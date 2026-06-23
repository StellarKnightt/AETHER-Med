"""
Base Agent
==========
Abstract base class for all agents.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional

from backend.agents.logging.agent_logger import AgentLogger
from backend.agents.logging.telemetry import TelemetryTracker
from backend.agents.base.agent_state import GlobalWorkflowState
from backend.agents.base.agent_response import AgentResponse

class BaseAgent(ABC):
    """Abstract base class for all AETHER-Med agents."""
    
    def __init__(self, name: str, role: str):
        self.name = name
        self.role = role
        self.logger = AgentLogger(name, role)
        
    @abstractmethod
    async def process(self, state: GlobalWorkflowState) -> AgentResponse:
        """Core processing logic to be implemented by subclasses."""
        pass

    async def validate_input(self, state: GlobalWorkflowState) -> bool:
        """Validate input state before processing."""
        if state is None:
            return False
        return True

    def __repr__(self) -> str:
        return f"<Agent(name='{self.name}', role='{self.role}')>"
