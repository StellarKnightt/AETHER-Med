import uuid
import time
from datetime import datetime, timezone
from backend.database.session.connection import async_session_factory
from backend.database.models.workflow_execution import WorkflowExecutionModel
from backend.utils.event_bus import event_bus

async def update_workflow_stage(execution_id: str, stage: str):
    async with async_session_factory() as session:
        execution = await session.get(WorkflowExecutionModel, uuid.UUID(execution_id))
        if execution:
            execution.current_stage = stage
            await session.commit()

async def record_node_transition(
    execution_id: str, 
    patient_id: str, 
    stage: str, 
    input_payload: dict, 
    output_payload: dict,
    duration_ms: float = 0.0
):
    """
    Records a node transition in the DB and broadcasts the trace event.
    """
    async with async_session_factory() as session:
        execution = await session.get(WorkflowExecutionModel, uuid.UUID(execution_id))
        if execution:
            # Update outputs
            outputs = dict(execution.agent_outputs)
            outputs[stage] = output_payload
            execution.agent_outputs = outputs
            
            # Update history
            history = list(execution.execution_history)
            history.append({
                "stage": stage,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "completed" if "error" not in output_payload else "failed",
                "input": input_payload,
                "output": output_payload,
                "duration_ms": duration_ms
            })
            execution.execution_history = history
            await session.commit()
            
    # Broadcast trace event for the UI
    await event_bus.publish("workflow_execution_trace", {
        "execution_id": execution_id,
        "patient_id": patient_id,
        "stage": stage,
        "input": input_payload,
        "output": output_payload,
        "duration_ms": duration_ms,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

async def publish_workflow_event(execution_id: str, patient_id: str, stage: str, extra_data: dict = None):
    """Publish general workflow lifecycle events like started, completed, failed."""
    payload = {
        "execution_id": execution_id,
        "patient_id": patient_id,
        "stage": stage,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    if extra_data:
        payload.update(extra_data)
    await event_bus.publish("workflow_execution_trace", payload)
