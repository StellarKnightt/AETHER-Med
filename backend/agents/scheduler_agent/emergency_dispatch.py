"""
Emergency Dispatch
==================
Handles critical escalation and emergency logic.
"""

from typing import Dict, Any

class EmergencyDispatch:
    @staticmethod
    def check_emergency(patient_data: Dict[str, Any]) -> bool:
        """Determine if an emergency dispatch is required."""
        triage = patient_data.get("triage_level", 5)
        pharma_risk = patient_data.get("pharma_risk_level", "SAFE")
        
        if triage <= 2 or pharma_risk in ["HIGH_RISK", "CRITICAL_RISK"]:
            return True
        return False
