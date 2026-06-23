"""
Agent API Routes
=================
Placeholder routes for triggering agent actions and viewing logs.
"""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.session import get_db
from backend.database.models.agent_log import AgentLog
from backend.database.schemas.agent_log import AgentLogResponse
from backend.database.models.agent_metric import AgentMetric
from backend.database.models.agent_run_history import AgentRunHistory
from backend.database.schemas.agent_metric import AgentMetricResponse, AgentRunHistoryCreate, AgentRunHistoryResponse
from datetime import datetime, timezone
from backend.utils.logger import get_logger

logger = get_logger("api.agents")
router = APIRouter(prefix="/agents", tags=["Agents"])


from backend.agents.registry.agent_registry import agent_registry

@router.get("/")
async def list_agents():
    """List all registered agents and their current status."""
    agents = agent_registry.list_agents()
    return {
        "agents": agents,
        "total": len(agents),
    }


@router.get("/{agent_name}/status")
async def get_agent_status(agent_name: str):
    """Get the status of a specific agent."""
    agent = agent_registry.get_agent(agent_name)
    if not agent:
        return {"error": f"Agent '{agent_name}' not found"}
    return {
        "name": agent.name,
        "role": agent.role,
        "status": "ready"
    }


@router.post("/{agent_name}/trigger")
async def trigger_agent(agent_name: str, payload: dict = {}):
    """
    Trigger an agent to execute a task.
    """
    agent = agent_registry.get_agent(agent_name)
    if not agent:
        return {"error": f"Agent '{agent_name}' not found"}

    logger.info(f"Agent triggered: {agent_name} with payload: {payload}")
    
    # If agent supports direct invocation (Phase 3B+)
    if hasattr(agent, "invoke_direct"):
        try:
            result = await agent.invoke_direct(payload)
            return {
                "agent": agent_name,
                "status": "success",
                "result": result
            }
        except Exception as e:
            logger.error(f"Agent invocation failed: {e}")
            return {"error": str(e)}

    return {
        "agent": agent_name,
        "status": "triggered",
        "message": f"Agent '{agent_name}' execution scaffold active.",
        "input": payload,
    }


@router.post("/triage/invoke")
async def invoke_triage(payload: dict):
    """Explicit endpoint for Triage Agent invocation."""
    agent = agent_registry.get_agent("TriageAgent")
    if not agent:
        return {"error": "TriageAgent not found in registry"}
    
    result = await agent.invoke_direct(payload)
    return result


@router.get("/logs/", response_model=List[AgentLogResponse])
async def get_agent_logs(
    agent_name: str | None = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve agent execution logs with optional filtering."""
    query = select(AgentLog).offset(skip).limit(limit).order_by(AgentLog.created_at.desc())
    if agent_name:
        query = query.where(AgentLog.agent_name == agent_name)

    result = await db.execute(query)
    logs = result.scalars().all()
    return logs

@router.get("/metrics", response_model=List[AgentMetricResponse])
async def get_all_agent_metrics(db: AsyncSession = Depends(get_db)):
    """Retrieve persistent metrics for all agents."""
    query = select(AgentMetric)
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/{agent_id}/metrics/update", response_model=AgentMetricResponse)
async def update_agent_metrics(
    agent_id: str,
    patients_analyzed: int = 0,
    actions_executed: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """Update agent metrics and set last_run_at to now."""
    query = select(AgentMetric).where(AgentMetric.agent_id == agent_id)
    result = await db.execute(query)
    metric = result.scalar_one_or_none()

    if not metric:
        metric = AgentMetric(
            agent_id=agent_id,
            patients_analyzed=patients_analyzed,
            actions_executed=actions_executed,
            last_run_at=datetime.now(timezone.utc)
        )
        db.add(metric)
    else:
        metric.patients_analyzed += patients_analyzed
        metric.actions_executed += actions_executed
        metric.last_run_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(metric)
    return metric

@router.post("/{agent_id}/history", response_model=AgentRunHistoryResponse)
async def save_agent_history(
    agent_id: str,
    payload: AgentRunHistoryCreate,
    db: AsyncSession = Depends(get_db)
):
    """Save the results of an agent execution batch."""
    history = AgentRunHistory(
        agent_id=agent_id,
        patients_analyzed=payload.patients_analyzed,
        recommendations_generated=payload.recommendations_generated,
        approvals=payload.approvals,
        rejections=payload.rejections,
        actions_executed=payload.actions_executed,
        execution_duration_ms=payload.execution_duration_ms
    )
    db.add(history)
    await db.commit()
    await db.refresh(history)
    return history

@router.get("/{agent_id}/history", response_model=List[AgentRunHistoryResponse])
async def get_agent_history(
    agent_id: str,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve historical execution batches for an agent."""
    query = select(AgentRunHistory).where(AgentRunHistory.agent_id == agent_id).offset(skip).limit(limit).order_by(AgentRunHistory.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/history/all", response_model=List[AgentRunHistoryResponse])
async def get_all_agent_history(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Retrieve historical execution batches for all agents."""
    query = select(AgentRunHistory).offset(skip).limit(limit).order_by(AgentRunHistory.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()
