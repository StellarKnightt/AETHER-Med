from langgraph.graph import StateGraph, START, END
from backend.graph.state.workflow_state import WorkflowState
from backend.graph.nodes.triage_node import triage_node
from backend.graph.nodes.routing_node import routing_node
from backend.graph.nodes.pharma_node import pharma_node
from backend.graph.nodes.scheduler_node import scheduler_node
from backend.graph.nodes.bed_node import bed_node
from backend.graph.nodes.outcome_node import outcome_node
from backend.graph.nodes.sentinel_node import sentinel_node
from backend.graph.nodes.meta_node import meta_node
from backend.graph.checkpoints.workflow_checkpoints import get_checkpointer

def evaluate_routing_decision(state: WorkflowState) -> str:
    """
    Reads the routing_decision made by the routing_node
    and selects the next edge.
    """
    decision = state.get("routing_decision", {})
    next_node = decision.get("next_node", "END")
    return next_node if next_node != "END" else END

def should_route_to_scheduler(state: WorkflowState) -> str:
    if "errors" in state and state["errors"]:
        return END
    return "scheduler_node"

def should_route_to_bed(state: WorkflowState) -> str:
    if "errors" in state and state["errors"]:
        return END
    return "bed_node"

def should_route_to_outcome(state: WorkflowState) -> str:
    if "errors" in state and state["errors"]:
        return END
    return "outcome_node"

def build_hospital_graph():
    """Constructs the compiled LangGraph StateGraph."""
    workflow = StateGraph(WorkflowState)
    
    # Add nodes
    workflow.add_node("triage_node", triage_node)
    workflow.add_node("routing_node", routing_node)
    workflow.add_node("pharma_node", pharma_node)
    workflow.add_node("scheduler_node", scheduler_node)
    workflow.add_node("bed_node", bed_node)
    workflow.add_node("outcome_node", outcome_node)
    workflow.add_node("sentinel_node", sentinel_node)
    workflow.add_node("meta_node", meta_node)
    
    # Edges
    workflow.add_edge(START, "triage_node")
    workflow.add_edge("triage_node", "routing_node")
    
    # Adaptive Routing Edges
    workflow.add_conditional_edges("routing_node", evaluate_routing_decision)
    
    workflow.add_conditional_edges("pharma_node", should_route_to_scheduler)
    workflow.add_conditional_edges("scheduler_node", should_route_to_bed)
    workflow.add_conditional_edges("bed_node", should_route_to_outcome)
    
    workflow.add_edge("outcome_node", END)
    workflow.add_edge("sentinel_node", END)
    workflow.add_edge("meta_node", END)
    
    # Compile with checkpointer and interrupt
    checkpointer = get_checkpointer()
    
    # We pause BEFORE routing_node so human can approve or reject the triage output.
    compiled_graph = workflow.compile(
        checkpointer=checkpointer,
        interrupt_before=["routing_node"]
    )
    
    return compiled_graph
