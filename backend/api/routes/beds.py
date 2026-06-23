"""
Bed API Routes
==============
REST endpoints for Bed Management and Bed Agent workflows.
"""

import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from backend.database.session.connection import get_db
from backend.database.models.bed import Bed
from backend.database.models.bed_result import BedResultModel
from backend.database.models.patient import Patient
from backend.database.schemas.bed import BedResponse, BedAgentResult
from backend.agents.bed_agent.agent import BedAgent
from backend.api.websocket.handler import ws_manager

router = APIRouter(prefix="/beds", tags=["Beds"])
bed_agent = BedAgent()

@router.get("/", response_model=List[BedResponse])
async def get_all_beds(db: AsyncSession = Depends(get_db)):
    """Retrieve all hospital beds."""
    result = await db.execute(select(Bed).order_by(Bed.bed_number))
    return result.scalars().all()

@router.get("/metrics")
async def get_bed_metrics(db: AsyncSession = Depends(get_db)):
    """Retrieve occupancy metrics for visualizations."""
    result = await db.execute(select(Bed.bed_type, Bed.status, func.count(Bed.id)).group_by(Bed.bed_type, Bed.status))
    metrics = {"total": 0, "occupied": 0, "icu": {"total": 0, "occupied": 0}, "general": {"total": 0, "occupied": 0}}
    
    for bed_type, status, count in result.all():
        metrics["total"] += count
        if status == "occupied":
            metrics["occupied"] += count
            
        btype = bed_type.lower()
        if "icu" in btype:
            metrics["icu"]["total"] += count
            if status == "occupied":
                metrics["icu"]["occupied"] += count
        else:
            metrics["general"]["total"] += count
            if status == "occupied":
                metrics["general"]["occupied"] += count
                
    return metrics

@router.post("/agent/{patient_id}")
async def run_bed_agent(patient_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Trigger the Bed Agent manually for a patient."""
    result = await bed_agent.run({"patient_id": str(patient_id)})
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/agent/{bed_result_id}/approve")
async def approve_bed_assignment(bed_result_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Approve a bed assignment output by the Bed Agent."""
    result = await db.get(BedResultModel, bed_result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Bed result not found")
        
    if result.status == "approved":
        return {"message": "Already approved"}
        
    # Mark result as approved
    result.status = "approved"
    
    # Assign the patient to the bed
    if result.assigned_bed_id:
        bed = await db.get(Bed, result.assigned_bed_id)
        if bed:
            if bed.status == "occupied":
                raise HTTPException(status_code=400, detail="Bed is already occupied!")
            bed.status = "occupied"
            bed.patient_id = result.patient_id
            
            # Also update patient's ward
            patient = await db.get(Patient, result.patient_id)
            if patient:
                patient.ward = result.recommended_ward
                
            # Broadcast the confirmed assignment to UI
            await ws_manager.broadcast({
                "type": "bed_workflow",
                "data": {
                    "bed_result_id": str(result.id),
                    "patient_id": str(result.patient_id),
                    "bed_id": str(bed.id),
                    "bed_number": bed.bed_number,
                    "ward": patient.ward if patient else result.recommended_ward,
                    "status": "approved"
                }
            })
            
    await db.commit()
    return {"message": "Bed assignment approved and finalized."}

@router.post("/agent/{bed_result_id}/reject")
async def reject_bed_assignment(bed_result_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Reject a bed assignment."""
    result = await db.get(BedResultModel, bed_result_id)
    if not result:
        raise HTTPException(status_code=404, detail="Bed result not found")
        
    result.status = "rejected"
    await db.commit()
    
    await ws_manager.broadcast({
        "type": "bed_workflow",
        "data": {
            "bed_result_id": str(result.id),
            "patient_id": str(result.patient_id),
            "status": "rejected"
        }
    })
    
    return {"message": "Bed assignment rejected."}

@router.post("/{bed_id}/release")
async def release_bed(bed_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Release a bed and trigger the Bed Agent cleaning workflow."""
    from backend.agents.bed_agent.bed_service import BedService
    import asyncio
    
    bed = await db.get(Bed, bed_id)
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
        
    bed.status = "cleaning_required"
    bed.patient_id = None
    await db.commit()
    
    # Trigger background cleaning workflow
    asyncio.create_task(BedService.trigger_cleaning_workflow(str(bed_id)))
    
    return {"message": "Bed released. Cleaning workflow initiated."}
