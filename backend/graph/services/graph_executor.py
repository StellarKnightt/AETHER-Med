import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from backend.database.session.connection import async_session_factory
from backend.database.models.triage_result import TriageResultModel
from backend.database.models.workflow_execution import WorkflowExecutionModel
from backend.graph.state.workflow_state import WorkflowState
from backend.graph.graphs.hospital_workflow_graph import build_hospital_graph
from backend.graph.utils.db_utils import publish_workflow_event
from backend.utils.logger import get_logger

logger = get_logger("workflow.graph_executor")

# Build the graph singleton
workflow_graph = build_hospital_graph()

async def start_mas_workflow(patient_id: str, auto_approve: bool = False, simulate_scheduler_failure: bool = False):
    """
    Instantiates the LangGraph StateGraph pipeline for a patient.
    Runs up to the first interrupt (Triage Approval).
    """
    logger.info(f"Starting MAS workflow for patient_id: {patient_id}")
    
    async with async_session_factory() as session:
        # Create execution tracker
        execution = WorkflowExecutionModel(
            patient_id=uuid.UUID(patient_id),
            current_stage="started",
            status="in_progress",
            agent_outputs={},
            execution_history=[]
        )
        session.add(execution)
        await session.commit()
        await session.refresh(execution)
        
        execution_id = str(execution.id)

    # Broadcast start event
    await publish_workflow_event(execution_id, patient_id, "started")

    # Initialize Graph State
    initial_state: WorkflowState = {
        "workflow_id": execution_id,
        "patient_id": patient_id,
        "patient_data": {},
        "triage_output": {},
        "pharma_output": {},
        "scheduler_output": {},
        "bed_output": {},
        "current_node": "started",
        "workflow_status": "running",
        "approval_status": "pending",
        "routing_decision": {},
        "outcome_report": {},
        "errors": [],
        "execution_history": [],
        "sentinel_events": [],
        "meta_events": [],
        "simulate_scheduler_failure": simulate_scheduler_failure
    }
    
    config = {"configurable": {"thread_id": execution_id}}
    
    try:
        logger.info(f"Invoking MAS workflow {execution_id}")
        
        # Invoke LangGraph - it will pause after triage_node due to interrupt_before=["routing_node"]
        await workflow_graph.ainvoke(initial_state, config=config)
        
        # Check if the graph ended due to an internal error before pausing
        state_snapshot = workflow_graph.get_state(config)
        state_values = state_snapshot.values
        
        if state_values.get("errors"):
            logger.error(f"Workflow {execution_id} completed with errors: {state_values['errors']}")
            async with async_session_factory() as session:
                execution = await session.get(WorkflowExecutionModel, uuid.UUID(execution_id))
                if execution:
                    execution.status = "failed"
                    await session.commit()
            await publish_workflow_event(execution_id, patient_id, "failed", {"errors": state_values["errors"]})
        else:
            # If auto_approve is True, automatically resume
            if auto_approve:
                logger.info(f"Auto-approving MAS workflow {execution_id}")
                await resume_mas_workflow(execution_id, "approve")
            else:
                logger.info(f"MAS workflow {execution_id} awaiting approval.")
                async with async_session_factory() as session:
                    execution = await session.get(WorkflowExecutionModel, uuid.UUID(execution_id))
                    if execution:
                        execution.status = "awaiting_approval"
                        await session.commit()
                await publish_workflow_event(execution_id, patient_id, "awaiting_approval")
                        
    except Exception as e:
        logger.error(f"LangGraph execution {execution_id} failed abruptly: {e}")
        async with async_session_factory() as session:
            execution = await session.get(WorkflowExecutionModel, uuid.UUID(execution_id))
            if execution:
                execution.status = "failed"
                await session.commit()
        await publish_workflow_event(execution_id, patient_id, "failed", {"errors": [str(e)]})
        return None
        
    return execution_id


async def resume_mas_workflow(execution_id: str, action: str):
    """
    Resumes a paused LangGraph workflow with a human decision.
    action: "approve" or "reject"
    """
    logger.info(f"Resuming MAS workflow {execution_id} with action: {action}")
    
    config = {"configurable": {"thread_id": execution_id}}
    
    state_snapshot = workflow_graph.get_state(config)
    if not state_snapshot:
        logger.error(f"No checkpoint found for workflow {execution_id}")
        return
        
    patient_id = state_snapshot.values["patient_id"]
    approval_status = "approved" if action == "approve" else "rejected"
    
    # Update the state directly via API
    workflow_graph.update_state(config, {"approval_status": approval_status})
    
    # Emit an approval stage trace event
    from backend.graph.utils.db_utils import record_node_transition
    await record_node_transition(
        execution_id=execution_id,
        patient_id=patient_id,
        stage="approval",
        input_payload={"action_requested": action},
        output_payload={"approval_status": approval_status},
        duration_ms=0
    )
    
    try:
        # Resume workflow (None means continue from interrupt)
        final_state = await workflow_graph.ainvoke(None, config=config)
        
        if final_state.get("errors"):
            logger.error(f"Workflow {execution_id} completed with errors: {final_state['errors']}")
            async with async_session_factory() as session:
                execution = await session.get(WorkflowExecutionModel, uuid.UUID(execution_id))
                if execution:
                    execution.status = "failed"
                    await session.commit()
            await publish_workflow_event(execution_id, patient_id, "failed", {"errors": final_state["errors"]})
        else:
            logger.info(f"LangGraph workflow {execution_id} completed successfully.")
            
            async with async_session_factory() as session:
                execution = await session.get(WorkflowExecutionModel, uuid.UUID(execution_id))
                if execution:
                    if approval_status == "rejected":
                        execution.status = "rejected"
                        execution.current_stage = "rejected"
                    else:
                        execution.status = "completed"
                        execution.current_stage = "completed"
                        
                    execution.outcome_report = final_state.get("outcome_report", {})
                    await session.commit()
                    
            await publish_workflow_event(execution_id, patient_id, execution.status)

    except Exception as e:
        logger.error(f"LangGraph resume {execution_id} failed abruptly: {e}")
        async with async_session_factory() as session:
            execution = await session.get(WorkflowExecutionModel, uuid.UUID(execution_id))
            if execution:
                execution.status = "failed"
                await session.commit()
        await publish_workflow_event(execution_id, patient_id, "failed", {"errors": [str(e)]})
