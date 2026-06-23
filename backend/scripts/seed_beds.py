import asyncio
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from backend.database.session.connection import async_session_factory
from backend.database.models.bed import Bed

from sqlalchemy import text

async def seed_beds():
    async with async_session_factory() as session:
        # Check if beds already exist
        result = await session.execute(text("SELECT COUNT(*) FROM beds"))
        count = result.scalar()
        if count > 0:
            print(f"Beds already seeded ({count} beds). Skipping.")
            return

        beds_to_create = []
        
        # 10 ICU Beds
        for i in range(1, 11):
            beds_to_create.append(Bed(bed_number=f"ICU-{i:02d}", bed_type="icu", ward="Intensive Care Unit", status="free"))
            
        # 40 General Beds (2 Wards)
        for i in range(1, 21):
            beds_to_create.append(Bed(bed_number=f"GEN-A{i:02d}", bed_type="general", ward="General Ward A", status="free"))
        for i in range(1, 21):
            beds_to_create.append(Bed(bed_number=f"GEN-B{i:02d}", bed_type="general", ward="General Ward B", status="free"))
            
        # 5 Emergency/Observation Beds
        for i in range(1, 6):
            beds_to_create.append(Bed(bed_number=f"ER-OBS-{i:02d}", bed_type="emergency", ward="Emergency Observation", status="free"))
            
        # 5 Isolation Beds
        for i in range(1, 6):
            beds_to_create.append(Bed(bed_number=f"ISO-{i:02d}", bed_type="isolation", ward="Infectious Disease Ward", status="free"))

        session.add_all(beds_to_create)
        await session.commit()
        print(f"Successfully seeded {len(beds_to_create)} beds.")

if __name__ == "__main__":
    asyncio.run(seed_beds())
