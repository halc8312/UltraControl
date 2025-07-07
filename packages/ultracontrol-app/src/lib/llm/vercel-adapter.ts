import type { LanguageModelV1, LanguageModelV1StreamPart, LanguageModelV1CallOptions, LanguageModelV1Prompt } from 'ai';
import type { ILLMProvider, StreamingChunk, Message as UltraControlMessage, PromptParameters, CompletionResponse } from './types'; // Adjusted path
import { LLMError, LLMErrorType } from './types'; // Adjusted path

export class LLMProviderAdapter implements LanguageModelV1 {
  private provider: ILLMProvider;
  private modelId: string;
  private apiKey?: string; // Store apiKey for potential re-initialization or direct use
  private initialized = false;

  constructor(provider: ILLMProvider, modelId: string, apiKey?: string) {
    this.provider = provider;
    this.modelId = modelId;
    this.apiKey = apiKey;
  }

  get providerId(): string {
    return this.provider.name;
  }

  // modelId property is not explicitly part of LanguageModelV1, but useful for internal logic
  // get modelId(): string {
  //   return this.modelId;
  // }

  private async ensureInitialized(config?: PromptParameters): Promise<void> {
    if (!this.initialized) {
      try {
        // Pass relevant parts of PromptParameters or a stored config for initialization
        await this.provider.initialize({
          apiKey: this.apiKey,
          defaultModel: this.modelId,
          // Potentially other config from PromptParameters if needed at init time
        });
        this.initialized = true;
      } catch (error) {
        console.error(`Adapter: Failed to initialize provider ${this.provider.name}`, error);
        throw error; // Re-throw to be caught by the caller
      }
    }
  }

  private convertToUltraControlMessages(prompt: LanguageModelV1Prompt): UltraControlMessage[] {
    // LanguageModelV1Prompt can be string or array of CoreMessage or LanguageModelV1PromptPart[]
    // For simplicity, assuming it's CoreMessage[] which is similar to our Message[]
    if (typeof prompt === 'string') {
        return [{ role: 'user', content: prompt }];
    }
    return prompt.map(p => {
        if (p.type === 'text') { // Assuming LanguageModelV1TextPromptPart
            return { role: p.role || 'user', content: p.text }; // Vercel's CoreMessage like
        }
        // Handle other prompt part types if necessary, e.g. 'image'
        // For now, focusing on text messages.
        // A more robust solution would inspect p.type and p.role
        // This mapping might need to be more sophisticated based on actual Vercel SDK usage
        const coreMessage = p as any; // Cast to access role/content if they exist
        return {
            role: coreMessage.role || 'user', // Default to user if role is not obvious
            content: coreMessage.content || '',
             // Map tool_calls and function_call if present and needed by your provider
        };
    }).filter(m => m.content); // Filter out messages that couldn't be converted
  }

  async doStream(params: LanguageModelV1CallOptions & { prompt: LanguageModelV1Prompt }): Promise<AsyncIterable<LanguageModelV1StreamPart>> {
    await this.ensureInitialized();

    const ultraMessages = this.convertToUltraControlMessages(params.prompt);

    const promptParameters: PromptParameters = {
      model: this.modelId,
      messages: ultraMessages,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      topP: params.topP,
      frequencyPenalty: params.frequencyPenalty,
      presencePenalty: params.presencePenalty,
      stopSequences: params.stopSequences,
      stream: true,
      // functions and tools need mapping if used
    };

    try {
      const stream = this.provider.stream(promptParameters);
      const modelId = this.modelId; // Capture for use in the generator

      return (async function* () {
        for await (const chunk of stream) {
          if (chunk.choices && chunk.choices.length > 0) {
            const choice = chunk.choices[0];
            if (choice.delta.content) {
              yield { type: 'text-delta', textDelta: choice.delta.content };
            }
            // TODO: Map tool_calls, tool_call_deltas correctly if your providers support them
            // Example for tool call delta (conceptual)
            // if (choice.delta.toolCalls && choice.delta.toolCalls.length > 0) {
            //   yield { type: 'tool-call-delta', toolCallId: ..., toolName: ..., argsTextDelta: ... }
            // }

            if (choice.finishReason) {
              // Map usage data if available from your provider's chunk or a final event
              const usage = chunk.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 }; // Default if not present
              yield {
                type: 'finish',
                finishReason: choice.finishReason,
                logprobs: choice.logprobs, // Pass through if available
                usage: { promptTokens: usage.promptTokens, completionTokens: usage.completionTokens }
              };
            }
          }
        }
      })();
    } catch (error) {
      console.error(`Error in adapter doStream for ${this.provider.name}:`, error);
      // Convert error to LanguageModelV1StreamPart if possible, or rethrow
      if (error instanceof LLMError) {
        // You might define a specific stream part for errors
        // For now, just rethrowing or logging.
        // Or yield an error part: yield { type: 'error', error: error }
      }
      throw error; // Or handle by yielding an error part
    }
  }

  async doGenerate(params: LanguageModelV1CallOptions & { prompt: LanguageModelV1Prompt }): Promise<{
    text?: string;
    toolCalls?: LanguageModelV1ToolCall[];
    finishReason: LanguageModelV1FinishReason;
    usage: { promptTokens: number; completionTokens: number };
    rawResponse?: { headers?: Record<string, string> };
    logprobs?: LanguageModelV1LogProbs;
  }> {
    await this.ensureInitialized();
    const ultraMessages = this.convertToUltraControlMessages(params.prompt);

    const promptParameters: PromptParameters = {
      model: this.modelId,
      messages: ultraMessages,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      topP: params.topP,
      frequencyPenalty: params.frequencyPenalty,
      presencePenalty: params.presencePenalty,
      stopSequences: params.stopSequences,
      stream: false,
      // functions and tools need mapping
    };

    try {
      const response: CompletionResponse = await this.provider.complete(promptParameters);
      const mainChoice = response.choices[0];

      return {
        text: mainChoice?.message.content || undefined,
        toolCalls: mainChoice?.message.toolCalls?.map(tc => ({
            toolCallId: tc.id,
            toolName: tc.function.name,
            args: tc.function.arguments,
        })) || undefined,
        finishReason: mainChoice?.finishReason || 'other',
        usage: {
          promptTokens: response.usage?.promptTokens || 0,
          completionTokens: response.usage?.completionTokens || 0,
        },
        // rawResponse and logprobs can be populated if available
      };
    } catch (error) {
        console.error(`Error in adapter doGenerate for ${this.provider.name}:`, error);
        throw error;
    }
  }
}
