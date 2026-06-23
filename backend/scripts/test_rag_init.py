import os
import sys

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from backend.rag.vectorstores.chroma_store import ChromaStoreManager
import traceback

try:
    store = ChromaStoreManager.get_store("triage")
    print("Store created successfully.")
    print("Collection count:", store._collection.count())
except Exception as e:
    print("Exception occurred!")
    traceback.print_exc()
