# UltraControl 🚀

AI駆動型統合開発環境プラットフォーム

## 概要

UltraControlは、3つの強力なAI開発ツールを統合した包括的な開発プラットフォームです：

- **bolt.new-any-llm-main** - ブラウザ内でのAI駆動型フルスタックWeb開発
- **devin-clone-mvp** - AIソフトウェアエンジニアアシスタント  
- **OpenHands-main** - AI開発エージェントプラットフォーム

## 🚀 クイックスタート

### 前提条件

- Node.js 18+
- pnpm 8+
- Git

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/halc8312/UltraControl.git
cd UltraControl

# 依存関係のインストール
pnpm install

# 開発サーバーの起動
cd packages/ultracontrol-app
pnpm run dev
```

開発サーバーは http://localhost:5173 で起動します。

## 📁 プロジェクト構造

```
UltraControl/
├── packages/
│   ├── ultracontrol-app/      # メインアプリケーション
│   ├── bolt.new-any-llm-main/ # Bolt.new フォーク
│   ├── devin-clone-mvp/       # Devin クローン
│   └── OpenHands-main/        # OpenHands プラットフォーム
├── package.json
├── pnpm-workspace.yaml
└── WORK_PLAN.md              # 開発計画
```

## 🛠️ 技術スタック

- **フロントエンド**: React 18, Vite, TypeScript
- **スタイリング**: UnoCSS, SCSS
- **エディタ**: CodeMirror 6
- **AI統合**: Vercel AI SDK
- **コンテナ**: WebContainers API

## 📋 開発状況

- ✅ Phase 1: UI基盤構築 - 完了
- 🚧 Phase 2: 機能統合 - 進行中
- ⏳ Phase 3: エージェント統合 - 計画中
- ⏳ Phase 4: 最終統合 - 計画中

## 🤝 貢献

プロジェクトへの貢献を歓迎します！詳細は[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。 