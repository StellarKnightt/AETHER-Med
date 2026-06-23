"""
AETHER-Med Logging System
==========================
Centralized logging with rotating file handlers.
Provides agent-specific loggers for traceability.
"""

import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path


# Determine log directory relative to backend root
LOG_DIR = Path(__file__).parent.parent / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

# Default format
LOG_FORMAT = "%(asctime)s | %(name)-25s | %(levelname)-8s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def _create_file_handler(
    filename: str,
    level: int = logging.DEBUG,
    max_bytes: int = 5 * 1024 * 1024,  # 5 MB
    backup_count: int = 5,
) -> RotatingFileHandler:
    """Create a rotating file handler."""
    filepath = LOG_DIR / filename
    handler = RotatingFileHandler(
        filepath,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding="utf-8",
    )
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT))
    return handler


def _create_console_handler(level: int = logging.INFO) -> logging.StreamHandler:
    """Create a console handler with colored output."""
    handler = logging.StreamHandler()
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT))
    return handler


def get_logger(name: str, log_file: str | None = None) -> logging.Logger:
    """
    Get or create a logger with the given name.

    Args:
        name: Logger name (e.g., 'triage_agent', 'meta_agent.supervisor')
        log_file: Optional specific log file name. Defaults to 'aether_med.log'.

    Returns:
        Configured logger instance.
    """
    logger = logging.getLogger(f"aether_med.{name}")

    # Avoid adding duplicate handlers
    if logger.handlers:
        return logger

    log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    logger.setLevel(getattr(logging, log_level, logging.INFO))

    # Console handler
    logger.addHandler(_create_console_handler(level=logging.DEBUG))

    # File handler — main log
    logger.addHandler(_create_file_handler("aether_med.log"))

    # Agent-specific file handler
    if log_file:
        logger.addHandler(_create_file_handler(log_file))

    # Prevent propagation to root logger
    logger.propagate = False

    return logger


# Pre-configured loggers for common components
app_logger = get_logger("app")
db_logger = get_logger("database", log_file="database.log")
agent_logger = get_logger("agents", log_file="agents.log")
graph_logger = get_logger("graph", log_file="graph.log")
rag_logger = get_logger("rag", log_file="rag.log")
