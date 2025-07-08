# UltraControl クイックスタート 🚀

## 最速で起動する方法（5分）

### 1. 依存関係のインストール
```bash
# プロジェクトルートで実行
pnpm install
```

### 2. 環境設定
```bash
# 環境ファイルをコピー
cp packages/ultracontrol-app/.env.example packages/ultracontrol-app/.env.local

# .env.localを編集して、最低限以下を設定：
# VITE_OPENAI_API_KEY=sk-...（OpenAI APIキー）
# または
# VITE_ANTHROPIC_API_KEY=sk-ant-...（Anthropic APIキー）
```

### 3. 開発サーバー起動

#### 方法A: 自動起動スクリプト（推奨）
```bash
./start-dev.sh
```

#### 方法B: 手動起動（最小構成）
```bash
cd packages/ultracontrol-app
pnpm dev
```

### 4. ブラウザでアクセス
```
http://localhost:5173
```

## 最小限の動作確認

1. **LLM接続テスト**
   - 設定 → LLMプロバイダー
   - 接続状態を確認

2. **基本機能テスト**
   - マルチモーダル入力にテキストを入力
   - AIアシスタントに質問

3. **プラグインテスト**
   - 設定 → プラグイン
   - Hello Worldプラグインを有効化

## トラブルシューティング

### エラー: APIキーが無効
```bash
# .env.localのAPIキーを確認
cat packages/ultracontrol-app/.env.local | grep API_KEY
```

### エラー: ポート5173が使用中
```bash
# 別のポートで起動
cd packages/ultracontrol-app
pnpm dev --port 5174
```

### エラー: 依存関係エラー
```bash
# クリーンインストール
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

## 必要なAPIキー取得先

- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/settings/keys

## 次のステップ

1. [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md) - 詳細な開発環境設定
2. [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - 実装の概要
3. [PLUGINS_ARCHITECTURE.md](./PLUGINS_ARCHITECTURE.md) - プラグイン開発ガイド

---

**注意**: 最低限1つのLLM APIキー（OpenAIまたはAnthropic）が必要です。