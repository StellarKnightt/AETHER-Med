"""
Provider Factory & Registry
===========================
Dynamically instantiates cloud LLM providers using LangChain.
"""

from typing import Dict, Any, Optional, Type
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq
from langchain_core.language_models.chat_models import BaseChatModel

from backend.config.settings import settings
from backend.agents.shared.enums import LLMProvider

class ProviderFactory:
    """Factory to create LangChain chat models based on provider configuration."""
    
    @staticmethod
    def get_provider(
        provider: Optional[str] = None,
        model_name: Optional[str] = None,
        temperature: float = 0.0,
        **kwargs: Any
    ) -> BaseChatModel:
        """
        Instantiate a chat model.
        
        Args:
            provider: The LLM provider (groq, openai, openrouter).
            model_name: Specific model ID.
            temperature: Sampling temperature.
        """
        target_provider = provider or settings.default_llm_provider
        
        if target_provider == LLMProvider.GROQ:
            return ChatGroq(
                groq_api_key=settings.groq_api_key,
                model_name=model_name or "llama-3.1-8b-instant",
                temperature=temperature,
                **kwargs
            )
            
        elif target_provider == LLMProvider.OPENAI:
            return ChatOpenAI(
                api_key=settings.openai_api_key,
                model_name=model_name or "gpt-4o",
                temperature=temperature,
                **kwargs
            )
            
        elif target_provider == LLMProvider.OPENROUTER:
            return ChatOpenAI(
                api_key=settings.openrouter_api_key,
                base_url=settings.openrouter_base_url,
                model_name=model_name or "anthropic/claude-3.5-sonnet",
                temperature=temperature,
                **kwargs
            )
            
        else:
            raise ValueError(f"Unsupported LLM provider: {target_provider}")
