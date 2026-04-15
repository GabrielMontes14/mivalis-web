"""
Codavity API - Motor de Agentes SaaS
Management Plane para despliegue automático de workflows en n8n
"""
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
from pathlib import Path
from pythonjsonlogger import jsonlogger

from app.core.config import settings
from app.api.v1 import health, deploy
from app.api.v1 import agents, leads, dashboard, chat

# ── Configuración de logging estructurado ──
logger = logging.getLogger()
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter(
    fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S"
)
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)
logger.setLevel(logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events: startup and shutdown"""
    logger.info("🚀 Codavity API iniciando...", extra={"event": "startup"})
    yield
    logger.info("🛑 Codavity API deteniendo...", extra={"event": "shutdown"})


# ── Inicializar FastAPI ──
app = FastAPI(
    title="Codavity API",
    description="Motor de Agentes SaaS - Management Plane",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
)

# ── CORS (para desarrollo) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.ENVIRONMENT == "development" else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Exception handlers ──
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Captura todas las excepciones no manejadas"""
    logger.error(
        "Excepción no manejada",
        extra={
            "error": str(exc),
            "path": request.url.path,
            "method": request.method,
        },
        exc_info=True,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "status": "error",
            "message": "Error interno del servidor. El equipo de Codavity ha sido notificado.",
        },
    )


# ── Incluir routers ──
app.include_router(health.router, tags=["Health"])
app.include_router(deploy.router, prefix="/api/v1", tags=["Deploy"])
app.include_router(agents.router, prefix="/api/v1", tags=["Agents"])
app.include_router(leads.router, prefix="/api/v1", tags=["Leads"])
app.include_router(dashboard.router, prefix="/api/v1", tags=["Dashboard"])
app.include_router(chat.router, prefix="/api/v1", tags=["Chat"])

# ── Servir archivos estáticos del Dashboard ──
dashboard_dir = Path(__file__).parent.parent / "dashboard"
if dashboard_dir.exists():
    app.mount("/dashboard", StaticFiles(directory=str(dashboard_dir), html=True), name="dashboard")


@app.get("/")
async def root():
    """Root endpoint - información de la API"""
    return {
        "service": "Codavity API",
        "version": "1.0.0",
        "status": "operational",
        "dashboard": "/dashboard/",
        "docs": "/docs" if settings.ENVIRONMENT != "production" else None,
    }

