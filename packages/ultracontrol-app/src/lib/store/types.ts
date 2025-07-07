// packages/ultracontrol-app/src/lib/store/types.ts

// --- General Types ---
export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  timestamp: number;
}

// --- bolt.new-any-llm-main Related Types ---
export interface BoltSession {
  id: string;
  name: string;
  // 必要に応じて他のプロパティを追加
  // 例: createdAt: Date, lastModifiedAt: Date, messages: Message[]
}

// --- devin-clone-mvp Related Types ---
export type DevinTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface DevinTask {
  id:string;
  title: string;
  description: string;
  status: DevinTaskStatus;
  // 必要に応じて他のプロパティを追加
  // 例: subTasks: DevinSubTask[], priority: number
}

// --- OpenHands-main Related Types ---
export interface OpenHandsAgent {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'stopped' | 'error';
  // 必要に応じて他のプロパティを追加
  // 例: currentGoal: string, history: string[]
}

// --- Integrated Workspace Types ---
export interface IntegratedWorkspace {
  activeProjectId: string | null; // bolt, devin, openhands のいずれかのプロジェクトID
  // 必要に応じて他のプロパティを追加
}

// --- User Preferences ---
export type Theme = 'light' | 'dark' | 'system';

export interface UserPreferences {
  theme: Theme;
  // 他のユーザー設定
}
