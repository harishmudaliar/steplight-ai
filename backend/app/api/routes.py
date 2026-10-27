from fastapi import APIRouter
from backend.app.config import settings
from backend.app.api.auth import router as auth_router
from backend.app.api.tasks import router as tasks_router
from backend.app.api.plans import router as plans_router
from backend.app.api.preferences import router as preferences_router
from backend.app.api.activity import router as activity_router
from backend.app.api.privacy import router as privacy_router
from backend.app.api.goals import router as goals_router

router = APIRouter()

router.include_router(auth_router)
router.include_router(tasks_router)
router.include_router(plans_router)
router.include_router(preferences_router)
router.include_router(activity_router)
router.include_router(privacy_router)
router.include_router(goals_router)


@router.get("/health")
async def health():
    """
    Health check endpoint returning system status and current environment.
    Used by frontend health monitors, load balancers, and Electron client.
    """
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
    }


@router.get("/version")
async def version():
    """
    Version endpoint returning the active API version and brand tagline.
    """
    return {
        "version": settings.APP_VERSION,
        "app_name": settings.APP_NAME,
        "tagline": settings.TAGLINE,
    }
