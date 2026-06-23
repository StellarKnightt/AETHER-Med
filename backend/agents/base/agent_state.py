"""
Agent State
===========
LangGraph-compatible state models.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime

class HospitalState(BaseModel):
    """Overall state of the hospital simulation."""
    total_patients: int = 0
    icu_occupancy: float = 0.0
    general_occupancy: float = 0.0
    emergency_surge: bool = False
    active_events: List[str] = []

class PatientContext(BaseModel):
    """Context for a specific patient being processed."""
    id: str
    name: str
    triage_level: int
    vitals: Dict[str, Any]
    history: List[str] = []
    current_status: str = "admitted"

class GlobalWorkflowState(BaseModel):
    """Shared state passed between LangGraph nodes."""
    patient: Optional[PatientContext] = None
    hospital: HospitalState = Field(default_factory=HospitalState)
    messages: List[Dict[str, Any]] = []
    agent_outputs: Dict[str, Any] = {}
    routing_metadata: Dict[str, Any] = {}
    errors: List[str] = []
