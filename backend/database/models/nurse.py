"""
Nurse Model
===========
Stores Nurse profiles and workloads.
"""

from sqlalchemy import String, Integer, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.models.base import Base


class NurseModel(Base):
    """Persisted nurse profile."""
    __tablename__ = "nurses"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    qualification: Mapped[str] = mapped_column(String(100), nullable=False)
    years_of_experience: Mapped[int] = mapped_column(Integer, nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    availability_status: Mapped[str] = mapped_column(String(50), default="Available")
    shift: Mapped[str] = mapped_column(String(50), nullable=False)
    contact_number: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(100), nullable=False)
    emergency_support_capability: Mapped[bool] = mapped_column(default=False)
    current_workload_score: Mapped[float] = mapped_column(Float, default=0.0)
    assigned_patients: Mapped[list | None] = mapped_column(JSON, nullable=True)

    def __repr__(self) -> str:
        return f"<Nurse(id={self.id}, name={self.name})>"
