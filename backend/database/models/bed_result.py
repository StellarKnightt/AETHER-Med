"""
Bed Result Model
=================
Stores the output and reasoning of the Bed Agent for a patient.
"""

import uuid
from sqlalchemy import String, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.models.base import Base

class BedResultModel(Base):
    """Bed Agent analysis and allocation recommendation."""
    __tablename__ = "bed_results"

    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    recommended_ward: Mapped[str] = mapped_column(String(100), nullable=False)
    bed_type_needed: Mapped[str] = mapped_column(String(50), nullable=False)
    
    assigned_bed_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("beds.id", ondelete="SET NULL"), nullable=True)
    assigned_bed_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    
    reasoning: Mapped[list | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending") # pending, approved, rejected
    
    def __repr__(self) -> str:
        return f"<BedResult(patient_id={self.patient_id}, bed={self.assigned_bed_number}, status={self.status})>"
