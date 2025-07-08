# Devin Clone MVP 🚀

**AIソフトウェアエンジニアアシスタント - MVP開発完了**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Claude AI](https://img.shields.io/badge/Claude_AI-3.5_Sonnet-orange?style=for-the-badge)](https://www.anthropic.com/claude)

## 🎉 プロジェクト完了！

**Devin Clone MVP**の開発が完了しました！このプロジェクトは、AIを活用したソフトウェア開発アシスタントのMVP（最小実行可能製品）です。

## ✨ 主要機能

### 🔐 認証システム
- **メール/パスワード認証** - 従来の認証方式
- **Google OAuth** - ソーシャルログイン
- **JWT認証** - セキュアなセッション管理
- **ロールベースアクセス制御** - ユーザー/管理者権限

### 📁 プロジェクト管理
- **プロジェクトCRUD** - 作成・読み取り・更新・削除
- **ファイル管理** - 階層構造のファイルシステム
- **コードエディタ** - Monaco Editor統合
- **リアルタイム保存** - 自動保存機能

### 🤖 AIチャット機能
- **Claude 3.5 Sonnet** - 最新のAIモデル統合
- **コード生成** - プロンプトベースのコード生成
- **コード説明** - 既存コードの解説
- **コード修正** - バグ修正と改善提案
- **ストリーミング応答** - リアルタイムレスポンス

### 💳 決済システム
- **Stripe統合** - 安全な決済処理
- **サブスクリプション管理** - 月額/年額プラン
- **使用量追跡** - トークン使用量の監視
- **プラン制限** - 無料/有料プランの制限

## 🚀 MVP Quick Deploy (3 Steps!)

**Deploy to production in under 10 minutes with minimal setup:**

### 📋 What You Need
- [Anthropic API Key](https://console.anthropic.com/) (for AI features)
- GitHub account
- Render.com account (free)
- Vercel account (free)

### 🎯 One-Click Deploy
1. **Fork this repo** to your GitHub
2. **Render.com**: Connect repo → Add `ANTHROPIC_API_KEY` → Deploy
3. **Vercel**: Import project → Add 3 env vars → Deploy

**Total manual settings: 4 environment variables**

👉 **[Complete MVP Deploy Guide](./QUICK_DEPLOY.md)**

### 🎨 ユーザーインターフェース
- **レスポンシブデザイン** - モバイル・タブレット対応
- **ダークモード/ライトモード** - テーマ切り替え
- **アクセシビリティ** - スクリーンリーダー対応
- **モダンUI** - Tailwind CSS + Shadcn/ui

### 🔒 セキュリティ
- **Content Security Policy** - XSS対策
- **レート制限** - API保護
- **セキュリティヘッダー** - 包括的なセキュリティ
- **入力検証** - 堅牢なバリデーション

## 🛠 技術スタック

### Frontend
- **Next.js 14** - Reactフレームワーク（App Router）
- **TypeScript** - 型安全な開発
- **Tailwind CSS** - ユーティリティファーストCSS
- **Shadcn/ui** - モダンなUIコンポーネント
- **Monaco Editor** - コードエディタ
- **NextAuth.js** - 認証ライブラリ
- **TanStack Query** - データフェッチング

### Backend
- **FastAPI** - 高速Python Webフレームワーク
- **PostgreSQL** - リレーショナルデータベース
- **SQLAlchemy** - ORM
- **Redis** - キャッシュ・セッション管理
- **JWT** - JSON Web Token認証
- **Alembic** - データベースマイグレーション

### AI & 外部サービス
- **Anthropic Claude 3.5 Sonnet** - AIチャット機能
- **Stripe** - 決済処理
- **Google OAuth** - ソーシャル認証

### Infrastructure
- **Docker** - コンテナ化
- **GitHub Actions** - CI/CD
- **Vercel** - フロントエンドデプロイ
- **Render.com** - バックエンドデプロイ

## 🚀 クイックスタート

### 前提条件
- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL
- Redis

### 1. リポジトリのクローン
```bash
git clone https://github.com/your-username/devin-clone-mvp.git
cd devin-clone-mvp
```

### 2. 環境変数の設定
```bash
# Frontend
cp frontend/.env.local.example frontend/.env.local

# Backend
cp backend/core/.env.example backend/core/.env
```

### 3. Docker Composeで起動
```bash
docker-compose up -d
```

### 4. データベースマイグレーション
```bash
cd backend/core
alembic upgrade head
```

### 5. フロントエンド開発サーバー
```bash
cd frontend
npm install
npm run dev
```

## 📊 開発進捗

| Phase | 内容 | 進捗 | 完了日 |
|-------|------|------|--------|
| 1 | 基盤構築とセットアップ | ✅ 100% | Day 3 |
| 2 | 認証・認可システム | ✅ 100% | Day 7 |
| 3 | プロジェクト管理機能 | ✅ 100% | Day 12 |
| 4 | AI機能統合 | ✅ 100% | Day 18 |
| 5 | UI/UX改善 | ✅ 100% | Day 22 |
| 6 | 決済・課金システム | ✅ 100% | Day 25 |
| 7 | テスト・最適化 | ✅ 100% | Day 28 |

## 🎯 MVP目標達成状況

- ✅ **ユーザー認証** - メール/パスワード、Google OAuth
- ✅ **プロジェクト管理** - 完全なCRUD機能
- ✅ **AIチャット機能** - Claude 3.5 Sonnet統合
- ✅ **コード実行環境** - Monaco Editor統合
- ✅ **ファイル管理システム** - 階層構造対応
- ✅ **課金システム** - Stripe統合

## 🔮 次のステップ

### Phase 2: 高度な機能
- [ ] リアルタイムコラボレーション
- [ ] コードレビュー機能
- [ ] 自動テスト生成
- [ ] デプロイメント統合

### Phase 3: スケーラビリティ
- [ ] マイクロサービス化
- [ ] 負荷分散
- [ ] 監視・ログシステム
- [ ] バックアップ・復旧

### Phase 4: エンタープライズ機能
- [ ] SSO統合
- [ ] チーム管理
- [ ] アクセス制御
- [ ] 監査ログ

## 🤝 貢献

プロジェクトへの貢献を歓迎します！

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📝 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 🙏 謝辞

- [Anthropic](https://www.anthropic.com/) - Claude AI API
- [Stripe](https://stripe.com/) - 決済処理
- [Vercel](https://vercel.com/) - ホスティング
- [Render](https://render.com/) - バックエンドホスティング

## 📞 サポート

質問やサポートが必要な場合は、[Issues](../../issues)を作成してください。

---

**Devin Clone MVP** - AIソフトウェアエンジニアアシスタント 🚀