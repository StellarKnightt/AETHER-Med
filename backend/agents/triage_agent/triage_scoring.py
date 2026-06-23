"""
Triage Scoring
==============
Mathematical calculation of severity score based on physiological parameters.
"""

from typing import Dict, Any
from backend.agents.triage_agent.triage_config import CLINICAL_THRESHOLDS

class TriageScorer:
    """Calculates a normalized severity score (0.0 to 1.0) based on vitals."""

    @staticmethod
    def calculate_severity(vitals: Dict[str, Any], age: int) -> float:
        """Calculate severity score based on deviation from normal vitals."""
        score = 0.0
        max_possible_score = 4.0 # Base max weight
        
        hr = vitals.get("hr")
        if hr:
            if hr < CLINICAL_THRESHOLDS["hr"]["low_critical"] or hr > CLINICAL_THRESHOLDS["hr"]["high_critical"]:
                score += 1.0
            elif hr > CLINICAL_THRESHOLDS["hr"]["high_warning"]:
                score += 0.5
                
        spo2 = vitals.get("spo2")
        if spo2:
            if spo2 < CLINICAL_THRESHOLDS["spo2"]["critical"]:
                score += 1.5 # Heavy weight for low oxygen
            elif spo2 < CLINICAL_THRESHOLDS["spo2"]["warning"]:
                score += 0.5
                
        rr = vitals.get("rr")
        if rr:
            if rr < CLINICAL_THRESHOLDS["rr"]["low_critical"] or rr > CLINICAL_THRESHOLDS["rr"]["high_critical"]:
                score += 1.0
            elif rr > CLINICAL_THRESHOLDS["rr"]["high_warning"]:
                score += 0.5
                
        # Age modifier (elderly patients > 65 or infants < 1 have higher baseline risk)
        if age > 65 or age < 1:
            score += 0.5
            max_possible_score += 0.5
            
        normalized_score = min(score / max_possible_score, 1.0)
        return round(normalized_score, 2)
