"""
Triage Explainer
================
Helpers to generate explainable rationale for deterministic rule matches and score combinations.
"""

from typing import List, Dict, Any

class TriageExplainer:
    """Generates human-readable explanations for hybrid triage decisions."""

    @staticmethod
    def merge_reasoning(rule_reasoning: List[str], llm_reasoning: List[str]) -> List[str]:
        """Combines deterministic reasoning with LLM reasoning for a complete picture."""
        final_reasoning = []
        if rule_reasoning:
            final_reasoning.append("[DETERMINISTIC RULES APPLIED]")
            final_reasoning.extend(rule_reasoning)
            
        if llm_reasoning:
            final_reasoning.append("[LLM ANALYSIS]")
            final_reasoning.extend(llm_reasoning)
            
        return final_reasoning
