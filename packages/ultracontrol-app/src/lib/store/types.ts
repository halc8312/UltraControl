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
  agentId?: string;
  projectId?: string;
  startTime?: Date;
  endTime?: Date;
  status?: 'active' | 'completed' | 'failed' | 'paused';
  tasks?: any[];
  artifacts?: any[];
  // 必要に応じて他のプロパティを追加
  // 例: createdAt: Date, lastModifiedAt: Date, messages: Message[]
}

// --- devin-clone-mvp Related Types ---
export type DevinTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface DevinTask {
  id: string;
  title: string;
  description: string;
  status: DevinTaskStatus;
  assignedAgent?: string;
  createdAt?: Date;
  updatedAt?: Date;
  dependencies?: string[];
  result?: any;
  type?: string;
  priority?: number;
  // 必要に応じて他のプロパティを追加
  // 例: subTasks: DevinSubTask[], priority: number
}

// --- OpenHands-main Related Types ---
export interface OpenHandsAgent {
  id: string;
  name: string;
  status: 'idle' | 'running' | 'stopped' | 'error' | 'active' | 'busy';
  type?: string;
  capabilities?: string[];
  currentTasks?: any[];
  resourceUsage?: {
    cpu: number;
    memory: number;
    gpu?: number;
  };
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
