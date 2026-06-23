"""
Triage Context Builder
======================
Assembles the complete context string for the LLM prompt.
"""

from typing import Dict, Any, List
from backend.rag.services.retrieval_service import RetrievalService

class TriageContextBuilder:
    """Builds the textual context for the LLM to analyze."""

    @staticmethod
    async def build_context(patient_data: Dict[str, Any]) -> str:
        """Constructs the patient profile and retrieves matching protocols."""
        
        symptoms = patient_data.get("symptoms", [])
        
        # Use centralized RAG Service
        query_context = f"Symptoms: {', '.join(symptoms)}"
        retrieval_res = RetrievalService.retrieve(query_context, "triage")
        retrieved_context = retrieval_res["retrieved_context"]
        
        # Store for downstream
        patient_data["retrieved_context"] = retrieved_context
        patient_data["retrieval_status"] = retrieval_res["status"]
        patient_data["retrieved_documents"] = retrieval_res["retrieved_documents"]
        
        context = [
            "PATIENT DEMOGRAPHICS & PHYSICAL:",
            f"- Age/Gender: {patient_data.get('age')} / {patient_data.get('gender')}",
            f"- Blood Group: {patient_data.get('blood_group', 'Unknown')}",
            f"- Weight/Height: {patient_data.get('weight', 'Unknown')}kg / {patient_data.get('height', 'Unknown')}cm",
            "",
            "HABITS & RISKS:",
            f"- Smoking: {patient_data.get('smoking_status', 'Unknown')}",
            f"- Alcohol: {patient_data.get('alcohol_consumption', 'Unknown')}",
            f"- Risk Factors: {', '.join(patient_data.get('risk_factors', [])) if patient_data.get('risk_factors') else 'None'}",
            "",
            "CURRENT VITALS:",
            f"{patient_data.get('vitals', {})}",
            "",
            "KNOWN DISEASES & MEDICAL HISTORY:",
            f"{', '.join(patient_data.get('diseases', [])) if patient_data.get('diseases') else 'None'}",
            f"History: {', '.join(patient_data.get('history', [])) if patient_data.get('history') else 'None'}",
            "",
            "ALLERGIES & MEDICATIONS:",
            f"- Allergies: {', '.join(patient_data.get('allergies', [])) if patient_data.get('allergies') else 'None'}",
            f"- Medications: {', '.join(patient_data.get('medications', [])) if patient_data.get('medications') else 'None'}",
            "",
            "PRESENTING SYMPTOMS:",
            f"{', '.join(symptoms) if symptoms else 'None'}",
            "",
            "--- RETRIEVED CLINICAL PROTOCOLS ---",
            retrieved_context
        ]
        
        return "\n".join(context)
