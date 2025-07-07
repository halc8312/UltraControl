@echo off
title Devin Clone MVP - Starting Servers

REM Start backend server in a new window
start "Backend Server" cmd /k "cd /d "%~dp0backend\core" && .\venv\Scripts\activate && python -m uvicorn app.main:app --reload --port 8000"

REM Give backend a moment to start
ping -n 5 127.0.0.1 > nul

REM Start frontend in a new window
start "Frontend Server" cmd /k "cd /d "%~dp0frontend" && pnpm dev"

echo Servers are starting in separate windows...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000

REM Open frontend in default browser after a short delay
ping -n 6 127.0.0.1 > nul
start http://localhost:3000
