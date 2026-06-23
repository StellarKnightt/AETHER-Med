"""
Pharma Context Builder
======================
Builds the context string for the LLM prompt based on clinical state.
"""

def build_pharma_context(patient_data: dict) -> dict:
    return {
        "patient_info": f"Age: {patient_data.get('age', 'Unknown')}, Gender: {patient_data.get('gender', 'Unknown')}",
        "weight": patient_data.get('weight', 'Unknown'),
        "height": patient_data.get('height', 'Unknown'),
        "smoking": patient_data.get('smoking_status', 'Unknown'),
        "alcohol": patient_data.get('alcohol_consumption', 'Unknown'),
        "risk_factors": ", ".join(patient_data.get('risk_factors', [])) if patient_data.get('risk_factors') else "None",
        "vitals": str(patient_data.get("vitals", {})),
        "diseases": ", ".join(patient_data.get("diseases", [])) if patient_data.get("diseases") else "None",
        "medications": ", ".join(patient_data.get("medications", [])) if patient_data.get("medications") else "None",
        "allergies": ", ".join(patient_data.get("allergies", [])) if patient_data.get("allergies") else "None known",
        "triage_priority": patient_data.get("triage_priority", "Unknown")
    }
