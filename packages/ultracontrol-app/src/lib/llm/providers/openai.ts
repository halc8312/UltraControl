/**
 * OpenAI APIプロバイダー
 */

import { BaseLLMProvider } from './base';
import type {
  Message,
  PromptParameters,
  CompletionResponse,
  StreamingChunk,
  LLMModel,
  ProviderConfig,
  CompletionChoice,
  StreamingChoice,
  ToolCall,
} from '../types';
import { LLMError, LLMErrorType } from '../types';
import type { ProviderOptions } from '../interfaces';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('OpenAIProvider');

// OpenAI固有の型定義
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_calls?: {
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }[];
  tool_call_id?: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stop?: string | string[];
  stream?: boolean;
  tools?: any[]; // OpenAIのツール定義型
  tool_choice?: any; // OpenAIのツール選択型
}

interface OpenAIChoice {
  index: number;
  message: OpenAIMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  logprobs?: any;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  system_fingerprint?: string;
}

interface OpenAIStreamChoice {
  index: number;
  delta: Partial<OpenAIMessage>;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  logprobs?: any;
}
interface OpenAIStreamEvent {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: OpenAIStreamChoice[];
  system_fingerprint?: string;
}


/**
 * OpenAIプロバイダーの実装
 */
export class OpenAIProvider extends BaseLLMProvider {
  readonly name = 'openai';

  private apiKey: string = '';
  private baseUrl: string = 'https://api.openai.com/v1';

  // OpenAIのモデル情報 (主要なもののみ)
  // より多くのモデルはAPIから取得することを推奨
  private static readonly MODELS: LLMModel[] = [
    // GPT-4.1 Models (2025年4月リリース)
    {
      id: 'gpt-4.1',
      name: 'GPT-4.1',
      provider: 'openai',
      maxTokens: 16384,
      contextWindow: 1000000, // 100万トークン
      supportsFunctions: true,
      supportsStreaming: true,
      supportsTools: true,
    },
    {
      id: 'gpt-4.1-mini',
      name: 'GPT-4.1 Mini',
      provider: 'openai',
      maxTokens: 8192,
      contextWindow: 1000000, // 100万トークン
      supportsFunctions: true,
      supportsStreaming: true,
      supportsTools: true,
    },
    {
      id: 'gpt-4.1-nano',
      name: 'GPT-4.1 Nano',
      provider: 'openai',
      maxTokens: 4096,
      contextWindow: 1000000, // 100万トークン
      supportsFunctions: true,
      supportsStreaming: true,
      supportsTools: true,
    },
    // GPT-4o Models
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      maxTokens: 4096, // output tokens
      contextWindow: 128000,
      supportsFunctions: true,
      supportsStreaming: true,
      supportsTools: true,
    },
    {
      id: 'gpt-4o-mini',
      name: 'GPT-4o Mini',
      provider: 'openai',
      maxTokens: 4096,
      contextWindow: 128000,
      supportsFunctions: true,
      supportsStreaming: true,
      supportsTools: true,
    },
    // GPT-4 Models
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      maxTokens: 4096,
      contextWindow: 128000,
      supportsFunctions: true,
      supportsStreaming: true,
      supportsTools: true,
    },
    {
      id: 'gpt-4',
      name: 'GPT-4',
      provider: 'openai',
      maxTokens: 8192,
      contextWindow: 8192,
      supportsFunctions: true,
      supportsStreaming: true,
      supportsTools: true,
    },
    // GPT-3.5 Models
    {
      id: 'gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      provider: 'openai',
      maxTokens: 4096,
      contextWindow: 16385, // Varies by specific 3.5 turbo model
      supportsFunctions: true,
      supportsStreaming: true,
      supportsTools: true,
    },
  ];

  constructor(options?: ProviderOptions) {
    super(options);
  }

  /**
   * 初期化処理
   */
  protected async doInitialize(config: ProviderConfig): Promise<void> {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      throw new LLMError(LLMErrorType.AUTHENTICATION, 'API key is required for OpenAI provider. Set OPENAI_API_KEY environment variable or provide it in config.');
    }

    this.baseUrl = config.baseUrl || this.baseUrl;

    // モデルをキャッシュに登録
    OpenAIProvider.MODELS.forEach(model => {
      this.models.set(model.id, model);
    });
    // APIからモデルリストを取得することも検討
    // await this.listModels();

    logger.info('OpenAI provider initialized with base URL:', this.baseUrl);
  }

  /**
   * モデルリストの取得
   */
  protected async doListModels(): Promise<LLMModel[]> {
    // OpenAI APIからモデルリストを取得する実装 (オプション)
    // ここではハードコードされたリストを返すか、必要に応じてAPIを叩く
    // try {
    //   const response = await this.fetchWithTimeout(`${this.baseUrl}/models`, {
    //     headers: { Authorization: `Bearer ${this.apiKey}` },
    //   });
    //   if (!response.ok) await this.handleApiError(response);
    //   const data = await response.json();
    //   return data.data.map((model: any) => ({
    //     id: model.id,
    //     name: model.id, // OpenAI APIはnameを提供しない場合がある
    //     provider: 'openai',
    //     // maxTokens, contextWindow等はモデルによって異なるため、詳細なマッピングが必要
    //   }));
    // } catch (error) {
    //   logger.warn('Failed to fetch model list from OpenAI API, using static list.', error);
    // }
    return OpenAIProvider.MODELS;
  }

  /**
   * 検証処理
   */
  protected async doValidate(): Promise<void> {
    try {
      await this.doComplete({
        model: this.config.defaultModel || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 10,
      });
    } catch (error) {
      if (error instanceof LLMError && error.type === LLMErrorType.AUTHENTICATION) {
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

    const response = await this.fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...this.config.headers,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      await this.handleApiError(response);
    }

    const data: OpenAIResponse = await response.json();
    return this.convertResponse(data);
  }

  /**
   * テキスト生成（ストリーミング）
   */
  protected async *doStream(params: PromptParameters): AsyncIterableIterator<StreamingChunk> {
    const request = this.buildRequest(params, true);

    const response = await this.fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...this.config.headers,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      await this.handleApiError(response);
    }

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
          if (data.trim() === '[DONE]') {
            return; // ストリーム終了
          }
          try {
            const event: OpenAIStreamEvent = JSON.parse(data);
            const chunk = this.convertStreamEvent(event);
            if (chunk) {
              yield chunk;
            }
          } catch (error) {
            logger.warn('Failed to parse stream event:', error, 'Data:', data);
          }
        }
      }
    }
  }

  /**
   * リクエストの構築
   */
  private buildRequest(params: PromptParameters, stream = false): OpenAIRequest {
    const messages: OpenAIMessage[] = params.messages.map(msg => {
      const openAIMsg: OpenAIMessage = {
        role: msg.role === 'function' ? 'tool' : msg.role, // 'function' role is now 'tool'
        content: msg.content || null, // content can be null for tool calls
      };
      if (msg.name) openAIMsg.name = msg.name;
      if (msg.toolCalls) {
        openAIMsg.tool_calls = msg.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }));
      }
      // If it's a tool response, it needs a tool_call_id
      if (msg.role === 'tool' && params.messages.find(m => m.toolCalls?.find(tc => tc.id === msg.name))) {
         openAIMsg.tool_call_id = msg.name; // Assuming msg.name holds the tool_call_id for responses
      }
      return openAIMsg;
    });

    const model = this.models.get(params.model);
    const maxTokens = params.maxTokens || model?.maxTokens;


    const request: OpenAIRequest = {
      model: params.model,
      messages,
      stream,
    };

    if (maxTokens !== undefined) request.max_tokens = maxTokens;
    if (params.temperature !== undefined) request.temperature = params.temperature;
    if (params.topP !== undefined) request.top_p = params.topP;
    if (params.stopSequences !== undefined) request.stop = params.stopSequences;
    if (params.tools) request.tools = params.tools.map(t => ({ type: t.type, function: t.function }));
    if (params.toolChoice) request.tool_choice = params.toolChoice;


    return request;
  }

  /**
   * レスポンスの変換
   */
  private convertResponse(data: OpenAIResponse): CompletionResponse {
    const choices: CompletionChoice[] = data.choices.map(choice => ({
      index: choice.index,
      message: {
        role: choice.message.role,
        content: choice.message.content || '', // content can be null for tool_calls
        toolCalls: choice.message.tool_calls?.map(tc => ({
          id: tc.id,
          type: 'function',
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
      },
      finishReason: choice.finish_reason,
      logprobs: choice.logprobs,
    }));

    return {
      id: data.id,
      model: data.model,
      choices,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      created: data.created,
    };
  }

  /**
   * ストリーミングイベントの変換
   */
  private convertStreamEvent(event: OpenAIStreamEvent): StreamingChunk | null {
    if (!event.choices || event.choices.length === 0) {
      return null;
    }
    const choice = event.choices[0]; // Typically one choice in stream delta

    const delta: Partial<Message> = {};
    if (choice.delta.role) delta.role = choice.delta.role as Message['role'];
    if (choice.delta.content !== undefined) delta.content = choice.delta.content || ""; // Ensure content is not null
    if (choice.delta.tool_calls) {
       delta.toolCalls = choice.delta.tool_calls.map(tc => {
        // Initialize function object if it's undefined
        const func = tc.function || { name: "", arguments: "" };
        return {
          id: tc.id || `toolcall_${Date.now()}`, // Ensure id exists
          type: 'function',
          function: {
            name: func.name || "", // Ensure name exists
            arguments: func.arguments || "", // Ensure arguments exist
          },
        };
      });
    }


    const streamingChoice: StreamingChoice = {
      index: choice.index,
      delta,
      finishReason: choice.finish_reason,
      logprobs: choice.logprobs,
    };

    return {
      id: event.id,
      model: event.model,
      choices: [streamingChoice],
      created: event.created,
    };
  }

  /**
   * APIエラーのハンドリング
   */
  private async handleApiError(response: Response): Promise<never> {
    let errorMessage: string;
    let errorType: string | undefined;
    let errorData: any;

    try {
      errorData = await response.json();
      errorMessage = errorData.error?.message || 'Unknown OpenAI API error';
      errorType = errorData.error?.type;
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }

    if (response.status === 401) {
      throw new LLMError(LLMErrorType.AUTHENTICATION, errorMessage, response.status, errorData);
    } else if (response.status === 429) {
      throw new LLMError(LLMErrorType.RATE_LIMIT, errorMessage, response.status, errorData);
    } else if (response.status === 400 || errorType === 'invalid_request_error') {
      throw new LLMError(LLMErrorType.INVALID_REQUEST, errorMessage, response.status, errorData);
    } else if (response.status >= 500 || errorType === 'api_error' || errorType === 'internal_error') {
      throw new LLMError(LLMErrorType.SERVER_ERROR, errorMessage, response.status, errorData);
    } else {
      throw new LLMError(LLMErrorType.UNKNOWN, errorMessage, response.status, errorData);
    }
  }

  /**
   * トークン数の推定 (OpenAI向け)
   * tiktokenライブラリを使用するのが最も正確ですが、ここでは簡易的な推定を行います。
   * 本番環境ではtiktokenの導入を検討してください。
   */
  async estimateTokens(text: string, modelId?: string): Promise<number> {
    // GPT-3.5/GPT-4のトークナイザーは複雑なので、tiktokenを使うのがベスト
    // 簡易推定: 英語の場合、1トークンあたり約4文字。日本語の場合はより少ない。
    const isJapanese = this.hasJapanese(text);
    const charsPerToken = isJapanese ? 1.8 : 4;
    // 実際のトークン数はモデルや内容によって変動する
    // 例: "hello world" -> 2 tokens, "こんにちは世界" -> 7 tokens (gpt-3.5-turbo)
    return Math.ceil(text.length / charsPerToken);
  }
}
