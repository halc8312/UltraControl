/**
 * LLM通信統合レイヤーの共通型定義とインターフェース
 */

// --- Type Definitions (from existing types.ts) ---

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


// --- Interface Definitions (from existing interfaces.ts) ---

/**
 * LLMプロバイダーの基本インターフェース
 */
export interface ILLMProvider {
  /**
   * プロバイダー名
   */
  readonly name: string;

  /**
   * プロバイダーの初期化
   */
  initialize(config: ProviderConfig): Promise<void>;

  /**
   * 利用可能なモデルのリストを取得
   */
  listModels(): Promise<LLMModel[]>;

  /**
   * 特定のモデル情報を取得
   */
  getModel(modelId: string): Promise<LLMModel | null>;

  /**
   * テキスト生成（非ストリーミング）
   */
  complete(params: PromptParameters): Promise<CompletionResponse>;

  /**
   * テキスト生成（ストリーミング）
   */
  stream(params: PromptParameters): AsyncIterableIterator<StreamingChunk>;

  /**
   * コンテキスト情報の計算
   */
  calculateContext(messages: Message[], modelId: string): Promise<ContextInfo>;

  /**
   * トークン数の推定
   */
  estimateTokens(text: string, modelId?: string): Promise<number>;

  /**
   * プロバイダーの検証
   */
  validate(): Promise<boolean>;

  /**
   * プロバイダーの破棄
   */
  dispose(): Promise<void>;
}

/**
 * プロバイダーファクトリーインターフェース
 */
export interface IProviderFactory {
  /**
   * プロバイダーの作成
   */
  create(type: string, config?: ProviderConfig): ILLMProvider;

  /**
   * プロバイダーの登録
   */
  register(type: string, providerClass: new () => ILLMProvider): void;

  /**
   * 登録されているプロバイダーのリスト取得
   */
  listProviders(): string[];
}

/**
 * コンテキスト管理インターフェース
 */
export interface IContextManager {
  /**
   * メッセージの追加
   */
  addMessage(message: Message): void;

  /**
   * メッセージ履歴の取得
   */
  getMessages(): Message[];

  /**
   * メッセージ履歴のクリア
   */
  clearMessages(): void;

  /**
   * コンテキストウィンドウに収まるメッセージの取得
   */
  getMessagesInWindow(maxTokens: number, modelId: string): Promise<Message[]>;

  /**
   * システムプロンプトの設定
   */
  setSystemPrompt(prompt: string): void;

  /**
   * システムプロンプトの取得
   */
  getSystemPrompt(): string | null;
}

/**
 * プロンプトチェーンインターフェース
 */
export interface IPromptChain {
  /**
   * チェーンへのステップ追加
   */
  addStep(name: string, promptFn: (context: any) => Promise<PromptParameters>): void;

  /**
   * チェーンの実行
   */
  execute(provider: ILLMProvider, initialContext?: any): AsyncIterableIterator<{
    step: string;
    result: CompletionResponse;
    context: any;
  }>;

  /**
   * チェーンのリセット
   */
  reset(): void;
}

/**
 * リトライ戦略インターフェース
 */
export interface IRetryStrategy {
  /**
   * リトライ可能かどうかの判定
   */
  shouldRetry(error: Error, attempt: number): boolean;

  /**
   * 次のリトライまでの遅延時間（ミリ秒）
   */
  getDelay(attempt: number): number;

  /**
   * 最大リトライ回数
   */
  maxAttempts: number;
}

/**
 * プロバイダーオプション
 */
export interface ProviderOptions {
  /**
   * リトライ戦略
   */
  retryStrategy?: IRetryStrategy;

  /**
   * タイムアウト（ミリ秒）
   */
  timeout?: number;

  /**
   * カスタムヘッダー
   */
  headers?: Record<string, string>;

  /**
   * プロキシ設定
   */
  proxy?: {
    host: string;
    port: number;
    auth?: {
      username: string;
      password: string;
    };
  };
}

// APIエンドポイントの例 (コメントとして)
// POST /api/v1/llm/completion -> CompletionResponse (非ストリーミング)
// POST /api/v1/llm/stream -> StreamingChunk (ストリーミング, SSE)
// GET /api/v1/llm/models -> LLMModel[]
// GET /api/v1/llm/models/{modelId} -> LLMModel
// POST /api/v1/llm/tokenize -> { tokens: number }
// POST /api/v1/llm/context/calculate -> ContextInfo
