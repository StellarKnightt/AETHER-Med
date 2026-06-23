"""
Sentinel Simulation API Routes
==============================
Controls the Sentinel Security Simulation Center.
"""
import uuid
import asyncio
import random
from datetime import datetime, timezone
from typing import Dict, Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from backend.database.session import get_db
from backend.database.models.security_simulation import SecuritySimulation, SecurityEvent
from backend.api.routes.scenario_library import SCENARIO_LIBRARY
from backend.api.routes.meta_agent_scenarios import META_AGENT_SCENARIO_LIBRARY
from backend.api.websocket.handler import ws_manager
from backend.utils.logger import get_logger

logger = get_logger("api.sentinel_sim")

router = APIRouter(tags=["Sentinel Simulation"])

# Global dictionary to hold simulation task references so we can stop them
active_simulation_tasks: Dict[str, asyncio.Task] = {}

@router.get("/scenarios")
async def get_scenarios():
    """Return the static scenario library for sentinel."""
    for s in SCENARIO_LIBRARY:
        s["scenario_type"] = "sentinel"
    return SCENARIO_LIBRARY

@router.get("/meta-scenarios")
async def get_meta_scenarios():
    """Return the static scenario library for meta-agent."""
    return META_AGENT_SCENARIO_LIBRARY

@router.get("/simulations")
async def get_simulations(db: AsyncSession = Depends(get_db)):
    """List all simulation runs."""
    result = await db.execute(select(SecuritySimulation).order_by(desc(SecuritySimulation.created_at)))
    return result.scalars().all()

@router.post("/simulations")
async def launch_simulation(config: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    """Create and launch a new simulation."""
    scenario_id = config.get("scenario_id")
    scenario = next((s for s in SCENARIO_LIBRARY if s["id"] == scenario_id), None)
    if not scenario:
        scenario = next((s for s in META_AGENT_SCENARIO_LIBRARY if s["id"] == scenario_id), None)
        
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    sim_type = scenario.get("scenario_type", "sentinel")

    # Create DB record
    sim_id = uuid.uuid4()
    new_sim = SecuritySimulation(
        id=sim_id,
        simulation_type=sim_type,
        failure_category=scenario.get("failure_category"),
        failure_frequency=config.get("failure_frequency", 5),
        scenario_category=scenario["category"],
        scenario_name=scenario["name"],
        severity=config.get("severity", scenario["default_severity"]),
        intensity=config.get("intensity", scenario["default_intensity"]),
        duration_seconds=config.get("duration", 60),
        target_agents=config.get("target_agents", scenario["affected_agents_default"]),
        violation_count=config.get("violation_count", 0), # 0 means generate continuously
        status="running",
        started_at=datetime.now(timezone.utc),
        config=config
    )
    db.add(new_sim)
    await db.commit()
    await db.refresh(new_sim)

    # Launch background task
    task = asyncio.create_task(run_simulation(str(sim_id), config, scenario))
    active_simulation_tasks[str(sim_id)] = task
    
    await ws_manager.broadcast({
        "type": "sentinel_sim_update",
        "action": "started",
        "simulation_id": str(sim_id)
    })

    return new_sim

@router.get("/simulations/{sim_id}")
async def get_simulation(sim_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific simulation."""
    sim = await db.get(SecuritySimulation, uuid.UUID(sim_id))
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")
    return sim

@router.post("/simulations/{sim_id}/stop")
async def stop_simulation(sim_id: str, db: AsyncSession = Depends(get_db)):
    """Stop a running simulation."""
    sim = await db.get(SecuritySimulation, uuid.UUID(sim_id))
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation not found")

    if sim_id in active_simulation_tasks:
        active_simulation_tasks[sim_id].cancel()
        del active_simulation_tasks[sim_id]

    if sim.status == "running":
        sim.status = "stopped"
        sim.completed_at = datetime.now(timezone.utc)
        await db.commit()
        
        await ws_manager.broadcast({
            "type": "sentinel_sim_update",
            "action": "stopped",
            "simulation_id": sim_id
        })

    return sim

@router.get("/simulations/{sim_id}/events")
async def get_simulation_events(sim_id: str, db: AsyncSession = Depends(get_db)):
    """Get all events for a simulation."""
    result = await db.execute(
        select(SecurityEvent)
        .where(SecurityEvent.simulation_id == uuid.UUID(sim_id))
        .order_by(SecurityEvent.created_at)
    )
    return result.scalars().all()

@router.get("/events/recent")
async def get_recent_events(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Get recent events across all simulations."""
    result = await db.execute(
        select(SecurityEvent)
        .order_by(desc(SecurityEvent.created_at))
        .limit(limit)
    )
    return result.scalars().all()

# --- Background Task ---

async def run_simulation(sim_id: str, config: Dict[str, Any], scenario: Dict[str, Any]):
    """Background task to generate events for a simulation."""
    intensity = config.get("intensity", scenario["default_intensity"])
    duration = config.get("duration", 60)
    target_agents = config.get("target_agents", scenario["affected_agents_default"])
    max_violations = config.get("violation_count", 0)
    sim_type = scenario.get("scenario_type", "sentinel")
    
    # For meta-agent scenarios, we use failure_frequency (events per minute)
    if sim_type == "meta_agent":
        freq = config.get("failure_frequency", 5)
        base_delay = 60.0 / freq if freq > 0 else 10.0
    else:
        # Calculate delay based on intensity (1-10). 
        # Intensity 10 = ~1 event per second. Intensity 1 = ~1 event per 10 seconds.
        base_delay = 11 - intensity
    
    start_time = datetime.now(timezone.utc).timestamp()
    violations_generated = 0
    
    logger.info(f"Started Security Simulation {sim_id}: {scenario['name']}")

    try:
        while True:
            current_time = datetime.now(timezone.utc).timestamp()
            if current_time - start_time >= duration:
                break
                
            if max_violations > 0 and violations_generated >= max_violations:
                break
                
            # Random jitter to delay
            delay = base_delay * random.uniform(0.5, 1.5)
            await asyncio.sleep(delay)
            
            # Generate event
            agent = random.choice(target_agents) if target_agents else "UnknownAgent"
            template = random.choice(scenario["event_templates"])
            
            # Simple template replacement
            patient_names = ["John Doe", "Jane Smith", "Alice Johnson", "Bob Brown", "Charlie Davis"]
            desc = template.replace("{patient_name}", random.choice(patient_names))
            
            if sim_type == "meta_agent":
                failure_examples = scenario.get("failure_examples", {})
                agent_example = failure_examples.get(agent, {})
                if agent_example:
                    desc += f" | Normal: '{agent_example.get('normal', '')}' -> Failure: '{agent_example.get('failure', '')}'"

            # We need a new db session for background task
            from backend.database.session import async_session_factory
            async with async_session_factory() as db:
                event = SecurityEvent(
                    simulation_id=uuid.UUID(sim_id),
                    event_type=scenario["name"],
                    category=scenario.get("failure_category", scenario["category"]),
                    severity=config.get("severity", scenario["default_severity"]),
                    affected_agent=agent,
                    target_entity="Patient Record" if "patient" in desc.lower() else "System Resource",
                    description=desc,
                    risk_score=random.uniform(0.5, 1.0) if config.get("severity") in ["high", "critical"] else random.uniform(0.1, 0.5),
                    status="detected"
                )
                db.add(event)
                
                # Update violation count on simulation
                sim = await db.get(SecuritySimulation, uuid.UUID(sim_id))
                if sim:
                    sim.violation_count += 1
                
                await db.commit()
                await db.refresh(event)
                
                # Broadcast event
                event_dict = {
                    "id": str(event.id),
                    "simulation_id": sim_id,
                    "event_type": event.event_type,
                    "category": event.category,
                    "severity": event.severity,
                    "affected_agent": event.affected_agent,
                    "description": event.description,
                    "created_at": event.created_at.isoformat() if event.created_at else datetime.now(timezone.utc).isoformat()
                }
                
                await ws_manager.broadcast({
                    "type": "sentinel_event",
                    "event": event_dict
                })
                
            violations_generated += 1

    except asyncio.CancelledError:
        logger.info(f"Security Simulation {sim_id} was cancelled.")
        return
    except Exception as e:
        logger.error(f"Error in Security Simulation {sim_id}: {e}")
    finally:
        # Mark completed if not already stopped
        from backend.database.session import async_session_factory
        async with async_session_factory() as db:
            sim = await db.get(SecuritySimulation, uuid.UUID(sim_id))
            if sim and sim.status == "running":
                sim.status = "completed"
                sim.completed_at = datetime.now(timezone.utc)
                await db.commit()
                
                await ws_manager.broadcast({
                    "type": "sentinel_sim_update",
                    "action": "completed",
                    "simulation_id": sim_id
                })
        
        if sim_id in active_simulation_tasks:
            del active_simulation_tasks[sim_id]
        
        logger.info(f"Finished Security Simulation {sim_id}")
