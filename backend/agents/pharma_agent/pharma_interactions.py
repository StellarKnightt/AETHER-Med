"""
Pharma Interactions
===================
Analyzes drug-drug interactions.
"""

def check_interactions(medications: list) -> list:
    # Placeholder for deterministic interaction checks
    # Real checks would use the RAG system or a drug interaction database
    interactions = []
    meds_lower = [m.lower() for m in medications]
    
    if "warfarin" in meds_lower and "aspirin" in meds_lower:
        interactions.append("HIGH RISK: Warfarin + Aspirin increases bleeding risk.")
        
    return interactions
