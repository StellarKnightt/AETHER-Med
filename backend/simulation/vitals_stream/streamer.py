"""
Vitals Stream Simulator
========================
Simulates real-time patient vital signs streaming.
Phase 1: Generates random vitals within realistic ranges.
"""

import random
import asyncio
from typing import Any, AsyncGenerator, Dict

from backend.utils.logger import get_logger

logger = get_logger("simulation.vitals_stream")


class VitalsStreamer:
    """
    Simulates a stream of patient vital signs.
    Produces realistic (but random) vitals at configurable intervals.
    """

    # Normal ranges for vital signs
    VITAL_RANGES = {
        "heart_rate": (60, 100),       # bpm
        "blood_pressure_sys": (90, 140),  # mmHg systolic
        "blood_pressure_dia": (60, 90),   # mmHg diastolic
        "temperature": (36.1, 37.8),   # °C
        "spo2": (95, 100),             # %
        "respiratory_rate": (12, 20),  # breaths/min
    }

    async def generate_vitals(self, patient_id: str) -> Dict[str, Any]:
        """Generate a single vitals reading for a patient."""
        vitals = {
            "patient_id": patient_id,
            "heart_rate": random.randint(*self.VITAL_RANGES["heart_rate"]),
            "blood_pressure": f"{random.randint(*self.VITAL_RANGES['blood_pressure_sys'])}/{random.randint(*self.VITAL_RANGES['blood_pressure_dia'])}",
            "temperature": round(random.uniform(*self.VITAL_RANGES["temperature"]), 1),
            "spo2": random.randint(*self.VITAL_RANGES["spo2"]),
            "respiratory_rate": random.randint(*self.VITAL_RANGES["respiratory_rate"]),
        }
        return vitals

    async def stream_vitals(
        self, patient_id: str, interval_seconds: float = 5.0
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Continuously stream vitals for a patient.

        Args:
            patient_id: Patient identifier.
            interval_seconds: Time between readings.

        Yields:
            Vitals reading dictionaries.
        """
        logger.info(f"Starting vitals stream for patient: {patient_id}")
        while True:
            vitals = await self.generate_vitals(patient_id)
            yield vitals
            await asyncio.sleep(interval_seconds)
