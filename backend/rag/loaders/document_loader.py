import os
import shutil
from typing import List
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from backend.rag.vectorstores.chroma_store import ChromaStoreManager
from backend.utils.logger import get_logger

logger = get_logger("rag.loader")

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "../../../.data/rag_documents")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class DocumentLoader:
    @staticmethod
    def process_and_store(file_path: str, filename: str, agent_type: str) -> dict:
        """
        Parses the document, chunks it, and adds it to the agent's specific vector store.
        """
        logger.info(f"Processing document {filename} for agent {agent_type}")
        
        # Determine loader
        ext = os.path.splitext(filename)[1].lower()
        if ext == ".pdf":
            loader = PyPDFLoader(file_path)
        elif ext == ".docx":
            loader = Docx2txtLoader(file_path)
        elif ext == ".txt":
            loader = TextLoader(file_path)
        else:
            raise ValueError(f"Unsupported file extension: {ext}")
            
        docs = loader.load()
        
        # Add metadata source
        for doc in docs:
            doc.metadata["source"] = filename
            
        # Split into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len
        )
        chunks = text_splitter.split_documents(docs)
        
        logger.info(f"Split {filename} into {len(chunks)} chunks.")
        
        # Save to specific vector store
        store = ChromaStoreManager.get_store(agent_type)
        store.add_documents(chunks)
        
        return {
            "status": "success",
            "filename": filename,
            "agent_type": agent_type,
            "chunks_processed": len(chunks)
        }
        
    @staticmethod
    async def save_upload_and_process(file_bytes: bytes, filename: str, agent_type: str) -> dict:
        """Save raw bytes to disk and then process."""
        agent_dir = os.path.join(UPLOAD_DIR, agent_type)
        os.makedirs(agent_dir, exist_ok=True)
        
        file_path = os.path.join(agent_dir, filename)
        with open(file_path, "wb") as f:
            f.write(file_bytes)
            
        return DocumentLoader.process_and_store(file_path, filename, agent_type)
