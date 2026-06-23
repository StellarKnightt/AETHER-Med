"""
ChromaDB Vector Store
======================
Manages ChromaDB collections for storing and querying medical knowledge embeddings.

Phase 1: Basic initialization and collection management.
Phase 2+: Multi-collection support, metadata filtering, hybrid search.
"""

from typing import Any, Dict, List, Optional

from backend.config.settings import settings
from backend.utils.logger import rag_logger


class ChromaStore:
    """
    ChromaDB vector store wrapper.

    Manages collections and provides add/query interfaces.
    """

    def __init__(self):
        self._client = None
        self._collections: Dict[str, Any] = {}
        rag_logger.info("ChromaStore initialized")

    def _get_client(self):
        """Lazy-initialize the ChromaDB client."""
        if self._client is None:
            try:
                import chromadb
                self._client = chromadb.HttpClient(
                    host=settings.chromadb_host,
                    port=settings.chromadb_port,
                )
                rag_logger.info(
                    f"Connected to ChromaDB at {settings.chromadb_host}:{settings.chromadb_port}"
                )
            except Exception as e:
                rag_logger.warning(
                    f"ChromaDB connection failed (expected in Phase 1): {e}"
                )
                # Fallback to in-memory client for development
                import chromadb
                self._client = chromadb.Client()
                rag_logger.info("Using in-memory ChromaDB client (development mode)")
        return self._client

    def get_or_create_collection(self, name: str) -> Any:
        """Get or create a ChromaDB collection."""
        if name not in self._collections:
            client = self._get_client()
            self._collections[name] = client.get_or_create_collection(name=name)
            rag_logger.info(f"Collection '{name}' ready")
        return self._collections[name]

    def add_documents(
        self,
        collection_name: str,
        documents: List[str],
        embeddings: List[List[float]],
        ids: List[str],
        metadatas: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        """Add documents with embeddings to a collection."""
        collection = self.get_or_create_collection(collection_name)
        collection.add(
            documents=documents,
            embeddings=embeddings,
            ids=ids,
            metadatas=metadatas,
        )
        rag_logger.info(f"Added {len(documents)} documents to '{collection_name}'")

    def query(
        self,
        collection_name: str,
        query_embedding: List[float],
        n_results: int = 5,
    ) -> Dict[str, Any]:
        """Query a collection for similar documents."""
        collection = self.get_or_create_collection(collection_name)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
        )
        rag_logger.info(
            f"Query on '{collection_name}' returned {len(results.get('documents', [[]])[ 0])} results"
        )
        return results


# Singleton instance
chroma_store = ChromaStore()
