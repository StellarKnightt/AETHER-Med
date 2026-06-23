import uuid
import time
from sqlalchemy import select
from backend.graph.state.workflow_state import WorkflowState
from backend.graph.utils.db_utils import update_workflow_stage, record_node_transition
from backend.agents.bed_agent.agent import BedAgent
from backend.database.session.connection import async_session_factory
from backend.database.models.patient import Patient
from backend.utils.logger import get_logger

logger = get_logger("workflow.bed_node")

async def bed_node(state: WorkflowState) -> WorkflowState:
    """
    Bed Node:
    Wraps the existing BedAgent execution within the LangGraph pipeline
    and finalizes the patient status in the database.
    """
    start_time = time.time()
    logger.info(f"BedNode started for patient {state['patient_id']}")
    
    await update_workflow_stage(state["workflow_id"], "bed")
    
    triage_output = state.get("triage_output", {})
    scheduler_output = state.get("scheduler_output", {})
    
    from backend.rag.services.retrieval_service import RetrievalService
    query_context = f"Priority: {triage_output.get('priority')}"
    retrieval_res = RetrievalService.retrieve(query=query_context, agent_type="bed")
    
    bed_input = {
        "patient_id": state["patient_id"],
        "triage_priority": triage_output.get("priority"),
        "assigned_doctor": scheduler_output.get("assigned_doctor_name"),
        "assigned_nurse": scheduler_output.get("assigned_nurse_name"),
        "retrieved_context": retrieval_res["retrieved_context"]
    }
    
    try:
        bed = BedAgent()
        bed_res = await bed.run(bed_input)
        
        bed_res["retrieved_documents"] = retrieval_res["retrieved_documents"]
        bed_res["retrieval_status"] = retrieval_res["status"]
        bed_res["retrieved_context"] = retrieval_res["retrieved_context"]
        
        duration_ms = (time.time() - start_time) * 1000
        await record_node_transition(
            execution_id=state["workflow_id"],
            patient_id=state["patient_id"],
            stage="bed",
            input_payload=bed_input,
            output_payload=bed_res,
            duration_ms=duration_ms
        )
        
        # 4. Final DB Update (Patient Record)
        async with async_session_factory() as session:
            patient = await session.get(Patient, uuid.UUID(state["patient_id"]))
            if patient:
                patient.ward = bed_res.get("recommended_ward")
                # Map priority to integer (1-5 typically)
                priority_map = {"CRITICAL": 1, "HIGH": 2, "MODERATE": 3, "LOW": 4}
                patient.triage_level = priority_map.get(triage_output.get("priority", "MODERATE"), 5)
                patient.status = "admitted"
            await session.commit()
            
        return {
            "bed_output": bed_res,
            "current_node": "bed",
            "workflow_status": "completed"
        }
        
    except Exception as e:
        logger.error(f"BedNode failed: {e}")
        duration_ms = (time.time() - start_time) * 1000
        
        # Record failure
        await record_node_transition(
            execution_id=state["workflow_id"],
            patient_id=state["patient_id"],
            stage="bed",
            input_payload=bed_input,
            output_payload={"error": str(e)},
            duration_ms=duration_ms
        )
        
        return {
            "errors": [f"Bed Agent failed: {e}"],
            "workflow_status": "failed",
            "current_node": "bed"
        }
