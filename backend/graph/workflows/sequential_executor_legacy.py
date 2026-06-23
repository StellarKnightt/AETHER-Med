import asyncio
import uuid
from datetime import datetime, timezone
from sqlalchemy import select
from backend.database.session.connection import async_session_factory
from backend.database.models.patient import Patient
from backend.database.models.triage_result import TriageResultModel
from backend.database.models.workflow_execution import WorkflowExecutionModel
from backend.agents.pharma_agent.pharma_agent import PharmaAgent
from backend.agents.scheduler_agent.scheduler_agent import SchedulerAgent
from backend.agents.bed_agent.agent import BedAgent
from backend.utils.event_bus import event_bus
from backend.utils.logger import get_logger

logger = get_logger("workflow.executor")

async def execute_sequential_workflow(triage_id: str):
    """
    Executes the standard Python orchestration pipeline:
    Triage Output -> Pharma -> Scheduler -> Bed -> DB.
    """
    logger.info(f"Starting sequential workflow for triage_id: {triage_id}")
    
    async with async_session_factory() as session:
        # Fetch triage
        result = await session.execute(select(TriageResultModel).where(TriageResultModel.id == uuid.UUID(triage_id)))
        triage = result.scalar_one_or_none()
        if not triage:
            logger.error(f"Triage {triage_id} not found.")
            return

        patient_id = str(triage.patient_id)
        
        # Create execution tracker
        execution = WorkflowExecutionModel(
            patient_id=uuid.UUID(patient_id),
            current_stage="triage",
            status="in_progress",
            agent_outputs={"triage": {
                "priority": triage.priority,
                "severity_score": triage.severity_score,
                "diseases": triage.diseases,
                "symptoms": triage.symptoms,
                "reasoning": triage.reasoning
            }},
            execution_history=[{
                "stage": "triage",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "completed",
                "payload": {"priority": triage.priority, "severity_score": triage.severity_score}
            }]
        )
        session.add(execution)
        await session.commit()
        await session.refresh(execution)
        
        execution_id = str(execution.id)

    # Broadcast start event
    await event_bus.publish("workflow_execution_trace", {
        "execution_id": execution_id,
        "patient_id": patient_id,
        "stage": "started",
        "timestamp": datetime.now(timezone.utc).isoformat()
    })

    try:
        # 1. Pharma Agent
        await _update_stage(execution_id, "pharma")
        pharma = PharmaAgent()
        pharma_input = {
            "patient_id": patient_id,
            "triage_priority": triage.priority,
            "triage_diseases": triage.diseases,
            "triage_severity": triage.severity_score
        }
        pharma_res = await pharma.run(pharma_input)
        await _record_transition(execution_id, "pharma", pharma_input, pharma_res)
        
        # 2. Scheduler Agent
        await _update_stage(execution_id, "scheduler")
        scheduler = SchedulerAgent()
        scheduler_input = {
            "patient_id": patient_id,
            "triage_priority": triage.priority,
            "pharma_risk_level": pharma_res.get("risk_level"),
            "pharma_interactions": pharma_res.get("interactions_detected")
        }
        scheduler_res = await scheduler.run(scheduler_input)
        await _record_transition(execution_id, "scheduler", scheduler_input, scheduler_res)
        
        # 3. Bed Agent
        await _update_stage(execution_id, "bed")
        bed = BedAgent()
        bed_input = {
            "patient_id": patient_id,
            "triage_priority": triage.priority,
            "assigned_doctor": scheduler_res.get("assigned_doctor_name"),
            "assigned_nurse": scheduler_res.get("assigned_nurse_name")
        }
        bed_res = await bed.run(bed_input)
        await _record_transition(execution_id, "bed", bed_input, bed_res)

        # 4. Final DB Update (Patient Record)
        async with async_session_factory() as session:
            patient = await session.get(Patient, uuid.UUID(patient_id))
            if patient:
                patient.assigned_bed_id = bed_res.get("assigned_bed_id")
                patient.ward = bed_res.get("recommended_ward")
                # Map priority to integer (1-5 typically)
                priority_map = {"CRITICAL": 1, "HIGH": 2, "MODERATE": 3, "LOW": 4}
                patient.triage_level = priority_map.get(triage.priority, 5)
                patient.status = "admitted"
                
            execution = await session.get(WorkflowExecutionModel, uuid.UUID(execution_id))
            if execution:
                execution.status = "completed"
                execution.current_stage = "completed"
                
            await session.commit()
            
        # Broadcast completed
        await event_bus.publish("workflow_execution_trace", {
            "execution_id": execution_id,
            "patient_id": patient_id,
            "stage": "completed",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Sequential workflow {execution_id} completed successfully.")

    except Exception as e:
        logger.error(f"Workflow {execution_id} failed: {e}")
        async with async_session_factory() as session:
            execution = await session.get(WorkflowExecutionModel, uuid.UUID(execution_id))
            if execution:
                execution.status = "failed"
                await session.commit()
                

async def _update_stage(execution_id: str, stage: str):
    async with async_session_factory() as session:
        execution = await session.get(WorkflowExecutionModel, uuid.UUID(execution_id))
        if execution:
            execution.current_stage = stage
            await session.commit()

async def _record_transition(execution_id: str, stage: str, input_payload: dict, output_payload: dict):
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
                "output": output_payload
            })
            execution.execution_history = history
            await session.commit()
            
    # Broadcast trace event for the UI
    await event_bus.publish("workflow_execution_trace", {
        "execution_id": execution_id,
        "patient_id": str(execution.patient_id) if execution else None,
        "stage": stage,
        "input": input_payload,
        "output": output_payload,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
