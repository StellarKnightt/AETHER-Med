import os
import chromadb
from chromadb.config import Settings
from langchain_community.vectorstores import Chroma
from backend.rag.embeddings.local_embedder import LocalEmbedder
from backend.utils.logger import get_logger

logger = get_logger("rag.chroma")

CHROMA_HOST = os.getenv("CHROMADB_HOST")
CHROMA_PORT = os.getenv("CHROMADB_PORT", "8000")

CHROMA_DB_DIR = os.path.join(os.path.dirname(__file__), "../../../.chromadb")

class ChromaStoreManager:
    _stores = {}
    _client = None

    @classmethod
    def get_client(cls):
        if cls._client is None:
            if CHROMA_HOST:
                logger.info(f"Connecting to ChromaDB HTTP Service at {CHROMA_HOST}:{CHROMA_PORT}")
                cls._client = chromadb.HttpClient(host=CHROMA_HOST, port=CHROMA_PORT, settings=Settings(allow_reset=True))
            else:
                logger.info(f"Using local persistent ChromaDB at {CHROMA_DB_DIR}")
                os.makedirs(CHROMA_DB_DIR, exist_ok=True)
                cls._client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
        return cls._client

    @classmethod
    def get_store(cls, agent_type: str) -> Chroma:
        """
        Get or initialize a ChromaDB store for a specific agent.
        Valid agent_types: 'triage', 'pharma', 'scheduler', 'bed', 'sentinel', 'meta'
        """
        if agent_type not in cls._stores:
            collection_name = f"{agent_type}_kb"
            logger.info(f"Initializing ChromaDB vector store for collection: {collection_name}")
            
            embedder = LocalEmbedder.get_instance()
            client = cls.get_client()
            
            store = Chroma(
                client=client,
                collection_name=collection_name,
                embedding_function=embedder
            )
            cls._stores[agent_type] = store
            
        return cls._stores[agent_type]

    @classmethod
    def get_all_collections(cls):
        return ['triage', 'pharma', 'scheduler', 'bed', 'sentinel', 'meta']
