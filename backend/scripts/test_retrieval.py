import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from backend.rag.services.retrieval_service import RetrievalService

queries = [
    "Critical Cardiac Emergency",
    "Severe Allergy Conflict",
    "ICU Candidate",
    "Respiratory Failure",
    "Stroke Risk",
    "Severe Asthma Attack",
    "Oncology Patient",
    "General Ward Patient"
]

print("=== RAG RETRIEVAL TEST ===")
for q in queries:
    print(f"\nQuery: {q}")
    res = RetrievalService.retrieve(q, agent_type="triage", k=1)
    if "No relevant knowledge found" in res['retrieved_context']:
        print("-> FAILED: No relevant knowledge found.")
    else:
        print(f"-> SUCCESS: Retrieved context snippet: {res['retrieved_context'][:100]}...")

print("\nMetrics:", RetrievalService.get_metrics())
