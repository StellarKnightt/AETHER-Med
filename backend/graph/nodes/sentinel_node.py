"""
Sentinel Node
==============
LangGraph node that invokes the Sentinel Agent.
Final node in the clinical workflow — performs monitoring checks.
"""

from backend.graph.state.clinical_state import ClinicalState
from backend.agents.sentinel_agent import SentinelAgent
from backend.utils.logger import graph_logger

_agent = SentinelAgent()


async def sentinel_node(state: ClinicalState) -> dict:
    """
    Sentinel node — final monitoring and validation.
    Reads: entire state
    Writes: alerts, anomalies_detected, sentinel_notes, workflow_status, is_complete, messages
    """
    graph_logger.info(f"Sentinel node processing patient: {state.get('patient_id')}")

    from backend.rag.services.retrieval_service import RetrievalService
    query_context = f"Priority: {state.get('triage_priority')}, Ward: {state.get('assigned_ward')}"
    retrieval_res = RetrievalService.retrieve(query=query_context, agent_type="sentinel")

    result = await _agent.run({
        "patient_id": state.get("patient_id", ""),
        "triage_priority": state.get("triage_priority", 3),
        "assigned_ward": state.get("assigned_ward", ""),
        "bed_number": state.get("bed_number", ""),
        "retrieved_context": retrieval_res["retrieved_context"]
    })
    
    result["retrieved_documents"] = retrieval_res["retrieved_documents"]
    result["retrieval_status"] = retrieval_res["status"]
    result["retrieved_context"] = retrieval_res["retrieved_context"]

    messages = list(state.get("messages", []))
    messages.append("Sentinel monitoring completed — workflow finished")

    return {
        "alerts": result.get("alerts", []),
        "anomalies_detected": result.get("anomalies_detected", False),
        "sentinel_notes": result.get("sentinel_notes", ""),
        "workflow_status": result.get("workflow_status", "completed"),
        "is_complete": True,
        "current_step": "sentinel",
        "messages": messages,
        "retrieved_context": result.get("retrieved_context", ""),
        "retrieval_status": result.get("retrieval_status", "success"),
        "retrieved_documents": result.get("retrieved_documents", [])
    }
