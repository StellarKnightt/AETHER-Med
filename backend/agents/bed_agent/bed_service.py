"""
Bed Service
===========
Handles database interactions for the Bed Agent.
"""

from typing import Dict, Any, List
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from backend.database.session.connection import async_session_factory
from backend.database.models.patient import Patient
from backend.database.models.bed import Bed
from backend.database.models.bed_history import BedHistory
from backend.database.models.bed_result import BedResultModel
from backend.api.websocket.handler import ws_manager
from backend.utils.logger import agent_logger

class BedService:
    @staticmethod
    async def get_patient_data(patient_id: str) -> dict:
        try:
            async with async_session_factory() as session:
                patient = await session.get(Patient, patient_id)
                if not patient:
                    return {}
                return {
                    "id": str(patient.id),
                    "name": patient.name,
                    "age": patient.age,
                    "gender": patient.gender,
                    "diseases": patient.diseases or [],
                    "allergies": patient.allergies or [],
                    "risk_factors": patient.risk_factors or [],
                    "triage_priority": patient.triage_level or 3
                }
        except Exception as e:
            agent_logger.error(f"Error fetching patient data for bed agent: {e}")
            return {}

    @staticmethod
    async def get_available_beds() -> List[Dict[str, Any]]:
        try:
            async with async_session_factory() as session:
                result = await session.execute(
                    select(Bed).where(Bed.status == "free").order_by(Bed.bed_number)
                )
                beds = result.scalars().all()
                return [
                    {
                        "id": str(b.id),
                        "bed_number": b.bed_number,
                        "bed_type": b.bed_type,
                        "ward": b.ward
                    }
                    for b in beds
                ]
        except Exception as e:
            agent_logger.error(f"Error fetching available beds: {e}")
            return []

    @staticmethod
    async def save_bed_result(patient_id: str, result_data: dict) -> BedResultModel:
        async with async_session_factory() as session:
            # Check if bed exists
            bed = None
            assigned_bed_id = None
            if result_data.get("assigned_bed_number"):
                res = await session.execute(select(Bed).where(Bed.bed_number == result_data["assigned_bed_number"]))
                bed = res.scalar_one_or_none()
                if bed:
                    assigned_bed_id = bed.id
                    # Mark bed as occupied in DB
                    bed.status = "occupied"
                    import uuid
                    bed.patient_id = uuid.UUID(patient_id) if isinstance(patient_id, str) else patient_id

            db_result = BedResultModel(
                patient_id=patient_id,
                recommended_ward=result_data.get("recommended_ward", "General"),
                bed_type_needed=result_data.get("bed_type_needed", "general"),
                assigned_bed_id=assigned_bed_id,
                assigned_bed_number=result_data.get("assigned_bed_number"),
                reasoning=result_data.get("reasoning", []),
                status="pending"
            )
            session.add(db_result)
            await session.commit()
            await session.refresh(db_result)
            return db_result

    @staticmethod
    async def broadcast_bed_event(patient_id: str, result: dict):
        event = {
            "type": "bed_result",
            "patient_id": patient_id,
            "data": result
        }
        await ws_manager.broadcast(event)

    @staticmethod
    async def trigger_cleaning_workflow(bed_id: str):
        """Simulate the Bed Agent orchestrating the cleaning of a released bed."""
        from backend.database.models.cleaner import CleanerModel
        from backend.database.models.cleaning_task import CleaningTaskModel
        from datetime import datetime, timezone
        import asyncio
        
        async with async_session_factory() as session:
            bed = await session.get(Bed, bed_id)
            if not bed:
                return
                
            await ws_manager.broadcast({
                "type": "bed_cleaning",
                "status": "cleaning_required",
                "bed_id": bed_id,
                "bed_number": bed.bed_number
            })
            
            # Find available cleaner
            result = await session.execute(select(CleanerModel).where(CleanerModel.availability_status == "Available"))
            available_cleaners = result.scalars().all()
            
            if not available_cleaners:
                agent_logger.warning(f"No available cleaners for bed {bed.bed_number}")
                return
                
            # Bed agent reasoning: select cleaner with least assigned tasks or most experience
            cleaner = min(available_cleaners, key=lambda c: len(c.assigned_tasks) if c.assigned_tasks else 0)
            
            cleaner.availability_status = "Cleaning"
            bed.status = "cleaning"
            
            # Create task
            task = CleaningTaskModel(
                cleaner_id=cleaner.id,
                bed_id=bed.id,
                status="in_progress",
                reasoning=f"Selected {cleaner.name} due to availability and lower workload. Bed {bed.bed_number} requires sanitization before reallocation."
            )
            session.add(task)
            
            # Update cleaner's tasks array
            tasks = cleaner.assigned_tasks or []
            tasks.append({"bed_number": bed.bed_number, "status": "in_progress"})
            cleaner.assigned_tasks = tasks
            cleaner.current_location = bed.ward
            
            await session.commit()
            await session.refresh(task)
            
            await ws_manager.broadcast({
                "type": "bed_cleaning",
                "status": "cleaning_started",
                "bed_id": bed_id,
                "bed_number": bed.bed_number,
                "cleaner_id": str(cleaner.id),
                "cleaner_name": cleaner.name,
                "reasoning": task.reasoning
            })
            
        # Simulate cleaning time (e.g., 5 seconds)
        await asyncio.sleep(5)
        
        async with async_session_factory() as session:
            task = await session.get(CleaningTaskModel, task.id)
            cleaner = await session.get(CleanerModel, task.cleaner_id)
            bed = await session.get(Bed, task.bed_id)
            
            if task and cleaner and bed:
                task.status = "completed"
                task.completed_at = datetime.now(timezone.utc)
                
                cleaner.availability_status = "Available"
                cleaner.completed_tasks += 1
                
                tasks = cleaner.assigned_tasks or []
                tasks = [t for t in tasks if t["bed_number"] != bed.bed_number]
                cleaner.assigned_tasks = tasks
                cleaner.current_location = None
                
                bed.status = "free"
                
                await session.commit()
                
                await ws_manager.broadcast({
                    "type": "bed_cleaning",
                    "status": "cleaning_completed",
                    "bed_id": str(bed.id),
                    "bed_number": bed.bed_number,
                    "cleaner_id": str(cleaner.id),
                    "cleaner_name": cleaner.name
                })
