import asyncio
from sqlalchemy import text
from backend.database.session.connection import engine

async def verify():
    async with engine.begin() as conn:
        # Check patients columns
        r = await conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'patients' AND column_name IN ('diseases', 'symptoms')
            ORDER BY column_name
        """))
        cols = [row[0] for row in r.fetchall()]
        print(f"patients table new columns: {cols}")

        # Check triage_results table
        r = await conn.execute(text("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'triage_results'
            ORDER BY column_name
        """))
        cols = [row[0] for row in r.fetchall()]
        print(f"triage_results table columns: {cols}")

        # Count
        r = await conn.execute(text("SELECT COUNT(*) FROM patients"))
        print(f"patients count: {r.scalar()}")

        r = await conn.execute(text("SELECT COUNT(*) FROM triage_results"))
        print(f"triage_results count: {r.scalar()}")

if __name__ == "__main__":
    asyncio.run(verify())
