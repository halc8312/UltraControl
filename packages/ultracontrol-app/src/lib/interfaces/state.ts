// packages/ultracontrol-app/src/lib/interfaces/state.ts
import type {
  BoltSession,
  DevinTask,
  OpenHandsAgent,
  UserPreferences,
  // EditorDocument, FileMap など、同期が必要な他の型もインポート
} from '../store/types'; // 既存の型定義を活用

export enum StateType {
  BoltSession = 'bolt_session',
  DevinTask = 'devin_task',
  OpenHandsAgent = 'openhands_agent',
  UserPreferences = 'user_preferences',
  // FileTree = 'file_tree',
  // ActiveEditor = 'active_editor',
  // TerminalOutput = 'terminal_output',
}

export interface StateUpdateMessage<T> {
  stateType: StateType;
  entityId?: string; // 特定のエンティティを指す場合 (e.g., taskId)
  payload: Partial<T> | T[]; // 部分更新またはリスト全体の更新
  action: 'update' | 'add' | 'remove' | 'set_all'; // 操作の種類
}

// 例: DevinTaskの状態更新メッセージ
// {
//   stateType: StateType.DevinTask,
//   entityId: 'task-123',
//   payload: { status: 'completed' },
//   action: 'update'
// }

// 例: 全Boltセッションリストの更新メッセージ
// {
//   stateType: StateType.BoltSession,
//   payload: [session1, session2],
//   action: 'set_all'
// }

// WebSocketエンドポイントの例 (コメントとして)
// (Event APIと同じWebSocket接続上で、メッセージタイプで区別する想定)
