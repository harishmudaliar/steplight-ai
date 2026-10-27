from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.api.routes import router as api_router

# Enforce fail-closed security posture before starting app
settings.validate_security()
show_api_docs = settings.DEBUG or settings.APP_ENV.lower() in ("development", "test", "dev")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Steplight AI Backend - One Tiny Step. Zero Shame.",
    docs_url="/docs" if show_api_docs else None,
    redoc_url="/redoc" if show_api_docs else None,
)

# Explicit Development CORS setup
development_origin_regex = (
    r"^http://(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$"
    if settings.APP_ENV.lower() in ("development", "dev", "test")
    else None
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    # Vite moves to the next port when 5173 is occupied. Restrict fallback
    # origins to loopback development hosts; never enable this in production.
    allow_origin_regex=development_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Mount API routes under /api
app.include_router(api_router, prefix=settings.API_PREFIX)


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "tagline": settings.TAGLINE,
        "health": f"{settings.API_PREFIX}/health",
        "version": f"{settings.API_PREFIX}/version",
    }
