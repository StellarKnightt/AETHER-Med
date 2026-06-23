import uuid
import time
from sqlalchemy import select
from backend.database.session.connection import async_session_factory
from backend.database.models.triage_result import TriageResultModel
from backend.graph.state.workflow_state import WorkflowState
from backend.graph.utils.db_utils import update_workflow_stage, record_node_transition
from backend.utils.logger import get_logger

logger = get_logger("workflow.triage_node")

import uuid
import time
from datetime import datetime, timezone
from sqlalchemy import select
from backend.database.session.connection import async_session_factory
from backend.database.models.triage_result import TriageResultModel
from backend.graph.state.workflow_state import WorkflowState
from backend.graph.utils.db_utils import update_workflow_stage, record_node_transition
from backend.utils.logger import get_logger

# Import triage logic
from backend.api.routes.triage import _fetch_patient, _map_vitals, _run_triage, _analyze_vitals
from backend.simulation.vitals_stream.websocket_stream import broadcaster

logger = get_logger("workflow.triage_node")

async def triage_node(state: WorkflowState) -> WorkflowState:
    """
    Triage Node:
    Performs full LLM triage evaluation based on patient vitals and history.
    """
    start_time = time.time()
    patient_id = state['patient_id']
    logger.info(f"TriageNode started for patient {patient_id}")
    
    await update_workflow_stage(state["workflow_id"], "triage")
    
    async with async_session_factory() as db:
        patient = await _fetch_patient(patient_id, db)
        if not patient:
            return {"errors": [f"Patient {patient_id} not found."]}

        raw_vitals = patient["vitals"]
        triage_vitals = _map_vitals(raw_vitals)
        diseases = patient["diseases"]
        symptoms = patient["symptoms"]
        
        # Run Triage LLM
        triage_result = await _run_triage(
            patient_id=patient_id,
            age=patient["age"],
            gender=patient["gender"],
            triage_vitals=triage_vitals,
            diseases=diseases,
            symptoms=symptoms,
            allergies=patient["allergies"],
            history=[],
        )
        
        # RAG Retrieval
        from backend.rag.services.retrieval_service import RetrievalService
        query_context = f"Priority: {triage_result['priority']}, Symptoms: {symptoms}, Diseases: {diseases}"
        retrieval_res = RetrievalService.retrieve(query=query_context, agent_type="triage")
        
        triage_result["retrieved_context"] = retrieval_res["retrieved_context"]
        triage_result["retrieved_documents"] = retrieval_res["retrieved_documents"]
        triage_result["retrieval_status"] = retrieval_res["status"]
        
        vitals_analysis = _analyze_vitals(raw_vitals, triage_vitals)
        
        # Persist to DB
        triage_id = str(uuid.uuid4())
        try:
            db_result = TriageResultModel(
                id=uuid.UUID(triage_id),
                patient_id=uuid.UUID(patient_id),
                priority=triage_result["priority"],
                severity_score=triage_result["severity_score"],
                confidence=triage_result["confidence"],
                reasoning=triage_result["reasoning"],
                diseases=diseases,
                symptoms=symptoms,
                final_decision=triage_result["final_decision"],
                recommended_actions=triage_result["recommended_actions"],
                status="pending", # Wait for human approval
                workflow_actions=[]
            )
            db.add(db_result)
            await db.commit()
        except Exception as e:
            logger.warning(f"Could not persist triage result in node: {e}")
            await db.rollback()

    output = {
        "triage_id": triage_id,
        "priority": triage_result["priority"],
        "severity_score": triage_result["severity_score"],
        "diseases": diseases,
        "symptoms": symptoms,
        "reasoning": triage_result["reasoning"],
        "final_decision": triage_result.get("final_decision", ""),
        "recommended_actions": triage_result["recommended_actions"],
        "retrieved_context": retrieval_res["retrieved_context"],
        "retrieved_documents": retrieval_res["retrieved_documents"],
        "retrieval_status": retrieval_res["status"],
        "vitals_analysis": vitals_analysis
    }
    
    duration_ms = (time.time() - start_time) * 1000
    
    await record_node_transition(
        execution_id=state["workflow_id"],
        patient_id=patient_id,
        stage="triage",
        input_payload={"patient_id": patient_id, "vitals": raw_vitals},
        output_payload=output,
        duration_ms=duration_ms
    )
    
    # Send WebSocket event for frontend modal
    await broadcaster.broadcast({
        "type": "triage_result",
        "data": {
            "triage_id": triage_id,
            "patient_id": patient_id,
            "patient_name": patient["name"],
            "age": patient["age"],
            "gender": patient["gender"],
            "priority": triage_result["priority"],
            "severity_score": triage_result["severity_score"],
            "confidence": triage_result["confidence"],
            "reasoning": triage_result["reasoning"],
            "retrieved_context": triage_result["retrieved_context"],
            "escalation_required": triage_result["escalation_required"],
            "vitals_analysis": vitals_analysis,
            "diseases": diseases,
            "symptoms": symptoms,
            "final_decision": triage_result["final_decision"],
            "recommended_actions": triage_result["recommended_actions"],
            "status": "pending",
            "execution_id": state["workflow_id"],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    })
    
    return {
        "triage_output": output,
        "current_node": "triage",
        "workflow_status": "awaiting_approval"
    }
