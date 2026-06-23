"""
Scheduler Routes
================
API endpoints for Scheduler Agent functionality.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database.session.connection import get_db
from backend.database.models.scheduler_result import SchedulerResultModel
from backend.agents.scheduler_agent.scheduler_agent import SchedulerAgent
from backend.agents.scheduler_agent.scheduler_metrics import scheduler_metrics

router = APIRouter(tags=["Scheduler"])

@router.post("/scheduler/assign")
async def run_scheduler_assignment(patient_id: str):
    """Trigger the Scheduler Agent analysis for a specific patient."""
    agent = SchedulerAgent()
    result = await agent.run({"patient_id": patient_id})
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.get("/scheduler/results")
async def get_scheduler_results(session: AsyncSession = Depends(get_db)):
    """Get all scheduler results."""
    query = select(SchedulerResultModel).order_by(SchedulerResultModel.created_at.desc())
    result = await session.execute(query)
    records = result.scalars().all()
    return records

@router.get("/scheduler/history")
async def get_scheduler_history(patient_id: str, session: AsyncSession = Depends(get_db)):
    """Get scheduler history for a specific patient."""
    query = select(SchedulerResultModel).where(SchedulerResultModel.patient_id == patient_id).order_by(SchedulerResultModel.created_at.desc())
    result = await session.execute(query)
    records = result.scalars().all()
    return records

from backend.database.models.doctor import DoctorModel
from backend.database.models.nurse import NurseModel
from backend.api.websocket.handler import ws_manager

@router.get("/scheduler/metrics")
async def get_scheduler_metrics():
    """Get metrics for Scheduler Agent performance."""
    return scheduler_metrics.get_metrics()

@router.post("/scheduler/approve")
async def approve_scheduler_assignment(db_id: str, session: AsyncSession = Depends(get_db)):
    result = await session.get(SchedulerResultModel, db_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
        
    result.status = "approved"
    
    # Update Doctor workload
    if result.assigned_doctor_id:
        doc = await session.get(DoctorModel, result.assigned_doctor_id)
        if doc:
            doc.current_workload_score = min(100.0, doc.current_workload_score + 15.0)
            patients = list(doc.assigned_patients or [])
            if str(result.patient_id) not in patients:
                patients.append(str(result.patient_id))
            doc.assigned_patients = patients

    # Update Nurse workload
    if result.assigned_nurse_id:
        nurse = await session.get(NurseModel, result.assigned_nurse_id)
        if nurse:
            nurse.current_workload_score = min(100.0, nurse.current_workload_score + 10.0)
            patients = list(nurse.assigned_patients or [])
            if str(result.patient_id) not in patients:
                patients.append(str(result.patient_id))
            nurse.assigned_patients = patients

    await session.commit()
    await ws_manager.broadcast({"type": "scheduler_approved", "patient_id": str(result.patient_id)})
    return {"status": "approved"}

@router.post("/scheduler/reject")
async def reject_scheduler_assignment(db_id: str, session: AsyncSession = Depends(get_db)):
    result = await session.get(SchedulerResultModel, db_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
        
    result.status = "rejected"
    await session.commit()
    await ws_manager.broadcast({"type": "scheduler_rejected", "patient_id": str(result.patient_id)})
    return {"status": "rejected"}

