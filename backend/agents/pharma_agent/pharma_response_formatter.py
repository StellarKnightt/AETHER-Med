"""
Pharma Response Formatter
=========================
Parses LLM output into a structured dict.
"""
import json
import re

def parse_pharma_response(raw_text: str) -> dict:
    try:
        # Attempt to extract JSON if it is wrapped in markdown code blocks
        match = re.search(r"```(?:json)?(.*?)```", raw_text, re.DOTALL)
        if match:
            raw_text = match.group(1)
        
        parsed = json.loads(raw_text.strip())
        return parsed
    except json.JSONDecodeError:
        return {
            "risk_level": "MODERATE_RISK",
            "reasoning": ["Failed to parse LLM response. Defaulting to Moderate Risk for manual review."],
            "interactions_detected": [],
            "recommended_actions": ["Escalate Review"],
            "confidence": 0.5
        }
