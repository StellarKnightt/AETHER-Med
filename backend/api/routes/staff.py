"""
Staff Management API Routes
===========================
Generates and manages medical staff (Doctors and Nurses).
"""
import random
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from faker import Faker

from backend.database.session.connection import get_db
from backend.database.models.doctor import DoctorModel
from backend.database.models.nurse import NurseModel

router = APIRouter(tags=["Staff Management"])
faker = Faker()

# Data Pools
DOCTOR_SPECIALIZATIONS = [
    "Cardiologist", "Neurologist", "Oncologist", "Pulmonologist", 
    "General Physician", "Emergency Medicine", "Orthopedic", 
    "Pediatrician", "Nephrologist"
]

NURSE_QUALIFICATIONS = [
    "Registered Nurse (RN)", "Licensed Practical Nurse (LPN)", 
    "Nurse Practitioner (NP)", "Clinical Nurse Specialist (CNS)", 
    "Certified Nursing Assistant (CNA)"
]

SHIFTS = ["Morning (08:00 - 16:00)", "Evening (16:00 - 00:00)", "Night (00:00 - 08:00)"]
DEPARTMENTS = ["Cardiology", "Neurology", "Emergency (ER)", "ICU", "General Ward", "Pediatrics", "Oncology"]
STATUSES = ["Available", "Busy", "On Leave", "In Surgery"]

@router.post("/staff/doctors/generate")
async def generate_doctor(session: AsyncSession = Depends(get_db)):
    """Generate and persist a realistic doctor profile."""
    gender = random.choice(["Male", "Female"])
    name = f"Dr. {faker.first_name_male()} {faker.last_name()}" if gender == "Male" else f"Dr. {faker.first_name_female()} {faker.last_name()}"
    age = random.randint(30, 65)
    exp = max(1, age - 28)
    spec = random.choice(DOCTOR_SPECIALIZATIONS)
    dept = "Emergency (ER)" if spec == "Emergency Medicine" else random.choice(DEPARTMENTS)
    
    doctor = DoctorModel(
        name=name,
        age=age,
        gender=gender,
        qualification="MD, Board Certified",
        specialization=spec,
        years_of_experience=exp,
        department=dept,
        availability_status=random.choice(STATUSES),
        shift=random.choice(SHIFTS),
        contact_number=faker.phone_number(),
        email=faker.email(),
        emergency_response_capability=random.choice([True, False]) if spec != "Emergency Medicine" else True,
        current_workload_score=round(random.uniform(10.0, 95.0), 1),
        assigned_patients=[]
    )
    session.add(doctor)
    await session.commit()
    await session.refresh(doctor)
    return doctor

@router.get("/staff/doctors")
async def get_doctors(session: AsyncSession = Depends(get_db)):
    """Get all doctor profiles."""
    query = select(DoctorModel).order_by(DoctorModel.created_at.desc())
    res = await session.execute(query)
    return res.scalars().all()

@router.post("/staff/nurses/generate")
async def generate_nurse(session: AsyncSession = Depends(get_db)):
    """Generate and persist a realistic nurse profile."""
    gender = random.choice(["Male", "Female", "Female", "Female"]) # Slight female weighting for realism
    name = f"{faker.first_name_male()} {faker.last_name()}" if gender == "Male" else f"{faker.first_name_female()} {faker.last_name()}"
    age = random.randint(22, 60)
    exp = max(1, age - 21)
    
    nurse = NurseModel(
        name=name,
        age=age,
        gender=gender,
        qualification=random.choice(NURSE_QUALIFICATIONS),
        years_of_experience=exp,
        department=random.choice(DEPARTMENTS),
        availability_status=random.choice(STATUSES),
        shift=random.choice(SHIFTS),
        contact_number=faker.phone_number(),
        email=faker.email(),
        emergency_support_capability=random.choice([True, False, True]),
        current_workload_score=round(random.uniform(10.0, 95.0), 1),
        assigned_patients=[]
    )
    session.add(nurse)
    await session.commit()
    await session.refresh(nurse)
    return nurse

@router.get("/staff/nurses")
async def get_nurses(session: AsyncSession = Depends(get_db)):
    """Get all nurse profiles."""
    query = select(NurseModel).order_by(NurseModel.created_at.desc())
    res = await session.execute(query)
    return res.scalars().all()
