# UltraControl プロジェクトの起動方法

このドキュメントは、UltraControlプロジェクトの各主要コンポーネントをローカル開発環境で起動するための手順を説明します。

## 1. サーバー (`OpenHands-main`)

`OpenHands-main` はバックエンドのFastAPIサーバーです。

**実行ディレクトリ:** `packages/OpenHands-main/`

**前提条件:**

*   Python 3.9以上がインストールされていること。
*   Poetry (Pythonの依存関係管理ツール) がインストールされていること。
    *   インストールされていない場合は、[Poetry公式サイト](https://python-poetry.org/docs/#installation) の手順に従ってインストールしてください。
    *   インストール後、ターミナルを再起動するか、Poetryの実行ファイルがあるディレクトリにPATHを通す必要がある場合があります。

**起動手順:**

1.  ターミナルを開き、`OpenHands-main` のルートディレクトリに移動します。
    ```bash
    cd path/to/your/project/packages/OpenHands-main
    ```
2.  Poetryを使用してプロジェクトの依存関係をインストールします（初回または依存関係更新時）。
    ```bash
    poetry install
    ```
3.  Poetry経由でUvicornサーバーを起動します。
    ```bash
    poetry run uvicorn openhands.server.app:app --reload --host 0.0.0.0 --port 8000
    ```
    *   `--reload`: 開発中にコード変更を検知して自動的にリロードします。
    *   `--host 0.0.0.0`: 同一ネットワーク内の他のマシンからアクセスできるようにします。
    *   `--port 8000`: サーバーがリッスンするポートです。クライアント側の設定 (`ws://localhost:8000/ws/events`) と一致させる必要があります。

    または、`poetry shell` で仮想環境に入ってからUvicornを起動することもできます。
    ```bash
    poetry shell
    # (プロンプトが変わり、仮想環境が有効になります)
    uvicorn openhands.server.app:app --reload --host 0.0.0.0 --port 8000
    ```
4.  サーバーがエラーなく起動し、コンソールに `Application startup complete.` のようなメッセージが表示されることを確認します。

## 2. クライアント (`ultracontrol-app`)

`ultracontrol-app` はフロントエンドのVite (React) アプリケーションです。

**実行ディレクトリ:** `packages/ultracontrol-app/`

**前提条件:**

*   Node.js (LTSバージョン推奨) がインストールされていること。
*   pnpm (パッケージマネージャ) がインストールされていること (プロジェクトが `pnpm-lock.yaml` を使用している場合)。
    *   インストールされていない場合は、`npm install -g pnpm` などでインストールしてください。
    *   プロジェクトが `package-lock.json` や `yarn.lock` を使用している場合は、それぞれ `npm` または `yarn` を使用してください。

**起動手順:**

1.  ターミナルを開き、`ultracontrol-app` のルートディレクトリに移動します。
    ```bash
    cd path/to/your/project/packages/ultracontrol-app
    ```
2.  pnpmを使用してプロジェクトの依存関係をインストールします（初回または依存関係更新時）。
    ```bash
    pnpm install
    ```
    (npmの場合は `npm install`, yarnの場合は `yarn install`)
3.  pnpm経由でVite開発サーバーを起動します。
    ```bash
    pnpm dev
    ```
    (npmの場合は `npm run dev`, yarnの場合は `yarn dev`)
4.  Viteが起動し、コンソールにローカルURL (例: `http://localhost:5173`) が表示されることを確認します。ブラウザでこのURLを開くとアプリケーションが表示されます。

## 3. 動作確認 (WebSocket ECHOテストなど)

1.  上記の手順でサーバーとクライアントの両方を起動します。
2.  ブラウザでクライアントアプリケーションを開きます。
3.  ブラウザの開発者ツール (F12キーなどで開く) のコンソールタブと、サーバーを実行しているターミナルのログを確認します。
    *   WebSocket接続が確立されていること。
    *   クライアントからテスト用のアクション (例: `ECHO_ACTION`) が送信され、サーバーがそれに応答し、クライアントがその応答 (例: `ECHO_OBSERVATION`) を受信していること。

---
このドキュメントは必要に応じて更新されます。
問題が発生した場合は、各プロジェクトの `README.md` やエラーメッセージも参照してください。
