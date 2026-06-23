"""
Cleaning Cycle Simulator
========================
Manages the process of cleaning beds after a patient is discharged.
"""

import asyncio
from typing import Dict, Any, Callable
from backend.utils.logger import get_logger

logger = get_logger("simulation.bed_simulator.cleaning")

class CleaningCycle:
    """Simulates the time it takes to clean a bed before it becomes available again."""

    def __init__(self, cleaning_time_seconds: float = 30.0):
        self.cleaning_time = cleaning_time_seconds
        self.active_cleanings: Dict[str, asyncio.Task] = {}
        
    async def schedule_cleaning(self, bed_number: str, on_complete: Callable[[str], None]):
        """Schedule a bed for cleaning."""
        
        if bed_number in self.active_cleanings:
            logger.warning(f"Bed {bed_number} is already being cleaned.")
            return

        logger.info(f"Bed {bed_number} is now in 'cleaning' state.")
        
        async def clean():
            await asyncio.sleep(self.cleaning_time)
            logger.info(f"Bed {bed_number} cleaning complete.")
            on_complete(bed_number)
            del self.active_cleanings[bed_number]
            
        task = asyncio.create_task(clean())
        self.active_cleanings[bed_number] = task
