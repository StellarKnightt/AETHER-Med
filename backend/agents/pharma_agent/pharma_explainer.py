"""
Pharma Explainer
================
Uses LangChain and Groq LLM to generate explainable reasoning.
"""
from langchain_core.prompts import ChatPromptTemplate
from backend.agents.pharma_agent.pharma_prompts import PHARMA_SYSTEM_PROMPT, PHARMA_ANALYSIS_PROMPT
from backend.agents.pharma_agent.pharma_response_formatter import parse_pharma_response
from backend.utils.logger import agent_logger
from backend.agents.execution.retry_handler import with_retry

async def generate_explanation(llm, context: dict) -> dict:
    try:
        prompt = ChatPromptTemplate.from_messages([
            ("system", PHARMA_SYSTEM_PROMPT),
            ("user", PHARMA_ANALYSIS_PROMPT)
        ])
        
        chain = prompt | llm
        
        agent_logger.info("Invoking LLM for Pharma explanation...")
        result = await with_retry(chain.ainvoke, context)
        
        parsed = parse_pharma_response(result.content)
        return parsed
    except Exception as e:
        agent_logger.error(f"LLM Error in Pharma Explainer: {e}")
        return {
            "risk_level": "MODERATE_RISK",
            "reasoning": [f"LLM failure during analysis: {str(e)}"],
            "interactions_detected": [],
            "recommended_actions": ["Escalate Review"],
            "confidence": 0.0
        }
