"""
LOW Backend Server Entry Point
FastAPI application running on SQLite + SQLAlchemy 2.x
"""
import uvicorn
from app.main import app

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)