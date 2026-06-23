"""
Async Executor
==============
Manages concurrent execution of agent tasks with timeout and circuit breaking.
"""

import asyncio
from typing import Any, Dict, Optional
from backend.utils.logger import app_logger

class AsyncExecutor:
    """Executes agent tasks asynchronously with safety wrappers."""
    
    def __init__(self, timeout_seconds: int = 30):
        self.timeout_seconds = timeout_seconds

    async def execute_task(
        self, 
        task_func: Any, 
        *args: Any, 
        timeout: Optional[int] = None,
        **kwargs: Any
    ) -> Any:
        """Execute a task with a timeout."""
        t = timeout or self.timeout_seconds
        try:
            return await asyncio.wait_for(task_func(*args, **kwargs), timeout=t)
        except asyncio.TimeoutError:
            app_logger.error(f"Task timed out after {t}s")
            raise
        except Exception as e:
            app_logger.exception(f"Execution failed: {e}")
            raise
