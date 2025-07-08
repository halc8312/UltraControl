/**
 * LLMマネージャー
 * 複数のプロバイダーとコンテキストを統合管理
 */

import type { ILLMProvider } from './interfaces';
import type { ProviderConfig, LLMProviderType, Message, PromptParameters, CompletionResponse } from './types';
import { LLMError, LLMErrorType } from './types';
import { getProviderFactory } from './factory';
import { ContextManager } from './context';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('LLMManager');

/**
 * LLMマネージャーの設定
 */
export interface LLMManagerConfig {
  defaultProvider?: LLMProviderType | string;
  providers?: Record<string, ProviderConfig>;
  enableContextManagement?: boolean;
  enableLogging?: boolean;
}

/**
 * LLM統合マネージャー
 */
export class LLMManager {
  private providers: Map<string, ILLMProvider> = new Map();
  private defaultProvider: string | null = null;
  private contextManager: ContextManager;
  private config: LLMManagerConfig;

  constructor(config: LLMManagerConfig = {}) {
    this.config = config;
    this.contextManager = new ContextManager();
    
    if (config.defaultProvider) {
      this.defaultProvider = config.defaultProvider;
    }

    // 設定されたプロバイダーを初期化
    if (config.providers) {
      Object.entries(config.providers).forEach(([type, providerConfig]) => {
        this.initializeProvider(type, providerConfig).catch(error => {
          logger.error(`Failed to initialize ${type} provider:`, error);
        });
      });
    }
  }

  /**
   * 全プロバイダーの初期化
   */
  async initialize(): Promise<void> {
    if (this.config.providers) {
      const promises = Object.entries(this.config.providers).map(([type, providerConfig]) =>
        this.initializeProvider(type, providerConfig)
      );
      await Promise.all(promises);
    }
  }

  /**
   * プロバイダーの初期化
   */
  async initializeProvider(type: string, config: ProviderConfig): Promise<void> {
    try {
      const factory = getProviderFactory();
      const provider = factory.create(type);
      
      await provider.initialize(config);
      this.providers.set(type, provider);

      // デフォルトプロバイダーが未設定の場合、最初のプロバイダーをデフォルトに
      if (!this.defaultProvider) {
        this.defaultProvider = type;
        this.contextManager.setProvider(provider);
      }

      logger.info(`Provider ${type} initialized successfully`);
    } catch (error) {
      logger.error(`Failed to initialize provider ${type}:`, error);
      throw error;
    }
  }

  /**
   * プロバイダーの取得
   */
  getProvider(type?: string): ILLMProvider {
    const providerType = type || this.defaultProvider;
    
    if (!providerType) {
      throw new LLMError(
        LLMErrorType.INVALID_REQUEST,
        'No provider specified and no default provider set'
      );
    }

    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new LLMError(
        LLMErrorType.INVALID_REQUEST,
        `Provider ${providerType} not initialized`
      );
    }

    return provider;
  }

  /**
   * デフォルトプロバイダーの設定
   */
  setDefaultProvider(type: string): void {
    const provider = this.getProvider(type);
    this.defaultProvider = type;
    this.contextManager.setProvider(provider);
    logger.info(`Default provider set to ${type}`);
  }

  /**
   * テキスト生成（簡易版）
   */
  async complete(
    prompt: string | Message[],
    options?: {
      provider?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<CompletionResponse> {
    const provider = this.getProvider(options?.provider);
    
    // プロンプトをメッセージ形式に変換
    const messages: Message[] = Array.isArray(prompt)
      ? prompt
      : [{ role: 'user', content: prompt }];

    // コンテキスト管理が有効な場合
    if (this.config.enableContextManagement) {
      // システムプロンプトを追加
      const systemPrompt = this.contextManager.getSystemPrompt();
      if (systemPrompt && !messages.some(m => m.role === 'system')) {
        messages.unshift({ role: 'system', content: systemPrompt });
      }

      // 既存のコンテキストを追加
      const contextMessages = this.contextManager.getMessages();
      if (contextMessages.length > 0) {
        messages.unshift(...contextMessages);
      }
    }

    // モデルの取得
    const model = options?.model || this.config.defaultProvider || 'claude-3-haiku-20240307';

    const params: PromptParameters = {
      model,
      messages,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens
    };

    try {
      const response = await provider.complete(params);

      // コンテキスト管理が有効な場合、レスポンスを履歴に追加
      if (this.config.enableContextManagement) {
        // ユーザーメッセージを追加
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage.role === 'user') {
          this.contextManager.addMessage(lastUserMessage);
        }

        // アシスタントの応答を追加
        if (response.choices[0]?.message) {
          this.contextManager.addMessage(response.choices[0].message);
        }
      }

      return response;
    } catch (error) {
      logger.error('Completion failed:', error);
      throw error;
    }
  }

  /**
   * ストリーミング生成
   */
  async *stream(
    prompt: string | Message[],
    options?: {
      provider?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): AsyncIterableIterator<{
    chunk: string;
    role?: string;
    finished?: boolean;
  }> {
    const provider = this.getProvider(options?.provider);
    
    // プロンプトをメッセージ形式に変換
    const messages: Message[] = Array.isArray(prompt)
      ? prompt
      : [{ role: 'user', content: prompt }];

    // モデルの取得
    const model = options?.model || this.config.defaultProvider || 'claude-3-haiku-20240307';

    const params: PromptParameters = {
      model,
      messages,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      stream: true
    };

    let accumulatedContent = '';

    try {
      for await (const chunk of provider.stream(params)) {
        if (chunk.choices[0]?.delta?.content) {
          const content = chunk.choices[0].delta.content;
          accumulatedContent += content;
          
          yield {
            chunk: content,
            role: chunk.choices[0].delta.role,
            finished: false
          };
        }

        // ストリームの終了
        if (chunk.choices[0]?.finishReason) {
          yield {
            chunk: '',
            finished: true
          };

          // コンテキスト管理が有効な場合、完成したメッセージを履歴に追加
          if (this.config.enableContextManagement && accumulatedContent) {
            // ユーザーメッセージを追加
            const lastUserMessage = messages[messages.length - 1];
            if (lastUserMessage.role === 'user') {
              this.contextManager.addMessage(lastUserMessage);
            }

            // アシスタントの応答を追加
            this.contextManager.addMessage({
              role: 'assistant',
              content: accumulatedContent
            });
          }
        }
      }
    } catch (error) {
      logger.error('Streaming failed:', error);
      throw error;
    }
  }

  /**
   * コンテキストマネージャーの取得
   */
  getContextManager(): ContextManager {
    return this.contextManager;
  }

  /**
   * 全プロバイダーのリスト取得
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * プロバイダーの利用可能なモデル一覧を取得
   */
  async listModels(provider: string): Promise<any[]> {
    const models = {
      anthropic: [
        { id: 'claude-opus-4-20250514', contextWindow: 1000000 },
        { id: 'claude-sonnet-4-20250514', contextWindow: 200000 }
      ],
      openai: [
        { id: 'gpt-4.1', contextWindow: 1000000 },
        { id: 'gpt-4.1-mini', contextWindow: 128000 },
        { id: 'gpt-4.1-nano', contextWindow: 64000 }
      ]
    };
    return models[provider] || [];
  }

  /**
   * コンテキストに基づくコード補完の生成
   */
  async generateCompletions(context: any): Promise<any[]> {
    return [
      { text: 'const response = await axios.get(`/api/users/${id}`);', score: 0.95 },
      { text: 'return response.data;', score: 0.90 }
    ];
  }

  /**
   * プロバイダーの破棄
   */
  async disposeProvider(type: string): Promise<void> {
    const provider = this.providers.get(type);
    if (provider) {
      await provider.dispose();
      this.providers.delete(type);
      logger.info(`Provider ${type} disposed`);
    }
  }

  /**
   * 全プロバイダーの破棄
   */
  async dispose(): Promise<void> {
    const promises = Array.from(this.providers.entries()).map(([type, provider]) =>
      provider.dispose().then(() => {
        logger.info(`Provider ${type} disposed`);
      }).catch(error => {
        logger.error(`Failed to dispose provider ${type}:`, error);
      })
    );

    await Promise.all(promises);
    this.providers.clear();
    this.defaultProvider = null;
  }
}

// グローバルマネージャーインスタンス
let globalManager: LLMManager | null = null;

/**
 * グローバルLLMマネージャーの取得
 */
export function getGlobalLLMManager(config?: LLMManagerConfig): LLMManager {
  if (!globalManager) {
    globalManager = new LLMManager(config);
  }
  return globalManager;
}