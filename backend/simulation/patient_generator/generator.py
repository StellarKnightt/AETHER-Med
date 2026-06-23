"""
Patient Generator
=================
Generates synthetic patients with diseases, symptoms, and vitals.
"""

import random
from typing import Any, Dict, List
from faker import Faker
from backend.simulation.patient_generator.patient_profiles import PATIENT_PROFILES
from backend.simulation.patient_generator.vitals_ranges import VITALS_RANGES
from backend.simulation.patient_generator.disease_catalog import (
    assign_diseases,
    apply_disease_vitals_impact,
    DISEASE_CATALOG,
)
from backend.utils.logger import get_logger

logger = get_logger("simulation.patient_generator")
fake = Faker()

class PatientGenerator:
    """Generates synthetic patients with realistic diseases and symptoms."""

    def generate_patient(self, profile_type: str = None) -> Dict[str, Any]:
        """Generate a single random patient dict (not yet saved to DB)."""
        
        if not profile_type:
            profiles = list(PATIENT_PROFILES.keys())
            weights = [PATIENT_PROFILES[p]["probability"] for p in profiles]
            profile_type = random.choices(profiles, weights=weights, k=1)[0]

        profile = PATIENT_PROFILES[profile_type]
        
        # Generate demographics
        gender = random.choice(["M", "F"])
        name = fake.name_male() if gender == "M" else fake.name_female()
            
        age = random.randint(18, 90)
        if random.random() < 0.1:
            age = random.randint(1, 17)  # 10% pediatric
            
        triage_level = random.randint(
            profile["triage_level_range"][0], profile["triage_level_range"][1]
        )
        
        # ── Assign diseases and symptoms ──────────────────────────────────
        diseases, symptoms = assign_diseases(triage_level)

        # ── Generate base vitals ──────────────────────────────────────────
        vitals = {}
        range_type = "normal" if triage_level > 2 else "warning"
        if triage_level == 1:
            range_type = "critical"
            
        for vital_key, ranges in VITALS_RANGES.items():
            v_min, v_max = ranges[range_type]
            val = round(random.uniform(v_min, v_max), 1)
            if vital_key == "oxygen_saturation" and val > 100:
                val = 100.0
            vitals[vital_key] = val

        # ── Apply disease-specific vitals modifications ───────────────────
        if diseases:
            vitals = apply_disease_vitals_impact(vitals, diseases)

        # Build display names for diseases
        disease_display = [
            DISEASE_CATALOG[d]["display_name"] for d in diseases if d in DISEASE_CATALOG
        ]

        # Generate random allergies
        ALLERGY_OPTIONS = [
            "Penicillin", "Sulfa drugs", "NSAIDs", "Latex", "Iodine",
            "Aspirin", "Codeine", "Morphine", "Shellfish", "Peanuts", "Dust", "Pollen"
        ]
        allergies = random.sample(ALLERGY_OPTIONS, k=random.randint(0, 3))
        
        # Medical Habits & Details
        blood_groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
        blood_group = random.choice(blood_groups)
        
        # Base height/weight on gender/age roughly
        height = round(random.uniform(150.0, 195.0), 1) if age > 16 else round(random.uniform(80.0, 150.0), 1)
        weight = round(random.uniform(50.0, 120.0), 1) if age > 16 else round(random.uniform(10.0, 50.0), 1)
        
        smoking_status = random.choice(["Never Smoked", "Former Smoker", "Current Smoker", "Occasional Smoker"])
        alcohol_consumption = random.choice(["None", "Occasional", "Moderate", "Heavy"])
        
        emergency_contact = f"{fake.first_name()} {name.split()[-1]} ({random.choice(['Spouse', 'Parent', 'Sibling', 'Child'])}) - {fake.phone_number()}"
        previous_hospitalizations = random.randint(0, 3)
        
        # Determine risk factors from diseases
        risk_factors = []
        if "hypertension" in diseases or "diabetes" in diseases or weight > 100:
            risk_factors.append("Cardiovascular Risk")
        if smoking_status == "Current Smoker":
            risk_factors.append("Respiratory Risk")
        if age > 75:
            risk_factors.append("Fall Risk")
            risk_factors.append("Frailty")
        if age < 5:
            risk_factors.append("Pediatric Vulnerability")
            
        patient_data = {
            "name": name,
            "age": age,
            "gender": gender,
            "status": "triage",
            "triage_level": triage_level,
            "diseases": diseases,
            "disease_display": disease_display,
            "symptoms": symptoms,
            "medical_history": {
                "hypertension": "hypertension" in diseases or random.choice([True, False]),
                "diabetes": "diabetes" in diseases or random.choice([True, False]),
            },
            "allergies": allergies,
            "medications": [fake.word(), fake.word()] if random.random() < 0.3 else [],
            "blood_group": blood_group,
            "weight": weight,
            "height": height,
            "smoking_status": smoking_status,
            "alcohol_consumption": alcohol_consumption,
            "emergency_contact": emergency_contact,
            "previous_hospitalizations": previous_hospitalizations,
            "risk_factors": risk_factors,
            "notes": f"Generated as {profile_type} profile with {len(diseases)} condition(s)",
            "initial_vitals": vitals,
        }
        
        logger.debug(
            f"Generated patient: {name} (Triage {triage_level}) "
            f"Diseases: {disease_display}, Symptoms: {symptoms}"
        )
        return patient_data

    def generate_batch(self, count: int = 10) -> List[Dict[str, Any]]:
        """Generate a batch of random patients."""
        patients = [self.generate_patient() for _ in range(count)]
        logger.info(f"Generated {count} synthetic patients")
        return patients
