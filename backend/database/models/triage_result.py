"""
Triage Result Model
====================
Stores triage decisions, reasoning, and workflow actions.
"""

from sqlalchemy import String, Float, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.models.base import Base


class TriageResultModel(Base):
    """Persisted triage result with reasoning and workflow state."""

    __tablename__ = "triage_results"

    patient_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    priority: Mapped[str] = mapped_column(String(20), nullable=False)
    severity_score: Mapped[float] = mapped_column(Float, default=0.0)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    reasoning: Mapped[list | None] = mapped_column(JSON, nullable=True)
    diseases: Mapped[list | None] = mapped_column(JSON, nullable=True)
    symptoms: Mapped[list | None] = mapped_column(JSON, nullable=True)
    final_decision: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_actions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # pending | approved | rejected
    status: Mapped[str] = mapped_column(String(20), default="pending")
    workflow_actions: Mapped[list | None] = mapped_column(JSON, nullable=True)

    def __repr__(self) -> str:
        return f"<TriageResult(id={self.id}, patient={self.patient_id}, priority={self.priority}, status={self.status})>"
