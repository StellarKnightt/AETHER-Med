"""
Pharma Result Model
====================
Stores pharma safety decisions, reasoning, and workflow actions.
"""

from sqlalchemy import String, Float, Text, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.models.base import Base


class PharmaResultModel(Base):
    """Persisted pharma safety result with reasoning and workflow state."""

    __tablename__ = "pharma_results"

    patient_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False
    )
    risk_level: Mapped[str] = mapped_column(String(20), nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    reasoning: Mapped[list | None] = mapped_column(JSON, nullable=True)
    medications: Mapped[list | None] = mapped_column(JSON, nullable=True)
    allergies: Mapped[list | None] = mapped_column(JSON, nullable=True)
    interactions_detected: Mapped[list | None] = mapped_column(JSON, nullable=True)
    recommended_actions: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # pending | approved | rejected
    status: Mapped[str] = mapped_column(String(20), default="pending")
    workflow_actions: Mapped[list | None] = mapped_column(JSON, nullable=True)

    def __repr__(self) -> str:
        return f"<PharmaResult(id={self.id}, patient={self.patient_id}, risk_level={self.risk_level}, status={self.status})>"
