"""
Pharma Risk Engine
==================
Evaluates base risk level from hardcoded deterministic rules as a fallback or baseline.
"""

def calculate_baseline_risk(allergies: list, medications: list) -> str:
    # A simple deterministic rule engine
    allergies_lower = [a.lower() for a in allergies]
    meds_lower = [m.lower() for m in medications]
    
    # Check direct allergy conflicts
    for med in meds_lower:
        if med in allergies_lower:
            return "CRITICAL_RISK"
            
    if len(medications) > 5:
        return "HIGH_RISK" # Polypharmacy
        
    return "SAFE"
