"""
Seed Triage RAG
===============
Populates ChromaDB with clinical triage protocols.
"""

import chromadb
from chromadb.utils import embedding_functions
import os

# ChromaDB Client
CHROMADB_HOST = os.getenv("CHROMADB_HOST", "localhost")
CHROMADB_PORT = int(os.getenv("CHROMADB_PORT", 8001))

client = chromadb.HttpClient(host=CHROMADB_HOST, port=CHROMADB_PORT)
ef = embedding_functions.DefaultEmbeddingFunction()

# Protocols to seed
PROTOCOLS = [
    {
        "id": "ESI-1",
        "text": "PROTOCOL [ESI-1]: IMMEDIATE RESUSCITATION required. Patient has life-threatening condition (cardiac arrest, respiratory arrest, severe trauma). Assign CRITICAL priority.",
        "metadata": {"category": "cardiology", "level": "critical"}
    },
    {
        "id": "ESI-2",
        "text": "PROTOCOL [ESI-2]: HIGH RISK situation. Confused, lethargic, or in severe distress. High risk of deterioration. Assign HIGH priority.",
        "metadata": {"category": "emergency", "level": "high"}
    },
    {
        "id": "CARD-01",
        "text": "PROTOCOL [CARD-01]: Suspected ACS. Administer ECG within 10 mins. Target SpO2 > 94%. Monitor for arrhythmias.",
        "metadata": {"category": "cardiology", "level": "high"}
    },
    {
        "id": "RESP-02",
        "text": "PROTOCOL [RESP-02]: Severe dyspnea. Apply supplemental O2. Prepare for possible intubation if RR > 30 or SpO2 < 90%.",
        "metadata": {"category": "respiratory", "level": "high"}
    }
]

def seed():
    print(f"Connecting to ChromaDB at {CHROMADB_HOST}:{CHROMADB_PORT}...")
    collection = client.get_or_create_collection(name="triage_protocols", embedding_function=ef)
    
    ids = [p["id"] for p in PROTOCOLS]
    documents = [p["text"] for p in PROTOCOLS]
    metadatas = [p["metadata"] for p in PROTOCOLS]
    
    collection.add(
        ids=ids,
        documents=documents,
        metadatas=metadatas
    )
    print(f"✓ Successfully seeded {len(ids)} triage protocols.")

if __name__ == "__main__":
    seed()
