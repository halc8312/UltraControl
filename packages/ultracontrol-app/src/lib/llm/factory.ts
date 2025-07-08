/**
 * LLMプロバイダーファクトリー
 */

import type { ILLMProvider, IProviderFactory } from './interfaces';
import type { ProviderConfig, LLMProviderType } from './types';
import { LLMError, LLMErrorType } from './types';
import { AnthropicProvider } from './providers/anthropic';
import { OpenAIProvider } from './providers/openai'; // OpenAIProviderをインポート
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('LLMProviderFactory');

/**
 * プロバイダーファクトリーの実装
 */
export class LLMProviderFactory implements IProviderFactory {
  private providers: Map<string, new () => ILLMProvider> = new Map();

  constructor() {
    // デフォルトプロバイダーの登録
    this.registerDefaultProviders();
  }

  /**
   * プロバイダーの作成
   */
  create(type: string, config?: ProviderConfig): ILLMProvider {
    const ProviderClass = this.providers.get(type.toLowerCase());
    
    if (!ProviderClass) {
      throw new LLMError(
        LLMErrorType.INVALID_REQUEST,
        `Unknown provider type: ${type}. Available providers: ${this.listProviders().join(', ')}`
      );
    }

    logger.info(`Creating ${type} provider`);
    const provider = new ProviderClass();
    
    // 設定が提供されている場合は初期化も行う
    if (config) {
      provider.initialize(config).catch(error => {
        logger.error(`Failed to initialize ${type} provider:`, error);
      });
    }

    return provider;
  }

  /**
   * プロバイダーの登録
   */
  register(type: string, providerClass: new () => ILLMProvider): void {
    const normalizedType = type.toLowerCase();
    
    if (this.providers.has(normalizedType)) {
      logger.warn(`Overwriting existing provider: ${normalizedType}`);
    }

    this.providers.set(normalizedType, providerClass);
    logger.info(`Registered provider: ${normalizedType}`);
  }

  /**
   * 登録されているプロバイダーのリスト取得
   */
  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * デフォルトプロバイダーの登録
   */
  private registerDefaultProviders(): void {
    this.register('anthropic', AnthropicProvider);
    this.register('openai', OpenAIProvider); // OpenAIProviderを登録
    
    // 今後追加予定
    // this.register('cohere', CohereProvider);
    // this.register('ollama', OllamaProvider);
    // this.register('openai-like', OpenAILikeProvider);
  }
}

// シングルトンインスタンス
let factoryInstance: LLMProviderFactory | null = null;

/**
 * ファクトリーインスタンスの取得
 */
export function getProviderFactory(): LLMProviderFactory {
  if (!factoryInstance) {
    factoryInstance = new LLMProviderFactory();
  }
  return factoryInstance;
}

/**
 * プロバイダーの簡易作成関数
 */
export function createProvider(type: LLMProviderType | string, config?: ProviderConfig): ILLMProvider {
  return getProviderFactory().create(type, config);
}