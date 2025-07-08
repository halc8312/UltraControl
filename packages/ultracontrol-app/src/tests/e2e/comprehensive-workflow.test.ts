/**
 * Comprehensive E2E Workflow Tests for UltraControl
 * 
 * These tests verify complete user workflows across all integrated tools
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { LLMManager } from '@/lib/llm/manager';
import { AgentOrchestrator } from '@/lib/agents/orchestrator/AgentOrchestrator';
import { RuntimeManager } from '@/lib/runtime/RuntimeManager';
import { PluginManager } from '@/lib/plugins/PluginManager';
import { EventService } from '@/lib/services/EventService';
import { ProjectManager } from '@/lib/projects/ProjectManager';
import { boltSessions, devinTasks, openHandsAgents, currentProject } from '@/lib/store';
import type { BoltSession, DevinTask, OpenHandsAgent } from '@/lib/interfaces';

describe('Comprehensive E2E Workflow Tests', () => {
  let llmManager: LLMManager;
  let orchestrator: AgentOrchestrator;
  let runtimeManager: RuntimeManager;
  let pluginManager: PluginManager;
  let eventService: EventService;
  let projectManager: ProjectManager;

  beforeAll(async () => {
    console.log('🚀 初期化中: UltraControl E2Eテスト環境');

    // Core infrastructure
    llmManager = new LLMManager({
      providers: {
        anthropic: {
          apiKey: process.env.VITE_ANTHROPIC_API_KEY || 'test-key',
          defaultModel: 'claude-sonnet-4-20250514'
        },
        openai: {
          apiKey: process.env.VITE_OPENAI_API_KEY || 'test-key',
          defaultModel: 'gpt-4.1-mini'
        }
      }
    });
    await llmManager.initialize();

    eventService = new EventService('ws://localhost:8000/ws/events');
    await eventService.connect();

    orchestrator = new AgentOrchestrator({
      llmManager,
      enableAIDecomposition: true,
      maxConcurrentTasks: 5
    });

    runtimeManager = new RuntimeManager();
    await runtimeManager.initialize();

    pluginManager = new PluginManager({
      autoLoad: true,
      enableSandbox: true
    });
    await pluginManager.initialize();

    projectManager = new ProjectManager({
      orchestrator,
      runtimeManager,
      eventService
    });
  });

  afterAll(async () => {
    await eventService.disconnect();
    await pluginManager.dispose();
    await runtimeManager.dispose();
  });

  describe('完全な開発ワークフロー', () => {
    it('新規Reactプロジェクトの作成から完成まで', async () => {
      console.log('📝 テスト: 新規Reactプロジェクトの完全なワークフロー');

      // 1. プロジェクトの作成
      const project = await projectManager.createProject({
        name: 'test-react-app',
        type: 'react',
        description: 'E2E test React application with authentication',
        features: ['authentication', 'routing', 'state-management']
      });

      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.name).toBe('test-react-app');

      currentProject.set(project);

      // 2. AI駆動のタスク分解
      const workflow = await orchestrator.orchestrateWorkflow({
        task: 'Create a React app with user authentication, dashboard, and profile pages',
        context: {
          projectId: project.id,
          projectType: 'react',
          features: project.features
        }
      });

      expect(workflow.tasks).toContainEqual(
        expect.objectContaining({
          description: expect.stringMatching(/authentication|auth/i),
          type: 'frontend'
        })
      );

      expect(workflow.tasks).toContainEqual(
        expect.objectContaining({
          description: expect.stringMatching(/dashboard|page/i),
          type: 'frontend'
        })
      );

      // 3. Boltセッションの作成とトラッキング
      const boltSession: BoltSession = {
        id: `bolt-${Date.now()}`,
        agentId: 'bolt-executor',
        projectId: project.id,
        startTime: new Date(),
        status: 'active',
        tasks: workflow.tasks.filter(t => t.type === 'frontend')
      };

      boltSessions.set([boltSession]);

      // 4. タスクの実行シミュレーション
      for (const task of boltSession.tasks) {
        // タスク開始イベント
        eventService.emit('action', {
          type: 'task:start',
          payload: {
            taskId: task.id,
            agentId: boltSession.agentId,
            sessionId: boltSession.id
          }
        });

        // シミュレート: タスク処理
        await new Promise(resolve => setTimeout(resolve, 100));

        // タスク完了イベント
        task.status = 'completed';
        eventService.emit('observation', {
          type: 'task:complete',
          payload: {
            taskId: task.id,
            result: {
              success: true,
              filesCreated: [`/src/components/${task.id}.tsx`]
            }
          }
        });
      }

      // 5. セッション状態の確認
      const sessions = boltSessions.get();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].tasks.every(t => t.status === 'completed')).toBe(true);
    });

    it('マルチエージェント協調作業', async () => {
      console.log('🤝 テスト: 複数エージェントの協調作業');

      // 複雑なタスクの作成
      const complexTask = 'Build a full-stack application with React frontend, Node.js backend, and PostgreSQL database';
      
      const workflow = await orchestrator.orchestrateWorkflow({
        task: complexTask,
        context: {
          projectType: 'fullstack',
          stack: ['react', 'nodejs', 'postgresql']
        }
      });

      // タスクの分類
      const frontendTasks = workflow.tasks.filter(t => t.type === 'frontend');
      const backendTasks = workflow.tasks.filter(t => t.type === 'backend');
      const databaseTasks = workflow.tasks.filter(t => t.type === 'database');

      expect(frontendTasks.length).toBeGreaterThan(0);
      expect(backendTasks.length).toBeGreaterThan(0);
      expect(databaseTasks.length).toBeGreaterThan(0);

      // Boltがフロントエンドを担当
      const boltSession: BoltSession = {
        id: `bolt-${Date.now()}`,
        agentId: 'bolt-executor',
        projectId: 'test-project',
        startTime: new Date(),
        status: 'active',
        tasks: frontendTasks
      };

      // Devinがバックエンドを担当
      const devinTaskList: DevinTask[] = backendTasks.map(task => ({
        ...task,
        assignedAgent: 'devin',
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      // OpenHandsがデータベースを担当
      const openHandsAgent: OpenHandsAgent = {
        id: `openhands-${Date.now()}`,
        type: 'database-specialist',
        status: 'active',
        capabilities: ['database-design', 'sql-optimization'],
        currentTasks: databaseTasks
      };

      // ストアに保存
      boltSessions.set([boltSession]);
      devinTasks.set(devinTaskList);
      openHandsAgents.set([openHandsAgent]);

      // エージェント間の通信シミュレーション
      eventService.emit('action', {
        type: 'agent:communicate',
        payload: {
          from: 'bolt-executor',
          to: 'devin',
          message: 'Frontend API interface ready',
          data: {
            apiEndpoints: ['/api/users', '/api/auth', '/api/projects']
          }
        }
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      // 全エージェントがタスクを持っていることを確認
      expect(boltSessions.get()[0].tasks.length).toBeGreaterThan(0);
      expect(devinTasks.get().length).toBeGreaterThan(0);
      expect(openHandsAgents.get()[0].currentTasks.length).toBeGreaterThan(0);
    });
  });

  describe('エラーハンドリングとリカバリー', () => {
    it('LLMプロバイダー障害時のフェイルオーバー', async () => {
      console.log('🔄 テスト: LLMプロバイダーのフェイルオーバー');

      // プライマリプロバイダーの失敗をシミュレート
      const primaryProvider = llmManager.getProvider('anthropic');
      vi.spyOn(primaryProvider, 'complete').mockRejectedValueOnce(
        new Error('API rate limit exceeded')
      );

      // フォールバックプロバイダーが使用されることを確認
      const result = await llmManager.complete({
        messages: [{ role: 'user', content: 'Test message' }],
        model: 'claude-sonnet-4-20250514',
        fallbackModels: ['gpt-4.1-mini']
      });

      expect(result.model).toContain('gpt-4.1');
      expect(result.usage).toBeDefined();
    });

    it('WebSocket切断からの自動復旧', async () => {
      console.log('🔌 テスト: WebSocket自動再接続');

      const initialState = eventService.isConnected();
      expect(initialState).toBe(true);

      // 切断をシミュレート
      await eventService.disconnect();
      expect(eventService.isConnected()).toBe(false);

      // 再接続
      await eventService.connect();
      
      // イベント送受信が復旧していることを確認
      const testEvent = { type: 'test', data: 'reconnection-test' };
      let received = false;

      eventService.subscribe('test', () => {
        received = true;
      });

      eventService.emit('action', testEvent);
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(received).toBe(true);
    });

    it('タスク失敗時の再試行とリカバリー', async () => {
      console.log('♻️ テスト: タスク失敗時の再試行');

      const failingTask = {
        id: 'failing-task',
        description: 'Task that will fail initially',
        type: 'general' as const,
        priority: 1,
        status: 'pending' as const,
        retries: 0,
        maxRetries: 3
      };

      let attempts = 0;
      const executeWithRetry = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Simulated failure');
        }
        return { success: true };
      };

      const result = await orchestrator.executeTaskWithRetry(
        failingTask,
        executeWithRetry
      );

      expect(attempts).toBe(3);
      expect(result.success).toBe(true);
    });
  });

  describe('パフォーマンスとスケーラビリティ', () => {
    it('大規模プロジェクトでの並行処理', async () => {
      console.log('⚡ テスト: 大規模並行処理');

      const largeTasks = Array.from({ length: 50 }, (_, i) => ({
        id: `large-task-${i}`,
        description: `Component ${i} implementation`,
        type: 'frontend' as const,
        priority: Math.ceil((i + 1) / 10),
        status: 'pending' as const
      }));

      const startTime = Date.now();

      // 並行実行数の制限をテスト
      const batchResults = await orchestrator.executeBatch(largeTasks, {
        maxConcurrent: 5,
        timeout: 10000
      });

      const duration = Date.now() - startTime;

      expect(batchResults.successful.length).toBeGreaterThan(0);
      expect(batchResults.failed.length).toBe(0);
      expect(duration).toBeLessThan(10000);

      // メモリ使用量が適切であることを確認
      if (global.gc) {
        global.gc();
        const memoryUsage = process.memoryUsage();
        expect(memoryUsage.heapUsed).toBeLessThan(500 * 1024 * 1024); // 500MB以下
      }
    });

    it('リアルタイムイベントストリーミング', async () => {
      console.log('📊 テスト: 高頻度イベントストリーミング');

      const eventCount = 1000;
      const receivedEvents: any[] = [];

      const unsubscribe = eventService.subscribe('performance-test', (event) => {
        receivedEvents.push(event);
      });

      const startTime = Date.now();

      // 高頻度でイベントを送信
      for (let i = 0; i < eventCount; i++) {
        eventService.emit('action', {
          type: 'performance-test',
          payload: { index: i, timestamp: Date.now() }
        });
      }

      // イベント処理の完了を待つ
      await new Promise(resolve => setTimeout(resolve, 500));

      const duration = Date.now() - startTime;

      expect(receivedEvents.length).toBeGreaterThan(eventCount * 0.95); // 95%以上の配信率
      expect(duration).toBeLessThan(1000); // 1秒以内

      unsubscribe();
    });
  });

  describe('プラグインエコシステム', () => {
    it('プラグインの動的ロードと実行', async () => {
      console.log('🔌 テスト: プラグインシステム');

      // テストプラグインの定義
      const testPlugin = {
        id: 'test-e2e-plugin',
        name: 'E2E Test Plugin',
        version: '1.0.0',
        manifest: {
          permissions: ['ui:render', 'state:read'],
          capabilities: ['code-analysis', 'suggestion']
        },
        execute: async (context: any) => {
          return {
            success: true,
            suggestions: ['Test suggestion 1', 'Test suggestion 2']
          };
        }
      };

      // プラグインのロード
      await pluginManager.loadPlugin(testPlugin);

      // プラグインの実行
      const result = await pluginManager.executePlugin('test-e2e-plugin', {
        code: 'const test = "hello world";',
        language: 'javascript'
      });

      expect(result.success).toBe(true);
      expect(result.suggestions).toHaveLength(2);

      // プラグインのアンロード
      await pluginManager.unloadPlugin('test-e2e-plugin');
    });

    it('プラグイン権限の検証', async () => {
      console.log('🔒 テスト: プラグイン権限管理');

      const maliciousPlugin = {
        id: 'malicious-plugin',
        name: 'Malicious Plugin',
        version: '1.0.0',
        manifest: {
          permissions: ['filesystem:write', 'process:spawn'],
          capabilities: []
        },
        execute: async () => ({ success: false })
      };

      // 危険な権限を持つプラグインのロードが拒否されることを確認
      await expect(
        pluginManager.loadPlugin(maliciousPlugin)
      ).rejects.toThrow(/permission denied/i);
    });
  });

  describe('ユーザー体験の統合テスト', () => {
    it('インテリジェントな提案システム', async () => {
      console.log('💡 テスト: AIによる提案システム');

      const projectContext = {
        currentFile: '/src/App.tsx',
        cursorPosition: { line: 10, column: 5 },
        recentErrors: [
          {
            message: 'Cannot find module "./components/Header"',
            file: '/src/App.tsx',
            line: 3
          }
        ],
        projectStructure: {
          '/src': ['App.tsx', 'index.tsx'],
          '/src/components': []
        }
      };

      // AI提案の生成
      const suggestions = await orchestrator.generateSuggestions(projectContext);

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'fix',
          title: expect.stringContaining('Header'),
          confidence: expect.any(Number)
        })
      );

      // 提案の実行
      const selectedSuggestion = suggestions[0];
      const executionResult = await orchestrator.executeSuggestion(
        selectedSuggestion,
        projectContext
      );

      expect(executionResult.success).toBe(true);
      expect(executionResult.filesCreated).toContain('/src/components/Header.tsx');
    });

    it('コンテキスト対応のコード補完', async () => {
      console.log('🎯 テスト: コンテキスト対応補完');

      const codeContext = {
        file: '/src/utils/api.ts',
        content: `
import axios from 'axios';

export async function fetchUser(id: string) {
  // カーソル位置
`,
        cursorPosition: { line: 5, column: 2 },
        imports: ['axios'],
        projectType: 'typescript'
      };

      const completions = await llmManager.generateCompletions(codeContext);

      expect(completions).toContainEqual(
        expect.objectContaining({
          text: expect.stringContaining('axios.get'),
          score: expect.any(Number)
        })
      );
    });
  });
});