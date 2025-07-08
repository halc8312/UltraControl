@echo off
chcp 65001 > nul
echo ========================================
echo    完全クリーンアップ & 再構築
echo ========================================
echo.

echo [1/8] 全プロセス強制終了中...
taskkill /IM node.exe /F >nul 2>&1
taskkill /IM npm.exe /F >nul 2>&1
taskkill /IM pnpm.exe /F >nul 2>&1
taskkill /IM python.exe /F >nul 2>&1

echo [2/8] Next.jsキャッシュ削除中...
if exist "frontend\.next" rmdir /s /q "frontend\.next"
if exist "frontend\node_modules" rmdir /s /q "frontend\node_modules"
if exist "frontend\package-lock.json" del /f "frontend\package-lock.json"

echo [3/8] 一時ファイル削除中...
if exist "frontend\.env.local" del /f "frontend\.env.local"
if exist "node_modules" rmdir /s /q "node_modules"
if exist "package-lock.json" del /f "package-lock.json"

echo [4/8] 環境変数ファイル作成中...
(
echo NEXT_PUBLIC_API_URL=http://localhost:8000
echo NEXTAUTH_URL=http://localhost:3000
echo NEXTAUTH_SECRET=dev-secret-key-change-in-production
echo GOOGLE_CLIENT_ID=
echo GOOGLE_CLIENT_SECRET=
) > "frontend\.env.local"

echo [5/8] フロントエンド依存関係インストール中...
cd frontend
npm cache clean --force
npm install

echo [6/8] バックエンド準備中...
cd ..\backend\core
if not exist "venv" python -m venv venv
call venv\Scripts\activate.bat
pip install --upgrade pip
pip install -r requirements.txt

echo [7/8] データベース初期化中...
alembic upgrade head

echo [8/8] サーバー起動中...
cd ..\..
start "Backend Server" cmd /k "cd /d %~dp0backend\core && venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo    完全再構築完了！
echo ========================================
echo.
echo 🌐 フロントエンド: http://localhost:3000
echo 📱 バックエンド: http://localhost:8000
echo 🧪 テストページ: http://localhost:3000/test.html
echo.
echo 各サーバーの起動を確認してからアクセスしてください。
pause 