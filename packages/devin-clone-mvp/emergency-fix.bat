@echo off
echo 🚨 緊急修正モード

REM 全プロセス強制終了
taskkill /IM node.exe /F >nul 2>&1
taskkill /IM python.exe /F >nul 2>&1

REM キャッシュ完全削除
rmdir /s /q "frontend\.next" >nul 2>&1
rmdir /s /q "frontend\node_modules" >nul 2>&1

echo 📱 バックエンドのみ起動中...
start "Backend Only" cmd /k "cd /d %~dp0backend\core && venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

echo ✅ バックエンド起動完了！
echo 🧪 テスト: http://localhost:3000/test.html
echo 📱 API: http://localhost:8000/docs

echo.
echo Next.jsに問題がある場合は、基本HTMLページのみ使用してください。
pause 