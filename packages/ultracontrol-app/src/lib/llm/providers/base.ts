/**
 * LLMプロバイダーの基底クラス
 */

import type {
  Message,
  PromptParameters,
  CompletionResponse,
  StreamingChunk,
  LLMModel,
  ProviderConfig,
  ContextInfo
} from '../types';
import { LLMError, LLMErrorType } from '../types';
import type { ILLMProvider, IRetryStrategy, ProviderOptions } from '../interfaces';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('LLMProvider');

/**
 * デフォルトのリトライ戦略
 */
export class DefaultRetryStrategy implements IRetryStrategy {
  maxAttempts = 3;

  shouldRetry(error: Error, attempt: number): boolean {
    if (attempt >= this.maxAttempts) {
      return false;
    }

    if (error instanceof LLMError) {
      switch (error.type) {
        case LLMErrorType.RATE_LIMIT:
        case LLMErrorType.TIMEOUT:
        case LLMErrorType.NETWORK:
        case LLMErrorType.SERVER_ERROR:
          return true;
        default:
          return false;
      }
    }

    return false;
  }

  getDelay(attempt: number): number {
    // 指数バックオフ: 1秒, 2秒, 4秒...
    return Math.min(1000 * Math.pow(2, attempt - 1), 10000);
  }
}

/**
 * LLMプロバイダーの基底実装
 */
export abstract class BaseLLMProvider implements ILLMProvider {
  abstract readonly name: string;
  
  protected config: ProviderConfig = {};
  protected options: ProviderOptions = {};
  protected models: Map<string, LLMModel> = new Map();
  protected initialized = false;

  constructor(options?: ProviderOptions) {
    this.options = {
      retryStrategy: new DefaultRetryStrategy(),
      timeout: 30000,
      ...options
    };
  }

  /**
   * プロバイダーの初期化
   */
  async initialize(config: ProviderConfig): Promise<void> {
    logger.info(`Initializing ${this.name} provider`);
    
    this.config = { ...config };
    this.initialized = false;

    try {
      await this.doInitialize(config);
      this.initialized = true;
      logger.info(`${this.name} provider initialized successfully`);
    } catch (error) {
      logger.error(`Failed to initialize ${this.name} provider:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 具象クラスで実装する初期化処理
   */
  protected abstract doInitialize(config: ProviderConfig): Promise<void>;

  /**
   * テキスト生成（非ストリーミング）
   */
  async complete(params: PromptParameters): Promise<CompletionResponse> {
    this.ensureInitialized();
    
    const retryStrategy = this.options.retryStrategy!;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryStrategy.maxAttempts; attempt++) {
      try {
        logger.debug(`Attempting completion (attempt ${attempt}/${retryStrategy.maxAttempts})`);
        return await this.doComplete(params);
      } catch (error) {
        lastError = error as Error;
        
        if (!retryStrategy.shouldRetry(lastError, attempt)) {
          break;
        }

        const delay = retryStrategy.getDelay(attempt);
        logger.warn(`Retrying after ${delay}ms due to error:`, lastError.message);
        await this.delay(delay);
      }
    }

    throw this.handleError(lastError!);
  }

  /**
   * 具象クラスで実装する完了処理
   */
  protected abstract doComplete(params: PromptParameters): Promise<CompletionResponse>;

  /**
   * テキスト生成（ストリーミング）
   */
  async *stream(params: PromptParameters): AsyncIterableIterator<StreamingChunk> {
    this.ensureInitialized();

    try {
      yield* this.doStream(params);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 具象クラスで実装するストリーミング処理
   */
  protected abstract doStream(params: PromptParameters): AsyncIterableIterator<StreamingChunk>;

  /**
   * 利用可能なモデルのリストを取得
   */
  async listModels(): Promise<LLMModel[]> {
    this.ensureInitialized();

    try {
      const models = await this.doListModels();
      
      // キャッシュに保存
      models.forEach(model => {
        this.models.set(model.id, model);
      });

      return models;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 具象クラスで実装するモデルリスト取得処理
   */
  protected abstract doListModels(): Promise<LLMModel[]>;

  /**
   * 特定のモデル情報を取得
   */
  async getModel(modelId: string): Promise<LLMModel | null> {
    // キャッシュから取得を試みる
    if (this.models.has(modelId)) {
      return this.models.get(modelId)!;
    }

    // キャッシュにない場合はリストを取得
    const models = await this.listModels();
    return models.find(m => m.id === modelId) || null;
  }

  /**
   * コンテキスト情報の計算
   */
  async calculateContext(messages: Message[], modelId: string): Promise<ContextInfo> {
    const model = await this.getModel(modelId);
    if (!model) {
      throw new LLMError(LLMErrorType.INVALID_REQUEST, `Model ${modelId} not found`);
    }

    let totalTokens = 0;
    let systemPromptTokens = 0;

    for (const message of messages) {
      const tokens = await this.estimateTokens(message.content, modelId);
      totalTokens += tokens;

      if (message.role === 'system') {
        systemPromptTokens += tokens;
      }
    }

    return {
      messageCount: messages.length,
      tokenCount: totalTokens,
      systemPromptTokens,
      availableTokens: model.contextWindow - totalTokens,
      maxContextWindow: model.contextWindow
    };
  }

  /**
   * トークン数の推定（デフォルト実装）
   */
  async estimateTokens(text: string, modelId?: string): Promise<number> {
    // 簡易的な推定: 1トークン ≈ 4文字（英語）または2文字（日本語）
    // 具象クラスでより正確な実装を提供すべき
    const avgCharsPerToken = this.hasJapanese(text) ? 2 : 4;
    return Math.ceil(text.length / avgCharsPerToken);
  }

  /**
   * プロバイダーの検証
   */
  async validate(): Promise<boolean> {
    try {
      this.ensureInitialized();
      await this.doValidate();
      return true;
    } catch (error) {
      logger.error(`Validation failed for ${this.name}:`, error);
      return false;
    }
  }

  /**
   * 具象クラスで実装する検証処理
   */
  protected abstract doValidate(): Promise<void>;

  /**
   * プロバイダーの破棄
   */
  async dispose(): Promise<void> {
    logger.info(`Disposing ${this.name} provider`);
    
    try {
      await this.doDispose();
      this.initialized = false;
      this.models.clear();
    } catch (error) {
      logger.error(`Error disposing ${this.name} provider:`, error);
    }
  }

  /**
   * 具象クラスで実装する破棄処理
   */
  protected async doDispose(): Promise<void> {
    // デフォルトでは何もしない
  }

  /**
   * 初期化チェック
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new LLMError(LLMErrorType.INVALID_REQUEST, `${this.name} provider not initialized`);
    }
  }

  /**
   * エラーハンドリング
   */
  protected handleError(error: any): LLMError {
    if (error instanceof LLMError) {
      return error;
    }

    // HTTPエラーの処理
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;

      if (status === 401) {
        return new LLMError(LLMErrorType.AUTHENTICATION, message, status, error);
      } else if (status === 429) {
        return new LLMError(LLMErrorType.RATE_LIMIT, message, status, error);
      } else if (status >= 400 && status < 500) {
        return new LLMError(LLMErrorType.INVALID_REQUEST, message, status, error);
      } else if (status >= 500) {
        return new LLMError(LLMErrorType.SERVER_ERROR, message, status, error);
      }
    }

    // ネットワークエラー
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new LLMError(LLMErrorType.NETWORK, error.message, undefined, error);
    }

    // タイムアウト
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      return new LLMError(LLMErrorType.TIMEOUT, error.message, undefined, error);
    }

    // その他のエラー
    return new LLMError(LLMErrorType.UNKNOWN, error.message || 'Unknown error', undefined, error);
  }

  /**
   * 遅延処理
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 日本語判定
   */
  protected hasJapanese(text: string): boolean {
    return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf]/.test(text);
  }

  /**
   * HTTPリクエストの実行（共通処理）
   */
  protected async fetchWithTimeout(
    url: string,
    options: RequestInit & { timeout?: number } = {}
  ): Promise<Response> {
    const timeout = options.timeout || this.options.timeout || 30000;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.options.headers,
          ...options.headers
        }
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}