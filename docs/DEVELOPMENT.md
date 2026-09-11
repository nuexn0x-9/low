# LOW Developer Guide

This document is for developers contributing code or building extensions for **LOW**.

---

## 1. Codebase Structure

```
low/
├── backend/                  # FastAPI + SQLite Async Backend
│   ├── alembic/              # Database migration definitions
│   ├── app/
│   │   ├── api/              # HTTP routers (routes_auth, routes_documents, routes_agent, routes_ai)
│   │   ├── core/             # Configuration, database connection, JWT security
│   │   ├── models/           # SQLAlchemy ORM models (User, Project, Document, AgentSession, AIImportDraft)
│   │   ├── schemas/          # Pydantic validation schemas
│   │   └── services/         # Business logic (agent_service, import_service, ai providers)
│   ├── scripts/              # Standalone CLI tools (seed.py, reset_dev.py, backup.py)
│   └── tests/                # Pytest async test suite (36 tests)
│
├── frontend/                 # React 19 SPA (Tailwind CSS, Lucide Icons)
│   ├── public/               # HTML template and favicon
│   └── src/
│       ├── components/
│       │   ├── editor/       # Canvas, Sidebar, Properties, AI Import Panel, Agent Panel
│       │   └── dashboard/    # Project grid, creation modal, search
│       ├── data/             # API clients (storage.js, agentApi.js, aiApi.js)
│       └── styles/           # Global Tailwind CSS styles
│
├── docs/                     # Specifications, protocols, guides
└── docker-compose.yml        # Container orchestration
```

---

## 2. Coding Conventions

- **Aesthetic**: All user interface components MUST adhere to the monochrome zinc color palette (`#18181b`, `#27272a`, `#3f3f46`, `#71717a`, `#a1a1aa`, `#d4d4d8`, `#e4e4e7`, `#f4f4f5`, `#ffffff`). Do not introduce colored gradients or non-essential bright accents.
- **Backend Architecture**:
  - Keep endpoints thin; place business logic in `app/services/`.
  - Always handle concurrency with optimistic locks (`revision` matching).
  - All agent actions must be purely data mutations without shelling out to OS commands.
- **Frontend Architecture**:
  - React 19 functional components with hooks.
  - Test UI components with `@testing-library/react`.
  - Offline fallback: Always keep offline editing capable via `localStorage` sync if the backend is temporarily unreachable.

---

## 3. Running Test Suites

```bash
# Run backend pytest (all 36 tests)
cd backend
python -m pytest -v

# Run frontend test suite
cd frontend
npm test -- --watchAll=false

# Test production compilation
npm run build
```
