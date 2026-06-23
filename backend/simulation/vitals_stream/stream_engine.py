"""
Vitals Stream Engine
====================
Manages the continuous simulation of vitals for all active patients.
"""

import asyncio
from typing import Dict, Any, List
from backend.simulation.vitals_stream.deterioration_engine import DeteriorationEngine
from backend.simulation.vitals_stream.anomaly_injector import AnomalyInjector
from backend.utils.logger import get_logger

logger = get_logger("simulation.vitals_stream.engine")

class VitalsStreamEngine:
    """Manages continuous generation and deterioration of vitals for active patients."""

    def __init__(self):
        self.active_patients: Dict[str, Dict[str, Any]] = {} # patient_id -> {patient_data, current_vitals}
        self.deterioration_engine = DeteriorationEngine()
        self.anomaly_injector = AnomalyInjector()
        self.is_running = False
        self._task = None
        self.subscribers = [] # Callbacks for when vitals tick
        self._tick_count = 0
        self.metrics_broadcast_callback = None  # Set externally after metrics_collector is ready

    def add_patient(self, patient_id: str, patient_data: Dict[str, Any], initial_vitals: Dict[str, float]):
        """Add a patient to the stream engine."""
        self.active_patients[patient_id] = {
            "data": patient_data,
            "vitals": initial_vitals
        }
        logger.info(f"Added patient {patient_id} to vitals stream.")

    def remove_patient(self, patient_id: str):
        """Remove a patient from the stream engine."""
        if patient_id in self.active_patients:
            del self.active_patients[patient_id]
            logger.info(f"Removed patient {patient_id} from vitals stream.")

    def subscribe(self, callback):
        """Subscribe to vitals ticks."""
        self.subscribers.append(callback)

    async def start(self, tick_interval: float = 2.0):
        """Start the stream engine."""
        if self.is_running:
            return
        
        self.is_running = True
        logger.info("Vitals Stream Engine started.")
        
        while self.is_running:
            try:
                await self._tick()
            except Exception as e:
                logger.error(f"Error in stream engine tick: {e}")
            await asyncio.sleep(tick_interval)

    def stop(self):
        """Stop the stream engine."""
        self.is_running = False
        logger.info("Vitals Stream Engine stopped.")

    async def _tick(self):
        """Process one tick of the simulation."""
        
        updates = []
        
        for p_id, p_info in self.active_patients.items():
            patient_data = p_info["data"]
            current_vitals = p_info["vitals"]
            
            # Apply deterioration & natural fluctuation
            new_vitals = self.deterioration_engine.apply_deterioration(patient_data, current_vitals)
            
            # Inject anomalies
            new_vitals = self.anomaly_injector.check_and_inject(patient_data, new_vitals)
            
            # Update state
            p_info["vitals"] = new_vitals
            
            updates.append({
                "patient_id": p_id,
                "vitals": new_vitals
            })
            
        # Notify subscribers
        for update in updates:
            for callback in self.subscribers:
                await callback(update)

        # Broadcast aggregated metrics every 5 ticks
        self._tick_count += 1
        if self._tick_count % 5 == 0 and self.metrics_broadcast_callback:
            try:
                await self.metrics_broadcast_callback()
            except Exception as e:
                logger.error(f"Error broadcasting metrics: {e}")
