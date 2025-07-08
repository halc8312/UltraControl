@echo off
chcp 65001 > nul
echo ========================================
echo    Devin Clone サーバー完全再起動
echo ========================================
echo.

echo [1/6] 既存のサーバープロセスを検索中...

REM ポート3000-3010, 8000-8010を使用しているプロセスを検索・終了
for /L %%i in (3000,1,3010) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%i') do (
        if not "%%a"=="0" (
            echo ポート %%i のプロセス %%a を終了中...
            taskkill /PID %%a /F >nul 2>&1
        )
    )
)

for /L %%i in (8000,1,8010) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%i') do (
        if not "%%a"=="0" (
            echo ポート %%i のプロセス %%a を終了中...
            taskkill /PID %%a /F >nul 2>&1
        )
    )
)

REM Node.js関連プロセスを終了
echo [2/6] Node.js関連プロセスを終了中...
taskkill /IM node.exe /F >nul 2>&1
taskkill /IM npm.exe /F >nul 2>&1
taskkill /IM pnpm.exe /F >nul 2>&1

REM Python関連プロセスを終了（uvicorn）
echo [3/6] Python/uvicorn関連プロセスを終了中...
for /f "tokens=2" %%a in ('tasklist /FI "IMAGENAME eq python.exe" /FO CSV ^| findstr uvicorn') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo [4/6] 2秒待機中...
timeout /t 2 /nobreak >nul

REM バックエンドサーバー起動
echo [5/6] バックエンドサーバーを起動中...
start "Backend Server" cmd /k "cd /d %~dp0backend\core && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && alembic upgrade head && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo [6/6] 5秒待機後、フロントエンドサーバーを起動中...
timeout /t 5 /nobreak >nul

REM フロントエンドサーバー起動
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm install && npm run dev"

echo.
echo ========================================
echo    サーバー起動完了！
echo ========================================
echo.
echo バックエンド: http://localhost:8000
echo フロントエンド: http://localhost:3000
echo API ドキュメント: http://localhost:8000/docs
echo.
echo 各サーバーの起動状況は別ウィンドウで確認してください。
echo このウィンドウは閉じても構いません。
echo.
pause 