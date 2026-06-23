"""
Context Manager
===============
Handles retrieval and injection of context (RAG, patient data) into agent runs.
"""

from typing import Dict, Any, List
from backend.agents.base.agent_state import GlobalWorkflowState

class ContextManager:
    """Manages context retrieval and merging for agent execution."""
    
    @staticmethod
    def get_full_context(state: GlobalWorkflowState) -> Dict[str, Any]:
        """Merge patient, hospital, and RAG context into a flat dictionary."""
        context = {
            "patient_id": state.patient.id if state.patient else "unknown",
            "triage_level": state.patient.triage_level if state.patient else 0,
            "vitals": state.patient.vitals if state.patient else {},
            "hospital_stats": state.hospital.model_dump(),
            "retrieved_evidence": []  # Placeholder for RAG
        }
        return context

    @staticmethod
    def inject_rag_evidence(context: Dict[str, Any], evidence: List[str]):
        """Inject retrieved RAG evidence into the context."""
        context["retrieved_evidence"].extend(evidence)
