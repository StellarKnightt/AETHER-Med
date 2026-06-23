"""
Triage Node
===========
LangGraph node for the Triage Agent.
Updates the GlobalWorkflowState with triage results.
"""

from typing import Dict, Any
from backend.agents.base.agent_state import GlobalWorkflowState
from backend.agents.registry.agent_registry import agent_registry
from backend.utils.logger import app_logger

async def triage_node(state: GlobalWorkflowState) -> Dict[str, Any]:
    """
    LangGraph node that invokes the Triage Agent.
    """
    app_logger.info(f"--- ENTERING TRIAGE NODE for patient {state.patient.id if state.patient else 'Unknown'} ---")
    
    # Get TriageAgent from registry
    agent = agent_registry.get_agent("TriageAgent")
    if not agent:
        app_logger.error("TriageAgent not found in registry")
        return {"errors": ["TriageAgent not found in registry"]}
        
    try:
        # Process triage
        response = await agent.process(state)
        
        # Update state with agent output
        agent_outputs = state.agent_outputs.copy()
        agent_outputs["triage"] = response.model_dump()
        
        # Update routing metadata based on priority
        routing_metadata = state.routing_metadata.copy()
        routing_metadata["next_step"] = "routing"
        routing_metadata["priority"] = response.decision # Priority string
        routing_metadata["escalation"] = response.model_dump().get("escalation_required", False)
        
        app_logger.info(f"--- TRIAGE COMPLETE: Priority={response.decision} ---")
        
        return {
            "agent_outputs": agent_outputs,
            "routing_metadata": routing_metadata
        }
        
    except Exception as e:
        app_logger.exception(f"Error in triage_node: {e}")
        errors = state.errors.copy()
        errors.append(f"Triage node failed: {str(e)}")
        return {"errors": errors}
