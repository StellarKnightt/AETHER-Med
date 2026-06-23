"""
Patient API Routes
===================
Basic CRUD placeholder for patient management.
"""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.database.session import get_db
from backend.database.models.patient import Patient
from backend.database.models.vitals import PatientVitals
from backend.database.schemas.patient import (
    PatientCreate,
    PatientResponse,
    PatientUpdate,
)
from backend.utils.logger import get_logger

logger = get_logger("api.patients")
router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("/", response_model=List[PatientResponse])
async def list_patients(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """List all patients with pagination."""
    result = await db.execute(
        select(Patient)
        .options(selectinload(Patient.vitals_history))
        .offset(skip).limit(limit).order_by(Patient.created_at.desc())
    )
    patients = result.scalars().all()
    for p in patients:
        if p.vitals_history:
            latest = p.vitals_history[-1]
            p.vitals = {
                "heart_rate": latest.heart_rate,
                "systolic_bp": latest.systolic_bp,
                "diastolic_bp": latest.diastolic_bp,
                "oxygen_saturation": latest.oxygen_saturation,
                "respiratory_rate": latest.respiratory_rate,
                "temperature": latest.temperature,
            }
        else:
            p.vitals = None
    return patients


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific patient by ID."""
    result = await db.execute(
        select(Patient)
        .options(selectinload(Patient.vitals_history))
        .where(Patient.id == patient_id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    if patient.vitals_history:
        latest = patient.vitals_history[-1]
        patient.vitals = {
            "heart_rate": latest.heart_rate,
            "systolic_bp": latest.systolic_bp,
            "diastolic_bp": latest.diastolic_bp,
            "oxygen_saturation": latest.oxygen_saturation,
            "respiratory_rate": latest.respiratory_rate,
            "temperature": latest.temperature,
        }
    else:
        patient.vitals = None
        
    return patient


@router.post("/", response_model=PatientResponse, status_code=201)
async def create_patient(
    patient_data: PatientCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new patient record."""
    data_dict = patient_data.model_dump()
    vitals_data = data_dict.pop("vitals", None)

    patient = Patient(**data_dict)
    db.add(patient)
    await db.flush()
    
    if vitals_data:
        vitals = PatientVitals(
            patient_id=patient.id,
            heart_rate=vitals_data.get("heart_rate", 80.0),
            systolic_bp=vitals_data.get("systolic_bp", 120.0),
            diastolic_bp=vitals_data.get("diastolic_bp", 80.0),
            oxygen_saturation=vitals_data.get("oxygen_saturation", 98.0),
            respiratory_rate=vitals_data.get("respiratory_rate", 16.0),
            temperature=vitals_data.get("temperature", 37.0)
        )
        db.add(vitals)

    await db.commit()
    await db.refresh(patient)
    patient.vitals = vitals_data
    
    logger.info(f"Created patient: {patient.name} (ID: {patient.id})")
    return patient


@router.patch("/{patient_id}", response_model=PatientResponse)
async def update_patient(
    patient_id: uuid.UUID,
    patient_data: PatientUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing patient record."""
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    update_data = patient_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)

    await db.flush()
    await db.refresh(patient)
    logger.info(f"Updated patient: {patient.id}")
    return patient


@router.delete("/{patient_id}", status_code=204)
async def delete_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete a patient record."""
    result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    await db.delete(patient)
    logger.info(f"Deleted patient: {patient_id}")
