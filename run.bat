@echo off
title LOW (Lowcode Oriented Wireframe)
setlocal enabledelayedexpansion

echo ======================================================================
echo           LOW (Lowcode Oriented Wireframe) - Launcher
echo ======================================================================
echo.

cd /d "%~dp0"

:: 1. Check for .env file
if not exist ".env" (
    if exist ".env.example" (
        echo [*] .env not found. Copying from .env.example...
        copy .env.example .env >nul
        echo [*] Created .env successfully.
    )
)

:: 2. Display Menu
echo Choose an option (Press Enter for Option 1):
echo [1] Start Full Stack (Backend :8000 + Frontend :3000)
echo [2] Start with Docker Compose
echo [3] Run All Tests (Backend Pytest + Frontend Jest)
echo [4] Create SQLite Database Backup
echo [5] Seed Built-in Components and Templates
echo [6] Reset Development Database
echo.
set /p choice="Enter choice [1-6, default=1]: "

if "%choice%"=="" set choice=1
if "%choice%"=="1" goto start_dev
if "%choice%"=="2" goto start_docker
if "%choice%"=="3" goto run_tests
if "%choice%"=="4" goto backup_db
if "%choice%"=="5" goto seed_db
if "%choice%"=="6" goto reset_db

echo Invalid choice. Starting Full Stack by default...
goto start_dev

:start_dev
echo.
echo ======================================================================
echo Starting LOW Local Development Server...
echo ======================================================================

:: Check Python virtual environment in backend
set "PYTHON_EXE=python"
if exist "backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0backend\.venv\Scripts\python.exe"
    echo [*] Using backend virtualenv: backend\.venv
)

:: Run database seed to make sure tables exist
echo [*] Checking database...
%PYTHON_EXE% backend\scripts\seed.py

:: Launch Backend in separate window
echo [*] Starting FastAPI Backend on http://localhost:8000 ...
start "LOW Backend API (:8000)" cmd /k "cd /d "%~dp0backend" && %PYTHON_EXE% -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Launch Frontend in separate window
echo [*] Starting React Frontend on http://localhost:3000 ...
start "LOW Frontend (:3000)" cmd /k "cd /d "%~dp0frontend" && npm start"

:: Wait 3 seconds and open browser
ping -n 4 127.0.0.1 >nul
start http://localhost:3000

echo.
echo ======================================================================
echo LOW is running!
echo - Frontend: http://localhost:3000
echo - Backend:  http://localhost:8000/docs
echo.
echo Both services are running in their respective command windows.
echo You can close this launcher window safely.
echo ======================================================================
pause
exit /b 0

:start_docker
echo.
echo [*] Launching LOW using Docker Compose...
docker compose up -d --build
if errorlevel 1 (
    echo [ERROR] Docker Compose failed to start.
    pause
    exit /b 1
)
ping -n 4 127.0.0.1 >nul
start http://localhost:3000
echo [*] Containers are running. Access at http://localhost:3000
pause
exit /b 0

:run_tests
echo.
echo ======================================================================
echo Running Test Suites...
echo ======================================================================
set "PYTHON_EXE=python"
if exist "backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0backend\.venv\Scripts\python.exe"
)
echo.
echo [1/2] Running Backend Pytest...
%PYTHON_EXE% -m pytest backend/tests -v
echo.
echo [2/2] Running Frontend Jest Tests...
cmd /c "cd /d "%~dp0frontend" && npm test -- --watchAll=false"
echo.
echo All tests finished.
pause
exit /b 0

:backup_db
echo.
set "PYTHON_EXE=python"
if exist "backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0backend\.venv\Scripts\python.exe"
)
%PYTHON_EXE% backend\scripts\backup.py
pause
exit /b 0

:seed_db
echo.
set "PYTHON_EXE=python"
if exist "backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0backend\.venv\Scripts\python.exe"
)
%PYTHON_EXE% backend\scripts\seed.py
pause
exit /b 0

:reset_db
echo.
set /p confirm="Are you sure you want to reset the database? All local changes will be lost! (y/N): "
if /i not "%confirm%"=="y" (
    echo Operation cancelled.
    pause
    exit /b 0
)
set "PYTHON_EXE=python"
if exist "backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0backend\.venv\Scripts\python.exe"
)
%PYTHON_EXE% backend\scripts\reset_dev.py
pause
exit /b 0
