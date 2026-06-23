"""
Bed History Model
=================
Tracks events on beds such as cleaning, occupancy, transfers.
"""

import uuid
from sqlalchemy import String, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.models.base import Base

class BedHistory(Base):
    """Event log for a specific bed."""
    __tablename__ = "bed_history"

    bed_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("beds.id", ondelete="CASCADE"), nullable=False)
    patient_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("patients.id", ondelete="SET NULL"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(50), nullable=False) # e.g. "allocated", "released", "cleaning_started", "cleaning_completed"
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    
    # Relationships
    bed = relationship("Bed", back_populates="history")
    patient = relationship("Patient") # simple unidirectional for reference

    def __repr__(self) -> str:
        return f"<BedHistory(bed_id={self.bed_id}, event='{self.event_type}')>"
