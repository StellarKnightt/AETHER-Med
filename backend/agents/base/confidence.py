"""
Confidence Scoring
==================
Utilities for calculating agent decision confidence.
"""

from typing import List, Dict, Any

class ConfidenceScorer:
    """Calculates confidence scores based on various medical/logical factors."""
    
    @staticmethod
    def calculate_score(
        factors: Dict[str, float], 
        weights: Dict[str, float]
    ) -> float:
        """
        Calculate a weighted confidence score.
        
        Args:
            factors: Dictionary of factor name -> score (0.0 to 1.0).
            weights: Dictionary of factor name -> weight.
        """
        if not factors:
            return 0.0
            
        total_weight = sum(weights.values())
        if total_weight == 0:
            return 0.0
            
        score = sum(factors[k] * weights[k] for k in factors if k in weights)
        return round(score / total_weight, 2)
