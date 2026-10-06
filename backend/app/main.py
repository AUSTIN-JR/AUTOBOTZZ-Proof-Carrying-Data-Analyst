"""AUTOBOTZZ FastAPI Application Entrypoint.

Proof-Carrying Data Analyst Backend.
Phase 2A: Real Backend Foundation & Tabular Data Ingestion.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.analysis import router as analysis_router
from app.api.datasets import router as datasets_router
from app.core.config import get_settings
from app.utils.logging import logger

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan lifecycle events."""
    logger.info(
        f"AUTOBOTZZ API started successfully (version {settings.app_version}, env: {settings.environment})"
    )
    logger.info(f"Storage directory: {settings.storage_dir}")
    logger.info(f"Allowed CORS origins: {settings.allowed_origins}")
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=settings.description,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS safely for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Format HTTP exceptions into consistent API error responses."""
    if isinstance(exc.detail, dict):
        error_payload = {
            "error": {
                "code": exc.detail.get("code", "HTTP_ERROR"),
                "message": exc.detail.get("message", "An error occurred."),
                "details": exc.detail.get("details", {}),
            }
        }
    else:
        error_payload = {
            "error": {
                "code": "HTTP_ERROR",
                "message": str(exc.detail),
                "details": {},
            }
        }

    return JSONResponse(status_code=exc.status_code, content=error_payload)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Safely catch unhandled errors without leaking stack traces to the client."""
    logger.exception(f"Unhandled server error on {request.method} {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected internal server error occurred.",
                "details": {},
            }
        },
    )


@app.get(
    "/health",
    summary="Health check endpoint",
    description="Returns operational status and service metadata.",
    tags=["system"],
)
async def health_check() -> dict:
    """Return API health status."""
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.app_version,
    }


# Include functional routers
app.include_router(datasets_router)
app.include_router(analysis_router)
