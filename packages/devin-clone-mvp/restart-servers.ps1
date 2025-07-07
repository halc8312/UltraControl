# PowerShell用サーバー再起動スクリプト
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Devin Clone サーバー完全再起動" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 管理者権限チェック
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "⚠️  管理者権限で実行することを推奨します" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "[1/6] 既存のサーバープロセスを検索・終了中..." -ForegroundColor Green

# ポート3000-3010, 8000-8010を使用しているプロセスを検索・終了
$ports = @(3000..3010) + @(8000..8010)
foreach ($port in $ports) {
    $processes = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    foreach ($pid in $processes) {
        if ($pid -and $pid -ne 0) {
            try {
                $processName = (Get-Process -Id $pid -ErrorAction SilentlyContinue).ProcessName
                Write-Host "  ポート $port のプロセス $processName (PID: $pid) を終了中..." -ForegroundColor Yellow
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            } catch {
                # プロセスが既に終了している場合は無視
            }
        }
    }
}

Write-Host "[2/6] Node.js関連プロセスを終了中..." -ForegroundColor Green
Get-Process -Name "node", "npm", "pnpm" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "[3/6] Python/uvicorn関連プロセスを終了中..." -ForegroundColor Green
Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*uvicorn*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "[4/6] 3秒待機中..." -ForegroundColor Green
Start-Sleep -Seconds 3

# プロジェクトルートディレクトリを取得
$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "[5/6] バックエンドサーバーを起動中..." -ForegroundColor Green
$backendPath = Join-Path $projectRoot "backend\core"
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; if (!(Test-Path 'venv')) { python -m venv venv }; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt; alembic upgrade head; uvicorn app.main:app --reload --host 0.0.0.0 --port 8000" -WindowStyle Normal

Write-Host "[6/6] 5秒待機後、フロントエンドサーバーを起動中..." -ForegroundColor Green
Start-Sleep -Seconds 5

$frontendPath = Join-Path $projectRoot "frontend"
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm install; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   サーバー起動完了！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 バックエンド: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:8000" -ForegroundColor Green
Write-Host "🌐 フロントエンド: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3000" -ForegroundColor Green
Write-Host "📚 API ドキュメント: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:8000/docs" -ForegroundColor Green
Write-Host "🧪 テストページ: " -NoNewline -ForegroundColor White
Write-Host "http://localhost:3000/test.html" -ForegroundColor Green
Write-Host ""
Write-Host "各サーバーの起動状況は別ウィンドウで確認してください。" -ForegroundColor Yellow
Write-Host "このウィンドウは閉じても構いません。" -ForegroundColor Yellow
Write-Host ""

# 環境変数チェック
$envPath = Join-Path $frontendPath ".env.local"
if (!(Test-Path $envPath)) {
    Write-Host "⚠️  .env.local ファイルが見つかりません" -ForegroundColor Red
    Write-Host "   フロントエンドディレクトリに以下の内容で作成してください:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "NEXT_PUBLIC_API_URL=http://localhost:8000" -ForegroundColor Cyan
    Write-Host "NEXTAUTH_URL=http://localhost:3000" -ForegroundColor Cyan
    Write-Host "NEXTAUTH_SECRET=your-secret-key-here" -ForegroundColor Cyan
    Write-Host ""
}

Read-Host "Enterキーを押して終了..." 