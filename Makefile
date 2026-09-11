.PHONY: help dev backend frontend test test-backend test-frontend build docker-up docker-down seed reset-dev backup

help:
	@echo "LOW (Lowcode Oriented Wireframe) — Commands:"
	@echo "  make dev            Run backend and frontend"
	@echo "  make backend        Start FastAPI backend on :8000"
	@echo "  make frontend       Start React frontend on :3000"
	@echo "  make test           Run all tests (backend & frontend)"
	@echo "  make test-backend   Run pytest backend suite"
	@echo "  make test-frontend  Run jest frontend suite"
	@echo "  make build          Build frontend production bundle"
	@echo "  make docker-up      Start full stack via Docker Compose"
	@echo "  make docker-down    Stop Docker Compose containers"
	@echo "  make seed           Seed components and templates"
	@echo "  make reset-dev      Reset dev SQLite database"
	@echo "  make backup         Backup SQLite database to backups/"

dev:
	@echo "Starting backend and frontend..."
	@python -m uvicorn app.main:app --app-dir backend --reload --port 8000 & (cd frontend && npm start)

backend:
	python -m uvicorn app.main:app --app-dir backend --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm start

test: test-backend test-frontend

test-backend:
	cd backend && python -m pytest -v

test-frontend:
	cd frontend && npm test -- --watchAll=false

build:
	cd frontend && npm run build

docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

seed:
	python backend/scripts/seed.py

reset-dev:
	python backend/scripts/reset_dev.py

backup:
	python backend/scripts/backup.py
