// packages/ultracontrol-app/src/lib/store/index.ts
import { atom } from 'nanostores';

// 例: アプリケーション全体のローディング状態
export const isLoading = atom(false);

// 例: 現在のユーザー情報
export const currentUser = atom<string | null>(null);

// 今後、各プロジェクト (bolt, devin, openhands) の状態や
// 共通のUI状態などを管理するストアをここに追加していく予定です。

// --- bolt.new-any-llm-main 関連のストア ---
export const boltSessions = atom<Array<any>>([]); // 仮の型定義
export const activeBoltSessionId = atom<string | null>(null);

// --- devin-clone-mvp 関連のストア ---
export const devinTasks = atom<Array<any>>([]); // 仮の型定義
export const currentDevinTask = atom<object | null>(null);

// --- OpenHands-main 関連のストア ---
export const openHandsAgents = atom<Array<any>>([]); // 仮の型定義
export const activeOpenHandsAgentId = atom<string | null>(null);

// --- UI関連の共通ストア ---
export const currentTheme = atom<'light' | 'dark'>('light');
export const notifications = atom<Array<{id: string, message: string, type: 'info' | 'warning' | 'error'}>>([]);

// --- 統合機能関連のストア ---
export const integratedWorkspaceState = atom<object | null>(null);

/**
 * ローディング状態を設定/解除するヘルパー関数
 * @param loading ローディング状態
 */
export const setLoading = (loading: boolean) => {
  isLoading.set(loading);
};

/**
 * ユーザー情報を設定するヘルパー関数
 * @param userId ユーザーID または null
 */
export const setUser = (userId: string | null) => {
  currentUser.set(userId);
};

/**
 * 通知を追加するヘルパー関数
 * @param message 通知メッセージ
 * @param type 通知タイプ
 */
export const addNotification = (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
  const newNotification = { id: Date.now().toString(), message, type };
  notifications.set([...notifications.get(), newNotification]);
};

/**
 * 通知を削除するヘルパー関数
 * @param id 削除する通知のID
 */
export const removeNotification = (id: string) => {
  notifications.set(notifications.get().filter(n => n.id !== id));
};

// 各プロジェクトのストア操作ヘルパーもここに追加していく
// 例:
// export const addBoltSession = (session: any) => {
//   boltSessions.set([...boltSessions.get(), session]);
// };
//
// export const setActiveBoltSession = (sessionId: string) => {
//   activeBoltSessionId.set(sessionId);
// };

// ... 他のプロジェクトのヘルパー関数も同様に ...

console.log('Nanostores initialized for UltraControl');
