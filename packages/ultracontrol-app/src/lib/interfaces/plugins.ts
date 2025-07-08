// packages/ultracontrol-app/src/lib/interfaces/plugins.ts

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  permissions: string[]; // 要求する権限 (e.g., "filesystem:read", "llm:request")
  capabilities: PluginCapability[]; // 提供する機能
}

export interface PluginCapability {
  name: string; // e.g., "code_formatter", "dependency_checker"
  type: 'action' | 'observer' | 'ui_component';
  // actionの場合の入力/出力スキーマなど
}

export interface PluginExecutionRequest {
  pluginId: string;
  capabilityName: string;
  payload: Record<string, any>;
}

export interface PluginExecutionResponse {
  success: boolean;
  result?: Record<string, any>;
  error?: string;
}

// APIエンドポイントの例 (コメントとして)
// GET /api/v1/plugins -> PluginManifest[]
// POST /api/v1/plugins/{pluginId}/execute -> PluginExecutionResponse
