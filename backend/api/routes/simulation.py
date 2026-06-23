"""
Simulation API Routes
======================
Controls the simulation engine, exposes metrics, WebSocket streaming,
manual event injection, and persists simulation patients to PostgreSQL.
"""
import uuid
import asyncio
from typing import Dict, Any

from fastapi import APIRouter, Depends
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.session import get_db
from backend.database.models.patient import Patient as PatientModel
from backend.simulation.patient_generator.generator import PatientGenerator
from backend.simulation.vitals_stream.stream_engine import VitalsStreamEngine
from backend.simulation.vitals_stream.websocket_stream import (
    broadcaster,
    vitals_tick_callback,
    event_broadcast_callback,
)
from backend.simulation.bed_simulator.bed_manager import BedManager
from backend.simulation.event_engine.event_generator import EventGenerator
from backend.simulation.metrics.metrics_collector import MetricsCollector
from backend.utils.logger import get_logger

logger = get_logger("api.simulation")

# ---------------------------------------------------------------------------
# Simulation singletons (in-memory — use Redis in production)
# ---------------------------------------------------------------------------
stream_engine = VitalsStreamEngine()
stream_engine.subscribe(vitals_tick_callback)

bed_manager = BedManager()
event_generator = EventGenerator()
event_generator.subscribe(event_broadcast_callback)   # ← wire events → WS

patient_generator = PatientGenerator()
metrics_collector = MetricsCollector(stream_engine, bed_manager)

router = APIRouter()

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _broadcast_metrics():
    """Broadcast current aggregated metrics to all connected clients."""
    metrics = metrics_collector.get_dashboard_metrics()
    await broadcaster.broadcast({"type": "metrics_update", "data": metrics})

# Wire periodic metrics broadcast into the stream engine (defined after function)
stream_engine.metrics_broadcast_callback = _broadcast_metrics


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.post("/start")
async def start_simulation(db: AsyncSession = Depends(get_db)):
    """Start the simulation engines and seed 15 patients into memory + DB."""
    if stream_engine.is_running:
        return {"status": "running", "message": "Simulation is already running."}

    asyncio.create_task(stream_engine.start())
    asyncio.create_task(event_generator.start())

    # Seed initial patients
    for _ in range(15):
        p_data = patient_generator.generate_patient()
        p_id = str(uuid.uuid4())
        vitals = p_data.pop("initial_vitals")
        stream_engine.add_patient(p_id, p_data, vitals)

        # Allocate bed
        b_type = "icu" if p_data.get("triage_level", 3) <= 2 else "general"
        await bed_manager.allocate_bed(p_id, b_type)

        # ── Persist to PostgreSQL ──────────────────────────────────────────
        try:
            db_patient = PatientModel(
                id=uuid.UUID(p_id),
                name=p_data.get("name", "Unknown"),
                age=p_data.get("age", 0),
                gender=p_data.get("gender", "Unknown"),
                status=p_data.get("status", "triage"),
                triage_level=p_data.get("triage_level"),
                ward="ICU" if b_type == "icu" else "General",
                notes=p_data.get("notes"),
                medical_history=p_data.get("medical_history"),
                allergies=p_data.get("allergies"),
                medications=p_data.get("medications"),
                diseases=p_data.get("diseases"),
                symptoms=p_data.get("symptoms"),
                blood_group=p_data.get("blood_group"),
                weight=p_data.get("weight"),
                height=p_data.get("height"),
                smoking_status=p_data.get("smoking_status"),
                alcohol_consumption=p_data.get("alcohol_consumption"),
                emergency_contact=p_data.get("emergency_contact"),
                previous_hospitalizations=p_data.get("previous_hospitalizations"),
                risk_factors=p_data.get("risk_factors"),
            )
            db.add(db_patient)
        except Exception as e:
            logger.warning(f"Could not persist patient to DB: {e}")

    try:
        await db.flush()
    except Exception as e:
        logger.warning(f"DB flush failed (simulation will still run): {e}")

    await _broadcast_metrics()

    return {"status": "started", "message": "Simulation initialized with 15 patients."}


@router.post("/stop")
async def stop_simulation():
    """Stop the simulation engines."""
    stream_engine.stop()
    event_generator.stop()
    await broadcaster.broadcast({"type": "simulation_stopped"})
    return {"status": "stopped", "message": "Simulation stopped."}


@router.get("/metrics")
async def get_metrics():
    """Get current simulation metrics (REST poll fallback)."""
    return metrics_collector.get_dashboard_metrics()


@router.post("/events/trigger")
async def trigger_event(body: Dict[str, Any]):
    """Manually inject a hospital event."""
    from backend.simulation.event_engine.event_types import EVENT_TYPES
    import random
    from datetime import datetime, timezone

    event_type = body.get("event_type", "mass_casualty")
    severity = body.get("severity", "high")

    # Find matching event config or create ad-hoc
    config = next((e for e in EVENT_TYPES if e["type"] == event_type), None)
    description = config["description"] if config else f"Manual event: {event_type}"

    event_data = {
        "id": str(uuid.uuid4()),
        "event_type": event_type,
        "severity": severity,
        "description": description,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    message = {"type": "event_update", "event": event_data}
    await broadcaster.broadcast(message)
    logger.warning(f"Manual event triggered: {event_type} ({severity})")

    return {"status": "triggered", "event": event_data}


@router.post("/patients/generate")
async def generate_patients(
    body: Dict[str, Any] = {"count": 5},
    db: AsyncSession = Depends(get_db),
):
    """Generate N random patients, persist to DB, add to simulation, broadcast metrics."""
    count = body.get("count", 5)
    count = min(max(count, 1), 20)  # clamp 1–20

    generated = []
    for _ in range(count):
        p_data = patient_generator.generate_patient()
        p_id = str(uuid.uuid4())
        vitals = p_data.pop("initial_vitals")

        # Add to simulation vitals stream (if running)
        stream_engine.add_patient(p_id, p_data, vitals)

        # Allocate bed
        b_type = "icu" if p_data.get("triage_level", 3) <= 2 else "general"
        await bed_manager.allocate_bed(p_id, b_type)

        # Persist to PostgreSQL
        try:
            db_patient = PatientModel(
                id=uuid.UUID(p_id),
                name=p_data.get("name", "Unknown"),
                age=p_data.get("age", 0),
                gender=p_data.get("gender", "Unknown"),
                status=p_data.get("status", "triage"),
                triage_level=p_data.get("triage_level"),
                ward="ICU" if b_type == "icu" else "General",
                notes=p_data.get("notes"),
                medical_history=p_data.get("medical_history"),
                allergies=p_data.get("allergies"),
                medications=p_data.get("medications"),
                diseases=p_data.get("diseases"),
                symptoms=p_data.get("symptoms"),
                blood_group=p_data.get("blood_group"),
                weight=p_data.get("weight"),
                height=p_data.get("height"),
                smoking_status=p_data.get("smoking_status"),
                alcohol_consumption=p_data.get("alcohol_consumption"),
                emergency_contact=p_data.get("emergency_contact"),
                previous_hospitalizations=p_data.get("previous_hospitalizations"),
                risk_factors=p_data.get("risk_factors"),
            )
            db.add(db_patient)
            generated.append({
                "id": p_id,
                "name": p_data.get("name"),
                "age": p_data.get("age"),
                "triage_level": p_data.get("triage_level"),
                "ward": "ICU" if b_type == "icu" else "General",
                "diseases": p_data.get("diseases", []),
                "symptoms": p_data.get("symptoms", []),
                "vitals": vitals,
            })
        except Exception as e:
            logger.warning(f"Could not persist generated patient to DB: {e}")

    try:
        await db.flush()
    except Exception as e:
        logger.warning(f"DB flush failed for generated patients: {e}")

    await _broadcast_metrics()

    return {"status": "generated", "count": len(generated), "patients": generated}


@router.websocket("/ws")
async def simulation_websocket(websocket: WebSocket):
    """WebSocket endpoint — streams vitals, events, and metrics in real time."""
    await broadcaster.connect(websocket)
    # Send current metrics immediately on connect
    metrics = metrics_collector.get_dashboard_metrics()
    await websocket.send_json({"type": "metrics_update", "data": metrics})
    try:
        while True:
            await websocket.receive_text()   # keep alive; handle commands if needed
    except WebSocketDisconnect:
        broadcaster.disconnect(websocket)
