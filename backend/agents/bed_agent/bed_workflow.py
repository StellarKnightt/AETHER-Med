"""
Bed Workflow
============
Executes the LLM analysis for bed allocation.
"""
import json
from langchain_core.messages import SystemMessage, HumanMessage
from backend.agents.bed_agent.bed_prompts import BED_AGENT_SYSTEM_PROMPT, BED_ANALYSIS_PROMPT
from backend.agents.bed_agent.bed_context_builder import BedContextBuilder
from backend.utils.logger import agent_logger
from backend.agents.execution.retry_handler import with_retry

async def run_bed_workflow(llm, patient_data: dict, available_beds: list) -> dict:
    """Run the Bed Agent LLM to determine bed allocation."""
    agent_logger.info(f"Running Bed Agent workflow for {patient_data.get('name')}")
    
    context = BedContextBuilder.build_context(patient_data, available_beds)
    
    prompt = BED_ANALYSIS_PROMPT.format(**context)
    
    messages = [
        SystemMessage(content=BED_AGENT_SYSTEM_PROMPT),
        HumanMessage(content=prompt)
    ]
    
    try:
        # LLM MUST output JSON schema as dictated in the prompt
        response = await with_retry(llm.ainvoke, messages)
        content = response.content
        
        # Clean up code blocks if present
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
            
        result = json.loads(content)
        
        # Validate required fields
        for field in ["recommended_ward", "bed_type_needed", "reasoning"]:
            if field not in result:
                result[field] = "Unknown" if field != "reasoning" else ["Error: LLM missing field"]
                
        return result
        
    except Exception as e:
        agent_logger.error(f"Bed Agent LLM Error: {str(e)}")
        # Fallback heuristic
        priority = patient_data.get("triage_priority", "MODERATE")
        bed_type = "icu" if priority in [1, 2, "CRITICAL", "HIGH", "CRITICAL_PRIORITY", "HIGH_PRIORITY"] else "general"
        
        # Find first matching bed
        assigned = None
        for b in available_beds:
            if b["bed_type"] == bed_type:
                assigned = b
                break
                
        return {
            "recommended_ward": assigned["ward"] if assigned else "Unknown Ward",
            "bed_type_needed": bed_type,
            "assigned_bed_number": assigned["bed_number"] if assigned else None,
            "reasoning": [
                f"LLM failure. Fallback heuristic triggered.",
                f"Priority {priority} maps to {bed_type} bed.",
                f"Assigned {assigned['bed_number'] if assigned else 'None available'}."
            ]
        }
