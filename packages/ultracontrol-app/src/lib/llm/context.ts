/**
 * コンテキスト管理システム
 */

import { atom } from 'nanostores';
import type { Message, ContextInfo } from './types';
import type { IContextManager, ILLMProvider } from './interfaces';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('ContextManager');

/**
 * コンテキストマネージャーの実装
 */
export class ContextManager implements IContextManager {
  // メッセージ履歴のストア
  private messagesStore = atom<Message[]>([]);
  
  // システムプロンプトのストア
  private systemPromptStore = atom<string | null>(null);
  
  // 現在のコンテキスト情報
  private contextInfoStore = atom<ContextInfo | null>(null);

  constructor(private provider?: ILLMProvider) {}

  /**
   * プロバイダーの設定
   */
  setProvider(provider: ILLMProvider): void {
    this.provider = provider;
  }

  /**
   * メッセージの追加
   */
  addMessage(message: Message): void {
    const messages = this.messagesStore.get();
    this.messagesStore.set([...messages, message]);
    logger.debug('Message added:', message.role, message.content.substring(0, 50) + '...');
  }

  /**
   * メッセージ履歴の取得
   */
  getMessages(): Message[] {
    return this.messagesStore.get();
  }

  /**
   * メッセージ履歴のクリア
   */
  clearMessages(): void {
    this.messagesStore.set([]);
    this.contextInfoStore.set(null);
    logger.info('Message history cleared');
  }

  /**
   * システムプロンプトの設定
   */
  setSystemPrompt(prompt: string): void {
    this.systemPromptStore.set(prompt);
    logger.debug('System prompt set:', prompt.substring(0, 50) + '...');
  }

  /**
   * システムプロンプトの取得
   */
  getSystemPrompt(): string | null {
    return this.systemPromptStore.get();
  }

  /**
   * コンテキストウィンドウに収まるメッセージの取得
   */
  async getMessagesInWindow(maxTokens: number, modelId: string): Promise<Message[]> {
    if (!this.provider) {
      throw new Error('Provider not set');
    }

    const allMessages = this.messagesStore.get();
    const systemPrompt = this.systemPromptStore.get();
    
    // システムプロンプトを含む全メッセージ
    const messagesWithSystem: Message[] = [];
    if (systemPrompt) {
      messagesWithSystem.push({ role: 'system', content: systemPrompt });
    }
    messagesWithSystem.push(...allMessages);

    // 後ろから順にトークン数を計算していく
    const result: Message[] = [];
    let totalTokens = 0;

    // システムプロンプトは必ず含める
    if (systemPrompt) {
      const systemTokens = await this.provider.estimateTokens(systemPrompt, modelId);
      totalTokens += systemTokens;
      result.unshift({ role: 'system', content: systemPrompt });
    }

    // 最新のメッセージから順に追加
    for (let i = allMessages.length - 1; i >= 0; i--) {
      const message = allMessages[i];
      const tokens = await this.provider.estimateTokens(message.content, modelId);
      
      if (totalTokens + tokens > maxTokens) {
        logger.warn(`Context window limit reached. Truncating at message ${i}`);
        break;
      }

      totalTokens += tokens;
      result.splice(1, 0, message); // システムプロンプトの後に挿入
    }

    // コンテキスト情報を更新
    const model = await this.provider.getModel(modelId);
    if (model) {
      this.contextInfoStore.set({
        messageCount: result.length,
        tokenCount: totalTokens,
        systemPromptTokens: systemPrompt ? await this.provider.estimateTokens(systemPrompt, modelId) : 0,
        availableTokens: model.contextWindow - totalTokens,
        maxContextWindow: model.contextWindow
      });
    }

    return result;
  }

  /**
   * 現在のコンテキスト情報を取得
   */
  getContextInfo(): ContextInfo | null {
    return this.contextInfoStore.get();
  }

  /**
   * メッセージストアの購読
   */
  subscribeToMessages(callback: (messages: readonly Message[]) => void): () => void {
    return this.messagesStore.subscribe(callback);
  }

  /**
   * コンテキスト情報の購読
   */
  subscribeToContextInfo(callback: (info: ContextInfo | null) => void): () => void {
    return this.contextInfoStore.subscribe(callback);
  }
}

// グローバルコンテキストマネージャー
let globalContextManager: ContextManager | null = null;

/**
 * グローバルコンテキストマネージャーの取得
 */
export function getGlobalContextManager(): ContextManager {
  if (!globalContextManager) {
    globalContextManager = new ContextManager();
  }
  return globalContextManager;
}

/**
 * コンテキストのエクスポート/インポート機能
 */
export interface SerializedContext {
  messages: Message[];
  systemPrompt: string | null;
  timestamp: number;
}

/**
 * コンテキストのシリアライズ
 */
export function serializeContext(manager: ContextManager): SerializedContext {
  return {
    messages: manager.getMessages(),
    systemPrompt: manager.getSystemPrompt(),
    timestamp: Date.now()
  };
}

/**
 * コンテキストのデシリアライズ
 */
export function deserializeContext(manager: ContextManager, data: SerializedContext): void {
  manager.clearMessages();
  
  if (data.systemPrompt) {
    manager.setSystemPrompt(data.systemPrompt);
  }

  data.messages.forEach(message => {
    manager.addMessage(message);
  });

  logger.info(`Context restored with ${data.messages.length} messages`);
}