"""
Provider Wrappers
=================
Standardized wrappers for cloud providers.
"""

from typing import Dict, Any, Optional
from backend.agents.providers.provider_factory import ProviderFactory
from backend.agents.shared.enums import LLMProvider

class GroqProvider:
    @staticmethod
    def get_model(model: str = "llama-3.3-70b-versatile", **kwargs):
        return ProviderFactory.get_provider(provider=LLMProvider.GROQ, model_name=model, **kwargs)

class OpenRouterProvider:
    @staticmethod
    def get_model(model: str = "anthropic/claude-3.5-sonnet", **kwargs):
        return ProviderFactory.get_provider(provider=LLMProvider.OPENROUTER, model_name=model, **kwargs)

class OpenAICompatibleProvider:
    @staticmethod
    def get_model(model: str = "gpt-4o", **kwargs):
        return ProviderFactory.get_provider(provider=LLMProvider.OPENAI, model_name=model, **kwargs)
