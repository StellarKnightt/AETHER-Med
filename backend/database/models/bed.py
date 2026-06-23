"""
Bed Model
==========
Hospital bed tracking for the simulation layer.
"""

import uuid
from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.models.base import Base


class Bed(Base):
    """Hospital bed record."""

    __tablename__ = "beds"

    bed_number: Mapped[str] = mapped_column(String(50), nullable=False, unique=True, index=True)
    bed_type: Mapped[str] = mapped_column(String(50), nullable=False) # e.g., 'general', 'icu', 'emergency'
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="free") # free, occupied, cleaning, maintenance
    
    ward: Mapped[str] = mapped_column(String(100), nullable=False, default="General")
    
    # Optional patient currently occupying the bed
    patient_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("patients.id", ondelete="SET NULL"), nullable=True)
    
    # Relationship to Patient (if occupied)
    patient = relationship("Patient", back_populates="bed", foreign_keys=[patient_id])
    
    # History of this bed
    history = relationship("BedHistory", back_populates="bed", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Bed(id={self.id}, number='{self.bed_number}', type='{self.bed_type}', status='{self.status}')>"
