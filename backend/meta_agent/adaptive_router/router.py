"""
Adaptive Router
================
Routes tasks to appropriate agents based on context and load.

Phase 1: Static routing based on task type.
Phase 2+: Dynamic routing with load balancing and context-aware selection.
"""

from typing import Any, Dict

from backend.utils.logger import get_logger

logger = get_logger("meta_agent.adaptive_router")


# Static routing table — maps task types to agent names
ROUTING_TABLE: Dict[str, str] = {
    "triage": "triage_agent",
    "medication": "pharma_agent",
    "schedule": "scheduler_agent",
    "bed_allocation": "bed_agent",
    "monitoring": "sentinel_agent",
}


class AdaptiveRouter:
    """
    Routes incoming tasks to the most appropriate agent.

    Phase 1: Simple lookup-based routing.
    Phase 2+: Context-aware, load-balanced, LLM-assisted routing.
    """

    def __init__(self):
        self._routing_table = ROUTING_TABLE.copy()
        logger.info("Adaptive router initialized")

    async def route(
        self, task_type: str, context: Dict[str, Any] | None = None
    ) -> str:
        """
        Determine which agent should handle a given task.

        Args:
            task_type: The type of task (e.g., 'triage', 'medication').
            context: Optional context for smarter routing decisions.

        Returns:
            Agent name that should handle the task.
        """
        # TODO: Phase 2 — Dynamic routing logic
        # - Consider agent load/availability
        # - Analyze context for routing hints
        # - Support multi-agent task delegation
        agent = self._routing_table.get(task_type)
        if not agent:
            logger.warning(f"No route found for task type: {task_type}")
            return "triage_agent"  # Default fallback

        logger.info(f"Routed task '{task_type}' to '{agent}'")
        return agent

    def register_route(self, task_type: str, agent_name: str) -> None:
        """Register a new routing rule."""
        self._routing_table[task_type] = agent_name
        logger.info(f"Registered route: {task_type} → {agent_name}")
