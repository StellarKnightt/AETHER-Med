"""
Triage Classifier
=================
Combines scoring and rules to determine base priority category.
"""

from typing import Dict, Any, List, Tuple
from backend.agents.triage_agent.triage_config import TriagePriority
from backend.agents.triage_agent.triage_rules import TriageRulesEngine
from backend.agents.triage_agent.triage_scoring import TriageScorer

class TriageClassifier:
    """Classifies patient urgency into categories."""

    @staticmethod
    def classify(vitals: Dict[str, Any], symptoms: List[str], age: int) -> Tuple[str, float, List[str]]:
        """
        Classify urgency.
        Returns: (priority, severity_score, reasoning)
        """
        reasoning = []
        severity_score = TriageScorer.calculate_severity(vitals, age)
        
        # 1. Check Hard Rules first
        rule_matched, rule_priority, rule_reason = TriageRulesEngine.evaluate(symptoms)
        if rule_matched:
            reasoning.append(rule_reason)
            # We still keep the severity score from vitals, but priority is forced by the rule
            return rule_priority, severity_score, reasoning
            
        # 2. Score-based Classification
        if severity_score >= 0.75:
            priority = TriagePriority.CRITICAL.value
            reasoning.append(f"Severity score {severity_score} >= 0.75 indicates critical deviation in vitals.")
        elif severity_score >= 0.5:
            priority = TriagePriority.HIGH.value
            reasoning.append(f"Severity score {severity_score} >= 0.5 indicates significant deviation in vitals.")
        elif severity_score >= 0.25:
            priority = TriagePriority.MODERATE.value
            reasoning.append(f"Severity score {severity_score} indicates moderate symptoms.")
        else:
            priority = TriagePriority.LOW.value
            reasoning.append("Vitals are stable and no critical symptoms reported.")
            
        return priority, severity_score, reasoning
