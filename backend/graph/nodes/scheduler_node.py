import time
from backend.graph.state.workflow_state import WorkflowState
from backend.graph.utils.db_utils import update_workflow_stage, record_node_transition
from backend.agents.scheduler_agent.scheduler_agent import SchedulerAgent
from backend.utils.logger import get_logger

logger = get_logger("workflow.scheduler_node")

async def scheduler_node(state: WorkflowState) -> WorkflowState:
    """
    Scheduler Node:
    Wraps the existing SchedulerAgent execution within the LangGraph pipeline.
    """
    start_time = time.time()
    logger.info(f"SchedulerNode started for patient {state['patient_id']}")
    
    await update_workflow_stage(state["workflow_id"], "scheduler")
    
    triage_output = state.get("triage_output", {})
    pharma_output = state.get("pharma_output", {})
    
    from backend.rag.services.retrieval_service import RetrievalService
    query_context = f"Priority: {triage_output.get('priority')}, Pharma Risk: {pharma_output.get('risk_level')}"
    retrieval_res = RetrievalService.retrieve(query=query_context, agent_type="scheduler")
    
    scheduler_input = {
        "patient_id": state["patient_id"],
        "triage_priority": triage_output.get("priority"),
        "pharma_risk_level": pharma_output.get("risk_level"),
        "pharma_interactions": pharma_output.get("interactions_detected"),
        "retrieved_context": retrieval_res["retrieved_context"]
    }
    
    try:
        if state.get("simulate_scheduler_failure"):
            from backend.database.models.security_simulation import SecurityEvent
            from backend.database.session.connection import async_session_factory
            async with async_session_factory() as session:
                event = SecurityEvent(
                    event_type="Agent Resource Exhaustion",
                    category="performance_failure",
                    severity="high",
                    affected_agent="SchedulerAgent",
                    target_entity="Patient Record",
                    description=f"Scheduler Agent encountered a connection timeout while allocating resources for patient {state['patient_id']} (Execution: {state['workflow_id']})",
                    risk_score=0.8,
                    status="detected"
                )
                session.add(event)
                await session.commit()
            raise Exception("Simulated Scheduler Agent connection timeout/failure")

        scheduler = SchedulerAgent()
        scheduler_res = await scheduler.run(scheduler_input)
        
        scheduler_res["retrieved_documents"] = retrieval_res["retrieved_documents"]
        scheduler_res["retrieval_status"] = retrieval_res["status"]
        scheduler_res["retrieved_context"] = retrieval_res["retrieved_context"]
        
        duration_ms = (time.time() - start_time) * 1000
        await record_node_transition(
            execution_id=state["workflow_id"],
            patient_id=state["patient_id"],
            stage="scheduler",
            input_payload=scheduler_input,
            output_payload=scheduler_res,
            duration_ms=duration_ms
        )
        
        return {
            "scheduler_output": scheduler_res,
            "current_node": "scheduler"
        }
        
    except Exception as e:
        logger.error(f"SchedulerNode failed: {e}")
        duration_ms = (time.time() - start_time) * 1000
        
        # Record failure
        await record_node_transition(
            execution_id=state["workflow_id"],
            patient_id=state["patient_id"],
            stage="scheduler",
            input_payload=scheduler_input,
            output_payload={"error": str(e)},
            duration_ms=duration_ms
        )
        
        return {
            "errors": [f"Scheduler Agent failed: {e}"],
            "workflow_status": "failed",
            "current_node": "scheduler"
        }
