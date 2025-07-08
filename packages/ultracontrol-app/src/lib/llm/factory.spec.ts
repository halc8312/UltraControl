import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMProviderFactory, getProviderFactory, createProvider } from './factory';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import type { ILLMProvider, ProviderConfig } from './interfaces';
import { LLMError, LLMErrorType } from './types';

// Mock providers for testing registration
class MockProvider implements ILLMProvider {
  name = 'mock';
  async initialize(config: ProviderConfig) {}
  async listModels() { return []; }
  async getModel(modelId: string) { return null; }
  async complete(params: any) { return {} as any; }
  async *stream(params: any) {}
  async calculateContext(messages: any, modelId: string) { return {} as any; }
  async estimateTokens(text: string) { return 0; }
  async validate() { return true; }
  async dispose() {}
}

describe('LLMProviderFactory', () => {
  let factory: LLMProviderFactory;

  beforeEach(() => {
    // Reset singleton for getProviderFactory if needed, or create new instance
    // For simplicity, we'll work with a new factory instance each time here,
    // though getProviderFactory() returns a singleton.
    // To properly test the singleton, you might need to reset modules or the instance itself.
    factory = new LLMProviderFactory();
  });

  it('should have default providers registered', () => {
    expect(factory.listProviders()).toContain('openai');
    expect(factory.listProviders()).toContain('anthropic');
  });

  it('should create OpenAIProvider', () => {
    const provider = factory.create('openai');
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('should create AnthropicProvider', () => {
    const provider = factory.create('anthropic');
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it('should be case-insensitive for provider types', () => {
    const provider = factory.create('OPENAI');
    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('should register a new provider', () => {
    factory.register('mock', MockProvider);
    expect(factory.listProviders()).toContain('mock');
    const provider = factory.create('mock');
    expect(provider).toBeInstanceOf(MockProvider);
  });

  it('should throw error for unknown provider type', () => {
    expect(() => factory.create('unknown-provider')).toThrowError(
      new LLMError(LLMErrorType.INVALID_REQUEST, 'Unknown provider type: unknown-provider. Available providers: openai, anthropic')
    );
  });

  it('should overwrite an existing provider if registered with the same name', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    class NewMockProvider extends MockProvider { name = 'newmock'; }

    factory.register('openai', NewMockProvider); // Overwrite openai
    expect(consoleWarnSpy).toHaveBeenCalledWith('Overwriting existing provider: openai');

    const provider = factory.create('openai');
    expect(provider).toBeInstanceOf(NewMockProvider);
    expect(provider).not.toBeInstanceOf(OpenAIProvider);

    consoleWarnSpy.mockRestore();
  });

  describe('getProviderFactory (singleton)', () => {
    it('should return the same factory instance', () => {
      const f1 = getProviderFactory();
      const f2 = getProviderFactory();
      expect(f1).toBe(f2);
    });
  });

  describe('createProvider (helper function)', () => {
    it('should create a provider using the singleton factory', () => {
      // Ensure the singleton factory has the default providers
      // This might require resetting the singleton if previous tests modified it.
      // For robustness, explicitly register if relying on a clean singleton state.
      // Or, rely on the fact that default providers are registered on new LLMProviderFactory().

      const provider = createProvider('openai');
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it('should pass config to provider initialize if provided', async () => {
      const mockOpenAIInitialize = vi.spyOn(OpenAIProvider.prototype, 'initialize');
      const config = { apiKey: 'test-key' };
      // Create provider with config - initialize is called async, but create doesn't await it.
      // We need to check if initialize was called.
      createProvider('openai', config);

      // initialize is called without await in factory.create, so we need to wait for it.
      // This is a bit tricky to test without modifying the factory.
      // A better factory design might return the promise from initialize.
      // For now, let's assume it gets called.
      // A more robust test would involve a provider that signals when initialize is done.

      // Wait for the async initialize call triggered by create to potentially complete
      await new Promise(setImmediate);

      expect(mockOpenAIInitialize).toHaveBeenCalledWith(config);
      mockOpenAIInitialize.mockRestore();
    });
  });
});
