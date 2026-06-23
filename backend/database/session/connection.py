"""
Database Connection & Session Management
==========================================
Async SQLAlchemy engine and session factory for PostgreSQL.
Uses asyncpg as the async driver.
"""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from backend.config.settings import settings
from backend.utils.logger import db_logger

# Create async engine
engine = create_async_engine(
    settings.database_url,
    echo=settings.database_echo,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

# Session factory
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides an async database session.

    Usage:
        @router.get("/example")
        async def example(db: AsyncSession = Depends(get_db)):
            ...
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            db_logger.exception("Database session error")
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    Initialize database tables.
    In production, use Alembic migrations instead.
    """
    from backend.database.models.base import Base

    async with engine.begin() as conn:
        # Only for development — creates tables if they don't exist
        await conn.run_sync(Base.metadata.create_all)
        db_logger.info("Database tables initialized")


async def close_db() -> None:
    """Dispose of the database engine."""
    await engine.dispose()
    db_logger.info("Database engine disposed")
