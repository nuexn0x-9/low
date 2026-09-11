from fastapi import APIRouter
from app.api.routes_auth import router as auth_router
from app.api.routes_projects import router as projects_router
from app.api.routes_documents import router as documents_router
from app.api.routes_import_export import router as import_export_router
from app.api.routes_assets import router as assets_router
from app.api.routes_library import router as library_router
from app.api.routes_agent import router as agent_router
from app.api.routes_ai import router as ai_router
from app.api.routes_settings import router as settings_router

api_router = APIRouter(prefix="/api")

# Mount all feature routers
api_router.include_router(auth_router)
api_router.include_router(projects_router)
api_router.include_router(documents_router)
api_router.include_router(import_export_router)
api_router.include_router(assets_router)
api_router.include_router(library_router)
api_router.include_router(agent_router)
api_router.include_router(ai_router)
api_router.include_router(settings_router)

__all__ = ["api_router"]

