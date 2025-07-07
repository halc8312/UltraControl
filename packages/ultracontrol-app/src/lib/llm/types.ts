/**
 * LLM通信統合レイヤーの共通型定義
 */

/**
 * LLMプロバイダーの種類
 */
export type LLMProviderType = 'anthropic' | 'openai' | 'cohere' | 'ollama' | 'openai-like' | 'custom';

/**
 * メッセージのロール
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'function' | 'tool';

/**
 * 基本的なメッセージ型
 */
export interface Message {
  role: MessageRole;
  content: string;
  name?: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
  toolCalls?: ToolCall[];
}

/**
 * ツール呼び出し
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * LLMモデル情報
 */
export interface LLMModel {
  id: string;
  name: string;
  provider: LLMProviderType;
  maxTokens: number;
  contextWindow: number;
  supportsFunctions?: boolean;
  supportsStreaming?: boolean;
  supportsTools?: boolean;
}

/**
 * プロンプトパラメータ
 */
export interface PromptParameters {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  stream?: boolean;
  functions?: FunctionDefinition[];
  tools?: ToolDefinition[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

/**
 * 関数定義
 */
export interface FunctionDefinition {
  name: string;
  description?: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * ツール定義
 */
export interface ToolDefinition {
  type: 'function';
  function: FunctionDefinition;
}

/**
 * 完了レスポンス
 */
export interface CompletionResponse {
  id: string;
  model: string;
  choices: CompletionChoice[];
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  created?: number;
}

/**
 * 完了の選択肢
 */
export interface CompletionChoice {
  index: number;
  message: Message;
  finishReason?: 'stop' | 'length' | 'function_call' | 'tool_calls' | 'content_filter' | null;
  logprobs?: any;
}

/**
 * ストリーミングチャンク
 */
export interface StreamingChunk {
  id: string;
  model: string;
  choices: StreamingChoice[];
  created?: number;
}

/**
 * ストリーミングの選択肢
 */
export interface StreamingChoice {
  index: number;
  delta: Partial<Message>;
  finishReason?: 'stop' | 'length' | 'function_call' | 'tool_calls' | 'content_filter' | null;
  logprobs?: any;
}

/**
 * プロバイダー設定
 */
export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

/**
 * エラータイプ
 */
export enum LLMErrorType {
  AUTHENTICATION = 'AUTHENTICATION',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_REQUEST = 'INVALID_REQUEST',
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN = 'UNKNOWN'
}

/**
 * LLMエラー
 */
export class LLMError extends Error {
  constructor(
    public type: LLMErrorType,
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * コンテキスト情報
 */
export interface ContextInfo {
  messageCount: number;
  tokenCount: number;
  systemPromptTokens?: number;
  availableTokens: number;
  maxContextWindow: number;
}