# LOW Backend (Phase 1)

Lightweight, self-hostable document backend for the LOW Mobile UI/UX Editor.

## Stack

- **Framework**: FastAPI (Python 3.10+)
- **Database**: SQLite with SQLAlchemy 2.x (async via `aiosqlite`)
- **Migrations**: Alembic
- **Auth**: Local authentication with password hashing and JWT
- **Document Storage**: JSON document blob with auto-incrementing revisions and version history
- **Asset Storage**: Local filesystem with metadata in SQLite
- **Agent Connect**: Experimental AI agent API with token hashing, session expiry, and audit events
- **Testing**: pytest & pytest-asyncio

## Directory Structure

```txt
backend/
  app/
    main.py              # FastAPI application entrypoint & health endpoint
    core/
      config.py          # App settings & environment loading
      database.py        # SQLAlchemy async engine, sessionmaker & seeders
      security.py        # Password hashing, JWT & token generation
    models/
      base.py            # Declarative base
      user.py            # User model
      project.py         # Project model (with soft delete)
      document.py        # Document & DocumentVersion models
      asset.py           # Asset model
      library.py         # Component & Template models
      agent.py           # AgentSession & AgentEvent models
    schemas/             # Pydantic v2 validation models
    api/                 # API route handlers
    services/            # Document, import/export, asset, and agent services
  alembic/               # Database migration scripts
  tests/                 # Automated test suite
  requirements.txt
  .env.example
```

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 3. Run Database Migrations

```bash
alembic upgrade head
```

This creates `low.db` with all required tables and seeds default components, templates, and the local user (`local@low.design`).

### 4. Start the Backend Server

```bash
uvicorn app.main:app --port 8000 --reload
```

Health check:
```bash
curl http://localhost:8000/api/health
# {"status":"ok","app":"LOW"}
```

API docs:
Visit `http://localhost:8000/docs` for interactive Swagger UI.

### 5. Run Tests

```bash
pytest
```
