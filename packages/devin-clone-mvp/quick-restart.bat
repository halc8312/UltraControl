@echo off
echo 🚀 クイック再起動中...

REM 既存プロセスを強制終了
taskkill /IM node.exe /F >nul 2>&1
taskkill /IM python.exe /F >nul 2>&1

REM 2秒待機
timeout /t 2 /nobreak >nul

echo 📱 バックエンド起動中...
start "Backend" cmd /k "cd /d %~dp0backend\core && venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo 🌐 フロントエンド起動中...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo ✅ 完了！
echo 📍 http://localhost:3000 でアクセスしてください
timeout /t 3 /nobreak >nul 