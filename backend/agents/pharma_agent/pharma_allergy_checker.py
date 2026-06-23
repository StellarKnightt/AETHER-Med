"""
Pharma Allergy Checker
======================
Checks medications against known allergies.
"""

def check_allergies(allergies: list, medications: list) -> list:
    conflicts = []
    allergies_lower = [a.lower() for a in allergies]
    
    for med in medications:
        if med.lower() in allergies_lower:
            conflicts.append(f"CRITICAL ALLERGY CONFLICT: {med} is contraindicated due to {med} allergy.")
            
    return conflicts
