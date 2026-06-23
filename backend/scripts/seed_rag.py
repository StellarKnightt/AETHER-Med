import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))

from backend.rag.loaders.document_loader import DocumentLoader
from backend.utils.logger import get_logger

logger = get_logger("rag.seeder")

STARTER_PACK_DIR = os.path.join(os.path.dirname(__file__), "../rag/data/starter_pack")

def seed_knowledge_bases():
    logger.info("Starting RAG Knowledge Base Seeding...")
    
    files = {
        "triage": "triage_guidelines.txt",
        "pharma": "pharma_guidelines.txt",
        "scheduler": "scheduler_guidelines.txt",
        "bed": "bed_guidelines.txt",
        "sentinel": "sentinel_guidelines.txt",
        "meta": "meta_guidelines.txt"
    }
    
    for agent_type, filename in files.items():
        file_path = os.path.join(STARTER_PACK_DIR, filename)
        if os.path.exists(file_path):
            result = DocumentLoader.process_and_store(file_path, filename, agent_type)
            logger.info(f"Seeded {agent_type} KB: {result}")
        else:
            logger.warning(f"File not found: {file_path}")

    logger.info("RAG Seeding Complete.")

if __name__ == "__main__":
    seed_knowledge_bases()
