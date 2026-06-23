"""
Anomaly Injector
================
Injects sudden catastrophic events into patient vitals.
"""

import random
from typing import Dict, Any
from backend.simulation.patient_generator.emergency_cases import EMERGENCY_CASES

class AnomalyInjector:
    """Randomly injects sudden severe emergencies."""

    def __init__(self, probability: float = 0.005):
        self.probability = probability

    def check_and_inject(self, patient: Dict[str, Any], vitals: Dict[str, float]) -> Dict[str, float]:
        """Check if an anomaly should occur and inject it."""
        
        if random.random() < self.probability:
            # Pick a random emergency case
            case = random.choice(EMERGENCY_CASES)
            
            new_vitals = vitals.copy()
            for key, (v_min, v_max) in case["vitals_override"].items():
                new_vitals[key] = round(random.uniform(v_min, v_max), 1)
                
            return new_vitals
            
        return vitals
