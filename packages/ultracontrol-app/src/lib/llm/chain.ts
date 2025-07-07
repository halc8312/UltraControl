/**
 * プロンプトチェーン実装
 */

import type { IPromptChain, ILLMProvider } from './interfaces';
import type { PromptParameters, CompletionResponse } from './types';

interface ChainStep {
  name: string;
  promptFn: (context: any) => Promise<PromptParameters>;
}

/**
 * プロンプトチェーンの実装クラス
 */
export class PromptChain implements IPromptChain {
  private steps: ChainStep[] = [];
  private currentStepIndex = 0;

  /**
   * チェーンへのステップ追加
   */
  addStep(name: string, promptFn: (context: any) => Promise<PromptParameters>): void {
    this.steps.push({ name, promptFn });
  }

  /**
   * チェーンの実行
   */
  async *execute(
    provider: ILLMProvider,
    initialContext: any = {}
  ): AsyncIterableIterator<{
    step: string;
    result: CompletionResponse;
    context: any;
  }> {
    let context = { ...initialContext };
    this.currentStepIndex = 0;

    for (const step of this.steps) {
      try {
        // 現在のコンテキストでプロンプトパラメータを生成
        const promptParams = await step.promptFn(context);
        
        // LLMプロバイダーでの実行
        const result = await provider.complete(promptParams);
        
        // コンテキストの更新
        context = {
          ...context,
          [`${step.name}_result`]: result,
          [`${step.name}_output`]: result.text,
          previousStep: step.name,
          previousOutput: result.text
        };

        // 結果を yield
        yield {
          step: step.name,
          result,
          context: { ...context }
        };

        this.currentStepIndex++;
      } catch (error) {
        // エラーハンドリング
        throw new Error(
          `Chain execution failed at step "${step.name}": ${error instanceof Error ? error.message : 'Unknown error'}`
        );
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
  getStep(index: number): ChainStep | undefined {
    return this.steps[index];
  }

  /**
   * すべてのステップ名を取得
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
   * ステップを追加
   */
  step(name: string, promptFn: (context: any) => Promise<PromptParameters>): this {
    this.chain.addStep(name, promptFn);
    return this;
  }

  /**
   * 条件付きステップを追加
   */
  conditionalStep(
    name: string,
    condition: (context: any) => boolean,
    promptFn: (context: any) => Promise<PromptParameters>
  ): this {
    this.chain.addStep(name, async (context) => {
      if (!condition(context)) {
        // 条件を満たさない場合はスキップ
        return {
          messages: [{
            role: 'system' as const,
            content: `Step "${name}" skipped due to condition`
          }],
          maxTokens: 1,
          temperature: 0
        };
      }
      return promptFn(context);
    });
    return this;
  }

  /**
   * 並列実行ステップを追加（将来の拡張用）
   */
  parallelSteps(
    name: string,
    ...promptFns: Array<(context: any) => Promise<PromptParameters>>
  ): this {
    // 現在は順次実行として実装
    promptFns.forEach((fn, index) => {
      this.chain.addStep(`${name}_parallel_${index}`, fn);
    });
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