"""
Pharma Node
===========
LangGraph node that invokes the Pharma Agent.
"""

from backend.graph.state.clinical_state import ClinicalState
from backend.utils.logger import graph_logger

async def pharma_node(state: ClinicalState) -> dict:
    """
    Pharma node — pharmaceutical analysis.
    Reads: patient_id, triage_priority, symptoms, patient_age
    Writes: pharma_risk_level, pharma_recommendations, drug_interactions, pharma_notes, pharma_actions
    """
    graph_logger.info(f"Pharma node processing patient: {state.get('patient_id')}")

    # We import the agent here to avoid circular imports if any
    from backend.agents.pharma_agent.pharma_agent import PharmaAgent
    agent = PharmaAgent()

    result = await agent.run({
        "patient_id": state.get("patient_id", ""),
        "triage_priority": state.get("triage_priority", 3),
        "age": state.get("patient_age", "Unknown"),
        "symptoms": state.get("symptoms", []),
        # In a real scenario, medications and allergies would come from state or DB.
        # We will retrieve them in the agent.run method via PharmaService
    })

    messages = list(state.get("messages", []))
    messages.append(f"Pharma analysis completed: Risk Level {result.get('risk_level')}")

    return {
        "pharma_risk_level": result.get("risk_level", "SAFE"),
        "pharma_recommendations": result.get("reasoning", []),
        "drug_interactions": result.get("interactions_detected", []),
        "pharma_actions": result.get("recommended_actions", []),
        "pharma_notes": "Pharma analysis done.",
        "current_step": "pharma",
        "messages": messages,
    }
