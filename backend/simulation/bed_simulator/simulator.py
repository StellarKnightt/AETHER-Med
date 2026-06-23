"""
Bed Simulator
==============
Simulates hospital bed availability and ward occupancy.
Phase 1: Static bed pool with random occupancy.
"""

import random
from typing import Any, Dict, List

from backend.utils.logger import get_logger

logger = get_logger("simulation.bed_simulator")


class BedSimulator:
    """
    Simulates hospital bed availability.
    Maintains a virtual bed pool across multiple wards.
    """

    WARDS = {
        "ICU": {"total": 20, "prefix": "I"},
        "Emergency": {"total": 30, "prefix": "E"},
        "General": {"total": 100, "prefix": "G"},
        "Pediatric": {"total": 25, "prefix": "P"},
        "Surgical": {"total": 40, "prefix": "S"},
    }

    def __init__(self):
        self._occupancy: Dict[str, float] = {
            ward: random.uniform(0.4, 0.85) for ward in self.WARDS
        }
        logger.info("Bed simulator initialized")

    def get_availability(self) -> List[Dict[str, Any]]:
        """Get current bed availability across all wards."""
        availability = []
        for ward, config in self.WARDS.items():
            total = config["total"]
            occupied = int(total * self._occupancy[ward])
            available = total - occupied
            availability.append({
                "ward": ward,
                "total_beds": total,
                "occupied": occupied,
                "available": available,
                "occupancy_rate": round(self._occupancy[ward] * 100, 1),
            })
        return availability

    def allocate_bed(self, ward: str) -> Dict[str, Any] | None:
        """
        Attempt to allocate a bed in the specified ward.
        Returns bed info or None if no beds available.
        """
        if ward not in self.WARDS:
            return None

        config = self.WARDS[ward]
        total = config["total"]
        occupied = int(total * self._occupancy[ward])

        if occupied >= total:
            logger.warning(f"No beds available in {ward}")
            return None

        bed_number = f"{config['prefix']}-{random.randint(100, 100 + total)}"
        # Increase occupancy
        self._occupancy[ward] = min(1.0, self._occupancy[ward] + (1 / total))

        logger.info(f"Allocated bed {bed_number} in {ward}")
        return {"ward": ward, "bed_number": bed_number}
