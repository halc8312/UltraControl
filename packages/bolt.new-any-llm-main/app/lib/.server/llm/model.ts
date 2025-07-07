/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import { getAPIKey, getBaseURL } from '~/lib/.server/llm/api-key';
import type { LanguageModelV1 } from 'ai';

// UltraControl LLM Provider imports
import { getProviderFactory } from '../../../../../../packages/ultracontrol-app/src/lib/llm/factory'; // Adjusted path
import { LLMProviderAdapter } from '../../../../../../packages/ultracontrol-app/src/lib/llm/vercel-adapter'; // Adjusted path
import type { LLMProviderType } from '../../../../../../packages/ultracontrol-app/src/lib/llm/types'; // Adjusted path


export const DEFAULT_NUM_CTX = process.env.DEFAULT_NUM_CTX ? parseInt(process.env.DEFAULT_NUM_CTX, 10) : 32768;

type OptionalApiKey = string | undefined;

// Keep Ollama and other Vercel SDK-native providers if they are not covered by UltraControl's providers,
// or if you want to use them as fallbacks or for specific use cases.
// For this integration, we will primarily focus on routing 'Anthropic' and 'OpenAI'
// through the UltraControl LLM layer. Other providers can remain as they are or be integrated similarly.

// Example: Keeping Ollama model function for fallback or direct use
import { ollama } from 'ollama-ai-provider';
export function getOllamaModel(baseURL: string, model: string) {
  const ollamaInstance = ollama(model, {
    numCtx: DEFAULT_NUM_CTX,
  }) as LanguageModelV1 & { config: any };

  ollamaInstance.config.baseURL = `${baseURL}/api`;
  return ollamaInstance;
}


export function getModel(providerNameStr: string, modelId: string, env: Env, apiKeys?: Record<string, string>): LanguageModelV1 {
  const apiKey = getAPIKey(env, providerNameStr, apiKeys);
  const baseURL = getBaseURL(env, providerNameStr); // May be needed for some UltraControl providers if they expect a base URL

  const providerType = providerNameStr.toLowerCase() as LLMProviderType;

  // Whitelist providers to be handled by UltraControl LLM layer
  if (providerType === 'openai' || providerType === 'anthropic') {
    try {
      console.log(`UltraControl: Attempting to use ${providerType} provider for model ${modelId}`);
      const factory = getProviderFactory();
      // The factory's `create` method might need to accept ProviderConfig for initialization,
      // or the adapter handles initialization lazily using the apiKey.
      // Current factory.create() does not take config.
      const ultraControlProviderInstance = factory.create(providerType);

      // The LLMProviderAdapter will handle initialization using the apiKey
      return new LLMProviderAdapter(ultraControlProviderInstance, modelId, apiKey);
    } catch (error) {
      console.error(`UltraControl: Failed to create provider ${providerType} with model ${modelId}. Error: ${error.message}`);
      console.warn(`UltraControl: Falling back to default behavior or error for ${providerType}.`);
      // Optionally, fall back to an old implementation or throw an error
      // For now, let it fall through to error or a default case if not specifically handled below.
    }
  }

  // Keep existing Vercel AI SDK direct integrations for other providers or as fallbacks
  // Note: Some of these might be duplicative if UltraControlProvider aims to cover them all.
  // You'll need to decide which layer handles which provider.
  // For this example, 'openai' and 'anthropic' are routed to UltraControl. Others use existing Vercel SDK integrations.

  // Import Vercel SDK providers as needed for fallbacks or non-UltraControl cases
  const { createAnthropic } = require('@ai-sdk/anthropic');
  const { createOpenAI } = require('@ai-sdk/openai');
  const { createGoogleGenerativeAI } = require('@ai-sdk/google');
  const { createOpenRouter } = require('@openrouter/ai-sdk-provider');
  const { createMistral } = require('@ai-sdk/mistral');
  const { createCohere } = require('@ai-sdk/cohere');


  switch (providerType) {
    // Anthropic and OpenAI are now handled by UltraControl (if block above)
    // If they fall through here, it means UltraControl couldn't handle them.
    // Consider if you want a fallback to direct Vercel SDK usage for them.
    case 'anthropic': // Fallback if UltraControl failed
      console.warn("UltraControl: Falling back to direct Vercel SDK for Anthropic");
      return createAnthropic({apiKey})(modelId);
    case 'openai': // Fallback if UltraControl failed
       console.warn("UltraControl: Falling back to direct Vercel SDK for OpenAI");
      return createOpenAI({apiKey})(modelId);

    // Existing cases for other providers (using Vercel AI SDK directly)
    case 'groq':
      return createOpenAI({ baseURL: 'https://api.groq.com/openai/v1', apiKey })(modelId);
    case 'huggingface':
      return createOpenAI({ baseURL: 'https://api-inference.huggingface.co/v1/', apiKey })(modelId);
    case 'openrouter':
      return createOpenRouter({apiKey}).chat(modelId);
    case 'google':
      return createGoogleGenerativeAI({apiKey})(modelId);
    case 'openailike':
      return createOpenAI({baseURL, apiKey})(modelId);
    case 'deepseek':
      return createOpenAI({ baseURL: 'https://api.deepseek.com/beta', apiKey })(modelId);
    case 'mistral':
      return createMistral({apiKey})(modelId);
    case 'lmstudio':
      return createOpenAI({ baseUrl: `${baseURL}/v1`, apiKey: '' })(modelId);
    case 'xai':
      return createOpenAI({ baseURL: 'https://api.x.ai/v1', apiKey })(modelId);
    case 'cohere':
      return createCohere({apiKey})(modelId);
    case 'ollama': // Ollama is often a local provider, ensure baseURL is correct
      return getOllamaModel(baseURL || 'http://localhost:11434', modelId); // Provide default baseURL for Ollama
    default:
      console.warn(`getModel: Unknown provider "${providerNameStr}", attempting Ollama as default.`);
      return getOllamaModel(baseURL || 'http://localhost:11434', modelId); // Default to Ollama
  }
}
