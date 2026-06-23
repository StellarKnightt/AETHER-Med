from fastapi import APIRouter
from backend.rag.services.retrieval_service import RetrievalService

router = APIRouter(prefix="/rag", tags=["RAG"])

@router.get("/metrics")
async def get_rag_metrics():
    """Returns real-time RAG retrieval metrics."""
    return RetrievalService.get_metrics()
