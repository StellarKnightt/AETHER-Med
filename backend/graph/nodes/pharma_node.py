import time
from backend.graph.state.workflow_state import WorkflowState
from backend.graph.utils.db_utils import update_workflow_stage, record_node_transition
from backend.agents.pharma_agent.pharma_agent import PharmaAgent
from backend.utils.logger import get_logger

logger = get_logger("workflow.pharma_node")

async def pharma_node(state: WorkflowState) -> WorkflowState:
    """
    Pharma Node:
    Wraps the existing PharmaAgent execution within the LangGraph pipeline.
    """
    start_time = time.time()
    logger.info(f"PharmaNode started for patient {state['patient_id']}")
    
    await update_workflow_stage(state["workflow_id"], "pharma")
    
    triage_output = state.get("triage_output", {})
    
    from backend.rag.services.retrieval_service import RetrievalService
    query_context = f"Diseases: {triage_output.get('diseases')}, Severity: {triage_output.get('severity_score')}"
    retrieval_res = RetrievalService.retrieve(query=query_context, agent_type="pharma")
    
    pharma_input = {
        "patient_id": state["patient_id"],
        "triage_priority": triage_output.get("priority"),
        "triage_diseases": triage_output.get("diseases"),
        "triage_severity": triage_output.get("severity_score"),
        "retrieved_context": retrieval_res["retrieved_context"]
    }
    
    try:
        pharma = PharmaAgent()
        pharma_res = await pharma.run(pharma_input)
        
        pharma_res["retrieved_documents"] = retrieval_res["retrieved_documents"]
        pharma_res["retrieval_status"] = retrieval_res["status"]
        pharma_res["retrieved_context"] = retrieval_res["retrieved_context"]
        
        duration_ms = (time.time() - start_time) * 1000
        await record_node_transition(
            execution_id=state["workflow_id"],
            patient_id=state["patient_id"],
            stage="pharma",
            input_payload=pharma_input,
            output_payload=pharma_res,
            duration_ms=duration_ms
        )
        
        return {
            "pharma_output": pharma_res,
            "current_node": "pharma"
        }
        
    except Exception as e:
        logger.error(f"PharmaNode failed: {e}")
        duration_ms = (time.time() - start_time) * 1000
        
        # Record failure
        await record_node_transition(
            execution_id=state["workflow_id"],
            patient_id=state["patient_id"],
            stage="pharma",
            input_payload=pharma_input,
            output_payload={"error": str(e)},
            duration_ms=duration_ms
        )
        
        return {
            "errors": [f"Pharma Agent failed: {e}"],
            "workflow_status": "failed",
            "current_node": "pharma"
        }
