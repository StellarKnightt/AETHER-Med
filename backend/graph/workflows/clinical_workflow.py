"""
Clinical Workflow — LangGraph StateGraph
==========================================
Defines the main clinical workflow as a LangGraph StateGraph.

Flow: triage → pharma → scheduler → bed → sentinel

Phase 1: Linear pipeline.
Phase 2+: Conditional branching, parallel execution, HITL interrupts.
"""

from langgraph.graph import StateGraph, END

from backend.graph.state.clinical_state import ClinicalState
from backend.graph.nodes import (
    triage_node,
    pharma_node,
    scheduler_node,
    bed_node,
    sentinel_node,
)
from backend.utils.logger import graph_logger


def build_clinical_workflow() -> StateGraph:
    """
    Build and compile the clinical workflow graph.

    Current flow (Phase 1 — linear):
        START → triage → pharma → scheduler → bed → sentinel → END

    Returns:
        Compiled LangGraph StateGraph ready for execution.
    """
    graph_logger.info("Building clinical workflow graph...")

    # Create the state graph
    workflow = StateGraph(ClinicalState)

    # Add nodes
    workflow.add_node("triage", triage_node)
    workflow.add_node("pharma", pharma_node)
    workflow.add_node("scheduler", scheduler_node)
    workflow.add_node("bed", bed_node)
    workflow.add_node("sentinel", sentinel_node)

    # Define edges (linear flow for Phase 1)
    workflow.set_entry_point("triage")
    workflow.add_edge("triage", "pharma")
    
    # Phase 2: Conditional routing after Pharma
    def should_escalate(state: ClinicalState) -> str:
        risk = state.get("pharma_risk_level", "SAFE")
        if risk in ["CRITICAL_RISK", "HIGH_RISK"]:
            return "escalate"
        return "continue"

    workflow.add_conditional_edges(
        "pharma",
        should_escalate,
        {
            "continue": "scheduler",
            "escalate": "sentinel" # Skip scheduler and bed, go to sentinel for immediate monitoring
        }
    )

    workflow.add_edge("scheduler", "bed")

    graph_logger.info("Clinical workflow graph built successfully")

    # Compile the graph
    compiled = workflow.compile()
    graph_logger.info("Clinical workflow graph compiled")

    return compiled


# Module-level compiled workflow instance
clinical_workflow = None


def get_clinical_workflow():
    """Get or create the compiled clinical workflow."""
    global clinical_workflow
    if clinical_workflow is None:
        clinical_workflow = build_clinical_workflow()
    return clinical_workflow
