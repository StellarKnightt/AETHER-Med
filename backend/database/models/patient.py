"""
Patient Model
==============
Placeholder patient model for clinical workflow data.
Will be expanded in future phases with full medical record fields.
"""

from sqlalchemy import String, Integer, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.models.base import Base


class Patient(Base):
    """Patient record in the AETHER-Med system."""

    __tablename__ = "patients"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="registered"
    )
    
    # Phase 2 & 3 fields
    triage_level: Mapped[int | None] = mapped_column(Integer, nullable=True) # 1 (Resuscitation) to 5 (Non-urgent)
    ward: Mapped[str | None] = mapped_column(String(100), nullable=True, default="General")
    medical_history: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    allergies: Mapped[list | None] = mapped_column(JSON, nullable=True)
    medications: Mapped[list | None] = mapped_column(JSON, nullable=True)
    diseases: Mapped[list | None] = mapped_column(JSON, nullable=True)
    symptoms: Mapped[list | None] = mapped_column(JSON, nullable=True)
    
    # Enhanced Medical Information
    blood_group: Mapped[str | None] = mapped_column(String(10), nullable=True)
    weight: Mapped[float | None] = mapped_column(nullable=True)
    height: Mapped[float | None] = mapped_column(nullable=True)
    smoking_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    alcohol_consumption: Mapped[str | None] = mapped_column(String(50), nullable=True)
    emergency_contact: Mapped[str | None] = mapped_column(String(255), nullable=True)
    previous_hospitalizations: Mapped[int | None] = mapped_column(Integer, nullable=True, default=0)
    risk_factors: Mapped[list | None] = mapped_column(JSON, nullable=True)
    
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    vitals_history = relationship("PatientVitals", back_populates="patient", cascade="all, delete-orphan")
    bed = relationship("Bed", back_populates="patient", uselist=False)

    def __repr__(self) -> str:
        return f"<Patient(id={self.id}, name='{self.name}', status='{self.status}')>"
