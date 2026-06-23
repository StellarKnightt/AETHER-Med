"""
RAG Retriever
==============
End-to-end retrieval pipeline: query → embed → search → return results.

Phase 1: Basic scaffold.
Phase 2+: Re-ranking, hybrid search, context window optimization.
"""

from typing import Any, Dict, List

from backend.rag.embeddings.embedding_service import EmbeddingService
from backend.rag.vector_store.chroma_store import ChromaStore
from backend.utils.logger import rag_logger


class Retriever:
    """
    RAG retriever that combines embedding and vector search.

    Pipeline:
        1. Embed the query text
        2. Search the vector store for similar documents
        3. Return ranked results with metadata
    """

    def __init__(
        self,
        embedding_service: EmbeddingService | None = None,
        vector_store: ChromaStore | None = None,
    ):
        self.embedding_service = embedding_service or EmbeddingService()
        self.vector_store = vector_store or ChromaStore()
        rag_logger.info("Retriever initialized")

    async def retrieve(
        self,
        query: str,
        collection_name: str = "medical_knowledge",
        n_results: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant documents for a query.

        Args:
            query: Natural language query.
            collection_name: ChromaDB collection to search.
            n_results: Number of results to return.

        Returns:
            List of result dicts with 'document', 'metadata', 'distance'.
        """
        rag_logger.info(f"Retrieving for query: '{query[:50]}...'")

        try:
            # Step 1: Embed the query
            query_embedding = self.embedding_service.embed_text(query)

            # Step 2: Search the vector store
            raw_results = self.vector_store.query(
                collection_name=collection_name,
                query_embedding=query_embedding,
                n_results=n_results,
            )

            # Step 3: Format results
            documents = raw_results.get("documents", [[]])[0]
            metadatas = raw_results.get("metadatas", [[]])[0]
            distances = raw_results.get("distances", [[]])[0]

            results = [
                {
                    "document": doc,
                    "metadata": meta,
                    "distance": dist,
                }
                for doc, meta, dist in zip(documents, metadatas, distances)
            ]

            rag_logger.info(f"Retrieved {len(results)} results")
            return results

        except Exception as e:
            rag_logger.error(f"Retrieval failed: {e}")
            return []
