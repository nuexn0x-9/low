import logging
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db
from app.api import api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("low.backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database and seeding defaults...")
    # Ensure asset directory exists
    Path(settings.ASSET_STORAGE_PATH).mkdir(parents=True, exist_ok=True)
    await init_db()
    logger.info("Database initialized successfully.")
    yield
    logger.info("Shutting down LOW backend...")


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
)

# Health endpoint
@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "app": "LOW",
    }


# Include all API routes
app.include_router(api_router)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
