"""
Patient Deterioration Engine
============================
Simulates realistic changes in patient vitals over time based on severity.
"""

import random
from typing import Dict, Any

class DeteriorationEngine:
    """Manages gradual changes in patient vitals."""

    def __init__(self):
        pass

    def apply_deterioration(self, patient: Dict[str, Any], vitals: Dict[str, float]) -> Dict[str, float]:
        """Apply random fluctuations and potential deterioration based on triage level."""
        
        triage_level = patient.get("triage_level", 3)
        
        # Base volatility (higher for lower triage numbers, e.g. 1 is highest)
        volatility_map = {1: 0.3, 2: 0.15, 3: 0.05, 4: 0.02, 5: 0.01}
        volatility = volatility_map.get(triage_level, 0.05)
        
        # Deterioration chance (higher for lower triage numbers)
        deterioration_chance_map = {1: 0.1, 2: 0.05, 3: 0.01, 4: 0.001, 5: 0.001}
        deterioration_chance = deterioration_chance_map.get(triage_level, 0.01)
        
        new_vitals = vitals.copy()
        
        # Apply standard random walk (fluctuation)
        for key in ["heart_rate", "systolic_bp", "diastolic_bp", "respiratory_rate"]:
            change = random.uniform(-volatility * 10, volatility * 10)
            new_vitals[key] = round(new_vitals[key] + change, 1)
            
        # SpO2 and Temp fluctuate less
        new_vitals["oxygen_saturation"] = round(new_vitals["oxygen_saturation"] + random.uniform(-volatility * 2, volatility * 2), 1)
        if new_vitals["oxygen_saturation"] > 100:
            new_vitals["oxygen_saturation"] = 100.0
            
        new_vitals["temperature"] = round(new_vitals["temperature"] + random.uniform(-volatility, volatility), 1)
        
        # Apply directional deterioration if triggered
        if random.random() < deterioration_chance:
            # Drop SpO2
            new_vitals["oxygen_saturation"] -= random.uniform(1.0, 3.0)
            # Increase HR
            new_vitals["heart_rate"] += random.uniform(2.0, 10.0)
            # Drop BP
            new_vitals["systolic_bp"] -= random.uniform(2.0, 8.0)
            new_vitals["diastolic_bp"] -= random.uniform(1.0, 5.0)

        # Enforce minimums to avoid impossible values
        new_vitals["heart_rate"] = max(0.0, new_vitals["heart_rate"])
        new_vitals["oxygen_saturation"] = max(0.0, new_vitals["oxygen_saturation"])
        new_vitals["systolic_bp"] = max(0.0, new_vitals["systolic_bp"])
        new_vitals["diastolic_bp"] = max(0.0, new_vitals["diastolic_bp"])
        new_vitals["respiratory_rate"] = max(0.0, new_vitals["respiratory_rate"])

        return new_vitals
