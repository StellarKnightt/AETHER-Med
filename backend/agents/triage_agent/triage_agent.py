"""
Triage Agent
============
Production-grade Triage Agent for AETHER-Med.
"""

from typing import Dict, Any, Optional
from backend.agents.base.cloud_agent import CloudAgent
from backend.agents.base.agent_state import GlobalWorkflowState
from backend.agents.base.agent_response import AgentResponse
from backend.agents.shared.enums import AgentRole
from backend.agents.triage_agent.triage_workflow import TriageWorkflow
from backend.agents.triage_agent.triage_response_formatter import TriageResponseFormatter

class TriageAgent(CloudAgent):
    """
    Intelligent Triage Agent.
    Analyzes patient vitals and symptoms to determine clinical priority.
    """

    def __init__(self, **kwargs):
        super().__init__(
            name="TriageAgent",
            role=AgentRole.TRIAGE,
            **kwargs
        )
        self.workflow = TriageWorkflow(self)

    async def process(self, state: GlobalWorkflowState) -> AgentResponse:
        """
        Processes triage based on current state.
        Called by LangGraph or API.
        """
        if not state.patient:
            raise ValueError("No patient data provided in state for triage.")

        # Convert state to dictionary for internal workflow
        input_data = {
            "patient_id": str(state.patient.id),
            "age": state.patient.age or 45,
            "gender": state.patient.gender or "Unknown",
            "vitals": state.patient.vitals,
            "symptoms": state.patient.symptoms or [],
            "history": state.patient.history or [],
            "diseases": state.patient.diseases or [],
            "allergies": state.patient.allergies or [],
            "medications": state.patient.medications or [],
            "blood_group": getattr(state.patient, "blood_group", None),
            "weight": getattr(state.patient, "weight", None),
            "height": getattr(state.patient, "height", None),
            "smoking_status": getattr(state.patient, "smoking_status", None),
            "alcohol_consumption": getattr(state.patient, "alcohol_consumption", None),
            "risk_factors": getattr(state.patient, "risk_factors", [])
        }

        # Execute internal workflow
        result = await self.workflow.execute(input_data)

        # Format and return standardized response
        formatted_data = TriageResponseFormatter.format(
            agent_name=self.name,
            priority=result["priority"],
            severity_score=result["severity_score"],
            confidence=result["confidence"],
            reasoning=result["reasoning"],
            retrieved_context=result["retrieved_context"],
            escalation_required=result["escalation_required"],
            metrics=result["telemetry"]
        )

        return AgentResponse(**formatted_data)

    async def invoke_direct(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Direct invocation helper for API calls."""
        return await self.workflow.execute(input_data)
