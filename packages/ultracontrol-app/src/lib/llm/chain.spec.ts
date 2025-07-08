import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptChain, PromptChainBuilder, ChainTemplates } from './chain';
import type { ILLMProvider, PromptParameters, CompletionResponse } from './interfaces'; // Adjust path if needed
import type { Message } from './types'; // Adjust path if needed

// Mock ILLMProvider
const mockLLMProvider: ILLMProvider = {
  name: 'mock-chain-provider',
  initialize: vi.fn(),
  listModels: vi.fn(),
  getModel: vi.fn(),
  complete: vi.fn(async (params: PromptParameters): Promise<CompletionResponse> => ({
    id: `comp-${params.messages[0]?.content?.substring(0, 5)}`,
    model: params.model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: `Response to: ${params.messages.find(m=>m.role==='user')?.content}` },
        finishReason: 'stop',
      },
    ],
    usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
  })),
  stream: vi.fn(), // Not used in these chain tests, but required by interface
  calculateContext: vi.fn(),
  estimateTokens: vi.fn(),
  validate: vi.fn(),
  dispose: vi.fn(),
};

describe('PromptChain', () => {
  let chain: PromptChain;

  beforeEach(() => {
    chain = new PromptChain();
    vi.clearAllMocks();
  });

  it('should add a step correctly', () => {
    const promptFn = async (context: any) => ({ model: 'test', messages: [{role: 'user', content: 'Hi'}] });
    chain.addStep('step1', promptFn);
    expect(chain.getStepCount()).toBe(1);
    expect(chain.getStepNames()).toEqual(['step1']);
    expect(chain.getStep(0)?.name).toBe('step1');
  });

  it('should execute a single step chain', async () => {
    const promptFn = async (context: any) => ({ model: 'test', messages: [{role: 'user', content: `Input: ${context.initialInput}`}] });
    chain.addStep('step1', promptFn);

    const results = [];
    for await (const result of chain.execute(mockLLMProvider, { initialInput: 'Hello' })) {
      results.push(result);
    }

    expect(results.length).toBe(1);
    expect(results[0].step).toBe('step1');
    expect(results[0].result.choices[0].message.content).toBe('Response to: Input: Hello');
    expect(results[0].context.step1_result).toBeDefined();
    expect(results[0].context.step1_output).toBe('Response to: Input: Hello');
    expect(results[0].context.previousStep).toBe('step1');
    expect(mockLLMProvider.complete).toHaveBeenCalledTimes(1);
  });

  it('should execute a multi-step chain, passing context', async () => {
    chain.addStep('step1', async (context: any) => ({ model: 'test', messages: [{role: 'user', content: `Q: ${context.query}`}]}));
    chain.addStep('step2', async (context: any) => ({ model: 'test', messages: [{role: 'user', content: `Based on '${context.step1_output}', answer again.`}]}));

    const results = [];
    for await (const result of chain.execute(mockLLMProvider, { query: 'What is AI?' })) {
      results.push(result);
    }

    expect(results.length).toBe(2);
    expect(results[0].step).toBe('step1');
    expect(results[0].result.choices[0].message.content).toBe('Response to: Q: What is AI?');

    expect(results[1].step).toBe('step2');
    expect(results[1].result.choices[0].message.content).toBe("Response to: Based on 'Response to: Q: What is AI?', answer again.");
    expect(results[1].context.step1_output).toBe('Response to: Q: What is AI?');
    expect(results[1].context.step2_output).toBe("Response to: Based on 'Response to: Q: What is AI?', answer again.");
    expect(mockLLMProvider.complete).toHaveBeenCalledTimes(2);
  });

  it('should reset the chain execution state', async () => {
    chain.addStep('step1', async () => ({model: 'test', messages: [{role: 'user', content: '1'}]}));
    chain.addStep('step2', async () => ({model: 'test', messages: [{role: 'user', content: '2'}]}));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of chain.execute(mockLLMProvider, {})) { /* consume first run */ }
    expect(chain.getCurrentStepIndex()).toBe(2); // After full execution

    chain.reset();
    expect(chain.getCurrentStepIndex()).toBe(0);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of chain.execute(mockLLMProvider, {})) { /* consume second run */ }
    expect(chain.getCurrentStepIndex()).toBe(2); // Runs fully again
  });

  it('should throw error if a step fails', async () => {
    const failingPromptFn = async (context: any) => { throw new Error("Step failed!"); };
    chain.addStep('goodStep', async () => ({model: 'test', messages: [{role: 'user', content: 'Good'}]}));
    chain.addStep('badStep', failingPromptFn);
    chain.addStep('anotherGoodStep', async () => ({model: 'test', messages: [{role: 'user', content: 'Never runs'}]}));

    async function executeAndCollect() {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const result of chain.execute(mockLLMProvider, {})) {
        // Loop to trigger execution
      }
    }
    await expect(executeAndCollect()).rejects.toThrowError('Chain execution failed at step "badStep": Step failed!');
    expect(mockLLMProvider.complete).toHaveBeenCalledTimes(1); // Only goodStep should have called complete
  });
});

describe('PromptChainBuilder', () => {
  it('should build a chain using the fluent API', async () => {
    const builder = new PromptChainBuilder();
    const chain = builder
      .step('s1', async (ctx) => ({model: 'test', messages: [{role: 'user', content: ctx.input}]}))
      .step('s2', async (ctx) => ({model: 'test', messages: [{role: 'user', content: ctx.s1_output}]}))
      .build();

    expect(chain.getStepCount()).toBe(2);
    expect(chain.getStepNames()).toEqual(['s1', 's2']);

    const results = [];
    for await (const result of chain.execute(mockLLMProvider, { input: 'Builder Test' })) {
      results.push(result);
    }
    expect(results.length).toBe(2);
    expect(results[1].result.choices[0].message.content).toBe('Response to: Response to: Builder Test');
  });

  it('should add a conditional step that gets executed if condition is true', async () => {
    const chain = new PromptChainBuilder()
      .step('alwaysRun', async (ctx) => ({model: 'test', messages: [{role: 'user', content: 'Initial'}]}))
      .conditionalStep(
        'conditionalRun',
        (ctx) => ctx.alwaysRun_output === 'Response to: Initial', // Condition is true
        async (ctx) => ({model: 'test', messages: [{role: 'user', content: 'Conditional was true'}]})
      )
      .build();

    const results = [];
    for await (const result of chain.execute(mockLLMProvider, {})) {
      results.push(result);
    }
    expect(results.length).toBe(2);
    expect(results[1].step).toBe('conditionalRun');
    expect(results[1].result.choices[0].message.content).toBe('Response to: Conditional was true');
  });

  it('should add a conditional step that gets skipped if condition is false', async () => {
    const chain = new PromptChainBuilder()
      .step('alwaysRun', async (ctx) => ({model: 'test', messages: [{role: 'user', content: 'Initial'}]}))
      .conditionalStep(
        'conditionalSkip',
        (ctx) => ctx.alwaysRun_output !== 'Response to: Initial', // Condition is false
        async (ctx) => ({model: 'test', messages: [{role: 'user', content: 'Conditional was true'}]})
      )
      .step('afterConditional', async (ctx) => ({model: 'test', messages: [{role: 'user', content: `After: ${ctx.conditionalSkip_output}`}]}))
      .build();

    const results = [];
    for await (const result of chain.execute(mockLLMProvider, {})) {
      results.push(result);
    }
    expect(results.length).toBe(3); // alwaysRun, conditionalSkip (skipped), afterConditional
    expect(results[1].step).toBe('conditionalSkip');
    // The "skipped" message is a system message with 1 token, so the mockLLMProvider might not respond as usual.
    // The important part is that the promptFn for "conditionalSkip" was not the one doing "Conditional was true".
    // The mock provider will respond to the "Step ... skipped due to condition" system message.
    expect(results[1].result.choices[0].message.content).toBe('Response to: Step "conditionalSkip" skipped due to condition');

    expect(results[2].step).toBe('afterConditional');
    expect(results[2].result.choices[0].message.content).toBe('Response to: After: Response to: Step "conditionalSkip" skipped due to condition');
  });
});

describe('ChainTemplates', () => {
  it('Summarization template should create a two-step chain', () => {
    const chain = ChainTemplates.summarization();
    expect(chain.getStepCount()).toBe(2);
    expect(chain.getStepNames()).toEqual(['chunk', 'combine']);
  });

  it('QuestionAnswering template should create a two-step chain', () => {
    const chain = ChainTemplates.questionAnswering();
    expect(chain.getStepCount()).toBe(2);
    expect(chain.getStepNames()).toEqual(['context_retrieval', 'answer_generation']);
  });

  it('CodeGeneration template should create a three-step chain', () => {
    const chain = ChainTemplates.codeGeneration();
    expect(chain.getStepCount()).toBe(3);
    expect(chain.getStepNames()).toEqual(['design', 'implementation', 'review']);
  });
});
