import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LLMProviderAdapter } from './vercel-adapter';
import type { ILLMProvider, PromptParameters, CompletionResponse, StreamingChunk, Message as UltraControlMessage } from './types';
import type { LanguageModelV1Prompt, LanguageModelV1StreamPart } from 'ai';

// Mock ILLMProvider
const mockUltraProvider: ILLMProvider = {
  name: 'mock-provider',
  initialize: vi.fn(async () => {}),
  listModels: vi.fn(async () => []),
  getModel: vi.fn(async () => null),
  complete: vi.fn(async (params: PromptParameters): Promise<CompletionResponse> => ({
    id: 'comp-123',
    model: params.model,
    choices: [{ index: 0, message: { role: 'assistant', content: 'Mocked completion' }, finishReason: 'stop' }],
    usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
  })),
  stream: vi.fn(async function* (params: PromptParameters): AsyncIterableIterator<StreamingChunk> {
    yield {
      id: 'chunk-1',
      model: params.model,
      choices: [{ index: 0, delta: { role: 'assistant' }, finishReason: null }]
    };
    yield {
      id: 'chunk-2',
      model: params.model,
      choices: [{ index: 0, delta: { content: 'Mocked stream' }, finishReason: null }]
    };
    yield {
      id: 'chunk-3',
      model: params.model,
      choices: [{ index: 0, delta: {}, finishReason: 'stop' }],
      usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 }
    };
  }),
  calculateContext: vi.fn(async () => ({ messageCount: 1, tokenCount: 10, availableTokens: 1000, maxContextWindow: 1010 })),
  estimateTokens: vi.fn(async () => 10),
  validate: vi.fn(async () => true),
  dispose: vi.fn(async () => {}),
};

describe('LLMProviderAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const modelId = 'test-model';
  const apiKey = 'test-key';

  it('should initialize the underlying provider on first call', async () => {
    const adapter = new LLMProviderAdapter(mockUltraProvider, modelId, apiKey);
    const vercelPrompt: LanguageModelV1Prompt = [{ type: 'text', role: 'user', text: 'Hello' }];

    // doGenerateを呼び出すことで内部的にensureInitializedが呼ばれる
    await adapter.doGenerate({ prompt: vercelPrompt, modelId });
    expect(mockUltraProvider.initialize).toHaveBeenCalledWith({ apiKey, defaultModel: modelId });
    expect(mockUltraProvider.initialize).toHaveBeenCalledTimes(1);

    // 再度呼び出してもinitializeは1回だけのはず
    await adapter.doGenerate({ prompt: vercelPrompt, modelId });
    expect(mockUltraProvider.initialize).toHaveBeenCalledTimes(1);
  });

  describe('doGenerate', () => {
    it('should call provider.complete and map response correctly', async () => {
      const adapter = new LLMProviderAdapter(mockUltraProvider, modelId, apiKey);
      const vercelPrompt: LanguageModelV1Prompt = [{ type: 'text', role: 'user', text: 'Test prompt' }];

      const result = await adapter.doGenerate({ prompt: vercelPrompt, modelId });

      expect(mockUltraProvider.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          model: modelId,
          messages: [{ role: 'user', content: 'Test prompt' }],
          stream: false,
        })
      );
      expect(result.text).toBe('Mocked completion');
      expect(result.finishReason).toBe('stop');
      expect(result.usage.completionTokens).toBe(5);
    });
  });

  describe('doStream', () => {
    it('should call provider.stream and map chunks correctly', async () => {
      const adapter = new LLMProviderAdapter(mockUltraProvider, modelId, apiKey);
      const vercelPrompt: LanguageModelV1Prompt = [{ type: 'text', role: 'user', text: 'Stream test' }];

      const streamParts: LanguageModelV1StreamPart[] = [];
      for await (const part of await adapter.doStream({ prompt: vercelPrompt, modelId })) {
        streamParts.push(part);
      }

      expect(mockUltraProvider.stream).toHaveBeenCalledWith(
        expect.objectContaining({
          model: modelId,
          messages: [{ role: 'user', content: 'Stream test' }],
          stream: true,
        })
      );

      expect(streamParts.length).toBe(3);
      // First chunk should be role, but our mock yields it as textDelta for simplicity of LanguageModelV1StreamPart
      // A more precise mock or adapter logic would map role delta if the Vercel SDK supports it distinctly.
      // Current Vercel AI SDK text-delta handles role changes implicitly or expects it with first content.
      // Our mock provider yields role in the first chunk, but adapter converts it to text-delta if content is also there,
      // or it might be skipped if only role. The mock yields role, then content.
      // The adapter yields text-delta for content.

      // Based on the mock:
      // 1. role: 'assistant' (no content, so might not produce a 'text-delta' depending on adapter logic for role-only delta)
      //    Our adapter currently only yields text-delta if choice.delta.content is present.
      //    The mock yields role in the first chunk. Let's adjust the mock or test expectation.
      //    Adjusted mock: first chunk has role, second has content. Adapter should handle this.
      //    The adapter's convertToUltraControlMessages and stream mapping logic are key here.

      // The current adapter logic for stream:
      // if (choice.delta.content) { yield { type: 'text-delta', textDelta: choice.delta.content }; }
      // This means the role-only delta from the mock might be skipped.

      // Let's verify the content and finish reason based on the mock that yields content.
      const textDeltas = streamParts.filter(p => p.type === 'text-delta').map(p => p.textDelta);
      expect(textDeltas.join('')).toBe('Mocked stream');

      const finishPart = streamParts.find(p => p.type === 'finish');
      expect(finishPart).toBeDefined();
      expect(finishPart?.finishReason).toBe('stop');
      expect(finishPart?.usage?.completionTokens).toBe(5); // from mock's last chunk
    });
  });

   it('should convert various LanguageModelV1Prompt types to UltraControlMessage[]', () => {
    const adapter = new LLMProviderAdapter(mockUltraProvider, modelId, apiKey);
    // @ts-ignore accessing private method for test
    const convert = adapter.convertToUltraControlMessages;

    // Test with string prompt
    let ultraMessages = convert('Hello');
    expect(ultraMessages).toEqual([{ role: 'user', content: 'Hello' }]);

    // Test with CoreMessage like prompt (LanguageModelV1TextPromptPart)
    const coreMessagesPrompt: LanguageModelV1Prompt = [
      { type: 'text', role: 'user', text: 'User message' },
      { type: 'text', role: 'assistant', text: 'Assistant message' },
    ];
    ultraMessages = convert(coreMessagesPrompt);
    expect(ultraMessages).toEqual([
      { role: 'user', content: 'User message' },
      { role: 'assistant', content: 'Assistant message' },
    ]);

    // Test with a more generic prompt structure that might appear
    const genericPrompt: LanguageModelV1Prompt = [
        { role: 'system', content: 'System prompt text' } as any, // Casting for test
        { role: 'user', content: 'User prompt text' } as any,
    ];
    ultraMessages = convert(genericPrompt);
     expect(ultraMessages).toEqual([
      { role: 'system', content: 'System prompt text' },
      { role: 'user', content: 'User prompt text' },
    ]);
  });

});
