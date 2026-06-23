"""
Health Check Endpoint
======================
System health and readiness checks.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.session import get_db
from backend.config.settings import settings

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """Basic health check — confirms the API is running."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.app_env,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health/ready")
async def readiness_check(db: AsyncSession = Depends(get_db)):
    """
    Readiness check — confirms the API and its dependencies are operational.
    Checks: database connectivity, component status.
    """
    checks: dict = {
        "api": True,
        "database": False,
        "langgraph": True,  # Placeholder — always true in Phase 1
        "rag": True,  # Placeholder — always true in Phase 1
    }

    # Check database connectivity
    try:
        result = await db.execute(text("SELECT 1"))
        checks["database"] = result.scalar() == 1
    except Exception:
        checks["database"] = False

    all_healthy = all(checks.values())

    return {
        "status": "ready" if all_healthy else "degraded",
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
