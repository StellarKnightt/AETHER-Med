from typing import TypedDict, Dict, Any, List, Optional
import operator
from typing_extensions import Annotated

class WorkflowState(TypedDict):
    """
    LangGraph State for AETHER-Med Workflow.
    """
    # Identifiers
    workflow_id: str
    patient_id: str
    
    # Context Data
    patient_data: Dict[str, Any]
    
    # Outputs from agents
    triage_output: Dict[str, Any]
    pharma_output: Dict[str, Any]
    scheduler_output: Dict[str, Any]
    bed_output: Dict[str, Any]
    
    # State tracking
    current_node: str
    workflow_status: str # started, triage_pending, awaiting_approval, running, completed, rejected, failed
    approval_status: str # pending, approved, rejected
    routing_decision: Dict[str, Any] # selected_route, reason, next_node
    outcome_report: Dict[str, Any]
    
    # Logging and Events
    errors: List[str]
    execution_history: Annotated[List[Dict[str, Any]], operator.add]
    
    # Future support
    sentinel_events: Annotated[List[Dict[str, Any]], operator.add]
    meta_events: Annotated[List[Dict[str, Any]], operator.add]
    simulate_scheduler_failure: Optional[bool]

