import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContextManager } from './context';
import type { Message } from './types';
import type { ILLMProvider } from './interfaces';

// Mock ILLMProvider for token estimation
const mockProvider: Pick<ILLMProvider, 'estimateTokens' | 'getModel' | 'name'> = {
  name: 'mock-estimator',
  estimateTokens: vi.fn(async (text: string) => Math.ceil(text.length / 4)), // Simple estimator: 1 token ~ 4 chars
  getModel: vi.fn(async (modelId: string) => ({ // Return a dummy model for context window
    id: modelId,
    name: modelId,
    provider: 'mock-estimator',
    maxTokens: 200, // Dummy value, not directly used by ContextManager's getMessagesInWindow logic
    contextWindow: 100, // Dummy context window for the model
  })),
};

describe('ContextManager', () => {
  let contextManager: ContextManager;

  beforeEach(() => {
    contextManager = new ContextManager(mockProvider as ILLMProvider);
    vi.clearAllMocks();
    // Reset store if it's imported and modified directly by ContextManager
    // For nanostores, this usually means setting the store to its initial state.
    // If ContextManager uses an internal store instance, this is fine.
  });

  it('should initialize with an empty message history and no system prompt', () => {
    expect(contextManager.getMessages()).toEqual([]);
    expect(contextManager.getSystemPrompt()).toBeNull();
  });

  it('should add a user message', () => {
    const userMessage: Message = { role: 'user', content: 'Hello there!' };
    contextManager.addMessage(userMessage);
    expect(contextManager.getMessages()).toEqual([userMessage]);
  });

  it('should add an assistant message', () => {
    const assistantMessage: Message = { role: 'assistant', content: 'Hi user!' };
    contextManager.addMessage(assistantMessage);
    expect(contextManager.getMessages()).toEqual([assistantMessage]);
  });

  it('should add multiple messages in order', () => {
    const messages: Message[] = [
      { role: 'user', content: 'First' },
      { role: 'assistant', content: 'Second' },
      { role: 'user', content: 'Third' },
    ];
    messages.forEach(msg => contextManager.addMessage(msg));
    expect(contextManager.getMessages()).toEqual(messages);
  });

  it('should clear all messages', () => {
    contextManager.addMessage({ role: 'user', content: 'A message' });
    contextManager.clearMessages();
    expect(contextManager.getMessages()).toEqual([]);
  });

  it('should set and get a system prompt', () => {
    const systemPrompt = 'You are a helpful assistant.';
    contextManager.setSystemPrompt(systemPrompt);
    expect(contextManager.getSystemPrompt()).toBe(systemPrompt);
  });

  it('should overwrite an existing system prompt', () => {
    contextManager.setSystemPrompt('Old prompt');
    contextManager.setSystemPrompt('New prompt');
    expect(contextManager.getSystemPrompt()).toBe('New prompt');
  });

  describe('getMessagesInWindow', () => {
    const modelId = 'test-model-for-window';
    // Mock provider's estimateTokens: 1 token per 4 chars
    // Mock model's contextWindow: 100 tokens

    it('should return all messages if they fit within the window', async () => {
      contextManager.addMessage({ role: 'user', content: 'Short msg 1' }); // 11 chars -> 3 tokens
      contextManager.addMessage({ role: 'assistant', content: 'Reply a bit longer' }); // 18 chars -> 5 tokens
      // Total: 8 tokens. System prompt: null
      const messagesInWindow = await contextManager.getMessagesInWindow(modelId);
      expect(messagesInWindow.length).toBe(2);
      expect(mockProvider.estimateTokens).toHaveBeenCalledTimes(2);
    });

    it('should include system prompt in token calculation and return it if it fits', async () => {
      contextManager.setSystemPrompt('System: Be concise.'); // 18 chars -> 5 tokens
      contextManager.addMessage({ role: 'user', content: 'User query.' }); // 11 chars -> 3 tokens
      // Total: 8 tokens.
      const messagesInWindow = await contextManager.getMessagesInWindow(modelId);
      expect(messagesInWindow.length).toBe(2); // System prompt is prepended
      expect(messagesInWindow[0]).toEqual({ role: 'system', content: 'System: Be concise.' });
      expect(messagesInWindow[1]).toEqual({ role: 'user', content: 'User query.' });
      expect(mockProvider.estimateTokens).toHaveBeenCalledWith('System: Be concise.');
      expect(mockProvider.estimateTokens).toHaveBeenCalledWith('User query.');
    });

    it('should truncate messages from the beginning if they exceed the window', async () => {
      // Context window = 100 tokens. estimateTokens = length / 4.
      contextManager.addMessage({ role: 'user', content: 'A'.repeat(100) }); // 25 tokens
      contextManager.addMessage({ role: 'assistant', content: 'B'.repeat(100) }); // 25 tokens
      contextManager.addMessage({ role: 'user', content: 'C'.repeat(100) }); // 25 tokens
      contextManager.addMessage({ role: 'assistant', content: 'D'.repeat(100) }); // 25 tokens
      contextManager.addMessage({ role: 'user', content: 'E'.repeat(40) }); // 10 tokens. Total = 110 tokens.

      const messagesInWindow = await contextManager.getMessagesInWindow(modelId);
      // Expected: Last 4 messages (B, C, D, E) should fit (25+25+25+10 = 85 tokens)
      // The first message (A) should be truncated.
      expect(messagesInWindow.length).toBe(4);
      expect(messagesInWindow[0].content).toBe('B'.repeat(100));
      expect(messagesInWindow[3].content).toBe('E'.repeat(40));
    });

    it('should always include the system prompt if set, even if it means truncating more user/assistant messages', async () => {
      contextManager.setSystemPrompt('S'.repeat(120)); // System prompt: 30 tokens
      contextManager.addMessage({ role: 'user', content: 'A'.repeat(100) }); // 25 tokens
      contextManager.addMessage({ role: 'assistant', content: 'B'.repeat(100) }); // 25 tokens
      contextManager.addMessage({ role: 'user', content: 'C'.repeat(100) }); // 25 tokens
      // With system prompt: S (30) + A (25) + B (25) + C (25) = 105 tokens.
      // Expected: S, B, C (30 + 25 + 25 = 80 tokens)

      const messagesInWindow = await contextManager.getMessagesInWindow(modelId);
      expect(messagesInWindow.length).toBe(3);
      expect(messagesInWindow[0].role).toBe('system');
      expect(messagesInWindow[0].content).toBe('S'.repeat(120));
      expect(messagesInWindow[1].content).toBe('B'.repeat(100));
      expect(messagesInWindow[2].content).toBe('C'.repeat(100));
    });

    it('should return only the system prompt if it alone nearly fills the window', async () => {
      contextManager.setSystemPrompt('S'.repeat(380)); // System prompt: 95 tokens
      contextManager.addMessage({ role: 'user', content: 'A'.repeat(40) }); // 10 tokens
      // S (95) + A (10) = 105 tokens. Window is 100.
      // Expected: Only system prompt.
      const messagesInWindow = await contextManager.getMessagesInWindow(modelId);
      expect(messagesInWindow.length).toBe(1);
      expect(messagesInWindow[0].role).toBe('system');
    });

    it('should throw error if system prompt itself exceeds the window', async () => {
      contextManager.setSystemPrompt('S'.repeat(404)); // System prompt: 101 tokens
      await expect(contextManager.getMessagesInWindow(modelId)).rejects.toThrowError(
        'System prompt alone exceeds the model context window.'
      );
    });

    it('should handle empty message history correctly', async () => {
        const messagesInWindow = await contextManager.getMessagesInWindow(modelId);
        expect(messagesInWindow.length).toBe(0);
    });

    it('should handle empty message history with system prompt correctly', async () => {
        contextManager.setSystemPrompt('System Only'); // 11 chars -> 3 tokens
        const messagesInWindow = await contextManager.getMessagesInWindow(modelId);
        expect(messagesInWindow.length).toBe(1);
        expect(messagesInWindow[0].role).toBe('system');
    });
  });
});
