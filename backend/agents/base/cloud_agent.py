"""
Cloud Agent
===========
Cloud-ready agent layer with provider abstraction and async inference.
"""

from typing import Any, Dict, Optional, List
import time
from backend.agents.base.base_agent import BaseAgent
from backend.agents.base.agent_state import GlobalWorkflowState
from backend.agents.base.agent_response import AgentResponse
from backend.agents.base.token_tracker import TokenTracker
from backend.agents.logging.telemetry import TelemetryTracker
from backend.agents.providers.provider_factory import ProviderFactory
from backend.agents.execution.retry_handler import with_retry
from backend.agents.execution.async_executor import AsyncExecutor

class CloudAgent(BaseAgent):
    """Agent that utilizes cloud LLMs for processing."""
    
    def __init__(
        self, 
        name: str, 
        role: str,
        provider: Optional[str] = None,
        model: Optional[str] = None,
        temperature: float = 0.0
    ):
        super().__init__(name, role)
        self.provider = provider
        self.model_name = model
        self.temperature = temperature
        self.token_tracker = TokenTracker()
        self.executor = AsyncExecutor()

    async def call_llm(self, messages: List[Any], **kwargs) -> Any:
        """Execute LLM call with retry and telemetry."""
        telemetry = TelemetryTracker(self.name, self.logger)
        telemetry.start()
        
        # Instantiate model from factory
        llm = ProviderFactory.get_provider(
            provider=self.provider,
            model_name=self.model_name,
            temperature=self.temperature,
            **kwargs
        )
        
        try:
            # Wrap in retry handler
            response = await with_retry(llm.ainvoke, messages)
            
            # Extract metadata (LangChain standardized)
            token_data = response.response_metadata.get("token_usage", {"total_tokens": 0})
            
            telemetry.stop(
                provider=self.provider or "default",
                tokens={
                    "prompt": token_data.get("prompt_tokens", 0),
                    "completion": token_data.get("completion_tokens", 0),
                    "total": token_data.get("total_tokens", 0)
                }
            )
            
            self.token_tracker.track_usage(
                token_data.get("prompt_tokens", 0),
                token_data.get("completion_tokens", 0)
            )
            
            return response, telemetry.get_metrics()
            
        except Exception as e:
            self.logger.error(f"LLM Call failed: {e}")
            raise
