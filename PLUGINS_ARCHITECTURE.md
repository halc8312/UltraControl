# UltraControl プラグインシステム設計

## 1. はじめに

このドキュメントでは、UltraControlプラットフォームのためのプラグインシステムの設計について説明します。プラグインシステムは、UltraControlのコア機能を拡張し、開発者やユーザーがカスタム機能を追加できるようにすることを目的としています。

### 1.1. プラグインシステムの目的とゴール

*   **拡張性**: コアシステムを変更することなく、新しいツール、エージェント、UIコンポーネント、LLMプロバイダーなどの機能を追加可能にする。
*   **分離性**: プラグインを独立したモジュールとして開発・配布可能にし、本体との依存関係を疎に保つ。
*   **柔軟性**: バックエンド、フロントエンド、またはその両方にまたがる多様な種類のプラグインをサポートする。
*   **コミュニティ**: 開発者コミュニティによる機能拡張を促進し、エコシステムを形成する。
*   **安全性 (将来)**: プラグインがシステム全体に悪影響を与えないよう、権限管理やサンドボックス実行の仕組みを導入する。
*   **発見可能性 (将来)**: 利用可能なプラグインを容易に見つけ、インストール・管理できるインターフェースを提供する。

## 2. 設計原則

*   **明確なインターフェース**: プラグインとコアシステム間のやり取りは、明確に定義されたAPIを通じて行われる。
*   **最小権限の原則**: プラグインは、その機能に必要な最小限の権限のみを要求・付与されるべきである。
*   **宣言的なマニフェスト**: 各プラグインは、自身のメタデータ、機能、権限要求をマニフェストファイルで宣言する。
*   **ライフサイクル管理**: プラグインのロード、初期化、有効化、無効化、アンロードの各段階を明確に管理する。
*   **後方互換性**: コアシステムのアップデート時にも、既存プラグインができる限り動作し続けるよう配慮する（APIバージョニングなど）。

## 3. アーキテクチャ概要

UltraControlプラグインシステムは、主に以下のコンポーネントで構成されます。

*   **プラグイン**: 拡張機能を提供する独立したパッケージ。
*   **プラグインマニフェスト**: プラグインの定義情報を含むファイル（例: `plugin.json`）。
*   **プラグインローダー**: マニフェストを読み込み、プラグインをシステムにロード・初期化するコンポーネント（バックエンドとフロントエンドにそれぞれ存在）。
*   **コアAPI**: プラグインがUltraControlの機能（イベントバス、状態管理、LLMサービスなど）を利用するためのインターフェース。

プラグインは、その主な動作環境に応じて以下の種類に分類されます。

*   **バックエンドプラグイン**: サーバーサイドで動作し、データ処理、エージェント機能、外部API連携などを担う (主にPythonで実装)。
*   **フロントエンドプラグイン**: クライアントサイド（ブラウザ）で動作し、UIコンポーネントの追加、ユーザーインタラクションの拡張などを担う (主にTypeScript/JavaScriptで実装)。
*   **統合プラグイン**: バックエンドとフロントエンドの両方にコンポーネントを持ち、連携して機能を提供する。

## 4. プラグインマニフェスト (`plugin.json`)

各プラグインは、ルートディレクトリに `plugin.json` という名前のマニフェストファイルを持つ必要があります。このファイルは、`packages/ultracontrol-app/src/lib/interfaces/plugins.ts` で定義された `PluginManifest` インターフェースに準拠します。

```json
{
  "id": "com.example.my-cool-plugin", // プラグインの一意なID (逆ドメイン名推奨)
  "name": "My Cool Plugin",             // プラグインの表示名
  "version": "1.0.0",                  // プラグインのバージョン (セマンティックバージョニング推奨)
  "description": "This plugin does cool things.", // プラグインの説明
  "author": "Your Name <you@example.com>", // 作者情報
  "main": "backend/main.py",           // バックエンドエントリーポイント (バックエンドプラグインの場合)
  "ui": "frontend/index.js",           // フロントエンドエントリーポイント (フロントエンドプラグインの場合)
  "permissions": [                     // 要求する権限のリスト
    "workspace:file:read",
    "llm:request:gpt-4",
    "event:subscribe:TaskCompleted"
  ],
  "capabilities": [                    // 提供する機能のリスト
    {
      "name": "myCustomAction",
      "type": "action", // 'action', 'observer', 'ui_component'など
      "description": "Handles a custom action.",
      "schema": { /* 入力/出力スキーマ (JSON Schema) */ }
    },
    {
      "name": "MyCustomPanel",
      "type": "ui_component",
      "area": "sidebar_bottom", // UIコンポーネントを表示する場所
      "component": "MyCustomPanelComponent" // フロントエンドでエクスポートされるコンポーネント名
    }
  ],
  "dependencies": { // (オプション) 他のプラグインへの依存関係
    "com.example.another-plugin": "^1.2.0"
  },
  "icon": "assets/icon.png" // (オプション) プラグインのアイコン
}
```
*   **`id`**: 必須。プラグインを一意に識別するための文字列。
*   **`name`**: 必須。ユーザーに表示されるプラグイン名。
*   **`version`**: 必須。プラグインのバージョン。
*   **`description`**: 推奨。プラグインの機能概要。
*   **`author`**: 推奨。プラグインの作者。
*   **`main`**: バックエンドプラグインの場合、Pythonモジュールのエントリーポイントを指定（例: `my_plugin.main:initialize_plugin`）。
*   **`ui`**: フロントエンドプラグインの場合、JavaScript/TypeScriptモジュールのエントリーポイントを指定。
*   **`permissions`**: プラグインが要求する権限のリスト。これにより、ユーザーはプラグインが何にアクセスしようとしているかを把握できます。
*   **`capabilities`**: プラグインが提供する機能のリスト。`type` には `action` (特定のアクションを処理)、`observer` (特定のイベントを監視)、`ui_component` (UI部品を提供)、`llm_provider` (新しいLLMプロバイダー) などが入ります。
*   **`dependencies`**: (オプション) このプラグインが依存する他のプラグインのIDとバージョン範囲。
*   **`icon`**: (オプション) プラグインのアイコンファイルのパス。

## 5. プラグインのライフサイクル

1.  **発見 (Discovery)**: システムが利用可能なプラグインを検出（例: 特定ディレクトリのスキャン、設定ファイルからの読み込み）。
2.  **ロード (Loading)**: マニフェストファイルを読み込み、プラグインのコードをメモリにロード。依存関係の解決。
3.  **初期化 (Initialization)**: プラグインのエントリーポイント関数を呼び出し、プラグインが自身をセットアップ（リソース確保、イベントリスナー登録など）。
4.  **有効化 (Enabling)**: プラグインがアクティブになり、機能を提供開始。
5.  **無効化 (Disabling)**: プラグインが一時的に非アクティブ化され、機能提供を停止。
6.  **アンロード (Unloading)**: プラグインのコードをメモリから解放し、リソースをクリーンアップ。

## 6. バックエンドプラグイン (Python)

バックエンドプラグインは、主に `OpenHands-main` の環境で動作し、サーバーサイドの機能を拡張します。

### 6.1. エントリーポイント

マニフェストの `main` フィールドで指定されたPythonモジュール内に、以下の規約に従った関数を定義します。

```python
# my_plugin/main.py
from openhands.events.stream import EventStream
from openhands.controller.agent_controller import AgentController # 仮

# プラグインAPI (仮のモジュールパス)
# from ultracontrol.sdk.plugin_api import PluginContext, Logger

# def initialize_plugin(context: PluginContext):
def initialize_plugin(event_stream: EventStream, agent_controller: AgentController): # 引数はDIされる想定
    """
    プラグイン初期化関数。UltraControl起動時に呼び出される。
    ここでイベントリスナーの登録や、新しいActionハンドラの追加などを行う。
    """
    # logger = context.get_logger("my-cool-plugin")
    # logger.info("My Cool Plugin initializing...")
    print("My Cool Plugin initializing...")

    # 例: 特定のアクションを処理するハンドラを登録
    # agent_controller.register_action_handler("MyCustomAction", my_custom_action_handler)

    # 例: 特定のイベントを購読
    # event_stream.subscribe(EventStreamSubscriber.PLUGIN_MY_COOL_PLUGIN, on_event, "my_cool_plugin_handler")

# def my_custom_action_handler(action: Action, agent_state):
#     pass

# def on_event(event: Event):
#     pass

def shutdown_plugin():
    """
    (オプション) プラグイン終了時に呼び出される。
    リソースのクリーンアップなどを行う。
    """
    print("My Cool Plugin shutting down...")
```

### 6.2. 提供可能な機能

*   **新しいAgentの定義**: `OpenHands-main` のエージェント基底クラスを継承して新しいエージェントを実装。
*   **Actionハンドラの追加**: 特定の `Action` イベントを処理する関数を登録。
*   **Observationの生成**: 新しい種類の `Observation` イベントを生成し、イベントバスに発行。
*   **ツールの提供**: エージェントが利用可能な新しいツール（関数）を登録。
*   **外部API連携**: サードパーティサービスとの連携機能。

### 6.3. コアAPIアクセス

プラグインは、初期化時に渡されるコンテキストオブジェクトや、インポート可能なSDKを通じて以下のコア機能にアクセスできます（予定）。

*   **イベントバス**: イベントの購読と発行。
*   **ロギング**: 標準化されたロギングインターフェース。
*   **設定アクセス**: UltraControlの設定値への読み取りアクセス。
*   **LLMサービス**: 抽象化されたLLM呼び出しインターフェース。
*   **ワークスペースアクセス**: ファイル読み書きなどの限定的なアクセス（権限ベース）。

## 7. フロントエンドプラグイン (TypeScript/JavaScript)

フロントエンドプラグインは、`ultracontrol-app` のUIやクライアントサイドの機能を拡張します。

### 7.1. エントリーポイント

マニフェストの `ui` フィールドで指定されたJavaScript/TypeScriptファイルで、特定の関数をエクスポートします。

```typescript
// my-frontend-plugin/index.ts
// import type { PluginContext, EventService, UIRegistry } from '@ultracontrol/sdk-frontend';
// import MyCustomPanelComponent from './MyCustomPanelComponent';

interface FrontendPluginContext {
  eventService: any; // EventServiceのインスタンス (仮)
  uiRegistry: any;   // UIコンポーネント登録機構 (仮)
  // 他のAPI
}

export function activate(context: FrontendPluginContext) {
  console.log('My Frontend Plugin activating...');

  // 例: UIコンポーネントの登録
  // context.uiRegistry.registerComponent('sidebar_bottom', 'MyCustomPanel', MyCustomPanelComponent);

  // 例: イベントの購読
  // context.eventService.onObservation((payload) => {
  //   if (payload.observationType === 'MyCustomObservation') {
  //     // UI更新など
  //   }
  // });

  // 例: アクションの発行
  // context.eventService.sendAction('MyPluginAction', { some: 'data' });
}

export function deactivate() {
  console.log('My Frontend Plugin deactivating...');
  // クリーンアップ処理
}
```

### 7.2. 提供可能な機能

*   **カスタムUIコンポーネント**: Reactコンポーネントなどを提供し、UltraControl UIの特定領域（パネル、サイドバー、エディタ内など）に表示。
*   **テーマやスタイルの追加**: アプリケーション全体の見た目をカスタマイズ。
*   **エディタ拡張**: 特定言語のシンタックスハイライト改善、リンター連携、コード補完の追加など (CodeMirrorの拡張機能として)。
*   **クライアントサイドイベント処理**: ユーザー操作や特定のクライアントイベントに対するカスタムロジック。

### 7.3. コアAPIアクセス

*   **`EventService`**: サーバーとのWebSocketイベント送受信。
*   **状態ストア (読み取り)**: Nanostoresで管理されるグローバル状態への限定的な読み取りアクセス。
*   **UIサービス**: 通知表示、モーダルダイアログ表示などのUI操作。
*   **コンポーネント登録API**: UIの特定部分にカスタムコンポーネントを登録。

## 8. プラグイン間通信 (将来の検討事項)

プラグイン同士が直接やり取りするための仕組み。イベントバスを介した間接的な通信や、明示的なAPI呼び出しなどが考えられます。

## 9. セキュリティモデル

### 9.1. 権限管理

*   プラグインはマニフェストで必要な権限を宣言します。
*   ユーザーはプラグインインストール時または有効化時に、これらの権限を確認し、許可/拒否できます。
*   コアAPIへのアクセスは、付与された権限に基づいて制限されます。

### 9.2. サンドボックス (将来の検討事項)

*   特にフロントエンドプラグインや、信頼できないソースからのバックエンドプラグインに対しては、サンドボックス環境での実行を検討します。
    *   WebAssembly (Wasm)
    *   iframe (フロントエンド)
    *   コンテナ化 (バックエンド)

## 10. APIリファレンス (プラグイン向け)

（このセクションは、SDKが具体化するにつれて詳細化されます）

### 10.1. バックエンドAPI
*   `event_stream.subscribe(subscriber_id, callback, callback_id)`
*   `event_stream.add_event(event, source)`
*   `llm_service.complete(params)` / `llm_service.stream(params)`
*   ...

### 10.2. フロントエンドAPI
*   `eventService.onAction(callback)` / `eventService.onObservation(callback)` / ...
*   `eventService.sendAction(actionType, details, source)`
*   `store.getAtom(atomName)` (読み取り専用)
*   `ui.showNotification(message, type)`
*   `uiRegistry.registerComponent(area, id, component)`
*   ...

## 11. 開発ガイドライン

（このセクションは、最初のプラグインが開発される際に具体化されます）

1.  **プラグイン構造のセットアップ**: ディレクトリ構成、マニフェストファイル作成。
2.  **バックエンド開発**: Pythonでのエントリーポイント実装、Action/Observation処理。
3.  **フロントエンド開発**: TypeScript/Reactでのコンポーネント実装、イベント処理。
4.  **ビルドとパッケージング**:
5.  **テスト**:
6.  **デバッグ**:

---

このドキュメントは、UltraControlプラグインシステムの初期設計案です。開発の進行とともに、より詳細な仕様が追加・更新されます。
