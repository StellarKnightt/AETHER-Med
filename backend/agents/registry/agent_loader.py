"""
Agent Loader
============
Initializes and registers all agents in the system.
"""

from backend.agents.registry.agent_registry import agent_registry
from backend.agents.triage_agent.triage_agent import TriageAgent
from backend.agents.pharma_agent.pharma_agent import PharmaAgent
from backend.agents.scheduler_agent.scheduler_agent import SchedulerAgent
from backend.agents.bed_agent.agent import BedAgent
from backend.agents.sentinel_agent.agent import SentinelAgent

def initialize_agents():
    """Create and register instances of all agents."""
    
    from backend.agents.meta_agent.agent import MetaAgent
    
    meta_agent = MetaAgent()
    agents = [
        TriageAgent(),
        PharmaAgent(),
        SchedulerAgent(),
        BedAgent(),
        SentinelAgent(),
        meta_agent
    ]
    
    for agent in agents:
        agent_registry.register(agent)
        
    # Subscribe monitoring agents to workflow execution traces
    from backend.utils.event_bus import event_bus
    
    async def _on_workflow_trace_sentinel(data):
        # Sentinel analyzes the payload for privacy/security anomalies
        if data.get("stage") not in ["started", "completed"]:
            sentinel = agent_registry.get_agent("SentinelAgent")
            if sentinel:
                await sentinel.analyze_event({
                    "event_type": "workflow_execution",
                    "category": "system",
                    "severity": "low",
                    "affected_agent": data.get("stage"),
                    "description": f"Workflow execution at stage {data.get('stage')}"
                })

    async def _on_workflow_trace_meta(data):
        # Meta-Agent monitors for agent failures/errors in output payload
        if data.get("stage") not in ["started", "completed"]:
            output = data.get("output", {})
            if "error" in output or data.get("status") == "failed":
                meta = agent_registry.get_agent("MetaAgent")
                if meta:
                    await meta.analyze_failure({
                        "event_type": "agent_failure",
                        "category": "execution_error",
                        "severity": "high",
                        "affected_agent": data.get("stage"),
                        "description": f"Agent {data.get('stage')} failed during workflow execution."
                    })
                    
    event_bus.subscribe("workflow_execution_trace", _on_workflow_trace_sentinel)
    event_bus.subscribe("workflow_execution_trace", _on_workflow_trace_meta)
        
    return agent_registry
