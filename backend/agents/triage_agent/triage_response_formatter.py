"""
Triage Response Formatter
=========================
Ensures the final output matches the requested standardized schema.
"""

from datetime import datetime
from typing import Dict, Any, List
from backend.agents.base.agent_response import AgentResponse

class TriageResponseFormatter:
    """Formats the internal triage data into the final AgentResponse."""

    @staticmethod
    def format(
        agent_name: str,
        priority: str,
        severity_score: float,
        confidence: float,
        reasoning: List[str],
        retrieved_context: List[str],
        escalation_required: bool,
        metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Creates a standardized dictionary for the triage response."""
        return {
            "agent_name": agent_name,
            "priority": priority,
            "severity_score": severity_score,
            "confidence": confidence,
            "reasoning": reasoning,
            "retrieved_context": retrieved_context,
            "escalation_required": escalation_required,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": {
                "telemetry": metrics,
                "version": "1.0.0"
            }
        }
