"""
Meta Node
=========
LangGraph node that invokes the Meta Agent.
"""

from backend.graph.state.clinical_state import ClinicalState
from backend.agents.meta_agent import MetaAgent
from backend.utils.logger import graph_logger

_agent = MetaAgent()

async def meta_node(state: ClinicalState) -> dict:
    graph_logger.info(f"Meta node processing patient: {state.get('patient_id')}")

    from backend.rag.services.retrieval_service import RetrievalService
    query_context = f"Workflow Error: {state.get('errors')}"
    retrieval_res = RetrievalService.retrieve(query=query_context, agent_type="meta")

    # The MetaAgent processes state to check for system health
    result = await _agent.process(state)

    return {
        "current_step": "meta",
        "is_complete": True,
        "retrieved_context": retrieval_res["retrieved_context"],
        "retrieval_status": retrieval_res["status"],
        "retrieved_documents": retrieval_res["retrieved_documents"]
    }
