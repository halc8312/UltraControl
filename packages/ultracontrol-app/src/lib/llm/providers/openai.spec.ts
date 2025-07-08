import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIProvider } from './openai';
import { LLMError, LLMErrorType, type Message, type PromptParameters } from '../types';

// global.fetch をモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

// process.env をモック (APIキー用)
const originalEnv = process.env;

describe('OpenAIProvider', () => {
  beforeEach(() => {
    vi.resetModules(); // モジュールキャッシュをリセット
    mockFetch.mockReset();
    process.env = { ...originalEnv }; // 環境変数をリセット
    // デフォルトのAPIキーを設定
    process.env.OPENAI_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env = originalEnv; // 環境変数を元に戻す
  });

  const dummyMessages: Message[] = [{ role: 'user', content: 'Hello' }];
  const dummyParams: PromptParameters = { model: 'gpt-4o', messages: dummyMessages };

  it('should initialize with API key from env', async () => {
    const provider = new OpenAIProvider();
    await provider.initialize({});
    expect(provider.name).toBe('openai');
  });

  it('should throw AUTHENTICATION error if API key is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const provider = new OpenAIProvider();
    await expect(provider.initialize({})).rejects.toThrowError(
      new LLMError(LLMErrorType.AUTHENTICATION, 'API key is required for OpenAI provider. Set OPENAI_API_KEY environment variable or provide it in config.')
    );
  });

  it('should initialize with API key from config', async () => {
    delete process.env.OPENAI_API_KEY;
    const provider = new OpenAIProvider();
    await provider.initialize({ apiKey: 'config-key' });
    // @ts-ignore access private member for test
    expect(provider.apiKey).toBe('config-key');
  });

  describe('complete', () => {
    it('should make a correct API call and parse response', async () => {
      const provider = new OpenAIProvider();
      await provider.initialize({});

      const mockApiResponse = {
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-4o-2024-05-13',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: 'World' },
            finish_reason: 'stop',
          },
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      });

      const response = await provider.complete(dummyParams);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: 'Hello' }],
            stream: false,
          }),
        })
      );
      expect(response.choices[0].message.content).toBe('World');
      expect(response.usage?.totalTokens).toBe(2);
    });

    it('should handle API errors', async () => {
      const provider = new OpenAIProvider();
      await provider.initialize({});
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'Unauthorized', type: 'auth_error' } }),
      });

      await expect(provider.complete(dummyParams)).rejects.toThrowError(
        new LLMError(LLMErrorType.AUTHENTICATION, 'Unauthorized', 401)
      );
    });
  });

  describe('stream', () => {
    it('should make a correct API call and yield parsed chunks', async () => {
      const provider = new OpenAIProvider();
      await provider.initialize({});

      const mockStreamEvents = [
        `data: ${JSON.stringify({ id: 'c1', model: 'gpt-4o', choices: [{ index: 0, delta: { role: 'assistant' } }] })}\n\n`,
        `data: ${JSON.stringify({ id: 'c2', model: 'gpt-4o', choices: [{ index: 0, delta: { content: 'Hel' } }] })}\n\n`,
        `data: ${JSON.stringify({ id: 'c3', model: 'gpt-4o', choices: [{ index: 0, delta: { content: 'lo' } }] })}\n\n`,
        `data: ${JSON.stringify({ id: 'c4', model: 'gpt-4o', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n`,
        `data: [DONE]\n\n`,
      ];

      // ReadableStreamを模倣
      const stream = new ReadableStream({
        async start(controller) {
          for (const event of mockStreamEvents) {
            controller.enqueue(new TextEncoder().encode(event));
            await new Promise(r => setTimeout(r, 10)); // チャンク間のわずかな遅延
          }
          controller.close();
        },
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        body: stream, // ReadableStreamを返す
        headers: new Headers({ 'Content-Type': 'text/event-stream' }),
      });

      const chunks = [];
      for await (const chunk of provider.stream(dummyParams)) {
        chunks.push(chunk);
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: 'Hello' }],
            stream: true,
          }),
        })
      );

      expect(chunks.length).toBe(4); // DONEイベントは含まれない
      expect(chunks[0].choices[0].delta.role).toBe('assistant');
      expect(chunks[1].choices[0].delta.content).toBe('Hel');
      expect(chunks[2].choices[0].delta.content).toBe('lo');
      expect(chunks[3].choices[0].finishReason).toBe('stop');
    });

     it('should handle API errors during stream', async () => {
      const provider = new OpenAIProvider();
      await provider.initialize({});
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Rate limit exceeded', type: 'rate_limit_error' } }),
        body: null, // エラー時はbodyがnullまたはエラーレスポンスの場合がある
      });

      async function collectStream() {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const chunk of provider.stream(dummyParams)) {
          // ストリームを消費しようとする
        }
      }

      await expect(collectStream()).rejects.toThrowError(
         new LLMError(LLMErrorType.RATE_LIMIT, 'Rate limit exceeded', 429)
      );
    });
  });

  it('should estimate tokens correctly (simplified)', async () => {
    const provider = new OpenAIProvider();
    expect(await provider.estimateTokens("Hello world")).toBe(Math.ceil("Hello world".length / 4));
    expect(await provider.estimateTokens("こんにちは世界")).toBe(Math.ceil("こんにちは世界".length / 1.8));
  });
});
