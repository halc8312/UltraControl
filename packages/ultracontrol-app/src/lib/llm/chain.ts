/**
 * プロンプトチェーン実装
 */

import type { IPromptChain, ILLMProvider } from './interfaces';
import type { PromptParameters, CompletionResponse } from './types';

// --- Step Type Definitions ---
interface SequentialStep {
  type: 'sequential';
  name: string;
  promptFn: (context: any) => Promise<PromptParameters>;
}

interface ParallelTask {
  nameSuffix: string; // e.g., "_taskA", "_taskB" to form full name like "groupName_taskA"
  promptFn: (context: any) => Promise<PromptParameters>;
}
interface ParallelStepGroup {
  type: 'parallel';
  name: string; // Name for the whole group, e.g., "analyzeSources"
  tasks: ParallelTask[];
}

type AnyChainStep = SequentialStep | ParallelStepGroup;
// --- End Step Type Definitions ---

/**
 * プロンプトチェーンの実装クラス
 */
export class PromptChain implements IPromptChain {
  private steps: AnyChainStep[] = []; // Changed type
  private currentStepIndex = 0;

  /**
   * チェーンへのステップ追加 (SequentialStep)
   */
  addStep(name: string, promptFn: (context: any) => Promise<PromptParameters>): void {
    this.steps.push({ type: 'sequential', name, promptFn });
  }

  /**
   * チェーンへのステップ追加 (Generic, used by builder)
   */
  protected addAnyStep(step: AnyChainStep): void {
    this.steps.push(step);
  }

  /**
   * チェーンの実行
   */
  async *execute(
    provider: ILLMProvider,
    initialContext: any = {}
  ): AsyncIterableIterator<{
    step: string; // Name of the sequential step or parallel group
    subStep?: string; // Name of the individual task within a parallel group (not used in this yield structure)
    result?: CompletionResponse; // Undefined for the parallel group yield itself
    results?: Record<string, CompletionResponse>; // For parallel group results
    context: any;
  }> {
    let context = { ...initialContext };
    this.currentStepIndex = 0; // Tracks the main step index (group or sequential)

    for (const step of this.steps) {
      this.currentStepIndex++; // Increment for each top-level step (sequential or parallel group)
      if (step.type === 'sequential') {
        try {
          const promptParams = await step.promptFn(context);
          const result = await provider.complete(promptParams);
          const outputText = result.choices[0]?.message.content;
          context = {
            ...context,
            [`${step.name}_result`]: result,
            [`${step.name}_output`]: outputText,
            previousStep: step.name,
            previousOutput: outputText,
          };
          yield { step: step.name, result, context: { ...context } };
        } catch (error) {
          throw new Error(
            `Chain execution failed at sequential step "${step.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      } else if (step.type === 'parallel') {
        try {
          const parallelPromises = step.tasks.map(async (task) => {
            const taskFullName = `${step.name}${task.nameSuffix}`;
            const promptParams = await task.promptFn(context); // Pass current context to each parallel task
            const result = await provider.complete(promptParams);
            return { taskFullName, result };
          });

          // Wait for all parallel tasks to settle (either complete or fail)
          const settledResults = await Promise.allSettled(parallelPromises);

          const groupResults: Record<string, CompletionResponse> = {};
          let hasErrorInGroup = false;
          const errors: string[] = [];

          // Process results and update context
          for (const settledResult of settledResults) {
            if (settledResult.status === 'fulfilled') {
              const { taskFullName, result } = settledResult.value;
              groupResults[taskFullName] = result;
              context = {
                ...context,
                [`${taskFullName}_result`]: result,
                [`${taskFullName}_output`]: result.choices[0]?.message.content,
              };
            } else {
              hasErrorInGroup = true;
              // Storing error. Task name might not be easily available here if promise was constructed anonymously.
              // For simplicity, just collecting messages.
              errors.push(settledResult.reason instanceof Error ? settledResult.reason.message : String(settledResult.reason));
            }
          }

          if (hasErrorInGroup) {
            // If any task in the parallel group failed, throw a group error
            throw new Error(
              `One or more tasks failed in parallel group "${step.name}". Errors: ${errors.join('; ')}`
            );
          }

          // Update context with previousStep pointing to the group name
          context = {
            ...context,
            previousStep: step.name,
            // previousOutput for a group could be a summary or concatenated outputs.
            // For now, it's not set at the group level, only for individual tasks.
            // Or, one could decide to store all outputs:
            // previousOutput: Object.fromEntries(Object.entries(groupResults).map(([k,v]) => [k, v.choices[0]?.message.content]))
          };

          // Yield a single result for the entire parallel group
          yield { step: step.name, results: groupResults, context: { ...context } };

        } catch (error) {
          // Catch errors from Promise.allSettled processing or the re-thrown group error
          throw new Error(
            `Chain execution failed at parallel group "${step.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }
    }
  }

  /**
   * チェーンのリセット
   */
  reset(): void {
    this.currentStepIndex = 0;
  }

  /**
   * 現在のステップインデックスを取得
   */
  getCurrentStepIndex(): number {
    return this.currentStepIndex;
  }

  /**
   * ステップ数を取得
   */
  getStepCount(): number {
    return this.steps.length;
  }

  /**
   * 特定のステップを取得
   */
  getStep(index: number): AnyChainStep | undefined { // Return type changed
    return this.steps[index];
  }

  /**
   * すべてのステップ名を取得 (sequential steps and parallel group names)
   */
  getStepNames(): string[] {
    return this.steps.map(step => step.name);
  }
}

/**
 * プロンプトチェーンビルダー
 * 流暢なAPIでチェーンを構築するためのヘルパー
 */
export class PromptChainBuilder {
  private chain: PromptChain;

  constructor() {
    this.chain = new PromptChain();
  }

  /**
   * 順次ステップを追加
   */
  step(name: string, promptFn: (context: any) => Promise<PromptParameters>): this {
    this.chain.addAnyStep({ type: 'sequential', name, promptFn });
    return this;
  }

  /**
   * 条件付きステップを追加 (順次ステップとして実装)
   */
  conditionalStep(
    name: string,
    condition: (context: any) => boolean,
    promptFn: (context: any) => Promise<PromptParameters>
  ): this {
    const conditionalPromptFn = async (context: any) => {
      if (!condition(context)) {
        return {
          messages: [{
            role: 'system' as const,
            content: `Step "${name}" skipped due to condition`
          }],
          maxTokens: 1, // Minimal tokens for a skip message
          temperature: 0
        };
      }
      return promptFn(context);
    };
    this.chain.addAnyStep({ type: 'sequential', name, promptFn: conditionalPromptFn });
    return this;
  }

  /**
   * 並列実行ステップグループを追加
   * @param groupName - 並列グループ全体の名前
   * @param tasks - 並列に実行するタスクのオブジェクト配列 { nameSuffix: string, promptFn: ... }
   *                nameSuffix は groupName に付加され、ユニークなタスク名を形成します (例: groupName_suffix)
   */
  parallelSteps(
    groupName: string,
    tasks: Array<{ nameSuffix: string; promptFn: (context: any) => Promise<PromptParameters> }>
  ): this {
    if (tasks.length === 0) {
      console.warn(`PromptChainBuilder: parallelSteps called for group "${groupName}" with no tasks. Skipping.`);
      return this;
    }
    this.chain.addAnyStep({ type: 'parallel', name: groupName, tasks });
    return this;
  }

  /**
   * 構築したチェーンを取得
   */
  build(): PromptChain {
    return this.chain;
  }
}

/**
 * 事前定義されたチェーンテンプレート
 */
export class ChainTemplates {
  /**
   * 要約チェーン
   */
  static summarization(
    chunkSize: number = 4000,
    overlap: number = 200
  ): PromptChain {
    return new PromptChainBuilder()
      .step('chunk', async (context) => ({
        messages: [{
          role: 'system' as const,
          content: 'You are a helpful assistant that summarizes text.'
        }, {
          role: 'user' as const,
          content: `Summarize the following text:\n\n${context.text}`
        }],
        maxTokens: 500,
        temperature: 0.3
      }))
      .step('combine', async (context) => ({
        messages: [{
          role: 'system' as const,
          content: 'You are a helpful assistant that combines summaries.'
        }, {
          role: 'user' as const,
          content: `Combine these summaries into a coherent summary:\n\n${context.chunk_output}`
        }],
        maxTokens: 1000,
        temperature: 0.3
      }))
      .build();
  }

  /**
   * 質問応答チェーン
   */
  static questionAnswering(): PromptChain {
    return new PromptChainBuilder()
      .step('context_retrieval', async (context) => ({
        messages: [{
          role: 'system' as const,
          content: 'You are a helpful assistant that finds relevant context.'
        }, {
          role: 'user' as const,
          content: `Find relevant information for the question: ${context.question}`
        }],
        maxTokens: 1000,
        temperature: 0.5
      }))
      .step('answer_generation', async (context) => ({
        messages: [{
          role: 'system' as const,
          content: 'You are a helpful assistant that answers questions based on context.'
        }, {
          role: 'user' as const,
          content: `Based on this context: ${context.context_retrieval_output}\n\nAnswer the question: ${context.question}`
        }],
        maxTokens: 500,
        temperature: 0.7
      }))
      .build();
  }

  /**
   * コード生成チェーン
   */
  static codeGeneration(): PromptChain {
    return new PromptChainBuilder()
      .step('design', async (context) => ({
        messages: [{
          role: 'system' as const,
          content: 'You are an expert software architect.'
        }, {
          role: 'user' as const,
          content: `Design the architecture for: ${context.requirement}`
        }],
        maxTokens: 1000,
        temperature: 0.7
      }))
      .step('implementation', async (context) => ({
        messages: [{
          role: 'system' as const,
          content: 'You are an expert programmer.'
        }, {
          role: 'user' as const,
          content: `Implement the following design:\n\n${context.design_output}\n\nRequirement: ${context.requirement}`
        }],
        maxTokens: 2000,
        temperature: 0.3
      }))
      .step('review', async (context) => ({
        messages: [{
          role: 'system' as const,
          content: 'You are a code reviewer.'
        }, {
          role: 'user' as const,
          content: `Review this code:\n\n${context.implementation_output}\n\nProvide improvements and fix any issues.`
        }],
        maxTokens: 1000,
        temperature: 0.5
      }))
      .build();
  }
}