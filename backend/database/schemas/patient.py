"""
Patient Pydantic Schemas
=========================
Request/response schemas for the Patient API.
"""

import uuid
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class PatientCreate(BaseModel):
    """Schema for creating a new patient."""
    name: str = Field(..., min_length=1, max_length=255, examples=["John Doe"])
    age: int = Field(..., ge=0, le=150, examples=[45])
    gender: str = Field(..., max_length=20, examples=["male"])
    status: str = Field(default="registered", max_length=50)
    triage_level: int | None = Field(default=None, ge=1, le=5)
    ward: str | None = Field(default="General", max_length=100)
    medical_history: dict | None = Field(default=None)
    allergies: list | None = Field(default=None)
    medications: list | None = Field(default=None)
    diseases: list | None = Field(default=None)
    symptoms: list | None = Field(default=None)
    blood_group: str | None = Field(default=None, max_length=10)
    weight: float | None = Field(default=None)
    height: float | None = Field(default=None)
    smoking_status: str | None = Field(default=None, max_length=50)
    alcohol_consumption: str | None = Field(default=None, max_length=50)
    emergency_contact: str | None = Field(default=None, max_length=255)
    previous_hospitalizations: int | None = Field(default=0)
    risk_factors: list | None = Field(default=None)
    notes: str | None = Field(default=None, examples=["Initial intake"])
    vitals: dict | None = Field(default=None)


class PatientUpdate(BaseModel):
    """Schema for updating a patient."""
    name: str | None = None
    age: int | None = Field(default=None, ge=0, le=150)
    gender: str | None = None
    status: str | None = None
    triage_level: int | None = Field(default=None, ge=1, le=5)
    ward: str | None = None
    medical_history: dict | None = None
    allergies: list | None = None
    medications: list | None = None
    diseases: list | None = None
    symptoms: list | None = None
    blood_group: str | None = None
    weight: float | None = None
    height: float | None = None
    smoking_status: str | None = None
    alcohol_consumption: str | None = None
    emergency_contact: str | None = None
    previous_hospitalizations: int | None = None
    risk_factors: list | None = None
    notes: str | None = None
    vitals: dict | None = None


class PatientResponse(BaseModel):
    """Schema for patient API responses."""
    id: uuid.UUID
    name: str
    age: int
    gender: str
    status: str
    triage_level: int | None
    ward: str | None
    medical_history: dict | None
    allergies: list | None
    medications: list | None
    diseases: list | None
    symptoms: list | None
    blood_group: str | None
    weight: float | None
    height: float | None
    smoking_status: str | None
    alcohol_consumption: str | None
    emergency_contact: str | None
    previous_hospitalizations: int | None
    risk_factors: list | None
    notes: str | None
    vitals: dict | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
