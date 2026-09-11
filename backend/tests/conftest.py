import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Determine worker ID for pytest-xdist isolation
worker_id = os.environ.get("PYTEST_XDIST_WORKER", "gw0")
TEST_DB_PATH = backend_dir / f"test_low_{worker_id}.db"
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH.as_posix()}"
os.environ["ASSET_STORAGE_PATH"] = str(backend_dir / "storage" / f"test_assets_{worker_id}")
os.environ["ALLOW_DEV_LOCAL_USER"] = "true"

from app.core.config import settings
settings.DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH.as_posix()}"
settings.ASSET_STORAGE_PATH = str(backend_dir / "storage" / f"test_assets_{worker_id}")

from app.core.database import Base, engine, AsyncSessionLocal, seed_database
from app.main import app


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    if TEST_DB_PATH.exists():
        try:
            TEST_DB_PATH.unlink()
        except Exception:
            pass

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed_database(session)

    yield

    # Cleanup
    await engine.dispose()
    if TEST_DB_PATH.exists():
        try:
            TEST_DB_PATH.unlink()
        except Exception:
            pass


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient):
    # Register and login a test user
    email = f"tester_{worker_id}@low.design"
    password = "password123"
    reg_resp = await client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "name": "Tester"},
    )
    if reg_resp.status_code == 201:
        token = reg_resp.json()["access_token"]
    else:
        login_resp = await client.post(
            "/api/auth/login",
            json={"email": email, "password": password},
        )
        token = login_resp.json()["access_token"]

    return {"Authorization": f"Bearer {token}"}
