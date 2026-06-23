"""
Agent Registry
==============
Centralized registry for all AETHER-Med agents.
"""

from typing import Dict, Any, Type, List, Optional
from backend.agents.base.base_agent import BaseAgent
from backend.utils.logger import app_logger

class AgentRegistry:
    """Singleton registry to track available agents and their capabilities."""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(AgentRegistry, cls).__new__(cls)
            cls._instance.agents: Dict[str, BaseAgent] = {}
        return cls._instance

    def register(self, agent: BaseAgent):
        """Register an agent instance."""
        self.agents[agent.name] = agent
        app_logger.info(f"Registered agent: {agent.name} [{agent.role}]")

    def get_agent(self, name: str) -> Optional[BaseAgent]:
        """Retrieve an agent by name."""
        return self.agents.get(name)

    def list_agents(self) -> List[Dict[str, str]]:
        """List all registered agents."""
        return [
            {"name": name, "role": agent.role}
            for name, agent in self.agents.items()
        ]

agent_registry = AgentRegistry()
