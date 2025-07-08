# UltraControl 開発環境セットアップガイド

## 前提条件

### 必須ソフトウェア
- **Node.js**: v18.0.0以上
- **pnpm**: v8.0.0以上
- **Git**: 最新版
- **Docker**: (OpenHands実行用、オプション)

### 推奨環境
- **OS**: Windows 11/WSL2、macOS、Linux
- **メモリ**: 16GB以上
- **ディスク**: 10GB以上の空き容量

## セットアップ手順

### 1. リポジトリのクローン（既に完了済みの場合はスキップ）
```bash
git clone https://github.com/[your-username]/UltraControl.git
cd UltraControl
```

### 2. 依存関係のインストール

```bash
# pnpmがインストールされていない場合
npm install -g pnpm

# ルートディレクトリで実行
pnpm install

# 各パッケージの依存関係をインストール
pnpm -r install
```

### 3. 環境変数の設定

#### 3.1 メインアプリケーション用
```bash
# packages/ultracontrol-app/.env.local を作成
cd packages/ultracontrol-app
cp .env.example .env.local
```

`.env.local` を編集：
```env
# LLM API Keys
VITE_ANTHROPIC_API_KEY=your-anthropic-api-key
VITE_OPENAI_API_KEY=your-openai-api-key

# Optional: Other providers
VITE_COHERE_API_KEY=your-cohere-api-key
VITE_MISTRAL_API_KEY=your-mistral-api-key

# Backend URLs
VITE_OPENHANDS_URL=http://localhost:8000
VITE_DEVIN_API_URL=http://localhost:3001
VITE_BOLT_API_URL=http://localhost:5173

# WebSocket
VITE_WS_URL=ws://localhost:8000/ws/events
```

#### 3.2 Devin Clone用（必要な場合）
```bash
cd packages/devin-clone-mvp
cp .env.mvp.example .env.local
```

#### 3.3 Bolt.new用（必要な場合）
```bash
cd packages/bolt.new-any-llm-main
cp .env.example .env.local
```

### 4. 開発サーバーの起動

#### 方法1: 個別起動（推奨）

**Terminal 1: メインアプリケーション**
```bash
cd packages/ultracontrol-app
pnpm dev
# http://localhost:5173 で起動
```

**Terminal 2: OpenHands バックエンド（必要な場合）**
```bash
cd packages/OpenHands-main
poetry install  # 初回のみ
poetry run uvicorn openhands.server.app:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 3: Devin Clone（必要な場合）**
```bash
cd packages/devin-clone-mvp
# フロントエンド
cd frontend
pnpm dev
# http://localhost:3000 で起動

# バックエンド（別ターミナル）
cd ../backend/core
pip install -r requirements.txt  # 初回のみ
uvicorn app.main:app --reload --port 3001
```

#### 方法2: 統合起動スクリプト

```bash
# ルートディレクトリに起動スクリプトを作成
cat > start-dev.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting UltraControl Development Environment..."

# Function to kill all processes on exit
cleanup() {
    echo "🛑 Stopping all services..."
    kill $(jobs -p) 2>/dev/null
    exit
}
trap cleanup EXIT

# Start main app
echo "📦 Starting UltraControl App..."
cd packages/ultracontrol-app
pnpm dev &

# Wait for main app to start
sleep 5

# Start OpenHands backend (optional)
if [ -d "packages/OpenHands-main" ]; then
    echo "🤖 Starting OpenHands Backend..."
    cd packages/OpenHands-main
    poetry run uvicorn openhands.server.app:app --reload --host 0.0.0.0 --port 8000 &
    cd ../..
fi

# Show running services
echo "✅ Services started:"
echo "  - UltraControl App: http://localhost:5173"
echo "  - OpenHands Backend: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
wait
EOF

chmod +x start-dev.sh
./start-dev.sh
```

### 5. 開発環境の確認

1. **メインアプリケーション**: http://localhost:5173
   - 統合UIが表示されることを確認
   - LLMプロバイダーの接続状態を確認

2. **WebSocket接続**: 
   - ブラウザの開発者ツール → Network → WS
   - `ws://localhost:8000/ws/events` への接続を確認

3. **プラグインシステム**:
   - Settings → Plugins でプラグイン管理画面を確認
   - Hello World プラグインをロード

### 6. テストの実行

```bash
cd packages/ultracontrol-app

# ユニットテスト
pnpm test

# エンドツーエンドテスト
pnpm test:e2e

# カバレッジ付きテスト
pnpm test:coverage
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. ポート競合
```bash
# 使用中のポートを確認
lsof -i :5173  # macOS/Linux
netstat -ano | findstr :5173  # Windows

# プロセスを終了
kill -9 [PID]  # macOS/Linux
taskkill /PID [PID] /F  # Windows
```

#### 2. 依存関係エラー
```bash
# キャッシュクリア
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### 3. TypeScriptエラー
```bash
# 型定義の再生成
pnpm build:types
```

#### 4. WebSocket接続エラー
- OpenHandsバックエンドが起動していることを確認
- ファイアウォール設定を確認
- WSL2の場合、ポートフォワーディングを確認

### デバッグモード

```bash
# 詳細ログを有効化
DEBUG=* pnpm dev

# 特定モジュールのみ
DEBUG=ultracontrol:* pnpm dev
```

## 開発のヒント

### 1. VS Code推奨拡張機能
- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Tailwind CSS IntelliSense

### 2. Git フック設定
```bash
# Husky設定
pnpm prepare

# コミット前の自動フォーマット
pnpm add -D lint-staged
```

### 3. ホットリロード
- ファイル保存時に自動的にブラウザが更新されます
- HMR（Hot Module Replacement）が有効

## 最小構成での起動

最小限の機能で起動する場合：

```bash
cd packages/ultracontrol-app

# 環境変数を最小限に設定
echo "VITE_OPENAI_API_KEY=your-key" > .env.local

# 開発サーバー起動
pnpm dev
```

これで基本的なUI機能とLLM統合が利用可能になります。

## 本番ビルド

```bash
cd packages/ultracontrol-app

# ビルド
pnpm build

# プレビュー
pnpm preview
# http://localhost:4173 で確認
```

## 次のステップ

1. LLM APIキーを取得して設定
2. 開発サーバーを起動
3. サンプルプロジェクトを作成して機能を確認
4. プラグインを試す
5. テストを実行して動作確認

---

問題が発生した場合は、GitHubのIssueまたはDiscussionsでサポートを受けてください。