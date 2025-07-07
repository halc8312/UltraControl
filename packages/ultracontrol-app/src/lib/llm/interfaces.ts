/**
 * 統一LLMプロバイダーインターフェース
 */

import type {
  Message,
  PromptParameters,
  CompletionResponse,
  StreamingChunk,
  LLMModel,
  ProviderConfig,
  ContextInfo
} from './types';

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