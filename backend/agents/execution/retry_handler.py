"""
Retry Handler
=============
Utilities for retrying failed agent executions and API calls with backoff.
"""

import asyncio
import random
from typing import Any, Callable, TypeVar, Union, Tuple
from backend.utils.logger import app_logger

T = TypeVar("T")

async def with_retry(
    func: Callable[..., Any],
    *args: Any,
    max_retries: int = 3,
    base_delay: float = 1.0,
    exponential_backoff: bool = True,
    retry_on_exceptions: Union[type, Tuple[type, ...]] = Exception,
    **kwargs: Any
) -> Any:
    """Execute a function with retry logic."""
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            return await func(*args, **kwargs)
        except retry_on_exceptions as e:
            last_exception = e
            if attempt == max_retries:
                break
                
            delay = base_delay * (2 ** attempt if exponential_backoff else 1)
            delay += random.uniform(0, 0.1 * delay)  # Jitter
            
            app_logger.warning(
                f"Attempt {attempt + 1} failed. Retrying in {delay:.2f}s... Error: {e}"
            )
            await asyncio.sleep(delay)
            
    app_logger.error(f"All {max_retries + 1} attempts failed.")
    raise last_exception
