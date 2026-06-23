"""
Embedding Service
==================
Generates vector embeddings for text using sentence-transformers.
Used by the RAG pipeline to embed queries and documents.

Phase 1: Scaffold with lazy model loading.
Phase 2+: Full embedding pipeline with caching and batch processing.
"""

from typing import List, Optional

from backend.config.settings import settings
from backend.utils.logger import rag_logger


class EmbeddingService:
    """
    Text embedding service using sentence-transformers.

    Lazily loads the embedding model on first use to avoid
    slow startup when the RAG system isn't needed.
    """

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or settings.embedding_model
        self._model = None
        rag_logger.info(f"Embedding service initialized (model: {self.model_name})")

    def _load_model(self):
        """Lazy-load the sentence-transformer model."""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.model_name)
                rag_logger.info(f"Loaded embedding model: {self.model_name}")
            except Exception as e:
                rag_logger.error(f"Failed to load embedding model: {e}")
                raise

    def embed_text(self, text: str) -> List[float]:
        """
        Generate an embedding vector for a single text string.

        Args:
            text: Input text to embed.

        Returns:
            List of floats representing the embedding vector.
        """
        self._load_model()
        embedding = self._model.encode(text).tolist()
        return embedding

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for a batch of texts.

        Args:
            texts: List of input texts.

        Returns:
            List of embedding vectors.
        """
        self._load_model()
        embeddings = self._model.encode(texts).tolist()
        rag_logger.info(f"Generated {len(embeddings)} embeddings")
        return embeddings

    @property
    def dimension(self) -> int:
        """Get the embedding dimension size."""
        self._load_model()
        return self._model.get_sentence_embedding_dimension()
