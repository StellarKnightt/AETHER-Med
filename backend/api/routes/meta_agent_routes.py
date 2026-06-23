"""
Meta-Agent API Routes
=====================
Controls the Meta-Agent monitoring session, failure detection, 
recovery workflows, and health scores.
"""
import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from backend.database.session import get_db, async_session_factory
from backend.database.models.meta_agent_models import (
    MetaAgentSession, MetaAgentHealthScore, MetaAgentIncident, MetaAgentRecoveryAction
)
from backend.database.models.security_simulation import SecurityEvent
from backend.agents.meta_agent.agent import MetaAgent
from backend.api.websocket.handler import ws_manager
from backend.utils.logger import get_logger

logger = get_logger("api.meta_agent")

router = APIRouter(tags=["Meta-Agent"])

# Global state
active_monitoring_task: asyncio.Task = None
meta_agent = MetaAgent()

@router.get("/status")
async def get_status(db: AsyncSession = Depends(get_db)):
    """Get the current meta-agent monitoring session status."""
    result = await db.execute(
        select(MetaAgentSession).order_by(desc(MetaAgentSession.created_at)).limit(1)
    )
    session = result.scalar_one_or_none()
    
    is_active = active_monitoring_task is not None and not active_monitoring_task.done()
    
    if session:
        # Sync status with task
        if is_active and session.status != "active":
            session.status = "active"
            await db.commit()
        elif not is_active and session.status == "active":
            session.status = "stopped"
            session.stopped_at = datetime.now(timezone.utc)
            await db.commit()
            
        return session
        
    return {"status": "stopped", "events_processed": 0, "failures_detected": 0, "recoveries_completed": 0}

@router.post("/start")
async def start_monitoring(db: AsyncSession = Depends(get_db)):
    """Start the Meta-Agent monitoring loop."""
    global active_monitoring_task
    
    if active_monitoring_task and not active_monitoring_task.done():
        return {"status": "already running"}
        
    session = MetaAgentSession(
        status="active",
        started_at=datetime.now(timezone.utc),
        events_processed=0,
        failures_detected=0,
        recoveries_completed=0
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    active_monitoring_task = asyncio.create_task(meta_agent_monitoring_loop(session.id))
    
    await ws_manager.broadcast({
        "type": "meta_agent_monitoring_update",
        "action": "started"
    })
    
    return session

@router.post("/stop")
async def stop_monitoring(db: AsyncSession = Depends(get_db)):
    """Stop the Meta-Agent monitoring loop."""
    global active_monitoring_task
    
    if active_monitoring_task:
        active_monitoring_task.cancel()
        active_monitoring_task = None
        
    result = await db.execute(
        select(MetaAgentSession).where(MetaAgentSession.status == "active").order_by(desc(MetaAgentSession.created_at)).limit(1)
    )
    session = result.scalar_one_or_none()
    
    if session:
        session.status = "stopped"
        session.stopped_at = datetime.now(timezone.utc)
        await db.commit()
        
    await ws_manager.broadcast({
        "type": "meta_agent_monitoring_update",
        "action": "stopped"
    })
    
    return {"status": "stopped"}

@router.get("/health-scores")
async def get_health_scores(db: AsyncSession = Depends(get_db)):
    """Get health scores for all agents."""
    result = await db.execute(select(MetaAgentHealthScore))
    scores = result.scalars().all()
    
    # Initialize default scores if empty
    if not scores:
        agents = ["TriageAgent", "PharmaAgent", "SchedulerAgent", "BedAgent", "SentinelAgent"]
        for agent in agents:
            score = MetaAgentHealthScore(agent_name=agent)
            db.add(score)
            scores.append(score)
        await db.commit()
        
    return scores

@router.get("/incidents")
async def get_incidents(db: AsyncSession = Depends(get_db)):
    """Get all meta-agent failure incidents."""
    result = await db.execute(
        select(MetaAgentIncident).order_by(desc(MetaAgentIncident.created_at))
    )
    return result.scalars().all()

@router.post("/incidents/{incident_id}/approve")
async def approve_incident(incident_id: str, db: AsyncSession = Depends(get_db)):
    """Approve all recommendations for an incident."""
    incident = await db.get(MetaAgentIncident, uuid.UUID(incident_id))
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    if incident.status == "pending_approval":
        incident.status = "approved"
        await db.commit()
        
        await ws_manager.broadcast({
            "type": "meta_agent_incident_update",
            "incident_id": str(incident.id),
            "status": "approved"
        })
        
        # Fire and forget recovery execution
        asyncio.create_task(execute_recovery(str(incident.id)))
        
    return incident

@router.post("/incidents/{incident_id}/reject")
async def reject_incident(incident_id: str, db: AsyncSession = Depends(get_db)):
    """Reject recommendations for an incident."""
    incident = await db.get(MetaAgentIncident, uuid.UUID(incident_id))
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    if incident.status == "pending_approval":
        incident.status = "rejected"
        await db.commit()
        
        await ws_manager.broadcast({
            "type": "meta_agent_incident_update",
            "incident_id": str(incident.id),
            "status": "rejected"
        })
        
    return incident

@router.post("/incidents/approve-all")
async def approve_all_incidents(db: AsyncSession = Depends(get_db)):
    """Approve all pending incidents."""
    result = await db.execute(select(MetaAgentIncident).where(MetaAgentIncident.status == "pending_approval"))
    incidents = result.scalars().all()
    
    for inc in incidents:
        inc.status = "approved"
        asyncio.create_task(execute_recovery(str(inc.id)))
        
    await db.commit()
    
    await ws_manager.broadcast({
        "type": "meta_agent_incident_update",
        "action": "approve_all"
    })
    
    return {"approved_count": len(incidents)}

@router.post("/incidents/reject-all")
async def reject_all_incidents(db: AsyncSession = Depends(get_db)):
    """Reject all pending incidents."""
    result = await db.execute(select(MetaAgentIncident).where(MetaAgentIncident.status == "pending_approval"))
    incidents = result.scalars().all()
    
    for inc in incidents:
        inc.status = "rejected"
        
    await db.commit()
    
    await ws_manager.broadcast({
        "type": "meta_agent_incident_update",
        "action": "reject_all"
    })
    
    return {"rejected_count": len(incidents)}


@router.get("/recovery-history")
async def get_recovery_history(db: AsyncSession = Depends(get_db)):
    """Get all recovery actions executed."""
    result = await db.execute(
        select(MetaAgentRecoveryAction).order_by(desc(MetaAgentRecoveryAction.created_at))
    )
    return result.scalars().all()


# --- Background Monitoring Loop ---

async def meta_agent_monitoring_loop(session_id: uuid.UUID):
    """Background task that continuously monitors for agent misbehavior and failures."""
    logger.info("Meta-Agent monitoring loop started.")
    last_event_time = datetime.now(timezone.utc)
    
    META_AGENT_CATEGORIES = [
        "decision_failure", "reasoning_failure", "confusion_state", 
        "workflow_failure", "communication_failure", "performance_failure"
    ]
    
    try:
        while True:
            await asyncio.sleep(4) # Polling interval
            
            async with async_session_factory() as db:
                # Fetch recent events related to meta-agent scenarios
                result = await db.execute(
                    select(SecurityEvent)
                    .where(SecurityEvent.created_at > last_event_time)
                    .where(SecurityEvent.category.in_(META_AGENT_CATEGORIES))
                    .order_by(SecurityEvent.created_at)
                    .limit(5)
                )
                new_events = result.scalars().all()
                
                if not new_events:
                    continue
                    
                # Update last event time
                last_event_time = new_events[-1].created_at
                
                for event in new_events:
                    # Broadcast pipeline step: Activity Detected
                    await ws_manager.broadcast({
                        "type": "meta_agent_pipeline",
                        "step": "activity_detected",
                        "agent": event.affected_agent
                    })
                    await asyncio.sleep(1) # Visual pacing
                    
                    event_data = {
                        "event_type": event.event_type,
                        "category": event.category,
                        "severity": event.severity,
                        "affected_agent": event.affected_agent,
                        "description": event.description
                    }
                    
                    # Broadcast pipeline step: Behavior Analysis
                    await ws_manager.broadcast({
                        "type": "meta_agent_pipeline",
                        "step": "behavior_analysis",
                        "agent": event.affected_agent
                    })
                    
                    # 1. Analyze with LLM
                    analysis = await meta_agent.analyze_failure(event_data)
                    
                    # Broadcast pipeline step: Root Cause & Recommendation
                    await ws_manager.broadcast({
                        "type": "meta_agent_pipeline",
                        "step": "root_cause_analysis",
                        "agent": event.affected_agent
                    })
                    
                    # 2. Get current health
                    score_result = await db.execute(
                        select(MetaAgentHealthScore).where(MetaAgentHealthScore.agent_name == event.affected_agent)
                    )
                    health_score = score_result.scalar_one_or_none()
                    if not health_score:
                        health_score = MetaAgentHealthScore(agent_name=event.affected_agent)
                        db.add(health_score)
                    
                    before_h = health_score.health_score
                    
                    # Decrement scores based on failure category
                    penalty = 10.0
                    if analysis["severity_assessment"] == "critical": penalty = 25.0
                    elif analysis["severity_assessment"] == "high": penalty = 15.0
                    
                    health_score.health_score = max(0.0, health_score.health_score - penalty)
                    
                    cat = event.category
                    if cat == "decision_failure" or cat == "reasoning_failure":
                        health_score.reasoning_quality = max(0.0, health_score.reasoning_quality - penalty * 1.2)
                    elif cat == "confusion_state" or cat == "performance_failure":
                        health_score.reliability_score = max(0.0, health_score.reliability_score - penalty * 1.2)
                    elif cat == "workflow_failure":
                        health_score.workflow_compliance = max(0.0, health_score.workflow_compliance - penalty * 1.2)
                    elif cat == "communication_failure":
                        health_score.communication_score = max(0.0, health_score.communication_score - penalty * 1.2)
                        
                    health_score.active_failures += 1
                    
                    if health_score.health_score < 40.0:
                        health_score.status = "critical"
                    elif health_score.health_score < 80.0:
                        health_score.status = "degraded"
                    
                    # 3. Create Incident
                    incident = MetaAgentIncident(
                        event_id=event.id,
                        failure_type=analysis["failure_type"],
                        failure_category=event.category,
                        severity=analysis["severity_assessment"],
                        affected_agent=event.affected_agent,
                        root_cause=analysis["root_cause"],
                        recommended_actions=analysis["recommended_actions"],
                        confidence=analysis["confidence"],
                        status="pending_approval",
                        before_health=before_h,
                        after_health=health_score.health_score
                    )
                    db.add(incident)
                    
                    # 4. Update Session stats
                    session = await db.get(MetaAgentSession, session_id)
                    if session:
                        session.failures_detected += 1
                        session.events_processed += 1
                        
                    await db.commit()
                    
                    # 5. Broadcast final pipeline step
                    await ws_manager.broadcast({
                        "type": "meta_agent_pipeline",
                        "step": "awaiting_approval",
                        "agent": event.affected_agent,
                        "incident_id": str(incident.id)
                    })
                    
                    await ws_manager.broadcast({
                        "type": "meta_agent_health_update",
                        "agent": health_score.agent_name
                    })
                
    except asyncio.CancelledError:
        logger.info("Meta-Agent monitoring loop cancelled.")
    except Exception as e:
        logger.error(f"Error in Meta-Agent monitoring loop: {e}")

async def execute_recovery(incident_id: str):
    """Executes the approved recovery actions and restores agent health."""
    try:
        async with async_session_factory() as db:
            incident = await db.get(MetaAgentIncident, uuid.UUID(incident_id))
            if not incident or incident.status != "approved":
                return
                
            incident.status = "recovering"
            await db.commit()
            
            await ws_manager.broadcast({
                "type": "meta_agent_recovery",
                "step": "started",
                "incident_id": incident_id,
                "agent": incident.affected_agent
            })
            
            # Create action records and simulate execution
            for action_dict in incident.recommended_actions:
                action = MetaAgentRecoveryAction(
                    incident_id=incident.id,
                    action_type=action_dict.get("action_type", "unknown"),
                    description=action_dict.get("description", ""),
                    status="executing"
                )
                db.add(action)
                await db.commit()
                
                await asyncio.sleep(1.5) # Simulate work
                
                action.status = "completed"
                action.execution_result = "Success"
                await db.commit()
                
            # Restore health
            score_result = await db.execute(
                select(MetaAgentHealthScore).where(MetaAgentHealthScore.agent_name == incident.affected_agent)
            )
            health_score = score_result.scalar_one_or_none()
            
            if health_score:
                health_score.health_score = min(100.0, health_score.health_score + 30.0)
                health_score.reliability_score = min(100.0, health_score.reliability_score + 20.0)
                health_score.reasoning_quality = min(100.0, health_score.reasoning_quality + 20.0)
                health_score.workflow_compliance = min(100.0, health_score.workflow_compliance + 20.0)
                health_score.communication_score = min(100.0, health_score.communication_score + 20.0)
                health_score.active_failures = max(0, health_score.active_failures - 1)
                
                if health_score.health_score > 80.0:
                    health_score.status = "healthy"
                elif health_score.health_score > 40.0:
                    health_score.status = "degraded"
                    
                incident.after_health = health_score.health_score
                
            incident.status = "recovered"
            
            # --- Auto-Healing & Resuming Patient Workflow ---
            if incident.affected_agent == "SchedulerAgent" and incident.failure_category in ["performance_failure", "workflow_failure"]:
                from backend.database.models.workflow_execution import WorkflowExecutionModel
                execution_id = None
                
                # Fetch security event to read description and extract execution UUID
                if incident.event_id:
                    event = await db.get(SecurityEvent, incident.event_id)
                    if event and "Execution: " in event.description:
                        try:
                            parts = event.description.split("Execution: ")
                            exec_str = parts[1].split(")")[0].strip()
                            execution_id = uuid.UUID(exec_str)
                        except Exception:
                            pass
                
                if not execution_id:
                    # Fallback: query the latest failed execution record in DB
                    res = await db.execute(
                        select(WorkflowExecutionModel)
                        .where(WorkflowExecutionModel.status == "failed")
                        .order_by(desc(WorkflowExecutionModel.updated_at))
                        .limit(1)
                    )
                    exec_model = res.scalar_one_or_none()
                    if exec_model:
                        execution_id = exec_model.id
                        
                if execution_id:
                    logger.info(f"Meta-Agent recovery: Healing and resuming workflow execution {execution_id}")
                    
                    # Update database model state
                    exec_model = await db.get(WorkflowExecutionModel, execution_id)
                    if exec_model:
                        exec_model.status = "in_progress"
                        exec_model.current_stage = "scheduler"
                        await db.commit()
                        
                    # Update LangGraph state to clear errors and turn off simulation
                    from backend.graph.services.graph_executor import workflow_graph
                    config = {"configurable": {"thread_id": str(execution_id)}}
                    
                    workflow_graph.update_state(config, {
                        "errors": [],
                        "simulate_scheduler_failure": False,
                        "workflow_status": "running"
                    }, as_node="pharma_node")
                    
                    # Run resumed workflow in a background task
                    async def run_resumed():
                        try:
                            final_state = await workflow_graph.ainvoke(None, config=config)
                            logger.info(f"Resumed workflow {execution_id} completed. Errors: {final_state.get('errors')}")
                            
                            async with async_session_factory() as sdb:
                                execution = await sdb.get(WorkflowExecutionModel, execution_id)
                                if execution:
                                    if final_state.get("errors"):
                                        execution.status = "failed"
                                    else:
                                        execution.status = "completed"
                                        execution.current_stage = "completed"
                                        execution.outcome_report = final_state.get("outcome_report", {})
                                    await sdb.commit()
                                    
                                from backend.graph.utils.db_utils import publish_workflow_event
                                await publish_workflow_event(str(execution_id), str(execution.patient_id if execution else ""), execution.status if execution else "completed")
                        except Exception as ex:
                            logger.error(f"Resumed workflow invoke failed: {ex}")
                            async with async_session_factory() as sdb:
                                execution = await sdb.get(WorkflowExecutionModel, execution_id)
                                if execution:
                                    execution.status = "failed"
                                    await sdb.commit()
                                    
                    asyncio.create_task(run_resumed())
            # --- End Auto-Healing ---

            # Update session
            session_result = await db.execute(
                select(MetaAgentSession).where(MetaAgentSession.status == "active").order_by(desc(MetaAgentSession.created_at)).limit(1)
            )
            session = session_result.scalar_one_or_none()
            if session:
                session.recoveries_completed += 1
                
            await db.commit()
            
            await ws_manager.broadcast({
                "type": "meta_agent_recovery",
                "step": "completed",
                "incident_id": incident_id,
                "agent": incident.affected_agent
            })
            
            await ws_manager.broadcast({
                "type": "meta_agent_health_update",
                "agent": incident.affected_agent
            })
            
    except Exception as e:
        logger.error(f"Error executing recovery for incident {incident_id}: {e}")
