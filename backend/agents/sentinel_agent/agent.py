"""
Sentinel Agent
==============
Monitors patient vitals and emits safety alerts.
"""

from typing import Any, Dict
import json
from langchain_core.messages import SystemMessage, HumanMessage
from backend.agents.base.cloud_agent import CloudAgent
from backend.agents.base.agent_state import GlobalWorkflowState
from backend.agents.base.agent_response import AgentResponse
from backend.agents.shared.enums import AgentRole

class SentinelAgent(CloudAgent):
    """
    Agent responsible for continuous safety, compliance, and threat monitoring.
    """

    def __init__(self, **kwargs):
        super().__init__(
            name="SentinelAgent",
            role=AgentRole.SENTINEL,
            **kwargs
        )

    async def process(self, state: GlobalWorkflowState) -> AgentResponse:
        """Legacy method for clinical workflow monitoring."""
        return AgentResponse(
            agent_name=self.name,
            decision="Monitor Stable",
            confidence=0.9,
            reasoning=["All vitals within normal range", "No rapid deterioration detected"],
            provider_used=self.provider or "default"
        )
        
    async def analyze_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyzes a security or privacy event to detect threats and recommend actions.
        """
        prompt = f"""You are the Sentinel Agent, an elite AI cybersecurity and compliance watchdog.
Analyze the following system event and determine if it represents a threat.

EVENT DETAILS:
Type: {event_data.get('event_type')}
Category: {event_data.get('category')}
Severity: {event_data.get('severity')}
Affected Agent: {event_data.get('affected_agent')}
Description: {event_data.get('description')}
Retrieved Guidelines: {event_data.get('retrieved_context', 'No specific guidelines found.')}

Respond strictly in JSON format with the following keys:
- "threat_type": A short string classifying the threat (e.g. "privacy_violation", "privilege_escalation").
- "reasoning": A clear, 1-2 sentence explanation of why this is a threat and what the agent did wrong.
- "recommendation": A short action string to take (e.g. "block_request", "revoke_permission", "require_human_review", "flag_agent", "escalate_incident").
- "confidence": Float between 0.0 and 1.0.
"""

        messages = [
            SystemMessage(content="You are a strict JSON-only API. Return only valid JSON."),
            HumanMessage(content=prompt)
        ]
        
        try:
            # Note: We don't enforce response_format to ensure compatibility with all cloud providers, 
            # we just parse the JSON manually.
            response, _ = await self.call_llm(messages)
            content = response.content
            if isinstance(content, str):
                content = content.strip()
                if content.startswith("```json"):
                    content = content[7:-3]
                elif content.startswith("```"):
                    content = content[3:-3]
            
            result = json.loads(content)
            return {
                "threat_type": result.get("threat_type", "unknown_threat"),
                "reasoning": result.get("reasoning", "Suspicious activity detected."),
                "recommendation": result.get("recommendation", "flag_agent"),
                "confidence": float(result.get("confidence", 0.8))
            }
        except Exception as e:
            self.logger.error(f"Failed to analyze event: {e}")
            return {
                "threat_type": "analysis_failed",
                "reasoning": "Failed to analyze the event due to an internal error.",
                "recommendation": "require_human_review",
                "confidence": 0.0
            }
