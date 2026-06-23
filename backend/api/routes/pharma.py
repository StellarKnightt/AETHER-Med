"""
Pharma Routes
=============
API endpoints for Pharma Agent functionality.
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.database.session.connection import get_db
from backend.database.models.pharma_result import PharmaResultModel
from backend.agents.pharma_agent.pharma_agent import PharmaAgent
from backend.agents.pharma_agent.pharma_metrics import pharma_metrics

router = APIRouter(tags=["Pharma"])

@router.post("/pharma/analyze")
async def run_pharma_analysis(patient_id: str):
    """Trigger the Pharma Agent analysis for a specific patient."""
    agent = PharmaAgent()
    result = await agent.run({"patient_id": patient_id})
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.get("/pharma/results")
async def get_pharma_results(session: AsyncSession = Depends(get_db)):
    """Get all pharma results."""
    query = select(PharmaResultModel).order_by(PharmaResultModel.created_at.desc())
    result = await session.execute(query)
    records = result.scalars().all()
    return records

@router.get("/pharma/history")
async def get_pharma_history(patient_id: str, session: AsyncSession = Depends(get_db)):
    """Get pharma history for a specific patient."""
    query = select(PharmaResultModel).where(PharmaResultModel.patient_id == patient_id).order_by(PharmaResultModel.created_at.desc())
    result = await session.execute(query)
    records = result.scalars().all()
    return records

@router.get("/pharma/metrics")
async def get_pharma_metrics():
    """Get metrics for Pharma Agent performance."""
    return pharma_metrics.get_metrics()
