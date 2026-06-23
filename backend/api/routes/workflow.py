from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional

from backend.database.session.connection import get_db
from backend.database.models.patient import Patient as PatientModel
from backend.graph.services.graph_executor import start_mas_workflow, resume_mas_workflow
from backend.utils.logger import get_logger

logger = get_logger("api.workflow")
router = APIRouter(prefix="/workflow", tags=["MAS Workflow"])

class StartWorkflowRequest(BaseModel):
    patient_id: str

class BatchWorkflowRequest(BaseModel):
    patient_ids: Optional[List[str]] = None
    auto_approve: bool = False

class ResumeWorkflowRequest(BaseModel):
    execution_id: str
    action: str  # "approve" or "reject"


@router.post("/start")
async def start_workflow(body: StartWorkflowRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Starts the MAS Workflow for a single patient."""
    logger.info(f"Received request to start workflow for patient {body.patient_id}")
    
    background_tasks.add_task(start_mas_workflow, body.patient_id, False)
    
    return {"status": "started", "patient_id": body.patient_id, "message": "MAS workflow started"}


@router.post("/batch")
async def batch_workflow(body: BatchWorkflowRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Starts MAS Workflow for multiple patients."""
    patient_ids = body.patient_ids
    
    if not patient_ids:
        # Fetch all patients not currently in a workflow (simplified logic: just take 20)
        from backend.api.routes.simulation import stream_engine
        patient_ids = list(stream_engine.active_patients.keys())
        if not patient_ids:
            result = await db.execute(select(PatientModel).limit(20))
            patient_ids = [str(p.id) for p in result.scalars().all()]
            
    logger.info(f"Starting batch workflow for {len(patient_ids)} patients. Auto-approve: {body.auto_approve}")
    
    queued_pids = patient_ids[:20]
    started = 0
    for pid in queued_pids:
        background_tasks.add_task(start_mas_workflow, pid, body.auto_approve)
        started += 1
        
    return {
        "status": "batch_started", 
        "count": started, 
        "patient_ids": queued_pids,
        "auto_approve": body.auto_approve,
        "message": f"Started {started} MAS workflows"
    }

@router.get("/all")
async def get_all_workflows(db: AsyncSession = Depends(get_db)):
    """Fetches all workflow executions to populate the Workflow Center Navigator."""
    from backend.database.models.workflow_execution import WorkflowExecutionModel
    from backend.database.models.patient import Patient as PatientModel
    
    # Get all executions, join with patient to get name
    stmt = (
        select(WorkflowExecutionModel, PatientModel.name)
        .join(PatientModel, WorkflowExecutionModel.patient_id == PatientModel.id)
        .order_by(WorkflowExecutionModel.updated_at.desc())
        .limit(50)
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    workflows = []
    for execution, patient_name in rows:
        routing_decision = None
        if execution.execution_history:
            routing_trace = next((t for t in execution.execution_history if t.get("stage") == "routing"), None)
            if routing_trace:
                routing_decision = routing_trace.get("output", {})
                
        workflows.append({
            "execution_id": str(execution.id),
            "patient_id": str(execution.patient_id),
            "patient_name": patient_name,
            "status": execution.status,
            "current_stage": execution.current_stage,
            "created_at": execution.created_at.isoformat() if execution.created_at else None,
            "updated_at": execution.updated_at.isoformat() if execution.updated_at else None,
            "routing_decision": routing_decision
        })
        
    return workflows

@router.post("/batch/status")
async def get_batch_status(body: BatchWorkflowRequest, db: AsyncSession = Depends(get_db)):
    """Fetches full status and outcomes for a batch of patient IDs."""
    from backend.database.models.workflow_execution import WorkflowExecutionModel
    from backend.database.models.patient import Patient as PatientModel
    import uuid
    
    if not body.patient_ids:
        return []
        
    pids = [uuid.UUID(pid) for pid in body.patient_ids]
    
    stmt = (
        select(WorkflowExecutionModel, PatientModel.name)
        .join(PatientModel, WorkflowExecutionModel.patient_id == PatientModel.id)
        .where(WorkflowExecutionModel.patient_id.in_(pids))
        .order_by(WorkflowExecutionModel.created_at.desc())
    )
    result = await db.execute(stmt)
    rows = result.all()
    
    # We only want the latest execution per patient
    seen_patients = set()
    workflows = []
    
    for execution, patient_name in rows:
        pid_str = str(execution.patient_id)
        if pid_str in seen_patients:
            continue
        seen_patients.add(pid_str)
        
        # Calculate duration and extract routing decision
        duration_ms = 0
        routing_decision = None
        if execution.execution_history:
            try:
                start_time = next((t.get("timestamp") for t in execution.execution_history if t.get("stage") == "started"), None)
                end_time = next((t.get("timestamp") for t in reversed(execution.execution_history) if t.get("stage") in ["completed", "failed", "rejected"]), None)
                if start_time and end_time:
                    from dateutil import parser
                    s = parser.parse(start_time)
                    e = parser.parse(end_time)
                    duration_ms = (e - s).total_seconds() * 1000
                
                routing_trace = next((t for t in execution.execution_history if t.get("stage") == "routing"), None)
                if routing_trace:
                    routing_decision = routing_trace.get("output", {})
            except:
                pass
                
        workflows.append({
            "execution_id": str(execution.id),
            "patient_id": pid_str,
            "patient_name": patient_name,
            "status": execution.status,
            "current_stage": execution.current_stage,
            "outcome_report": execution.outcome_report,
            "duration_ms": duration_ms,
            "routing_decision": routing_decision
        })
        
    return workflows

@router.get("/patient/{patient_id}")
async def get_patient_workflow(patient_id: str, db: AsyncSession = Depends(get_db)):
    """Fetches the latest workflow execution traces for a given patient."""
    from backend.database.models.workflow_execution import WorkflowExecutionModel
    import uuid
    
    # Get the most recent execution for this patient
    stmt = select(WorkflowExecutionModel).where(
        WorkflowExecutionModel.patient_id == uuid.UUID(patient_id)
    ).order_by(WorkflowExecutionModel.created_at.desc()).limit(1)
    
    result = await db.execute(stmt)
    execution = result.scalar_one_or_none()
    
    if not execution:
        return {"traces": []}
        
    return {
        "execution_id": str(execution.id),
        "status": execution.status,
        "current_stage": execution.current_stage,
        "traces": execution.execution_history
    }
@router.post("/{execution_id}/resume")
async def resume_workflow(execution_id: str, body: ResumeWorkflowRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """Resumes a paused MAS Workflow with human approval/rejection."""
    if body.action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Action must be 'approve' or 'reject'")
        
    logger.info(f"Resuming workflow {execution_id} with action: {body.action}")
    
    background_tasks.add_task(resume_mas_workflow, execution_id, body.action)
    
    return {"status": "resuming", "execution_id": execution_id, "action": body.action}
