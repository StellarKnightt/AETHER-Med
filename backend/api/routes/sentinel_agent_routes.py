"""
Sentinel Agent API Routes
=========================
Controls the Sentinel Agent monitoring session, incident management,
and trust scoring.
"""
import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from backend.database.session import get_db, async_session_factory
from backend.database.models.sentinel_models import SentinelIncident, SentinelTrustScore, SentinelSession
from backend.database.models.security_simulation import SecurityEvent
from backend.agents.sentinel_agent.agent import SentinelAgent
from backend.api.websocket.handler import ws_manager
from backend.utils.logger import get_logger

logger = get_logger("api.sentinel_agent")

router = APIRouter(tags=["Sentinel Agent"])

# Global state
active_monitoring_task: asyncio.Task = None
sentinel_agent = SentinelAgent()

@router.get("/status")
async def get_status(db: AsyncSession = Depends(get_db)):
    """Get the current monitoring session status."""
    result = await db.execute(
        select(SentinelSession).order_by(desc(SentinelSession.created_at)).limit(1)
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
        
    return {"status": "stopped", "events_processed": 0, "incidents_detected": 0}

@router.post("/start")
async def start_monitoring(db: AsyncSession = Depends(get_db)):
    """Start the Sentinel Agent monitoring loop."""
    global active_monitoring_task
    
    if active_monitoring_task and not active_monitoring_task.done():
        return {"status": "already running"}
        
    session = SentinelSession(
        status="active",
        started_at=datetime.now(timezone.utc),
        events_processed=0,
        incidents_detected=0
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    active_monitoring_task = asyncio.create_task(monitoring_loop(session.id))
    
    await ws_manager.broadcast({
        "type": "sentinel_monitoring_update",
        "action": "started"
    })
    
    return session

@router.post("/stop")
async def stop_monitoring(db: AsyncSession = Depends(get_db)):
    """Stop the Sentinel Agent monitoring loop."""
    global active_monitoring_task
    
    if active_monitoring_task:
        active_monitoring_task.cancel()
        active_monitoring_task = None
        
    result = await db.execute(
        select(SentinelSession).where(SentinelSession.status == "active").order_by(desc(SentinelSession.created_at)).limit(1)
    )
    session = result.scalar_one_or_none()
    
    if session:
        session.status = "stopped"
        session.stopped_at = datetime.now(timezone.utc)
        await db.commit()
        
    await ws_manager.broadcast({
        "type": "sentinel_monitoring_update",
        "action": "stopped"
    })
    
    return {"status": "stopped"}

@router.get("/incidents")
async def get_incidents(db: AsyncSession = Depends(get_db)):
    """Get all incidents."""
    result = await db.execute(
        select(SentinelIncident).order_by(desc(SentinelIncident.created_at))
    )
    return result.scalars().all()

@router.post("/incidents/{incident_id}/approve")
async def approve_incident(incident_id: str, db: AsyncSession = Depends(get_db)):
    """Approve the recommended response for an incident."""
    incident = await db.get(SentinelIncident, uuid.UUID(incident_id))
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    if incident.status == "pending":
        incident.status = "approved"
        # Simulate execution response
        incident.response_action = f"Successfully executed: {incident.recommendation}"
        await db.commit()
        await db.refresh(incident)
        
        await ws_manager.broadcast({
            "type": "sentinel_incident_update",
            "incident_id": str(incident.id),
            "status": "approved"
        })
        
    return incident

@router.post("/incidents/{incident_id}/reject")
async def reject_incident(incident_id: str, db: AsyncSession = Depends(get_db)):
    """Reject the recommended response for an incident."""
    incident = await db.get(SentinelIncident, uuid.UUID(incident_id))
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
        
    if incident.status == "pending":
        incident.status = "rejected"
        incident.response_action = "Action rejected by human operator"
        await db.commit()
        await db.refresh(incident)
        
        await ws_manager.broadcast({
            "type": "sentinel_incident_update",
            "incident_id": str(incident.id),
            "status": "rejected"
        })
        
    return incident

@router.post("/incidents/approve-all")
async def approve_all_incidents(db: AsyncSession = Depends(get_db)):
    """Approve all pending incidents."""
    result = await db.execute(select(SentinelIncident).where(SentinelIncident.status == "pending"))
    incidents = result.scalars().all()
    
    for inc in incidents:
        inc.status = "approved"
        inc.response_action = f"Successfully executed: {inc.recommendation}"
        
    await db.commit()
    
    await ws_manager.broadcast({
        "type": "sentinel_incident_update",
        "action": "approve_all"
    })
    
    return {"approved_count": len(incidents)}

@router.post("/incidents/reject-all")
async def reject_all_incidents(db: AsyncSession = Depends(get_db)):
    """Reject all pending incidents."""
    result = await db.execute(select(SentinelIncident).where(SentinelIncident.status == "pending"))
    incidents = result.scalars().all()
    
    for inc in incidents:
        inc.status = "rejected"
        inc.response_action = "Action rejected by human operator"
        
    await db.commit()
    
    await ws_manager.broadcast({
        "type": "sentinel_incident_update",
        "action": "reject_all"
    })
    
    return {"rejected_count": len(incidents)}

@router.get("/trust-scores")
async def get_trust_scores(db: AsyncSession = Depends(get_db)):
    """Get trust scores for all monitored agents."""
    result = await db.execute(select(SentinelTrustScore))
    scores = result.scalars().all()
    
    # Initialize default scores if empty
    if not scores:
        agents = ["TriageAgent", "PharmaAgent", "SchedulerAgent", "BedAgent"]
        for agent in agents:
            score = SentinelTrustScore(agent_name=agent)
            db.add(score)
            scores.append(score)
        await db.commit()
        
    return scores

# --- Background Monitoring Loop ---

async def monitoring_loop(session_id: uuid.UUID):
    """Background task that continuously monitors for new security events."""
    logger.info("Sentinel Agent monitoring loop started.")
    last_event_time = datetime.now(timezone.utc)
    
    try:
        while True:
            await asyncio.sleep(3) # Polling interval
            
            async with async_session_factory() as db:
                # Fetch recent events
                result = await db.execute(
                    select(SecurityEvent)
                    .where(SecurityEvent.created_at > last_event_time)
                    .order_by(SecurityEvent.created_at)
                    .limit(10)
                )
                new_events = result.scalars().all()
                
                if not new_events:
                    continue
                    
                # Update last event time
                last_event_time = new_events[-1].created_at
                
                for event in new_events:
                    event_data = {
                        "event_type": event.event_type,
                        "category": event.category,
                        "severity": event.severity,
                        "affected_agent": event.affected_agent,
                        "description": event.description
                    }
                    
                    # 1. Analyze with LLM
                    analysis = await sentinel_agent.analyze_event(event_data)
                    
                    # 2. Create Incident
                    incident = SentinelIncident(
                        event_id=event.id,
                        threat_type=analysis["threat_type"],
                        category=event.category,
                        severity=event.severity,
                        affected_agent=event.affected_agent,
                        reasoning=analysis["reasoning"],
                        recommendation=analysis["recommendation"],
                        confidence=analysis["confidence"],
                        status="pending"
                    )
                    db.add(incident)
                    
                    # 3. Update Trust Score
                    score_result = await db.execute(
                        select(SentinelTrustScore).where(SentinelTrustScore.agent_name == event.affected_agent)
                    )
                    trust_score = score_result.scalar_one_or_none()
                    if not trust_score:
                        trust_score = SentinelTrustScore(agent_name=event.affected_agent)
                        db.add(trust_score)
                        
                    # Decrement scores based on severity
                    penalty = 5.0
                    if event.severity == "critical": penalty = 15.0
                    elif event.severity == "high": penalty = 10.0
                    elif event.severity == "low": penalty = 2.0
                    
                    trust_score.trust_score = max(0.0, trust_score.trust_score - penalty)
                    if event.category == "privacy":
                        trust_score.privacy_score = max(0.0, trust_score.privacy_score - penalty * 1.5)
                    elif event.category == "security":
                        trust_score.security_score = max(0.0, trust_score.security_score - penalty * 1.5)
                    else:
                        trust_score.compliance_score = max(0.0, trust_score.compliance_score - penalty * 1.5)
                        
                    trust_score.incident_count += 1
                    
                    # 4. Update Session stats
                    session = await db.get(SentinelSession, session_id)
                    if session:
                        session.incidents_detected += 1
                        session.events_processed += 1
                        
                    await db.commit()
                    
                    # 5. Broadcast to UI
                    await ws_manager.broadcast({
                        "type": "sentinel_incident",
                        "incident_id": str(incident.id)
                    })
                    await ws_manager.broadcast({
                        "type": "sentinel_trust_update",
                        "agent": trust_score.agent_name
                    })
                
    except asyncio.CancelledError:
        logger.info("Sentinel Agent monitoring loop cancelled.")
    except Exception as e:
        logger.error(f"Error in monitoring loop: {e}")
