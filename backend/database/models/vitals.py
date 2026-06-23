"""
Vitals Model
============
Patient vitals history for the simulation layer.
"""

import uuid
from sqlalchemy import Float, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.models.base import Base


class PatientVitals(Base):
    """Patient vitals record."""

    __tablename__ = "patient_vitals"

    patient_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    
    heart_rate: Mapped[float] = mapped_column(Float, nullable=False)
    systolic_bp: Mapped[float] = mapped_column(Float, nullable=False)
    diastolic_bp: Mapped[float] = mapped_column(Float, nullable=False)
    oxygen_saturation: Mapped[float] = mapped_column(Float, nullable=False) # SpO2
    respiratory_rate: Mapped[float] = mapped_column(Float, nullable=False)
    temperature: Mapped[float] = mapped_column(Float, nullable=False)

    # Relationship to Patient
    patient = relationship("Patient", back_populates="vitals_history")

    def __repr__(self) -> str:
        return f"<PatientVitals(id={self.id}, patient_id='{self.patient_id}', hr={self.heart_rate}, spo2={self.oxygen_saturation})>"
