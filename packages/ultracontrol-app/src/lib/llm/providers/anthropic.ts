/**
 * Anthropic APIプロバイダー
 */

import { BaseLLMProvider } from './base';
import type {
  Message,
  PromptParameters,
  CompletionResponse,
  StreamingChunk,
  LLMModel,
  ProviderConfig,
  LLMErrorType,
  CompletionChoice,
  StreamingChoice
} from '../types';
import { LLMError, LLMErrorType as ErrorType } from '../types';
import type { ProviderOptions } from '../interfaces';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('AnthropicProvider');

// Anthropic固有の型定義
interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  stop_sequences?: string[];
  stream?: boolean;
  system?: string;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

interface AnthropicStreamEvent {
  type: string;
  index?: number;
  delta?: {
    type: 'text_delta';
    text: string;
  };
  message?: AnthropicResponse;
  content_block?: {
    type: 'text';
    text: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Anthropicプロバイダーの実装
 */
export class AnthropicProvider extends BaseLLMProvider {
  readonly name = 'anthropic';
  
  private apiKey: string = '';
  private baseUrl: string = 'https://api.anthropic.com/v1';

  // Anthropicのモデル情報
  private static readonly MODELS: LLMModel[] = [
    // Claude 4 Models (2025年5月リリース)
    {
      id: 'claude-opus-4-20250514',
      name: 'Claude Opus 4',
      provider: 'anthropic',
      maxTokens: 8192,
      contextWindow: 1000000, // 100万トークン
      supportsFunctions: true,
      supportsStreaming: true,
      supportsTools: true
    },
    {
      id: 'claude-sonnet-4-20250514',
      name: 'Claude Sonnet 4',
      provider: 'anthropic',
      maxTokens: 8192,
      contextWindow: 1000000, // 100万トークン
      supportsFunctions: true,
      supportsStreaming: true,
      supportsTools: true
    },
    // Claude 3.5 Models
    {
      id: 'claude-3-5-sonnet-latest',
      name: 'Claude 3.5 Sonnet (Latest)',
      provider: 'anthropic',
      maxTokens: 8192,
      contextWindow: 200000,
      supportsFunctions: false,
      supportsStreaming: true,
      supportsTools: false
    },
    {
      id: 'claude-3-5-sonnet-20241022',
      name: 'Claude 3.5 Sonnet',
      provider: 'anthropic',
      maxTokens: 8192,
      contextWindow: 200000,
      supportsFunctions: false,
      supportsStreaming: true,
      supportsTools: false
    },
    {
      id: 'claude-3-5-haiku-latest',
      name: 'Claude 3.5 Haiku (Latest)',
      provider: 'anthropic',
      maxTokens: 8192,
      contextWindow: 200000,
      supportsFunctions: false,
      supportsStreaming: true,
      supportsTools: false
    },
    // Claude 3 Models
    {
      id: 'claude-3-opus-latest',
      name: 'Claude 3 Opus (Latest)',
      provider: 'anthropic',
      maxTokens: 4096,
      contextWindow: 200000,
      supportsFunctions: false,
      supportsStreaming: true,
      supportsTools: false
    },
    {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      maxTokens: 4096,
      contextWindow: 200000,
      supportsFunctions: false,
      supportsStreaming: true,
      supportsTools: false
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      provider: 'anthropic',
      maxTokens: 4096,
      contextWindow: 200000,
      supportsFunctions: false,
      supportsStreaming: true,
      supportsTools: false
    }
  ];

  constructor(options?: ProviderOptions) {
    super(options);
  }

  /**
   * 初期化処理
   */
  protected async doInitialize(config: ProviderConfig): Promise<void> {
    if (!config.apiKey) {
      throw new LLMError(ErrorType.AUTHENTICATION, 'API key is required for Anthropic provider');
    }

    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || this.baseUrl;

    // モデルをキャッシュに登録
    AnthropicProvider.MODELS.forEach(model => {
      this.models.set(model.id, model);
    });

    logger.info('Anthropic provider initialized with base URL:', this.baseUrl);
  }

  /**
   * モデルリストの取得
   */
  protected async doListModels(): Promise<LLMModel[]> {
    // Anthropic APIはモデルリストのエンドポイントを提供していないため、
    // ハードコーディングされたリストを返す
    return AnthropicProvider.MODELS;
  }

  /**
   * 検証処理
   */
  protected async doValidate(): Promise<void> {
    // 簡単なAPIコールで検証
    try {
      await this.doComplete({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 10
      });
    } catch (error) {
      if (error instanceof LLMError && error.type === ErrorType.AUTHENTICATION) {
        throw error;
      }
      // その他のエラーは無視（レート制限など）
    }
  }

  /**
   * テキスト生成（非ストリーミング）
   */
  protected async doComplete(params: PromptParameters): Promise<CompletionResponse> {
    const request = this.buildRequest(params);
    
    const response = await this.fetchWithTimeout(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        ...this.config.headers
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      await this.handleApiError(response);
    }

    const data: AnthropicResponse = await response.json();
    return this.convertResponse(data);
  }

  /**
   * テキスト生成（ストリーミング）
   */
  protected async *doStream(params: PromptParameters): AsyncIterableIterator<StreamingChunk> {
    const request = this.buildRequest(params, true);
    
    const response = await this.fetchWithTimeout(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        ...this.config.headers
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      await this.handleApiError(response);
    }

    // ストリーミングレスポンスの処理
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const event: AnthropicStreamEvent = JSON.parse(data);
            const chunk = this.convertStreamEvent(event);
            if (chunk) {
              yield chunk;
            }
          } catch (error) {
            logger.warn('Failed to parse stream event:', error);
          }
        }
      }
    }
  }

  /**
   * トークン数の推定（Anthropic向けの改善版）
   */
  async estimateTokens(text: string, modelId?: string): Promise<number> {
    // Claudeモデルのトークン推定
    // より正確な推定: 1トークン ≈ 3.5文字（英語）または1.5文字（日本語）
    const avgCharsPerToken = this.hasJapanese(text) ? 1.5 : 3.5;
    return Math.ceil(text.length / avgCharsPerToken);
  }

  /**
   * リクエストの構築
   */
  private buildRequest(params: PromptParameters, stream = false): AnthropicRequest {
    const messages: AnthropicMessage[] = [];
    let systemPrompt: string | undefined;

    // メッセージの変換
    for (const msg of params.messages) {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Anthropicは最初のメッセージがuserである必要がある
    if (messages.length === 0 || messages[0].role !== 'user') {
      throw new LLMError(
        ErrorType.INVALID_REQUEST,
        'First message must be from user role for Anthropic API'
      );
    }

    const model = this.models.get(params.model);
    const maxTokens = params.maxTokens || model?.maxTokens || 4096;

    return {
      model: params.model,
      messages,
      max_tokens: maxTokens,
      temperature: params.temperature,
      top_p: params.topP,
      stop_sequences: params.stopSequences,
      stream,
      ...(systemPrompt && { system: systemPrompt })
    };
  }

  /**
   * レスポンスの変換
   */
  private convertResponse(data: AnthropicResponse): CompletionResponse {
    const content = data.content.map(c => c.text).join('');
    
    const choice: CompletionChoice = {
      index: 0,
      message: {
        role: 'assistant',
        content
      },
      finishReason: this.convertStopReason(data.stop_reason)
    };

    return {
      id: data.id,
      model: data.model,
      choices: [choice],
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens
      },
      created: Date.now()
    };
  }

  /**
   * ストリーミングイベントの変換
   */
  private convertStreamEvent(event: AnthropicStreamEvent): StreamingChunk | null {
    if (event.type === 'content_block_delta' && event.delta) {
      const choice: StreamingChoice = {
        index: event.index || 0,
        delta: {
          content: event.delta.text
        },
        finishReason: null
      };

      return {
        id: 'stream-' + Date.now(),
        model: this.config.defaultModel || 'claude-3-haiku-20240307',
        choices: [choice],
        created: Date.now()
      };
    } else if (event.type === 'message_delta' && event.usage) {
      // 最終的な使用量情報を含むイベント
      const choice: StreamingChoice = {
        index: 0,
        delta: {},
        finishReason: 'stop'
      };

      return {
        id: 'stream-' + Date.now(),
        model: this.config.defaultModel || 'claude-3-haiku-20240307',
        choices: [choice],
        created: Date.now()
      };
    }

    return null;
  }

  /**
   * 停止理由の変換
   */
  private convertStopReason(reason: string | null): CompletionChoice['finishReason'] {
    switch (reason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'stop_sequence':
        return 'stop';
      default:
        return null;
    }
  }

  /**
   * APIエラーのハンドリング
   */
  private async handleApiError(response: Response): Promise<never> {
    let errorMessage: string;
    let errorType: string | undefined;

    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorData.message || 'Unknown error';
      errorType = errorData.error?.type;
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }

    // Anthropic固有のエラーコードをLLMErrorTypeにマッピング
    if (response.status === 401 || errorType === 'authentication_error') {
      throw new LLMError(ErrorType.AUTHENTICATION, errorMessage, response.status);
    } else if (response.status === 429 || errorType === 'rate_limit_error') {
      throw new LLMError(ErrorType.RATE_LIMIT, errorMessage, response.status);
    } else if (response.status === 400 || errorType === 'invalid_request_error') {
      throw new LLMError(ErrorType.INVALID_REQUEST, errorMessage, response.status);
    } else if (response.status >= 500 || errorType === 'api_error') {
      throw new LLMError(ErrorType.SERVER_ERROR, errorMessage, response.status);
    } else {
      throw new LLMError(ErrorType.UNKNOWN, errorMessage, response.status);
    }
  }
}