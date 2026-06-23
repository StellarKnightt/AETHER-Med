"""
Pharma Rules
============
Deterministic fallback rules if LLM fails.
"""
from backend.agents.pharma_agent.pharma_allergy_checker import check_allergies
from backend.agents.pharma_agent.pharma_interactions import check_interactions
from backend.agents.pharma_agent.pharma_risk_engine import calculate_baseline_risk

def run_fallback_rules(patient_data: dict) -> dict:
    allergies = patient_data.get("allergies", [])
    medications = patient_data.get("medications", [])
    
    allergy_conflicts = check_allergies(allergies, medications)
    interaction_conflicts = check_interactions(medications)
    
    all_interactions = allergy_conflicts + interaction_conflicts
    risk_level = calculate_baseline_risk(allergies, medications)
    
    if interaction_conflicts and risk_level not in ["CRITICAL_RISK", "HIGH_RISK"]:
        risk_level = "HIGH_RISK"
        
    reasoning = ["Deterministic rules applied (LLM bypassed)."] + all_interactions
    
    actions = ["Continue Monitoring"]
    if risk_level in ["CRITICAL_RISK", "HIGH_RISK"]:
        actions = ["Alert Doctor", "Escalate Review"]

    return {
        "risk_level": risk_level,
        "reasoning": reasoning,
        "interactions_detected": all_interactions,
        "recommended_actions": actions,
        "confidence": 1.0 # Deterministic
    }
