"""
Migration: Add diseases and symptoms columns + triage_results table.
Run this via: python -m backend.database.migrations.add_diseases_and_triage
"""
import asyncio
from sqlalchemy import text
from backend.database.session.connection import engine as async_engine


async def migrate():
    async with async_engine.begin() as conn:
        # Add diseases and symptoms columns to patients (idempotent)
        await conn.execute(text("""
            ALTER TABLE patients
            ADD COLUMN IF NOT EXISTS diseases JSON,
            ADD COLUMN IF NOT EXISTS symptoms JSON
        """))

        # Create triage_results table
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS triage_results (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
                priority VARCHAR(20) NOT NULL,
                severity_score FLOAT NOT NULL DEFAULT 0.0,
                confidence FLOAT NOT NULL DEFAULT 0.0,
                reasoning JSON,
                diseases JSON,
                symptoms JSON,
                final_decision TEXT,
                recommended_actions JSON,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                workflow_actions JSON,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
            )
        """))

        print("[OK] Migration complete: diseases/symptoms columns + triage_results table")


if __name__ == "__main__":
    asyncio.run(migrate())
