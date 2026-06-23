"""
AETHER-Med — Main Application
================================
Agentic Environmental & Task Health Entity Resolver

FastAPI application bootstrap with:
- Modular routing
- CORS middleware
- Logging middleware
- WebSocket support
- Lifespan management (DB init, LangGraph init)
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config.settings import settings
from backend.utils.logger import app_logger
from backend.api.routes.health import router as health_router
from backend.api.routes.patients import router as patients_router
from backend.api.routes.agents import router as agents_router
from backend.api.websocket.handler import websocket_endpoint
from backend.api.middleware.logging_middleware import LoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan handler.
    Runs startup and shutdown logic.
    """
    # ── Startup ──
    app_logger.info("=" * 60)
    app_logger.info(f"  {settings.app_name} v{settings.app_version}")
    app_logger.info(f"  Environment: {settings.app_env}")
    app_logger.info("=" * 60)

    # Initialize database
    try:
        from backend.database.session.connection import init_db
        await init_db()
        app_logger.info("✓ Database initialized")
    except Exception as e:
        app_logger.warning(f"✗ Database initialization failed: {e}")
        app_logger.warning("  (Run with PostgreSQL for full functionality)")

    # Initialize LangGraph workflow
    try:
        from backend.graph.services.graph_executor import workflow_graph
        # workflow_graph is the singleton instance of hospital_workflow_graph
        app_logger.info("✓ LangGraph hospital workflow initialized")
    except Exception as e:
        app_logger.warning(f"✗ LangGraph initialization failed: {e}")

    # Initialize RAG and Auto-Seed Knowledge Base
    try:
        from backend.rag.vectorstores.chroma_store import ChromaStoreManager
        store = ChromaStoreManager.get_store("triage")
        if store._collection.count() == 0:
            app_logger.info("RAG Knowledge Base is empty. Auto-seeding from starter pack...")
            from backend.scripts.seed_rag import seed_knowledge_bases
            seed_knowledge_bases()
        app_logger.info("✓ RAG system ready and seeded")
    except Exception as e:
        app_logger.warning(f"✗ RAG initialization failed: {e}")

    # Initialize Agent Registry & Cloud-Ready Agents
    try:
        from backend.agents.registry.agent_loader import initialize_agents
        initialize_agents()
        app_logger.info("✓ Agent Framework & Registry initialized")
    except Exception as e:
        app_logger.error(f"✗ Agent Framework initialization failed: {e}")
    app_logger.info("─" * 60)
    app_logger.info(f"  Server running on http://{settings.host}:{settings.port}")
    app_logger.info(f"  API docs: http://{settings.host}:{settings.port}/docs")
    app_logger.info("─" * 60)

    yield

    # ── Shutdown ──
    app_logger.info("Shutting down AETHER-Med...")
    try:
        from backend.database.session.connection import close_db
        await close_db()
        app_logger.info("✓ Database connections closed")
    except Exception:
        pass
    app_logger.info("AETHER-Med shutdown complete")


# ── Create FastAPI application ──
app = FastAPI(
    title=settings.app_name,
    description=(
        "AETHER-Med: Agentic Environmental & Task Health Entity Resolver. "
        "A LangGraph-based Multi-Agent Clinical Workflow Automation Ecosystem."
    ),
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(LoggingMiddleware)

from backend.api.routes.simulation import router as simulation_router
from backend.api.routes.triage import router as triage_router
from backend.api.routes.pharma import router as pharma_router
from backend.api.routes.scheduler import router as scheduler_router
from backend.api.routes.staff import router as staff_router
from backend.api.routes.beds import router as beds_router
from backend.api.routes.sentinel_sim import router as sentinel_sim_router
from backend.api.routes.sentinel_agent_routes import router as sentinel_agent_router
from backend.api.routes.meta_agent_routes import router as meta_agent_router
from backend.api.routes.cleaners import router as cleaners_router
from backend.api.routes.rag import router as rag_router
from backend.api.routes.workflow import router as workflow_router

# ── Routers ──
API_PREFIX = "/api/v1"
app.include_router(health_router, prefix=API_PREFIX)
app.include_router(patients_router, prefix=API_PREFIX)
app.include_router(agents_router, prefix=API_PREFIX)
app.include_router(simulation_router, prefix="/api/v1/simulation", tags=["Simulation"])
app.include_router(triage_router, prefix=API_PREFIX)
app.include_router(pharma_router, prefix=API_PREFIX)
app.include_router(scheduler_router, prefix=API_PREFIX)
app.include_router(staff_router, prefix=API_PREFIX)
app.include_router(beds_router, prefix=API_PREFIX)
app.include_router(sentinel_sim_router, prefix="/api/v1/sentinel-sim")
app.include_router(sentinel_agent_router, prefix="/api/v1/sentinel-agent")
app.include_router(meta_agent_router, prefix="/api/v1/meta-agent")
app.include_router(cleaners_router, prefix=API_PREFIX)
app.include_router(rag_router, prefix=API_PREFIX)
app.include_router(workflow_router, prefix=API_PREFIX)

# ── WebSocket ──
app.websocket("/ws")(websocket_endpoint)


# ── Root endpoint ──
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint — API information."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "description": "Multi-Agent Clinical Workflow Automation Ecosystem",
        "docs": "/docs",
        "health": f"{API_PREFIX}/health",
    }
