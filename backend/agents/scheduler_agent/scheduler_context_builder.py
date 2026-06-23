"""
Scheduler Context Builder
=========================
Builds context from Triage, Pharma, and Hospital load state for the Scheduler Agent.
"""

import json
from typing import Dict, Any

class SchedulerContextBuilder:
    @staticmethod
    def build_context(patient_data: Dict[str, Any], staff_data: Dict[str, Any]) -> str:
        """Combine patient data, triage info, pharma info, and available staff into a rich LLM context."""
        
        context_parts = [
            "=== PATIENT PROFILE ===",
            f"Patient ID: {patient_data.get('id', 'Unknown')}",
            f"Name: {patient_data.get('name', 'Unknown')}",
            f"Diseases/Conditions: {', '.join(patient_data.get('diseases', []))}",
            f"Symptoms: {', '.join(patient_data.get('symptoms', []))}",
            f"Risk Factors: {', '.join(patient_data.get('risk_factors', []))}",
            f"Allergies: {', '.join(patient_data.get('allergies', []))}",
            f"Triage Level: {patient_data.get('triage_level', 'UNKNOWN')}",
            "",
            "=== PHARMA ALERTS ===",
            f"Pharma Risk Level: {patient_data.get('pharma_risk_level', 'UNKNOWN')}",
            f"Pharma Interactions: {json.dumps(patient_data.get('pharma_interactions', []))}",
            "",
            "=== AVAILABLE STAFF ===",
            json.dumps(staff_data, indent=2),
            "",
            "=== HOSPITAL GUIDELINES (RETRIEVED CONTEXT) ===",
            patient_data.get('retrieved_context', 'No specific guidelines found.')
        ]
        
        return "\n".join(context_parts)
