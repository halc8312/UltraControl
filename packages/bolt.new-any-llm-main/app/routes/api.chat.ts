import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { StreamingTextResponse, streamText as vercelStreamText } from 'ai';
import { getGlobalLLMManager, LLMManagerConfig } from '@ultracontrol/app/lib/llm/manager';
import { LLMProviderAdapter } from '@ultracontrol/app/lib/llm/vercel-adapter';
import type { Message as UltraControlMessage } from '@ultracontrol/app/lib/llm/types';
import { OpenAIProvider } from '@ultracontrol/app/lib/llm/providers/openai'; // Assuming OpenAI is the default or needed
import { AnthropicProvider } from '@ultracontrol/app/lib/llm/providers/anthropic'; // Example for another provider
import { getProviderFactory } from '@ultracontrol/app/lib/llm/factory';


// Helper to parse model and provider from message content if they exist
const extractModelAndProvider = (content: string): { modelId: string | null, providerId: string | null, cleanContent: string } => {
  let modelId: string | null = null;
  let providerId: string | null = null;
  let cleanContent = content;

  const modelMatch = content.match(/^\[Model: ([\w.-]+)\]\s*/);
  if (modelMatch) {
    modelId = modelMatch[1];
    cleanContent = cleanContent.replace(modelMatch[0], '');
  }

  const providerMatch = cleanContent.match(/^\[Provider: ([\w.-]+)\]\s*/);
  if (providerMatch) {
    providerId = providerMatch[1];
    cleanContent = cleanContent.replace(providerMatch[0], '');
  }
  // Fallback if model/provider not in message, use defaults or throw error
  return { modelId, providerId, cleanContent };
};


export async function action({ context, request }: ActionFunctionArgs) {
  const { messages: clientMessages, apiKeys: clientApiKeys } = await request.json<{
    messages: { role: 'user' | 'assistant' | 'system' | 'function' | 'tool', content: string }[]; // Vercel AI SDK message type
    apiKeys?: Record<string, string>; // API keys from Chat.client.tsx
  }>();

  if (!clientMessages || clientMessages.length === 0) {
    return new Response('No messages provided', { status: 400 });
  }

  try {
    // Register providers with the factory if not already done (e.g., in a global setup)
    // This is a simplified example; ideally, this is done once at application startup.
    const factory = getProviderFactory();
    if (!factory.listProviders().includes('openai')) {
        factory.register('openai', OpenAIProvider);
    }
    if (!factory.listProviders().includes('anthropic')) {
        factory.register('anthropic', AnthropicProvider);
    }


    // Initialize LLMManager
    // Configuration might come from environment variables or a config file
    const llmManagerConfig: LLMManagerConfig = {
        // defaultProvider: 'openai', // This will be determined from the message or a fallback
        providers: {
            // API keys will be set per-request for now
        },
        enableContextManagement: false, // Context is managed by client for now
    };
    const llmManager = getGlobalLLMManager(llmManagerConfig);

    // Extract model and provider from the last user message
    // This is a simplified approach; a more robust solution would inspect all messages or have a dedicated field.
    const lastUserMessage = clientMessages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
        return new Response('No user message found to determine model/provider', { status: 400 });
    }

    const { modelId: extractedModelId, providerId: extractedProviderId, cleanContent: _ } = extractModelAndProvider(lastUserMessage.content);

    const providerId = extractedProviderId || 'openai'; // Default to openai if not specified
    const modelId = extractedModelId || (providerId === 'openai' ? 'gpt-4o' : 'claude-3-haiku-20240307'); // Default model based on provider


    // Ensure the selected provider is initialized with the API key
    const apiKey = clientApiKeys?.[providerId] || context.cloudflare.env[`${providerId.toUpperCase()}_API_KEY`];
    if (!apiKey) {
        return new Response(`API key for ${providerId} not found. Please set it in client or server environment.`, { status: 401 });
    }

    // Dynamically initialize the provider if not already managed by LLMManager with this config
    // or if LLMManager needs to be reconfigured for this specific request.
    // For simplicity, we'll re-initialize. A more robust system might cache/reuse providers.
    await llmManager.initializeProvider(providerId, { apiKey, defaultModel: modelId });


    const llmProvider = llmManager.getProvider(providerId);
    const adapter = new LLMProviderAdapter(llmProvider, modelId, apiKey);

    // Convert client messages to the format expected by the Vercel AI SDK adapter
    // The adapter's convertToUltraControlMessages will further process this.
    // We also need to strip our custom [Model:] and [Provider:] tags for the actual LLM call.
    const processedMessages = clientMessages.map(msg => {
        if (msg.role === 'user') {
            const { cleanContent } = extractModelAndProvider(msg.content);
            return { ...msg, content: cleanContent };
        }
        return msg;
    });


    const stream = await vercelStreamText({
      model: adapter, // Pass the adapter instance
      messages: processedMessages, // Pass the Vercel AI SDK compatible messages
      // Other parameters like temperature, maxTokens can be added here if needed
      // temperature: 0.7,
    });

    return new StreamingTextResponse(stream);

  } catch (error: any) {
    console.error('[LLM API Error]', error);
    let errorMessage = 'Internal Server Error';
    let status = 500;

    if (error.message?.toLowerCase().includes('api key') || error.status === 401) {
      errorMessage = error.message || 'Invalid or missing API key.';
      status = 401;
    } else if (error.status) {
        errorMessage = error.message || "LLM Provider Error";
        status = error.status;
    }
    // Add more specific error handling based on LLMErrorType if needed

    return new Response(JSON.stringify({ error: errorMessage, details: error.cause || error.stack }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
