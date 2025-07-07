# UltraControl 開発環境起動タスクリスト

## 📋 概要
このドキュメントは、UltraControlプロジェクトを開発環境で起動できるようにするための詳細なタスクリストです。

### 🎯 目標
- `pnpm run dev` でultracontrol-appが正常に起動する
- TypeScriptコンパイルエラーを全て解決する
- 基本的なUI（Header + Chat）が表示される

### 📊 現在の状況
- **コンパイルエラー**: 77個のTypeScriptエラー
- **主な問題**: 型定義ファイル不足、依存関係不足、設定問題

---

## 🔴 Phase 1: 緊急対応（必須）

### Task 1.1: 型定義ファイルの作成
**優先度**: 🔴 最高  
**所要時間**: 30分  
**担当**: 開発者

#### 1.1.1 typesディレクトリの作成
```bash
mkdir -p packages/ultracontrol-app/src/types
```

#### 1.1.2 model.ts の作成
**ファイル**: `packages/ultracontrol-app/src/types/model.ts`
```typescript
import type { ModelInfo } from '~/utils/types';

export type ProviderInfo = {
  staticModels: ModelInfo[];
  name: string;
  getDynamicModels?: () => Promise<ModelInfo[]>;
  getApiKeyLink?: string;
  labelForGetApiKey?: string;
  icon?: string;
};
```

#### 1.1.3 theme.ts の作成
**ファイル**: `packages/ultracontrol-app/src/types/theme.ts`
```typescript
export type Theme = 'dark' | 'light';
```

#### 1.1.4 actions.ts の作成
**ファイル**: `packages/ultracontrol-app/src/types/actions.ts`
```typescript
export type ActionType = 'file' | 'shell';

export interface BaseAction {
  content: string;
}

export interface FileAction extends BaseAction {
  type: 'file';
  filePath: string;
}

export interface ShellAction extends BaseAction {
  type: 'shell';
}

export interface StartAction extends BaseAction {
  type: 'start';
}

export type BoltAction = FileAction | ShellAction | StartAction;

export type BoltActionData = BoltAction | BaseAction;
```

#### 1.1.5 terminal.ts の作成
**ファイル**: `packages/ultracontrol-app/src/types/terminal.ts`
```typescript
export interface ITerminal {
  readonly cols?: number;
  readonly rows?: number;

  reset: () => void;
  write: (data: string) => void;
  onData: (cb: (data: string) => void) => void;
  input: (data: string) => void;
}
```

#### 1.1.6 artifact.ts の作成
**ファイル**: `packages/ultracontrol-app/src/types/artifact.ts`
```typescript
export interface ArtifactCallbackData {
  messageId: string;
  title: string;
  id: string;
}

export type ArtifactCallback = (data: ArtifactCallbackData) => void;
export type ActionCallback = (data: any) => void;
```

**検証方法**: 
- 各ファイルが正しく作成されているか確認
- import文でエラーが出ないか確認

---

### Task 1.2: 依存関係の追加
**優先度**: 🔴 最高  
**所要時間**: 15分  
**担当**: 開発者

#### 1.2.1 型定義パッケージの追加
```bash
cd packages/ultracontrol-app
pnpm add -D @types/js-cookie @types/node
```

#### 1.2.2 UI/エディタ関連パッケージの追加
```bash
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu
pnpm add @xterm/addon-fit @xterm/addon-web-links @xterm/xterm
```

#### 1.2.3 ユーティリティパッケージの追加
```bash
pnpm add date-fns istextorbinary jszip file-saver @octokit/rest
pnpm add diff rehype-raw remark-gfm unified rehype-sanitize unist-util-visit
pnpm add node-fetch
```

#### 1.2.4 開発用パッケージの追加
```bash
pnpm add -D vitest
```

**検証方法**:
```bash
pnpm list | grep -E "(js-cookie|xterm|date-fns|jszip)"
```

---

### Task 1.3: TypeScript設定の修正
**優先度**: 🔴 最高  
**所要時間**: 10分  
**担当**: 開発者

#### 1.3.1 tsconfig.app.json の修正
**ファイル**: `packages/ultracontrol-app/tsconfig.app.json`

**変更内容**:
```json
{
  "compilerOptions": {
    "target": "ES2024",
    "lib": ["ES2024", "DOM", "DOM.Iterable"],
    "types": ["node", "vite/client"]
  }
}
```

#### 1.3.2 vite.config.ts の修正
**ファイル**: `packages/ultracontrol-app/vite.config.ts`

**変更内容**:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import UnoCSS from '@unocss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), UnoCSS()],
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
})
```

**検証方法**:
```bash
pnpm run build --dry-run
```

---

## 🟡 Phase 2: 重要対応（推奨）

### Task 2.1: コードの修正
**優先度**: 🟡 高  
**所要時間**: 45分  
**担当**: 開発者

#### 2.1.1 未使用Reactインポートの削除
**対象ファイル**:
- `src/components/chat/chatExportAndImport/ExportChatButton.tsx`
- `src/components/chat/chatExportAndImport/ImportButtons.tsx`

**修正内容**:
```typescript
// 削除
import React from 'react';
```

#### 2.1.2 未使用変数の削除
**対象ファイル**:
- `src/lib/stores/editor.ts`
- `src/utils/shell.ts`

**修正内容**:
```typescript
// #filesStore, #webcontainer, #shellInputStream などの未使用変数を削除
```

#### 2.1.3 型アノテーションの追加
**対象ファイル**:
- `src/components/sidebar/date-binning.ts`
- `src/utils/markdown.ts`
- `src/utils/shell.ts`

**修正内容**:
```typescript
// 暗黙的any型の解決
list.forEach((item: ChatHistoryItem) => {
  // ...
});
```

#### 2.1.4 グローバル型の定義
**ファイル**: `packages/ultracontrol-app/src/types/global.d.ts`
```typescript
declare global {
  interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
  }
  
  interface PromiseConstructor {
    withResolvers<T>(): PromiseWithResolvers<T>;
  }
}

interface PromiseWithResolvers<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
}

export {};
```

---

### Task 2.2: テストファイルの処理
**優先度**: 🟡 中  
**所要時間**: 20分  
**担当**: 開発者

#### 2.2.1 テスト設定の追加
**ファイル**: `packages/ultracontrol-app/vitest.config.ts`
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
})
```

#### 2.2.2 テストファイルの修正
**対象ファイル**:
- `src/components/chat/Markdown.spec.ts`
- `src/lib/runtime/message-parser.spec.ts`
- `src/utils/diff.spec.ts`

**選択肢**:
1. **推奨**: テストファイルを削除（開発環境起動が優先）
2. **代替**: テストファイルを修正

---

## 🟢 Phase 3: 最適化（任意）

### Task 3.1: パフォーマンス最適化
**優先度**: 🟢 低  
**所要時間**: 30分  
**担当**: 開発者

#### 3.1.1 不要なインポートの削除
- 未使用のライブラリインポートを削除
- 動的インポートの活用

#### 3.1.2 バンドルサイズの最適化
- tree-shakingの確認
- 不要な依存関係の削除

---

## 🔧 実行手順

### Step 1: 準備
```bash
cd packages/ultracontrol-app
```

### Step 2: 型定義ファイルの作成
```bash
# Task 1.1 を順番に実行
mkdir -p src/types
# 各ファイルを作成...
```

### Step 3: 依存関係の追加
```bash
# Task 1.2 を順番に実行
pnpm add -D @types/js-cookie @types/node
# 他のパッケージも追加...
```

### Step 4: 設定ファイルの修正
```bash
# Task 1.3 を実行
# tsconfig.app.json と vite.config.ts を修正
```

### Step 5: ビルドテスト
```bash
pnpm run build
```

### Step 6: 開発サーバー起動
```bash
pnpm run dev
```

---

## ✅ 検証チェックリスト

### Phase 1 完了チェック
- [ ] 型定義ファイルが全て作成されている
- [ ] 依存関係が正しくインストールされている
- [ ] TypeScript設定が正しく修正されている
- [ ] `pnpm run build` が成功する

### Phase 2 完了チェック
- [ ] コンパイルエラーが0個になっている
- [ ] 未使用コードが削除されている
- [ ] テストファイルが適切に処理されている

### Phase 3 完了チェック
- [ ] `pnpm run dev` が成功する
- [ ] ブラウザでアプリが表示される
- [ ] Header と Chat コンポーネントが正常に動作する

### 最終確認
- [ ] http://localhost:5173 でアプリが起動する
- [ ] コンソールにエラーが表示されない
- [ ] 基本的なUI操作が可能

---

## 🚨 トラブルシューティング

### エラー: "Cannot find module"
**原因**: パスエイリアスが正しく設定されていない  
**解決**: vite.config.ts のaliasを確認

### エラー: "Property does not exist"
**原因**: 型定義が不足している  
**解決**: 対応する型定義ファイルを作成

### エラー: "Cannot find name 'process'"
**原因**: Node.js型定義が不足している  
**解決**: @types/node を追加

---

## 📝 作業ログ

### 作業記録テンプレート
```
日付: YYYY-MM-DD
担当者: [名前]
作業内容: 
- Task X.X: [作業内容]
結果: [成功/失敗]
問題: [発生した問題]
解決方法: [解決した方法]
```

### 進捗管理
- [ ] Phase 1: 緊急対応
- [ ] Phase 2: 重要対応  
- [ ] Phase 3: 最適化
- [ ] 最終検証

---

## 🔗 参考資料

- [Vite Configuration](https://vitejs.dev/config/)
- [TypeScript Configuration](https://www.typescriptlang.org/tsconfig)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [UnoCSS Documentation](https://unocss.dev/)

---

**最終更新**: 2025-01-07  
**作成者**: AI Assistant  
**レビュー**: 未実施 