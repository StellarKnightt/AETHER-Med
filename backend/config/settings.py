"""
AETHER-Med Settings Configuration
==================================
Centralized configuration using Pydantic BaseSettings.
All settings are loaded from environment variables / .env file.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---
    app_name: str = "AETHER-Med"
    app_env: str = "development"
    app_debug: bool = True
    app_version: str = "0.1.0"

    # --- Server ---
    host: str = "0.0.0.0"
    port: int = 8000

    # --- Database ---
    database_url: str = "postgresql+asyncpg://aether:aether_secret@localhost:5432/aether_med"
    database_echo: bool = False

    # --- ChromaDB ---
    chromadb_host: str = "localhost"
    chromadb_port: int = 8001

    # --- LLM Providers ---
    default_llm_provider: str = "groq"
    groq_api_key: str = ""
    openai_api_key: str = ""
    openrouter_api_key: str = ""
    openrouter_base_url: str = "https://openrouter.ai/api/v1"

    # --- Embeddings ---
    embedding_model: str = "all-MiniLM-L6-v2"

    # --- Logging ---
    log_level: str = "INFO"
    log_dir: str = "logs"

    # --- CORS ---
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.app_env == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.app_env == "production"


# Singleton settings instance
settings = Settings()
