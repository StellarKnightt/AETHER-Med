"""
Triage Workflow
===============
Coordinates the internal steps of triage: validation, retrieval, scoring, and LLM analysis.
"""

import json
from typing import Dict, Any, List
from backend.agents.triage_agent.triage_validator import TriageInput
from backend.agents.triage_agent.triage_classifier import TriageClassifier
from backend.agents.triage_agent.triage_context_builder import TriageContextBuilder
from backend.agents.triage_agent.triage_prompts import get_triage_prompt
from backend.agents.triage_agent.triage_explainer import TriageExplainer
from backend.agents.triage_agent.triage_metrics import triage_metrics
from backend.agents.triage_agent.triage_rag import TriageRAG

class TriageWorkflow:
    """Orchestrates the internal triage processing pipeline."""

    def __init__(self, agent):
        self.agent = agent

    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Executes the triage pipeline.
        1. Validate Input
        2. Rule-based Classification & Scoring
        3. Retrieve RAG Context
        4. LLM Analysis (Reasoning)
        5. Format Response
        """
        # 1. Validate
        validated = TriageInput(**input_data)
        
        # 2. Base Classification (Rules + Scoring)
        priority, severity_score, rule_reasoning = TriageClassifier.classify(
            validated.vitals.model_dump(), 
            validated.symptoms,
            validated.age
        )
        
        # 3. Build Context (including RAG)
        patient_dict = validated.model_dump()
        context_str = await TriageContextBuilder.build_context(patient_dict)
        
        # 4. LLM Call for deeper reasoning
        prompt = get_triage_prompt()
        messages = prompt.format_messages(context=context_str)
        
        # Call LLM through CloudAgent base
        response, metrics = await self.agent.call_llm(messages)
        
        # Parse LLM JSON output
        try:
            # Handle potential markdown formatting from LLM
            content = response.content.strip()
            if content.startswith("```json"):
                content = content.split("```json")[1].split("```")[0].strip()
            elif content.startswith("```"):
                content = content.split("```")[1].split("```")[0].strip()
                
            llm_data = json.loads(content)
            llm_reasoning = llm_data.get("reasoning", [])
            llm_priority = llm_data.get("priority", priority)
            llm_confidence = llm_data.get("confidence", 0.8)
            escalation = llm_data.get("escalation_required", priority in ["HIGH", "CRITICAL"])
        except Exception as e:
            self.agent.logger.error(f"Failed to parse LLM response: {e}")
            llm_reasoning = ["LLM parsing failed. Falling back to rule-based priority."]
            llm_priority = priority
            llm_confidence = 0.5
            escalation = priority in ["HIGH", "CRITICAL"]

        # 5. Merge Reasoning
        final_reasoning = TriageExplainer.merge_reasoning(rule_reasoning, llm_reasoning)
        
        # 6. Record Metrics
        triage_metrics.record_triage(llm_priority, escalation)
        
        # 7. Final Response Data
        return {
            "priority": llm_priority,
            "severity_score": severity_score,
            "confidence": llm_confidence,
            "reasoning": final_reasoning,
            "retrieved_context": patient_dict.get("retrieved_context", ""),
            "retrieval_status": patient_dict.get("retrieval_status", "success"),
            "retrieved_documents": patient_dict.get("retrieved_documents", []),
            "escalation_required": escalation,
            "telemetry": metrics
        }
