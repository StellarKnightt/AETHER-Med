import os
from langchain_huggingface import HuggingFaceEmbeddings
from backend.utils.logger import get_logger

logger = get_logger("rag.embedder")

class LocalEmbedder:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            logger.info("Initializing SentenceTransformers Embeddings (all-MiniLM-L6-v2)")
            # all-MiniLM-L6-v2 is fast and effective for local RAG
            cls._instance = HuggingFaceEmbeddings(
                model_name="all-MiniLM-L6-v2",
                model_kwargs={'device': 'cpu'},  # Default to CPU to ensure compatibility
                encode_kwargs={'normalize_embeddings': True}
            )
        return cls._instance
