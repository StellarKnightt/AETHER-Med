import asyncio
from backend.rag.services.retrieval_service import RetrievalService

async def main():
    print("Testing RAG Isolation per Agent\n")
    
    # Generic query that might exist in multiple domains but yield different results
    query = "What are the guidelines for handling critical patients?"
    
    agents = ["triage", "pharma", "scheduler", "bed", "sentinel", "meta"]
    
    for agent in agents:
        print(f"--- Agent: {agent.upper()} ---")
        result = RetrievalService.retrieve(query=query, agent_type=agent, k=2)
        
        if result["status"] == "success":
            print(f"Documents Retrieved: {result['count']}")
            print(f"Sources: {', '.join(result['retrieved_documents'])}")
            # print(f"Context Snippet:\n{result['retrieved_context'][:200]}...\n")
        else:
            print(f"Retrieval failed: {result.get('error')}")
            
        print("-" * 40 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
