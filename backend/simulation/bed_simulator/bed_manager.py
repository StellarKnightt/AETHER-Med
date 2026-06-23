"""
Bed Manager
===========
Manages the state of hospital beds (General, ICU, Emergency).
"""

from typing import Dict, Any, List, Optional
from backend.simulation.bed_simulator.cleaning_cycle import CleaningCycle
from backend.utils.logger import get_logger

logger = get_logger("simulation.bed_simulator.manager")

class BedManager:
    """In-memory manager for bed states."""

    def __init__(self, total_general: int = 50, total_icu: int = 10, total_er: int = 20):
        self.beds = {}
        self.cleaning_cycle = CleaningCycle(cleaning_time_seconds=15.0) # Speed up for simulation
        
        # Initialize beds
        self._init_beds("GEN", total_general, "general")
        self._init_beds("ICU", total_icu, "icu")
        self._init_beds("ER", total_er, "emergency")
        
        self.subscribers = []

    def _init_beds(self, prefix: str, count: int, bed_type: str):
        for i in range(1, count + 1):
            bed_number = f"{prefix}-{i:03d}"
            self.beds[bed_number] = {
                "bed_number": bed_number,
                "bed_type": bed_type,
                "status": "free",
                "patient_id": None
            }

    def subscribe(self, callback):
        self.subscribers.append(callback)

    async def _notify(self, bed_number: str):
        update = self.beds[bed_number]
        for callback in self.subscribers:
            await callback(update)

    async def allocate_bed(self, patient_id: str, bed_type: str) -> Optional[str]:
        """Find a free bed of the requested type and allocate it."""
        for bed_number, bed_info in self.beds.items():
            if bed_info["bed_type"] == bed_type and bed_info["status"] == "free":
                bed_info["status"] = "occupied"
                bed_info["patient_id"] = patient_id
                logger.info(f"Allocated Bed {bed_number} to Patient {patient_id}")
                await self._notify(bed_number)
                return bed_number
        return None

    async def discharge_patient(self, bed_number: str):
        """Discharge a patient and schedule cleaning."""
        if bed_number in self.beds and self.beds[bed_number]["status"] == "occupied":
            self.beds[bed_number]["status"] = "cleaning"
            self.beds[bed_number]["patient_id"] = None
            logger.info(f"Patient discharged from Bed {bed_number}. Bed needs cleaning.")
            await self._notify(bed_number)
            
            # Start cleaning
            await self.cleaning_cycle.schedule_cleaning(bed_number, self._on_cleaning_complete)

    def _on_cleaning_complete(self, bed_number: str):
        """Callback when cleaning is done."""
        if bed_number in self.beds:
            self.beds[bed_number]["status"] = "free"
            # Since this is a regular sync callback from the asyncio task, we need to handle notification.
            # In a real app, we'd use an event loop or queue. For now, we'll log it.
            # Real notification will be picked up by the stream engine or polled.
            logger.info(f"Bed {bed_number} is now free.")

    def get_all_beds(self) -> List[Dict[str, Any]]:
        return list(self.beds.values())
        
    def get_bed_stats(self) -> Dict[str, Dict[str, int]]:
        stats = {}
        for bed_info in self.beds.values():
            b_type = bed_info["bed_type"]
            b_status = bed_info["status"]
            if b_type not in stats:
                stats[b_type] = {"free": 0, "occupied": 0, "cleaning": 0}
            stats[b_type][b_status] += 1
        return stats
