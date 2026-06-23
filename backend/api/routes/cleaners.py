"""
Cleaners Management API Routes
==============================
Generates and manages cleaning staff.
"""
import random
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from faker import Faker

from backend.database.session.connection import get_db
from backend.database.models.cleaner import CleanerModel

router = APIRouter(tags=["Cleaners Management"])
faker = Faker()

SHIFTS = ["Morning (08:00 - 16:00)", "Evening (16:00 - 00:00)", "Night (00:00 - 08:00)"]
STATUSES = ["Available", "Assigned", "Cleaning", "Break", "Off Duty"]

@router.post("/cleaners/generate")
async def generate_cleaners(session: AsyncSession = Depends(get_db)):
    """Generate and persist 5 realistic cleaner profiles."""
    new_cleaners = []
    for _ in range(5):
        gender = random.choice(["Male", "Female"])
        name = f"{faker.first_name_male()} {faker.last_name()}" if gender == "Male" else f"{faker.first_name_female()} {faker.last_name()}"
        age = random.randint(20, 60)
        exp = max(0, age - 20)
        
        cleaner = CleanerModel(
            name=name,
            age=age,
            gender=gender,
            years_of_experience=exp,
            shift=random.choice(SHIFTS),
            availability_status=random.choices(STATUSES, weights=[60, 10, 10, 10, 10])[0],
            assigned_tasks=[],
            completed_tasks=random.randint(0, 50),
            current_location=None
        )
        session.add(cleaner)
        new_cleaners.append(cleaner)
        
    await session.commit()
    for cleaner in new_cleaners:
        await session.refresh(cleaner)
        
    return new_cleaners

@router.get("/cleaners")
async def get_cleaners(session: AsyncSession = Depends(get_db)):
    """Get all cleaner profiles."""
    query = select(CleanerModel).order_by(CleanerModel.created_at.desc())
    res = await session.execute(query)
    return res.scalars().all()

@router.get("/cleaners/metrics")
async def get_cleaner_metrics(session: AsyncSession = Depends(get_db)):
    """Get metrics for cleaners."""
    # Count all cleaners
    total_query = select(func.count(CleanerModel.id))
    total = (await session.execute(total_query)).scalar() or 0
    
    # Available
    available_query = select(func.count(CleanerModel.id)).where(CleanerModel.availability_status == "Available")
    available = (await session.execute(available_query)).scalar() or 0
    
    # Active (Assigned or Cleaning)
    active_query = select(func.count(CleanerModel.id)).where(CleanerModel.availability_status.in_(["Assigned", "Cleaning"]))
    active = (await session.execute(active_query)).scalar() or 0
    
    # Completed Tasks (sum)
    completed_query = select(func.sum(CleanerModel.completed_tasks))
    completed = (await session.execute(completed_query)).scalar() or 0
    
    return {
        "total": total,
        "available": available,
        "active": active,
        "completed": int(completed)
    }
