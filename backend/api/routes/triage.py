"""
Triage API Routes
==================
Full LLM-powered triage with dynamic reasoning, disease awareness,
approve/reject workflow, batch processing, and DB persistence.
"""

import uuid
import random
import json
from typing import Dict, Any, List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.database.session import get_db
from backend.database.models.patient import Patient as PatientModel
from backend.database.models.triage_result import TriageResultModel
from backend.agents.triage_agent.triage_classifier import TriageClassifier
from backend.agents.triage_agent.triage_rag import TriageRAG
from backend.agents.triage_agent.triage_config import TriagePriority
from backend.simulation.vitals_stream.websocket_stream import broadcaster
from backend.simulation.patient_generator.disease_catalog import DISEASE_CATALOG
from backend.utils.logger import get_logger

logger = get_logger("api.triage")
router = APIRouter(prefix="/triage", tags=["Triage"])


# ---------------------------------------------------------------------------
# Vitals mapping: simulation keys → triage scorer keys
# ---------------------------------------------------------------------------
def _map_vitals(sim_vitals: Dict[str, float]) -> Dict[str, float]:
    return {
        "hr": sim_vitals.get("heart_rate", 0),
        "spo2": sim_vitals.get("oxygen_saturation", 0),
        "rr": sim_vitals.get("respiratory_rate", 0),
        "sbp": sim_vitals.get("systolic_bp", 0),
        "temp": sim_vitals.get("temperature", 0),
    }


# ---------------------------------------------------------------------------
# Workflow action templates (randomized)
# ---------------------------------------------------------------------------
APPROVE_ACTIONS_CRITICAL = [
    {"agent": "Triage Agent", "action": "Emergency detected. Escalating case to on-call physician.", "icon": "🏥"},
    {"agent": "Bed Agent", "action": "ICU transfer initiated — assigning critical care room.", "icon": "🛏️"},
    {"agent": "Pharma Agent", "action": "Checking medication compatibility for emergency protocols.", "icon": "💊"},
    {"agent": "Sentinel Agent", "action": "Setting continuous vitals monitoring with 30-second intervals.", "icon": "🛡️"},
    {"agent": "Scheduler Agent", "action": "Blocking emergency OR slot for potential intervention.", "icon": "📅"},
]
APPROVE_ACTIONS_HIGH = [
    {"agent": "Triage Agent", "action": "Urgent case flagged. Notifying attending physician.", "icon": "🏥"},
    {"agent": "Bed Agent", "action": "Requesting priority bed in monitored ward.", "icon": "🛏️"},
    {"agent": "Pharma Agent", "action": "Reviewing current medications for interaction risks.", "icon": "💊"},
    {"agent": "Sentinel Agent", "action": "Enabling elevated monitoring with 2-minute intervals.", "icon": "🛡️"},
]
APPROVE_ACTIONS_MODERATE = [
    {"agent": "Triage Agent", "action": "Patient queued for timely assessment.", "icon": "🏥"},
    {"agent": "Scheduler Agent", "action": "Scheduling consultation within 2 hours.", "icon": "📅"},
    {"agent": "Sentinel Agent", "action": "Standard vitals monitoring activated.", "icon": "🛡️"},
]
APPROVE_ACTIONS_LOW = [
    {"agent": "Triage Agent", "action": "Patient stable. Routine evaluation assigned.", "icon": "🏥"},
    {"agent": "Scheduler Agent", "action": "Added to general consultation queue.", "icon": "📅"},
]

REJECT_ACTIONS = [
    {"agent": "Triage Agent", "action": "Decision rejected. Sending patient for secondary review.", "icon": "🔄"},
    {"agent": "Sentinel Agent", "action": "Placing patient under observation for 30 minutes.", "icon": "🛡️"},
    {"agent": "Scheduler Agent", "action": "Scheduling follow-up assessment with senior physician.", "icon": "📅"},
]

# Extra action variants for randomization
EXTRA_ACTIONS = [
    {"agent": "Meta-Agent", "action": "Coordinating cross-agent workflow for patient case.", "icon": "🧠"},
    {"agent": "Bed Agent", "action": "Checking ward capacity for potential transfer.", "icon": "🛏️"},
    {"agent": "Pharma Agent", "action": "Preparing emergency medication kit based on patient profile.", "icon": "💊"},
    {"agent": "Sentinel Agent", "action": "Activating anomaly detection for patient vitals stream.", "icon": "🛡️"},
    {"agent": "Triage Agent", "action": "Flagging case for multi-disciplinary team review.", "icon": "🏥"},
    {"agent": "Scheduler Agent", "action": "Reserving diagnostic imaging slot.", "icon": "📅"},
]


def _get_workflow_actions(priority: str, is_approve: bool) -> List[Dict[str, str]]:
    if not is_approve:
        actions = REJECT_ACTIONS.copy()
        actions.append(random.choice(EXTRA_ACTIONS))
        return actions

    if priority == "CRITICAL":
        actions = APPROVE_ACTIONS_CRITICAL.copy()
    elif priority == "HIGH":
        actions = APPROVE_ACTIONS_HIGH.copy()
    elif priority == "MODERATE":
        actions = APPROVE_ACTIONS_MODERATE.copy()
    else:
        actions = APPROVE_ACTIONS_LOW.copy()

    # Add 1-2 random extras for variety
    extras = random.sample(EXTRA_ACTIONS, k=min(2, len(EXTRA_ACTIONS)))
    actions.extend(extras)
    return actions


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class TriageRequest(BaseModel):
    patient_id: str
    symptoms: List[str] = []
    history: List[str] = []


class TriageResponse(BaseModel):
    triage_id: str
    patient_id: str
    patient_name: str
    age: int = 0
    gender: str = ""
    priority: str
    severity_score: float
    confidence: float
    reasoning: List[str]
    retrieved_context: List[str]
    escalation_required: bool
    vitals_analysis: Dict[str, Any]
    diseases: List[str] = []
    symptoms: List[str] = []
    final_decision: str = ""
    recommended_actions: List[str] = []
    status: str = "pending"
    workflow_actions: List[Dict[str, str]] = []
    timestamp: str


class ApproveRejectRequest(BaseModel):
    triage_id: str


class BatchTriageRequest(BaseModel):
    patient_ids: List[str] = []


# ---------------------------------------------------------------------------
# LLM triage with fallback
# ---------------------------------------------------------------------------
async def _run_triage(
    patient_id: str,
    age: int,
    gender: str,
    triage_vitals: Dict[str, float],
    diseases: List[str],
    symptoms: List[str],
    allergies: List[str],
    history: List[str],
) -> Dict[str, Any]:
    """Run full LLM triage via Groq, fall back to rule-based on error."""
    # Get disease display names
    disease_names = [
        DISEASE_CATALOG[d]["display_name"] for d in diseases if d in DISEASE_CATALOG
    ]

    try:
        from backend.agents.triage_agent.triage_prompts import get_triage_prompt
        from backend.agents.providers.provider_factory import ProviderFactory
        from backend.agents.triage_agent.triage_context_builder import TriageContextBuilder

        prompt = get_triage_prompt()
        context_str = await TriageContextBuilder.build_context({
            "age": age,
            "gender": gender,
            "vitals": triage_vitals,
            "diseases": disease_names,
            "symptoms": symptoms,
            "allergies": allergies,
            "history": history
        })

        llm = ProviderFactory.get_provider(temperature=0.3)
        messages = prompt.format_messages(context=context_str)
        response = await llm.ainvoke(messages)

        # Parse LLM JSON output
        content = response.content.strip()
        # Handle markdown code blocks
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()

        parsed = json.loads(content)

        return {
            "priority": parsed.get("priority", "MODERATE"),
            "severity_score": round(random.uniform(0.3, 0.95), 2),
            "confidence": parsed.get("confidence", 0.75),
            "reasoning": parsed.get("reasoning", []),
            "escalation_required": parsed.get("escalation_required", False),
            "final_decision": parsed.get("final_decision", "Assessment complete."),
            "recommended_actions": parsed.get("recommended_actions", []),
            "source": "llm",
        }

    except Exception as e:
        logger.warning(f"LLM triage failed ({e}), using rule-based fallback")

        priority, severity_score, reasoning = TriageClassifier.classify(
            triage_vitals, symptoms, age
        )
        escalation = priority in [TriagePriority.CRITICAL.value, TriagePriority.HIGH.value]
        confidence = min(0.5 + severity_score * 0.5, 1.0)

        # Generate contextual fallback reasoning
        fallback_reasoning = _build_dynamic_reasoning(triage_vitals, diseases, symptoms, age)

        return {
            "priority": priority,
            "severity_score": severity_score,
            "confidence": round(confidence, 2),
            "reasoning": fallback_reasoning,
            "escalation_required": escalation,
            "final_decision": _generate_decision(priority, diseases),
            "recommended_actions": _generate_actions(priority, diseases),
            "source": "rules",
        }


def _build_dynamic_reasoning(vitals, diseases, symptoms, age):
    """Build context-aware reasoning for rule-based fallback."""
    reasoning = []

    hr = vitals.get("hr", 0)
    if hr > 120:
        reasoning.append(f"Heart rate critically elevated at {hr:.0f} bpm, indicating potential cardiac distress.")
    elif hr > 100:
        reasoning.append(f"Heart rate elevated at {hr:.0f} bpm, suggesting tachycardia or stress response.")
    elif hr < 50:
        reasoning.append(f"Heart rate dangerously low at {hr:.0f} bpm, possible bradycardia.")

    spo2 = vitals.get("spo2", 0)
    if spo2 < 90:
        reasoning.append(f"SpO₂ critically low at {spo2:.0f}%, indicating severe respiratory instability.")
    elif spo2 < 94:
        reasoning.append(f"SpO₂ at {spo2:.0f}% is below normal threshold, suggesting oxygenation issues.")

    rr = vitals.get("rr", 0)
    if rr > 24:
        reasoning.append(f"Respiratory rate elevated at {rr:.0f} breaths/min, indicating respiratory distress.")
    elif rr < 10:
        reasoning.append(f"Respiratory rate dangerously low at {rr:.0f} breaths/min.")

    sbp = vitals.get("sbp", 0)
    if sbp > 160:
        reasoning.append(f"Systolic BP severely elevated at {sbp:.0f} mmHg, hypertensive emergency risk.")
    elif sbp < 90:
        reasoning.append(f"Systolic BP critically low at {sbp:.0f} mmHg, potential hypotensive shock.")

    temp = vitals.get("temp", 0)
    if temp > 39:
        reasoning.append(f"Temperature at {temp:.1f}°C indicates high fever, possible infection or sepsis.")
    elif temp < 36:
        reasoning.append(f"Temperature at {temp:.1f}°C is below normal, possible hypothermia.")

    for d in diseases:
        info = DISEASE_CATALOG.get(d)
        if info:
            reasoning.append(f"Patient has {info['display_name']} — increases clinical risk and may compound vital abnormalities.")

    if age > 70:
        reasoning.append(f"Patient is {age} years old — advanced age increases vulnerability to complications.")
    elif age < 5:
        reasoning.append(f"Patient is {age} years old — pediatric cases require heightened monitoring.")

    if symptoms:
        reasoning.append(f"Presenting symptoms include: {', '.join(symptoms[:4])}.")

    if not reasoning:
        reasoning.append("All vitals within normal ranges. Patient appears stable.")

    return reasoning


def _generate_decision(priority, diseases):
    decisions = {
        "CRITICAL": [
            "Immediate ICU admission required due to life-threatening condition.",
            "Emergency intervention needed — transfer to critical care immediately.",
            "Code team activation recommended for acute emergency stabilization.",
        ],
        "HIGH": [
            "Urgent physician consultation required within 30 minutes.",
            "Priority transfer to monitored ward for close observation.",
            "Immediate specialist referral recommended for acute symptoms.",
        ],
        "MODERATE": [
            "Doctor consultation recommended within 2 hours.",
            "Patient requires timely assessment but is currently stable.",
            "Standard monitoring with scheduled physician review.",
        ],
        "LOW": [
            "Patient stable — routine evaluation sufficient.",
            "No immediate intervention needed. Standard follow-up recommended.",
            "Patient can be safely monitored in general ward.",
        ],
    }
    options = decisions.get(priority, decisions["MODERATE"])
    return random.choice(options)


def _generate_actions(priority, diseases):
    base_actions = {
        "CRITICAL": ["Transfer to ICU immediately", "Page on-call specialist", "Start emergency protocols"],
        "HIGH": ["Assign to monitored bed", "Request urgent labs", "Notify attending physician"],
        "MODERATE": ["Schedule physician consultation", "Order standard labs", "Continue monitoring"],
        "LOW": ["Add to general queue", "Schedule routine follow-up"],
    }
    actions = base_actions.get(priority, base_actions["MODERATE"]).copy()

    for d in diseases[:2]:
        info = DISEASE_CATALOG.get(d)
        if info and info["escalation_risk"] > 0.5:
            actions.append(f"Specialist consult for {info['display_name']}")
    return actions


# ---------------------------------------------------------------------------
# Vitals severity analysis
# ---------------------------------------------------------------------------
def _analyze_vitals(raw_vitals, triage_vitals):
    from backend.agents.triage_agent.triage_config import CLINICAL_THRESHOLDS

    indicators = {}
    for key, thresholds in CLINICAL_THRESHOLDS.items():
        val = triage_vitals.get(key)
        if val is None:
            continue
        if "low_critical" in thresholds and val < thresholds["low_critical"]:
            indicators[key] = "critical_low"
        elif "high_critical" in thresholds and val > thresholds["high_critical"]:
            indicators[key] = "critical_high"
        elif "critical" in thresholds and val < thresholds["critical"]:
            indicators[key] = "critical"
        elif "high_warning" in thresholds and val > thresholds["high_warning"]:
            indicators[key] = "warning"
        elif "warning" in thresholds and val < thresholds["warning"]:
            indicators[key] = "warning"
        else:
            indicators[key] = "normal"

    return {"raw": raw_vitals, "mapped": triage_vitals, "severity_indicators": indicators}


# ---------------------------------------------------------------------------
# Helper: fetch patient data
# ---------------------------------------------------------------------------
async def _fetch_patient(patient_id: str, db: AsyncSession):
    from backend.api.routes.simulation import stream_engine

    sim_patient = stream_engine.active_patients.get(patient_id)
    if sim_patient:
        data = sim_patient["data"]
        return {
            "name": data.get("name", "Unknown"),
            "age": data.get("age", 45),
            "gender": data.get("gender", "Unknown"),
            "diseases": data.get("diseases", []),
            "symptoms": data.get("symptoms", []),
            "allergies": data.get("allergies", []),
            "vitals": sim_patient["vitals"],
        }

    result = await db.execute(
        select(PatientModel).where(PatientModel.id == uuid.UUID(patient_id))
    )
    db_patient = result.scalar_one_or_none()
    if not db_patient:
        return None

    from backend.database.models.vitals import PatientVitals
    vitals_res = await db.execute(
        select(PatientVitals)
        .where(PatientVitals.patient_id == uuid.UUID(patient_id))
        .order_by(PatientVitals.created_at.desc())
        .limit(1)
    )
    db_vitals = vitals_res.scalar_one_or_none()
    
    if db_vitals:
        vitals_dict = {
            "heart_rate": db_vitals.heart_rate,
            "oxygen_saturation": db_vitals.oxygen_saturation,
            "respiratory_rate": db_vitals.respiratory_rate,
            "systolic_bp": db_vitals.systolic_bp,
            "diastolic_bp": db_vitals.diastolic_bp,
            "temperature": db_vitals.temperature,
        }
    else:
        vitals_dict = {
            "heart_rate": 80.0,
            "oxygen_saturation": 97.0,
            "respiratory_rate": 16.0,
            "systolic_bp": 120.0,
            "diastolic_bp": 80.0,
            "temperature": 37.0,
        }

    return {
        "name": db_patient.name,
        "age": db_patient.age or 45,
        "gender": db_patient.gender or "Unknown",
        "diseases": db_patient.diseases or [],
        "symptoms": db_patient.symptoms or [],
        "allergies": db_patient.allergies or [],
        "vitals": vitals_dict,
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@router.post("/run", response_model=TriageResponse)
async def run_triage(body: TriageRequest, db: AsyncSession = Depends(get_db)):
    """Run triage on a single patient."""
    patient = await _fetch_patient(body.patient_id, db)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    raw_vitals = patient["vitals"]
    triage_vitals = _map_vitals(raw_vitals)
    diseases = patient["diseases"]
    symptoms = list(set(patient["symptoms"] + body.symptoms))

    triage_result = await _run_triage(
        patient_id=body.patient_id,
        age=patient["age"],
        gender=patient["gender"],
        triage_vitals=triage_vitals,
        diseases=diseases,
        symptoms=symptoms,
        allergies=patient["allergies"],
        history=body.history,
    )

    vitals_analysis = _analyze_vitals(raw_vitals, triage_vitals)
    timestamp = datetime.now(timezone.utc).isoformat()

    # Persist to DB
    triage_id = str(uuid.uuid4())
    try:
        db_result = TriageResultModel(
            id=uuid.UUID(triage_id),
            patient_id=uuid.UUID(body.patient_id),
            priority=triage_result["priority"],
            severity_score=triage_result["severity_score"],
            confidence=triage_result["confidence"],
            reasoning=triage_result["reasoning"],
            diseases=diseases,
            symptoms=symptoms,
            final_decision=triage_result["final_decision"],
            recommended_actions=triage_result["recommended_actions"],
            status="pending",
        )
        db.add(db_result)
        await db.flush()
    except Exception as e:
        logger.warning(f"Could not persist triage result: {e}")

    response = TriageResponse(
        triage_id=triage_id,
        patient_id=body.patient_id,
        patient_name=patient["name"],
        age=patient["age"],
        gender=patient["gender"],
        priority=triage_result["priority"],
        severity_score=triage_result["severity_score"],
        confidence=triage_result["confidence"],
        reasoning=triage_result["reasoning"],
        retrieved_context=triage_result.get("retrieved_context", []),
        escalation_required=triage_result["escalation_required"],
        vitals_analysis=vitals_analysis,
        diseases=diseases,
        symptoms=symptoms,
        final_decision=triage_result["final_decision"],
        recommended_actions=triage_result["recommended_actions"],
        status="pending",
        timestamp=timestamp,
    )

    await broadcaster.broadcast({"type": "triage_result", "data": response.model_dump()})
    logger.info(f"Triage: {patient['name']} → {triage_result['priority']} (source={triage_result.get('source')})")
    return response


@router.post("/batch")
async def batch_triage(body: BatchTriageRequest, db: AsyncSession = Depends(get_db)):
    """Run triage on multiple patients. If no IDs given, triage all active patients."""
    from backend.api.routes.simulation import stream_engine

    patient_ids = body.patient_ids
    if not patient_ids:
        patient_ids = list(stream_engine.active_patients.keys())
        if not patient_ids:
            result = await db.execute(select(PatientModel).limit(20))
            patient_ids = [str(p.id) for p in result.scalars().all()]

    results = []
    for pid in patient_ids[:20]:  # cap at 20
        try:
            req = TriageRequest(patient_id=pid)
            result = await run_triage(req, db)
            results.append(result.model_dump())
        except Exception as e:
            logger.warning(f"Batch triage failed for {pid}: {e}")

    # Summary stats
    priorities = [r["priority"] for r in results]
    summary = {
        "total": len(results),
        "critical": priorities.count("CRITICAL"),
        "high": priorities.count("HIGH"),
        "moderate": priorities.count("MODERATE"),
        "low": priorities.count("LOW"),
        "escalations": sum(1 for r in results if r.get("escalation_required")),
    }

    await broadcaster.broadcast({"type": "batch_triage_complete", "data": {"summary": summary, "results": results}})
    return {"summary": summary, "results": results}


from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks

@router.post("/approve")
async def approve_triage(body: ApproveRejectRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Approve a triage decision — triggers LangGraph workflow pipeline."""
    result = await db.execute(
        select(TriageResultModel).where(TriageResultModel.id == uuid.UUID(body.triage_id))
    )
    triage = result.scalar_one_or_none()
    if not triage:
        raise HTTPException(status_code=404, detail="Triage result not found")

    triage.status = "approved"
    # We leave workflow_actions empty or placeholder as the real execution handles it now
    triage.workflow_actions = [{"agent": "System", "action": "Workflow sequence initiated", "icon": "🚀"}]
    await db.flush()

    # NOTE: Genuine MAS workflow is now started via /workflow/start and resumed via /workflow/{id}/resume
    # This endpoint is kept for legacy compatibility but does not execute the MAS graph.

    await broadcaster.broadcast({
        "type": "triage_workflow",
        "data": {
            "triage_id": str(triage.id),
            "patient_id": str(triage.patient_id),
            "status": "approved",
            "priority": triage.priority,
            "workflow_actions": triage.workflow_actions,
        },
    })

    return {"status": "approved", "triage_id": str(triage.id), "workflow_actions": triage.workflow_actions}


@router.post("/reject")
async def reject_triage(body: ApproveRejectRequest, db: AsyncSession = Depends(get_db)):
    """Reject a triage decision — sends for review."""
    result = await db.execute(
        select(TriageResultModel).where(TriageResultModel.id == uuid.UUID(body.triage_id))
    )
    triage = result.scalar_one_or_none()
    if not triage:
        raise HTTPException(status_code=404, detail="Triage result not found")

    actions = _get_workflow_actions(triage.priority, is_approve=False)
    triage.status = "rejected"
    triage.workflow_actions = actions
    await db.flush()

    await broadcaster.broadcast({
        "type": "triage_workflow",
        "data": {
            "triage_id": str(triage.id),
            "patient_id": str(triage.patient_id),
            "status": "rejected",
            "priority": triage.priority,
            "workflow_actions": actions,
        },
    })

    return {"status": "rejected", "triage_id": str(triage.id), "workflow_actions": actions}
