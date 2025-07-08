// packages/ultracontrol-app/src/lib/interfaces/workspace.ts

// --- File System Operations ---
export interface FileNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: string;
  children?: FileNode[]; // for directory
}

export interface FileReadRequest {
  path: string;
}
export interface FileReadResponse {
  path: string;
  content: string; // Base64エンコードされる場合もある
  isBinary: boolean;
}

export interface FileWriteRequest {
  path:string;
  content: string; // Base64エンコードされる場合もある
  overwrite?: boolean;
}
export interface FileWriteResponse {
  path: string;
  success: boolean;
  error?: string;
}
// ... 他のファイル操作 (list, delete, mkdir, rename) のインターフェース

// --- Terminal Operations ---
export interface TerminalRunCommandRequest {
  command: string;
  args?: string[];
  cwd?: string; // 作業ディレクトリ
}
// Terminal outputはEvent API (ObservationPayload) でストリーミングされる想定

// --- Agent Control ---
export interface AgentStartRequest {
  agentId: string; // どの種類のOpenHandsエージェントかなど
  taskId?: string; // 関連するDevinタスクIDなど
  params?: Record<string, any>; // エージェント固有のパラメータ
}
export interface AgentStatusResponse {
  agentId: string;
  status: 'idle' | 'running' | 'stopped' | 'error' | 'completed';
  details?: Record<string, any>;
}
// ... 他のエージェント操作 (stop, pause, resume)

// APIエンドポイントの例 (コメントとして)
// GET /api/v1/workspace/files?path=/src -> FileNode[] or FileNode
// GET /api/v1/workspace/files/content?path=/src/main.py -> FileReadResponse
// POST /api/v1/workspace/files/content -> FileWriteResponse
// POST /api/v1/workspace/terminal/run -> (WebSocketで出力が返る)
// POST /api/v1/workspace/agents/start -> AgentStatusResponse
// GET /api/v1/workspace/agents/{agentId}/status -> AgentStatusResponse
