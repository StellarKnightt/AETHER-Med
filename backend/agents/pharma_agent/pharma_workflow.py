"""
Pharma Workflow
===============
Orchestrates the steps for the Pharma Agent execution.
"""
from backend.agents.pharma_agent.pharma_context_builder import build_pharma_context
from backend.agents.pharma_agent.pharma_explainer import generate_explanation
from backend.agents.pharma_agent.pharma_rag import pharma_rag
from backend.agents.pharma_agent.pharma_rules import run_fallback_rules
from backend.agents.pharma_agent.pharma_metrics import pharma_metrics
from backend.utils.logger import agent_logger

async def run_pharma_workflow(llm, patient_data: dict) -> dict:
    try:
        medications = patient_data.get("medications", [])
        allergies = patient_data.get("allergies", [])
        
        # 1. RAG Retrieval
        # Retrieve context that was injected at the LangGraph Node layer
        retrieved_context = patient_data.get("retrieved_context", "")
        
        # 2. Build Context
        context = build_pharma_context(patient_data)
        context["rag_guidelines"] = retrieved_context if retrieved_context else "No specific guidelines found."
        
        # 3. LLM Analysis
        if llm:
            result = await generate_explanation(llm, context)
        else:
            agent_logger.warning("No LLM provided. Falling back to deterministic rules.")
            result = run_fallback_rules(patient_data)
            
        # 4. Metrics
        pharma_metrics.record_analysis(
            risk_level=result.get("risk_level", "SAFE"),
            interactions_count=len(result.get("interactions_detected", []))
        )
        
        return result
        
    except Exception as e:
        agent_logger.error(f"Error in Pharma Workflow: {e}")
        return run_fallback_rules(patient_data)
