import time
from typing import Dict, List, Any
from backend.rag.vectorstores.chroma_store import ChromaStoreManager
from backend.utils.logger import get_logger

logger = get_logger("rag.retrieval")

# In-memory metrics tracking (for demo purposes)
rag_metrics = {
    "total_queries": 0,
    "total_latency_ms": 0,
    "documents_retrieved": 0,
    "failed_queries": 0
}

class RetrievalService:
    @staticmethod
    def retrieve(query: str, agent_type: str, k: int = 3) -> Dict[str, Any]:
        """
        Retrieve relevant documents for the specific agent's domain.
        Returns a dictionary with formatted context and retrieved metadata.
        """
        start_time = time.time()
        
        try:
            store = ChromaStoreManager.get_store(agent_type)
            # Perform similarity search
            results = store.similarity_search(query, k=k)
            
            latency = (time.time() - start_time) * 1000
            
            # Format context
            context_pieces = []
            source_names = set()
            
            for doc in results:
                source = doc.metadata.get('source', 'Unknown Source')
                source_names.add(source)
                context_pieces.append(f"{doc.page_content}")
                
            formatted_context = "\n\n".join(context_pieces) if context_pieces else "No relevant knowledge found."
            
            # Update metrics
            rag_metrics["total_queries"] += 1
            rag_metrics["total_latency_ms"] += latency
            rag_metrics["documents_retrieved"] += len(results)
            
            logger.info(f"RAG Retrieval [{agent_type}]: Found {len(results)} docs in {latency:.2f}ms")
            
            return {
                "status": "success",
                "retrieved_context": formatted_context,
                "retrieved_documents": list(source_names),
                "latency_ms": latency,
                "count": len(results)
            }
            
        except Exception as e:
            logger.error(f"RAG Retrieval failed for {agent_type}: {str(e)}")
            rag_metrics["failed_queries"] += 1
            
            return {
                "status": "failed",
                "retrieved_context": "",
                "retrieved_documents": [],
                "latency_ms": (time.time() - start_time) * 1000,
                "count": 0,
                "error": str(e)
            }
            
    @staticmethod
    def get_metrics() -> dict:
        total = rag_metrics["total_queries"]
        avg_latency = (rag_metrics["total_latency_ms"] / total) if total > 0 else 0
        success_rate = ((total - rag_metrics["failed_queries"]) / total * 100) if total > 0 else 100
        
        return {
            "total_queries": total,
            "average_latency_ms": round(avg_latency, 2),
            "total_documents_retrieved": rag_metrics["documents_retrieved"],
            "success_rate_percent": round(success_rate, 2),
            "failed_queries": rag_metrics["failed_queries"]
        }
