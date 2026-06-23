"""
Bed Context Builder
===================
Constructs the context dictionary for the Bed Agent.
"""

from typing import Dict, Any, List

class BedContextBuilder:
    @staticmethod
    def build_context(patient_data: Dict[str, Any], available_beds: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Build the context for the Bed Agent LLM prompt.
        """
        
        # Format available beds into a readable string for the LLM
        beds_str = "No beds available in the hospital!"
        if available_beds:
            lines = []
            for b in available_beds:
                lines.append(f"- Bed {b['bed_number']} ({b['bed_type']}) in {b['ward']}")
            beds_str = "\n".join(lines)
            
        return {
            "name": patient_data.get("name", "Unknown"),
            "age": patient_data.get("age", 0),
            "gender": patient_data.get("gender", "Unknown"),
            "diseases": ", ".join(patient_data.get("diseases", [])) or "None",
            "allergies": ", ".join(patient_data.get("allergies", [])) or "None",
            "risk_factors": ", ".join(patient_data.get("risk_factors", [])) or "None",
            "triage_priority": patient_data.get("triage_priority", "Not Assessed"),
            "pharma_risk": patient_data.get("pharma_risk", "Not Assessed"),
            "available_beds": beds_str,
            "rag_guidelines": patient_data.get("retrieved_context", "No specific guidelines found.")
        }
