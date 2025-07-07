/**
 * LLM統合レイヤーのユーティリティ関数
 */

import type { ILLMProvider } from './interfaces';
import type { ProviderConfig, LLMProviderType, Message } from './types';
import { getProviderFactory } from './factory';
import { getGlobalLLMManager } from './manager';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('LLMUtils');

/**
 * LLMプロバイダーの簡易作成
 */
export async function createLLMProvider(
  type: LLMProviderType | string,
  config: ProviderConfig
): Promise<ILLMProvider> {
  const factory = getProviderFactory();
  const provider = factory.create(type);
  await provider.initialize(config);
  return provider;
}

/**
 * クイック完了関数
 * グローバルマネージャーを使用した簡易的なテキスト生成
 */
export async function quickComplete(
  prompt: string,
  options?: {
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const manager = getGlobalLLMManager();
  const response = await manager.complete(prompt, options);
  return response.choices[0]?.message?.content || '';
}

/**
 * メッセージフォーマッタ
 */
export function formatMessages(
  messages: Array<{ role: string; content: string }>
): Message[] {
  return messages.map(msg => ({
    role: msg.role as Message['role'],
    content: msg.content
  }));
}

/**
 * システムプロンプトビルダー
 */
export function buildSystemPrompt(options: {
  role?: string;
  context?: string;
  constraints?: string[];
  examples?: string[];
}): string {
  const parts: string[] = [];

  if (options.role) {
    parts.push(`You are ${options.role}.`);
  }

  if (options.context) {
    parts.push(`\nContext:\n${options.context}`);
  }

  if (options.constraints && options.constraints.length > 0) {
    parts.push('\nConstraints:');
    options.constraints.forEach((constraint, i) => {
      parts.push(`${i + 1}. ${constraint}`);
    });
  }

  if (options.examples && options.examples.length > 0) {
    parts.push('\nExamples:');
    options.examples.forEach(example => {
      parts.push(example);
    });
  }

  return parts.join('\n');
}

/**
 * トークン推定ユーティリティ
 */
export async function estimateTokens(
  text: string,
  provider?: ILLMProvider,
  modelId?: string
): Promise<number> {
  if (provider) {
    return provider.estimateTokens(text, modelId);
  }

  // 簡易推定（プロバイダーがない場合）
  const avgCharsPerToken = hasJapanese(text) ? 2 : 4;
  return Math.ceil(text.length / avgCharsPerToken);
}

/**
 * 日本語判定
 */
function hasJapanese(text: string): boolean {
  return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf]/.test(text);
}

/**
 * レスポンスの解析ユーティリティ
 */
export function parseToolCalls(content: string): Array<{
  name: string;
  arguments: Record<string, any>;
}> {
  const toolCalls: Array<{ name: string; arguments: Record<string, any> }> = [];
  
  // 簡易的なツール呼び出しパターンの検出
  const pattern = /<tool_call>\s*{[^}]+}\s*<\/tool_call>/g;
  const matches = content.match(pattern);

  if (matches) {
    matches.forEach(match => {
      try {
        const jsonStr = match.replace(/<\/?tool_call>/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        if (parsed.name && parsed.arguments) {
          toolCalls.push(parsed);
        }
      } catch (error) {
        logger.warn('Failed to parse tool call:', error);
      }
    });
  }

  return toolCalls;
}

/**
 * ストリーミングレスポンスの集約
 */
export async function collectStream(
  stream: AsyncIterableIterator<any>
): Promise<string> {
  let content = '';
  
  for await (const chunk of stream) {
    if (chunk.chunk) {
      content += chunk.chunk;
    }
  }

  return content;
}

/**
 * エラーメッセージのフォーマット
 */
export function formatLLMError(error: any): string {
  if (error.type && error.message) {
    return `[${error.type}] ${error.message}`;
  }
  
  if (error.message) {
    return error.message;
  }

  return 'Unknown LLM error occurred';
}

/**
 * プロバイダー設定のバリデーション
 */
export function validateProviderConfig(
  type: string,
  config: ProviderConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // APIキーのチェック
  if (type !== 'ollama' && !config.apiKey) {
    errors.push('API key is required');
  }

  // URLフォーマットのチェック
  if (config.baseUrl) {
    try {
      new URL(config.baseUrl);
    } catch {
      errors.push('Invalid base URL format');
    }
  }

  // タイムアウトのチェック
  if (config.timeout !== undefined && config.timeout <= 0) {
    errors.push('Timeout must be positive');
  }

  // リトライ設定のチェック
  if (config.maxRetries !== undefined && config.maxRetries < 0) {
    errors.push('Max retries must be non-negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}