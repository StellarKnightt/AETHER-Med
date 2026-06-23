from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from backend.database.models.base import Base
import uuid
from datetime import datetime, timezone

class WorkflowExecutionModel(Base):
    """
    Tracks the end-to-end execution of a multi-agent workflow for a patient.
    Stores the exact payloads passed between agents to prove communication.
    """
    __tablename__ = "workflow_executions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    
    current_stage = Column(String(50), nullable=False, default="triage")
    status = Column(String(50), nullable=False, default="in_progress") # in_progress, completed, failed
    
    # Stores the collective outputs produced by each agent during this workflow run
    agent_outputs = Column(JSON, nullable=False, default=dict)
    
    # Stores the final outcome report
    outcome_report = Column(JSON, nullable=True)
    
    # Array of dicts detailing each transition: {"from": "triage", "to": "pharma", "timestamp": "...", "payload": {...}}
    execution_history = Column(JSON, nullable=False, default=list)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
