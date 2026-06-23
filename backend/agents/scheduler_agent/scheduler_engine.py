"""
Scheduler Engine
================
Invokes the LLM to make scheduling decisions based on built context.
"""
import json
import time
from typing import Dict, Any

from langchain_core.language_models import BaseChatModel

from backend.agents.scheduler_agent.scheduler_prompts import scheduler_prompt
from backend.agents.scheduler_agent.scheduler_metrics import scheduler_metrics
from backend.agents.scheduler_agent.scheduler_response_formatter import SchedulerResponseFormatter
from backend.utils.logger import agent_logger
from backend.agents.execution.retry_handler import with_retry

class SchedulerEngine:
    @staticmethod
    async def run_llm_analysis(llm: BaseChatModel, context: str) -> Dict[str, Any]:
        """Run the LLM to get scheduling decisions."""
        start_time = time.time()
        try:
            chain = scheduler_prompt | llm
            response = await with_retry(chain.ainvoke, {"context": context})
            
            try:
                # Extract JSON block even if there is preamble text
                content = response.content
                if "```json" in content:
                    content = content.split("```json")[1].split("```")[0].strip()
                elif "```" in content:
                    content = content.split("```")[1].split("```")[0].strip()
                else:
                    # try to find first { and last }
                    start_idx = content.find("{")
                    end_idx = content.rfind("}")
                    if start_idx != -1 and end_idx != -1:
                        content = content[start_idx:end_idx+1]
                
                raw_data = json.loads(content)
            except Exception as e:
                agent_logger.error(f"Failed to parse LLM response as JSON: {response.content} | Error: {e}")
                raw_data = {}

            formatted = SchedulerResponseFormatter.format_response(raw_data)
            
            latency = (time.time() - start_time) * 1000
            scheduler_metrics.record_run(latency, formatted.get("priority_level", "NORMAL_PRIORITY"))
            return formatted

        except Exception as e:
            agent_logger.error(f"Scheduler LLM Engine Error: {e}")
            return SchedulerResponseFormatter.format_response({"error": str(e)})
