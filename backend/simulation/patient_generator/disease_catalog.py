"""
Disease Catalog
================
Realistic disease/condition definitions for simulated patients.
Each disease includes symptoms, vitals impact, severity, and escalation risk.
"""

import random
from typing import Dict, Any, List, Tuple

DISEASE_CATALOG: Dict[str, Dict[str, Any]] = {
    "cancer": {
        "display_name": "Cancer (Active Treatment)",
        "symptoms": ["fatigue", "weight loss", "pain", "nausea"],
        "vitals_impact": {"heart_rate": (5, 15), "temperature": (0.3, 1.2)},
        "severity_weight": 0.3,
        "escalation_risk": 0.6,
        "probability": 0.08,
    },
    "asthma": {
        "display_name": "Asthma (Acute Exacerbation)",
        "symptoms": ["shortness of breath", "wheezing", "chest tightness", "coughing"],
        "vitals_impact": {"oxygen_saturation": (-8, -3), "respiratory_rate": (4, 10)},
        "severity_weight": 0.25,
        "escalation_risk": 0.4,
        "probability": 0.12,
    },
    "diabetes": {
        "display_name": "Diabetes Mellitus (Type 2)",
        "symptoms": ["fatigue", "blurred vision", "frequent urination", "excessive thirst"],
        "vitals_impact": {"heart_rate": (0, 8)},
        "severity_weight": 0.15,
        "escalation_risk": 0.2,
        "probability": 0.15,
    },
    "cardiac_disease": {
        "display_name": "Cardiac Disease (CHF/CAD)",
        "symptoms": ["chest pain", "shortness of breath", "palpitations", "dizziness"],
        "vitals_impact": {"heart_rate": (10, 30), "systolic_bp": (15, 40), "oxygen_saturation": (-5, -2)},
        "severity_weight": 0.4,
        "escalation_risk": 0.7,
        "probability": 0.10,
    },
    "pneumonia": {
        "display_name": "Pneumonia (Community-Acquired)",
        "symptoms": ["cough with phlegm", "high fever", "breathing difficulty", "chest pain"],
        "vitals_impact": {"temperature": (1.0, 2.5), "respiratory_rate": (5, 12), "oxygen_saturation": (-10, -4)},
        "severity_weight": 0.35,
        "escalation_risk": 0.55,
        "probability": 0.10,
    },
    "kidney_disease": {
        "display_name": "Chronic Kidney Disease (Stage 3+)",
        "symptoms": ["swelling", "fatigue", "nausea", "decreased urination"],
        "vitals_impact": {"systolic_bp": (10, 30), "heart_rate": (5, 12)},
        "severity_weight": 0.25,
        "escalation_risk": 0.35,
        "probability": 0.08,
    },
    "hypertension": {
        "display_name": "Hypertensive Crisis",
        "symptoms": ["severe headache", "blurred vision", "nosebleed", "confusion"],
        "vitals_impact": {"systolic_bp": (30, 60), "diastolic_bp": (15, 30), "heart_rate": (5, 15)},
        "severity_weight": 0.3,
        "escalation_risk": 0.5,
        "probability": 0.12,
    },
    "stroke_risk": {
        "display_name": "Acute Stroke / TIA",
        "symptoms": ["sudden numbness", "confusion", "trouble speaking", "severe headache", "vision loss"],
        "vitals_impact": {"systolic_bp": (20, 50), "heart_rate": (10, 25)},
        "severity_weight": 0.45,
        "escalation_risk": 0.85,
        "probability": 0.05,
    },
    "sepsis": {
        "display_name": "Sepsis / Septic Shock",
        "symptoms": ["high fever", "rapid breathing", "confusion", "extreme pain", "clammy skin"],
        "vitals_impact": {"temperature": (1.5, 3.0), "heart_rate": (20, 40), "respiratory_rate": (8, 15), "systolic_bp": (-30, -15)},
        "severity_weight": 0.5,
        "escalation_risk": 0.9,
        "probability": 0.05,
    },
    "copd": {
        "display_name": "COPD (Acute Flare)",
        "symptoms": ["chronic cough", "breathing difficulty", "wheezing", "mucus production"],
        "vitals_impact": {"oxygen_saturation": (-10, -5), "respiratory_rate": (5, 10)},
        "severity_weight": 0.3,
        "escalation_risk": 0.45,
        "probability": 0.08,
    },
    "dvt": {
        "display_name": "Deep Vein Thrombosis (DVT)",
        "symptoms": ["leg swelling", "leg pain", "skin warmth", "skin discoloration"],
        "vitals_impact": {"heart_rate": (5, 15)},
        "severity_weight": 0.3,
        "escalation_risk": 0.5,
        "probability": 0.05,
    },
    "liver_failure": {
        "display_name": "Acute Liver Failure",
        "symptoms": ["jaundice", "abdominal pain", "confusion", "nausea", "dark urine"],
        "vitals_impact": {"heart_rate": (10, 20), "systolic_bp": (-20, -10)},
        "severity_weight": 0.4,
        "escalation_risk": 0.7,
        "probability": 0.04,
    },
}


def assign_diseases(triage_level: int) -> Tuple[List[str], List[str]]:
    """
    Assign 0-3 diseases based on triage severity.
    Returns (disease_keys, aggregated_symptoms).
    """
    # Higher triage severity → more diseases
    if triage_level <= 1:
        count = random.choices([1, 2, 3], weights=[0.3, 0.4, 0.3])[0]
    elif triage_level <= 2:
        count = random.choices([1, 2], weights=[0.5, 0.5])[0]
    elif triage_level <= 3:
        count = random.choices([0, 1, 2], weights=[0.3, 0.5, 0.2])[0]
    else:
        count = random.choices([0, 1], weights=[0.6, 0.4])[0]

    all_diseases = list(DISEASE_CATALOG.keys())
    weights = [DISEASE_CATALOG[d]["probability"] for d in all_diseases]

    selected = random.choices(all_diseases, weights=weights, k=count)
    selected = list(set(selected))  # deduplicate

    # Gather symptoms (pick 2-3 random symptoms per disease)
    symptoms = []
    for disease_key in selected:
        disease = DISEASE_CATALOG[disease_key]
        n_symptoms = min(random.randint(2, 3), len(disease["symptoms"]))
        symptoms.extend(random.sample(disease["symptoms"], n_symptoms))

    symptoms = list(set(symptoms))  # deduplicate
    return selected, symptoms


def apply_disease_vitals_impact(
    vitals: Dict[str, float], diseases: List[str]
) -> Dict[str, float]:
    """Apply disease-specific vitals modifications."""
    modified = vitals.copy()
    for disease_key in diseases:
        disease = DISEASE_CATALOG.get(disease_key)
        if not disease:
            continue
        for vital_key, (v_min, v_max) in disease["vitals_impact"].items():
            if vital_key in modified:
                delta = random.uniform(v_min, v_max)
                modified[vital_key] = round(modified[vital_key] + delta, 1)
                # Clamp SpO2
                if vital_key == "oxygen_saturation":
                    modified[vital_key] = max(min(modified[vital_key], 100), 60)
    return modified
