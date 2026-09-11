# LOW — Self-Hosting Guide

LOW is designed to be lightweight, open-source, self-hostable, and offline-first with zero heavy external dependencies.

---

## Architecture Overview

- **Backend**: FastAPI + SQLite (via SQLElchemy) + Uvicorn
- **Frontend**: React (SPA) + Tailwind CSS + Lucide Icons
- **Document Format**: Open `.low.json` standard format
- **Persistence**: Single SQLite database file (`low.db`) and an `uploads/` directory for assets.

---

## 1. Quick Start: Local Run

### Prerequisites
- Python 3.10+
- Node.js 18+ and Yarn / npm

### Step 1: Start the Backend
```bash
cd backend
python -m venv venv
# On Linux/macOS:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The API server will run at `http://localhost:8000`. Swagger API docs are available at `http://localhost:8000/docs`.

### Step 2: Start the Frontend
```bash
cd frontend
yarn install
yarn start
```
The frontend dev server will launch at `http://localhost:3000`.

---

## 2. Production Deployment with Docker Compose

Running LOW with Docker Compose gives you a production-ready setup with Nginx reverse proxying the frontend and backend API.

### Directory Setup
Ensure your project contains:
- `docker-compose.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`

### Launch Containers
```bash
# Create local data directory for persistent SQLite and uploads
mkdir -p data/uploads

# Build and start services in background
docker compose up -d --build
```

- Access LOW frontend at: `http://localhost:3000`
- Access LOW backend API directly at: `http://localhost:8000/api`

### Stop Containers
```bash
docker compose down
```

---

## 3. Database Backup & Restore

LOW stores all projects, screen documents, revisions, and agent sessions in a single SQLite file (`low.db`).

### Online SQLite Backup (Zero Downtime)
Using SQLite's safe backup API:

```bash
# On host machine:
agy-tool backup / sqlite3 data/low.db ".backup 'data/low_backup.qlite'"

# Or inside running Docker container:
docker compose exec backend sqlite3 /app/data/low.db ".backup '/app/data/backup.db'"
```

### Restore SQLite Backup
```bash
# 1. Stop backend service
docker compose stop backend
# 2. Replace database file with backup
cp data/low_backup.sqlite data/low.db
# 3. Restart backend service
docker compose start backend
```

---

## 4. Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./low.db` | SQLElchemy connection string |
| `UPLOAD_DIR` | `./uploads` | Directory where uploaded assets are stored |
| `REACT_APP_BACKEND_URL | `/api` | Base URL used by frontend API client |

---

## 5. Security & Maintenance

- **Agent Connect Sessions**: Expired sessions (> 24h) are automatically cleaned up, and can be manually pruned using `DELETE /api/agent/sessions/expired`.
- **Orphan Asset Cleanup**: Run `POST /api/projects/{id}/assets/cleanup-orphans` to delete uploaded assets not referenced by any nodes.
- **Optimistic Concurrency**: Prevents accidental overwrites by validating `expected_revision` during autosave/save operations.
