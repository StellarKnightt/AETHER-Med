"""
Meta-Agent
==========
Supervisory intelligence layer. Monitors agents, detects failures, and orchestrates self-healing.
"""

from typing import Any, Dict
import json
from langchain_core.messages import SystemMessage, HumanMessage
from backend.agents.base.cloud_agent import CloudAgent
from backend.agents.base.agent_state import GlobalWorkflowState
from backend.agents.base.agent_response import AgentResponse
from backend.agents.shared.enums import AgentRole

class MetaAgent(CloudAgent):
    """
    Agent responsible for continuous health monitoring, failure detection, 
    root cause analysis, and self-healing orchestration.
    """

    def __init__(self, **kwargs):
        super().__init__(
            name="MetaAgent",
            role=AgentRole.META_ORCHESTRATOR,
            **kwargs
        )

    async def process(self, state: GlobalWorkflowState) -> AgentResponse:
        """Required by interface, but MetaAgent typically runs asynchronously on events."""
        return AgentResponse(
            agent_name=self.name,
            decision="Monitoring Active",
            confidence=1.0,
            reasoning=["System stable"],
            provider_used=self.provider or "default"
        )
        
    async def analyze_failure(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyzes an ecosystem event/failure and produces a root cause analysis 
        and recovery recommendation.
        """
        prompt = f"""You are the Meta-Agent, the supervisory intelligence layer of the AETHER-Med autonomous healthcare ecosystem.
You are monitoring other AI agents (Triage, Pharma, Scheduler, Bed, Sentinel) for degraded behavior, workflow failures, and confusion states.

Analyze the following failure event detected in the simulation:

EVENT DETAILS:
Type: {event_data.get('event_type')}
Category: {event_data.get('category')}
Severity: {event_data.get('severity')}
Affected Agent: {event_data.get('affected_agent')}
Description: {event_data.get('description')}
Retrieved Guidelines: {event_data.get('retrieved_context', 'No specific guidelines found.')}

Respond strictly in JSON format with the following keys:
- "failure_type": A short string classifying the exact failure (e.g., "decision_failure", "reasoning_failure", "confusion_state").
- "root_cause": A clear, 1-2 sentence human-readable analysis of why the agent failed or misbehaved. Example: "Pharma Agent failed to consider allergy data."
- "recommended_actions": A JSON array of action objects. Each action object must have:
    - "action_type": String (one of: "restore_config", "reprocess_data", "reload_context", "rebuild_state", "rerun_workflow", "reset_session", "require_review", "continue_monitoring")
    - "description": Human readable description of the action.
- "severity_assessment": A string (critical, high, medium, low) indicating the risk to system integrity.
- "confidence": Float between 0.0 and 1.0 indicating your confidence in this diagnosis.
"""

        messages = [
            SystemMessage(content="You are a strict JSON-only API. Return only valid JSON."),
            HumanMessage(content=prompt)
        ]
        
        try:
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
                "failure_type": result.get("failure_type", event_data.get("category", "unknown_failure")),
                "root_cause": result.get("root_cause", "Agent behavior degraded unexpectedly."),
                "recommended_actions": result.get("recommended_actions", [
                    {"action_type": "reset_session", "description": "Reset agent session state"}
                ]),
                "severity_assessment": result.get("severity_assessment", event_data.get("severity", "high")),
                "confidence": float(result.get("confidence", 0.8))
            }
        except Exception as e:
            self.logger.error(f"Meta-Agent failed to analyze failure: {e}")
            return {
                "failure_type": "analysis_failed",
                "root_cause": "The Meta-Agent failed to complete root cause analysis due to an internal error.",
                "recommended_actions": [{"action_type": "require_review", "description": "Require human intervention"}],
                "severity_assessment": "critical",
                "confidence": 0.0
            }
