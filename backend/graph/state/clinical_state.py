"""
Clinical Workflow State
========================
TypedDict defining the state that flows through the LangGraph clinical workflow.
Each node reads from and writes to this shared state.
"""

from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class ClinicalState(TypedDict, total=False):
    """
    Shared state for the clinical workflow graph.

    Fields are populated incrementally as the workflow progresses
    through each agent node.
    """

    # --- Patient Information ---
    patient_id: str
    patient_name: str
    patient_age: int
    symptoms: List[str]

    # --- Triage Results ---
    triage_priority: int  # 1 (critical) to 5 (non-urgent)
    triage_notes: str

    # --- Pharma Results ---
    pharma_recommendations: List[Dict[str, Any]]
    drug_interactions: List[Dict[str, Any]]
    pharma_notes: str
    pharma_risk_level: str
    pharma_actions: List[str]

    # --- Scheduling Results ---
    scheduled_time: str
    schedule_notes: str

    # --- Bed Assignment Results ---
    assigned_ward: str
    bed_number: str
    bed_notes: str

    # --- Sentinel Results ---
    alerts: List[Dict[str, Any]]
    anomalies_detected: bool
    sentinel_notes: str
    workflow_status: str

    # --- Workflow Metadata ---
    messages: List[str]  # Audit trail of workflow messages
    errors: List[str]
    current_step: str
    is_complete: bool
    requires_human_review: bool
