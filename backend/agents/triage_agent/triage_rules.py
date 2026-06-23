"""
Triage Rules
============
Deterministic rules for emergency escalation based on symptoms and vitals.
"""

from typing import List, Dict, Any, Tuple
from backend.agents.triage_agent.triage_config import CRITICAL_SYMPTOMS, HIGH_RISK_SYMPTOMS, TriagePriority

class TriageRulesEngine:
    """Evaluates deterministic rules that bypass LLM reasoning for safety."""

    @staticmethod
    def evaluate(symptoms: List[str]) -> Tuple[bool, str, str]:
        """
        Evaluate if any symptoms trigger an automatic high/critical priority.
        Returns: (rule_matched, priority, reasoning)
        """
        symptoms_lower = [s.lower() for s in symptoms]
        
        # Check critical symptoms
        for crit_symp in CRITICAL_SYMPTOMS:
            if any(crit_symp in s for s in symptoms_lower):
                return True, TriagePriority.CRITICAL.value, f"Critical symptom detected: {crit_symp}"
                
        # Check high risk symptoms
        for high_symp in HIGH_RISK_SYMPTOMS:
            if any(high_symp in s for s in symptoms_lower):
                return True, TriagePriority.HIGH.value, f"High-risk symptom detected: {high_symp}"
                
        return False, "", ""
