<div align="center">

# 🏥 AETHER-Med

### Agentic Environmental & Task Health Entity Resolver

*A LangGraph-based Multi-Agent Clinical Workflow Automation Ecosystem*

[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![LangGraph](https://img.shields.io/badge/LangGraph-0.2-1C3C3C?logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraph/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docker.com)

</div>

---

## 📋 Overview

AETHER-Med is a research-oriented, multi-agent clinical workflow automation system built on **LangGraph** orchestration. It features adaptive agent orchestration, meta-agent supervision, RAG-based medical knowledge retrieval, conflict-aware workflow routing, and Human-in-the-Loop support.

### Key Features

- 🤖 **Multi-Agent System** — 5 specialized clinical agents (Triage, Pharma, Scheduler, Bed, Sentinel) supervised by a central Meta-Agent.
- 🧠 **Meta-Agent Ecosystem** — Acts as the "Agent of Agents", continuously monitoring health scores, detecting reasoning failures, and autonomously recovering impaired agents.
- 🛡️ **Sentinel Security & Compliance** — Real-time privacy and security incident monitoring with scenario simulation (e.g., unauthorized data access, network anomalies).
- 🏥 **Hospital Command Center** — Executive dashboard with live telemetry from patients, beds, medical staff, cleaning staff, and agent operations.
- 📊 **Autonomous Resource Management** — End-to-end bed management with an integrated Cleaning Staff module for automated sanitization workflows.
- ⚡ **Real-Time WebSockets** — Live event streams for vitals, security incidents, meta-agent interventions, and hospital operations.

---

## 🏗️ Architecture

```text
aether-med/
├── backend/
│   ├── agents/              # Domain-specific agents
│   │   ├── triage_agent/    # Patient triage & priority
│   │   ├── pharma_agent/    # Pharmaceutical recommendations
│   │   ├── scheduler_agent/ # Appointment scheduling
│   │   ├── bed_agent/       # Bed allocation
│   │   └── sentinel_agent/  # Monitoring & alerts
│   ├── meta_agent/          # Orchestration layer
│   │   ├── supervisor/      # Agent execution control
│   │   ├── conflict_engine/ # Conflict detection/resolution
│   │   └── adaptive_router/ # Task routing
│   ├── graph/               # LangGraph workflows
│   │   ├── workflows/       # StateGraph definitions
│   │   ├── state/           # Shared state schemas
│   │   └── nodes/           # Graph node functions
│   ├── rag/                 # RAG pipeline
│   │   ├── embeddings/      # Embedding service
│   │   ├── vector_store/    # ChromaDB integration
│   │   ├── retriever/       # Query pipeline
│   │   └── knowledge_base/  # Medical documents
│   ├── simulation/          # Test data generators
│   ├── api/                 # FastAPI routes & WebSocket
│   ├── database/            # SQLAlchemy models & Alembic
│   ├── memory/              # Agent context storage
│   ├── config/              # Pydantic settings
│   ├── utils/               # Logging & utilities
│   └── tests/               # Test suite
├── frontend/                # React + Vite + Tailwind
├── docker/                  # Dockerfiles
├── docs/                    # Documentation
└── docker-compose.yml       # Container orchestration
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 20+**
- **Docker & Docker Compose** (recommended)
- **PostgreSQL 16** (or use Docker)

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/aether-med.git
cd aether-med

# Copy environment file
cp backend/.env.example backend/.env

# Start all services
docker-compose up --build

# Access:
# - Backend API:  http://localhost:8000
# - API Docs:     http://localhost:8000/docs
# - Frontend:     http://localhost:5173
# - PostgreSQL:   localhost:5432
# - ChromaDB:     localhost:8001
```

### Option 2: Manual Setup

#### Backend

```bash
# Create and activate virtual environment
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env
# Edit .env with your database credentials

# Run the server
cd ..
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

#### Database

```bash
# If using local PostgreSQL, create the database:
createdb aether_med

# Run migrations (when available)
cd backend
alembic upgrade head
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API information |
| `GET` | `/api/v1/health` | Health check |
| `GET` | `/api/v1/patients/` | List patients |
| `GET` | `/api/v1/staff/doctors` | List doctors |
| `GET` | `/api/v1/cleaners` | List cleaning staff |
| `GET` | `/api/v1/beds` | List beds and statuses |
| `GET` | `/api/v1/sentinel-agent/status` | Sentinel Agent status |
| `GET` | `/api/v1/meta-agent/status` | Meta-Agent status |
| `WS` | `/ws` | WebSocket connection for live events |

---

## 🧪 Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.11+, FastAPI, Uvicorn |
| **AI/Orchestration** | LangChain, LangGraph, sentence-transformers |
| **Vector Store** | ChromaDB |
| **Database** | PostgreSQL 16, SQLAlchemy (async), Alembic |
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS |
| **State** | Zustand |
| **Real-Time** | WebSockets |
| **Infrastructure** | Docker, Docker Compose |
| **Config** | Pydantic Settings, python-dotenv |

---

## 📈 Current Phase

> **Phase 1 & 2: Foundation & Meta-Agent Ecosystem** ✅
>
> Scalable architecture, multi-agent communication, and the Meta-Agent supervisory layer are implemented. Hospital Command Center UI with live websockets and resource management (beds, staff, cleaners) is fully functional.

### Roadmap

- [x] **Phase 1**: Architecture Initialization & Multi-Agent Structure
- [x] **Phase 2**: Meta-Agent Supervision & Sentinel Security Integration
- [x] **Phase 3**: Dynamic UI & Resource Management (Beds, Cleaners, Command Center)
- [ ] **Phase 4**: LLM Integration — Connect remaining agents to Ollama/OpenRouter
- [ ] **Phase 5**: Full RAG Pipeline — Medical knowledge ingestion & retrieval
- [ ] **Phase 6**: Advanced Orchestration — Conditional routing, parallel execution
- [ ] **Phase 7**: Production Hardening — Auth, monitoring, CI/CD

---

## 📄 License

This project is for research and educational purposes.

---

<div align="center">

**AETHER-Med** — *Automating Clinical Workflows with Intelligent Agents*

</div>
