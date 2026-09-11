# LOW Installation Guide

This guide walks through setting up **LOW (Lowcode Oriented Wireframe)** using **Docker Compose** (recommended for production & quick evaluation) or **Manual Setup** (for active development).

---

## Method 0: 1-Click Launch on Windows (`run.bat`)

If you are on Windows, simply double-click **`run.bat`** in the project root:
- Automatically detects or creates your `.env` configuration.
- Verifies the SQLite database schema and seeds initial components.
- Launches both the FastAPI backend (`:8000`) and React frontend (`:3000`) in separate command windows.
- Automatically opens [http://localhost:3000](http://localhost:3000) in your default browser.
- Also includes a built-in menu to run tests, create backups, or start via Docker Compose.

---

## Method A: Quick Install with Docker Compose (Recommended for Linux/macOS)

Docker Compose bundles the FastAPI backend, precompiled React frontend, and persistent storage volumes in an isolated environment.

### 1. Prerequisites
- [Docker Engine](https://docs.docker.com/engine/install/) (v24.0+)
- [Docker Compose](https://docs.docker.com/compose/) (v2.20+)

### 2. Clone Repository & Setup Environment
```bash
git clone https://github.com/nuexn0x-9/low.git
cd low


# Copy environment template
cp .env.example .env
```

Review `.env` and set a custom `JWT_SECRET`:
```env
JWT_SECRET=your-random-production-secret-key-32chars
AI_PROVIDER=mock
```

### 3. Launch Containers
```bash
docker compose up -d --build
```

### 4. Access the Application
- **Frontend Web UI**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Healthcheck**: [http://localhost:8000/api/health](http://localhost:8000/api/health)

### 5. Stop Containers
```bash
docker compose down
```
*Note: Your SQLite database and uploaded assets persist safely in `./data/` across container restarts.*

---

## Method B: Manual Local Development Setup

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- SQLite 3

### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment:
# On Linux / macOS:
source .venv/bin/activate
# On Windows PowerShell:
.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Initialize database & seed builtin components
python scripts/seed.py

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Backend will be live at `http://localhost:8000`.

### 3. Frontend Setup
In a new terminal:
```bash
cd frontend

# Install packages
npm install

# Start React development server
npm start
```
Frontend will automatically open at `http://localhost:3000`.

---

## Verifying the Installation

1. Open `http://localhost:3000` in your web browser.
2. Click **Create Project** on the dashboard.
3. Name it "Mobile Test" and open the canvas editor.
4. Try dragging a button onto the screen or opening the **AI Import** tab.
