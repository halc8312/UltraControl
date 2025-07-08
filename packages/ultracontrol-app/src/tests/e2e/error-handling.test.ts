/**
 * Error Handling E2E Tests
 * 
 * Comprehensive tests for error scenarios and recovery mechanisms
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { LLMManager } from '@/lib/llm/manager';
import { AgentOrchestrator } from '@/lib/agents/orchestrator/AgentOrchestrator';
import { RuntimeManager } from '@/lib/runtime/RuntimeManager';
import { EventService } from '@/lib/services/EventService';
import { ErrorRecoveryService } from '@/lib/services/ErrorRecoveryService';
import { currentUser, systemErrors, recoveryAttempts } from '@/lib/store';
import type { SystemError, RecoveryStrategy } from '@/lib/interfaces';

describe('Error Handling E2E Tests', () => {
  let llmManager: LLMManager;
  let orchestrator: AgentOrchestrator;
  let runtimeManager: RuntimeManager;
  let eventService: EventService;
  let errorRecoveryService: ErrorRecoveryService;

  beforeAll(async () => {
    console.log('🛡️ 初期化中: エラーハンドリングE2Eテスト環境');

    // サービスの初期化
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

    eventService = new EventService('ws://localhost:8000/ws/events');
    
    orchestrator = new AgentOrchestrator({
      llmManager,
      enableAIDecomposition: true,
      maxConcurrentTasks: 5
    });

    runtimeManager = new RuntimeManager();
    
    errorRecoveryService = new ErrorRecoveryService({
      eventService,
      orchestrator,
      maxRetries: 3,
      backoffMultiplier: 2
    });

    // エラーログをクリア
    systemErrors.set([]);
    recoveryAttempts.set([]);
  });

  afterAll(async () => {
    await eventService.disconnect();
    await runtimeManager.dispose();
  });

  describe('LLMプロバイダーエラー', () => {
    it('APIレート制限エラーのハンドリング', async () => {
      console.log('⏱️ テスト: APIレート制限エラー');

      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.name = 'RateLimitError';
      (rateLimitError as any).status = 429;
      (rateLimitError as any).retryAfter = 60;

      // レート制限エラーをシミュレート
      vi.spyOn(llmManager.getProvider('anthropic'), 'complete')
        .mockRejectedValueOnce(rateLimitError);

      try {
        await llmManager.complete({
          messages: [{ role: 'user', content: 'Test query' }],
          model: 'claude-sonnet-4-20250514'
        });
      } catch (error: any) {
        expect(error.name).toBe('RateLimitError');
        
        // エラーがストアに記録されることを確認
        const errors = systemErrors.get();
        expect(errors).toContainEqual(
          expect.objectContaining({
            type: 'rate_limit',
            service: 'anthropic',
            retryAfter: 60
          })
        );
      }

      // 自動フォールバックが機能することを確認
      const result = await llmManager.complete({
        messages: [{ role: 'user', content: 'Test query' }],
        model: 'claude-sonnet-4-20250514',
        fallbackModels: ['gpt-4.1-mini']
      });

      expect(result.model).toContain('gpt-4.1');
    });

    it('無効なAPIキーエラー', async () => {
      console.log('🔑 テスト: 無効なAPIキーエラー');

      const authError = new Error('Invalid API key');
      authError.name = 'AuthenticationError';
      (authError as any).status = 401;

      vi.spyOn(llmManager.getProvider('openai'), 'complete')
        .mockRejectedValueOnce(authError);

      await expect(
        llmManager.complete({
          messages: [{ role: 'user', content: 'Test' }],
          model: 'gpt-4.1-mini'
        })
      ).rejects.toThrow('Invalid API key');

      // ユーザーへの通知が送信されることを確認
      const errors = systemErrors.get();
      expect(errors).toContainEqual(
        expect.objectContaining({
          type: 'authentication',
          service: 'openai',
          userAction: 'update_api_key'
          })
      );
    });

    it('コンテキスト長超過エラー', async () => {
      console.log('📏 テスト: コンテキスト長超過エラー');

      // 長大なコンテキストを作成
      const longContext = Array(1000).fill('This is a very long message. ').join('');
      
      const contextError = new Error('Context length exceeded');
      contextError.name = 'ContextLengthError';
      (contextError as any).maxTokens = 100000;
      (contextError as any).requestedTokens = 150000;

      vi.spyOn(llmManager, 'complete').mockRejectedValueOnce(contextError);

      // エラーリカバリーサービスがコンテキストを自動的に短縮することを確認
      const recovery = await errorRecoveryService.handleError(contextError, {
        context: { messages: [{ role: 'user', content: longContext }] },
        operation: 'llm_complete'
      });

      expect(recovery.success).toBe(true);
      expect(recovery.strategy).toBe('truncate_context');
      expect(recovery.result.truncatedTokens).toBeGreaterThan(0);
    });
  });

  describe('ランタイムエラー', () => {
    it('WebContainerクラッシュのリカバリー', async () => {
      console.log('💥 テスト: WebContainerクラッシュリカバリー');

      const runtime = await runtimeManager.selectRuntime({
        type: 'frontend',
        requirements: []
      });

      // クラッシュをシミュレート
      const crashError = new Error('WebContainer crashed');
      crashError.name = 'RuntimeCrashError';
      (crashError as any).runtimeId = runtime.id;

      vi.spyOn(runtime, 'execute').mockRejectedValueOnce(crashError);

      // エラーリカバリーの実行
      const recovery = await errorRecoveryService.handleError(crashError, {
        runtime,
        operation: 'execute_command',
        command: 'npm install'
      });

      expect(recovery.success).toBe(true);
      expect(recovery.strategy).toBe('restart_runtime');
      expect(recovery.result.newRuntimeId).toBeDefined();
      expect(recovery.result.newRuntimeId).not.toBe(runtime.id);
    });

    it('Dockerコンテナのメモリ不足エラー', async () => {
      console.log('💾 テスト: Dockerメモリ不足エラー');

      const dockerRuntime = await runtimeManager.selectRuntime({
        type: 'backend',
        requirements: ['database']
      });

      const memoryError = new Error('Container out of memory');
      memoryError.name = 'OutOfMemoryError';
      (memoryError as any).containerId = 'test-container-123';
      (memoryError as any).memoryLimit = 512 * 1024 * 1024; // 512MB

      // メモリ不足エラーの処理
      const recovery = await errorRecoveryService.handleError(memoryError, {
        runtime: dockerRuntime,
        operation: 'execute_command'
      });

      expect(recovery.success).toBe(true);
      expect(recovery.strategy).toBe('increase_memory_limit');
      expect(recovery.result.newMemoryLimit).toBeGreaterThan(512 * 1024 * 1024);
    });

    it('ファイルシステム権限エラー', async () => {
      console.log('🔒 テスト: ファイルシステム権限エラー');

      const permissionError = new Error('Permission denied: /etc/passwd');
      permissionError.name = 'PermissionError';
      (permissionError as any).path = '/etc/passwd';
      (permissionError as any).operation = 'write';

      const recovery = await errorRecoveryService.handleError(permissionError, {
        operation: 'file_write',
        path: '/etc/passwd'
      });

      expect(recovery.success).toBe(false);
      expect(recovery.strategy).toBe('abort_dangerous_operation');
      expect(recovery.error).toContain('security policy');
    });
  });

  describe('ネットワークエラー', () => {
    it('WebSocket切断と再接続', async () => {
      console.log('🔌 テスト: WebSocket切断リカバリー');

      await eventService.connect();
      
      // 切断をシミュレート
      const disconnectError = new Error('WebSocket disconnected');
      disconnectError.name = 'WebSocketError';
      (disconnectError as any).code = 1006; // Abnormal closure

      let reconnectAttempts = 0;
      eventService.onReconnectAttempt(() => {
        reconnectAttempts++;
      });

      // エラーをトリガー
      await eventService.disconnect();
      
      // 自動再接続を待つ
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(reconnectAttempts).toBeGreaterThan(0);
      expect(eventService.isConnected()).toBe(true);
    });

    it('API タイムアウトエラー', async () => {
      console.log('⏰ テスト: APIタイムアウトエラー');

      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      (timeoutError as any).timeout = 30000;
      (timeoutError as any).endpoint = '/api/v1/tasks/execute';

      vi.spyOn(global, 'fetch').mockRejectedValueOnce(timeoutError);

      const recovery = await errorRecoveryService.handleError(timeoutError, {
        operation: 'api_request',
        endpoint: '/api/v1/tasks/execute',
        retryCount: 0
      });

      expect(recovery.success).toBe(true);
      expect(recovery.strategy).toBe('retry_with_backoff');
      expect(recovery.result.retryDelay).toBeGreaterThan(0);
    });
  });

  describe('並行処理エラー', () => {
    it('デッドロックの検出と解決', async () => {
      console.log('🔓 テスト: デッドロック検出と解決');

      // デッドロック状況をシミュレート
      const task1 = {
        id: 'task-1',
        dependencies: ['resource-A', 'resource-B'],
        holding: ['resource-A'],
        waiting: ['resource-B']
      };

      const task2 = {
        id: 'task-2',
        dependencies: ['resource-B', 'resource-A'],
        holding: ['resource-B'],
        waiting: ['resource-A']
      };

      const deadlockError = new Error('Deadlock detected');
      deadlockError.name = 'DeadlockError';
      (deadlockError as any).tasks = [task1, task2];

      const recovery = await errorRecoveryService.handleError(deadlockError, {
        operation: 'task_execution',
        tasks: [task1, task2]
      });

      expect(recovery.success).toBe(true);
      expect(recovery.strategy).toBe('break_deadlock');
      expect(recovery.result.resolution).toContain('reordered');
    });

    it('リソース競合エラー', async () => {
      console.log('🏃 テスト: リソース競合エラー');

      const resourceConflictError = new Error('Resource conflict: port 3000 already in use');
      resourceConflictError.name = 'ResourceConflictError';
      (resourceConflictError as any).resource = 'port';
      (resourceConflictError as any).value = 3000;

      const recovery = await errorRecoveryService.handleError(resourceConflictError, {
        operation: 'start_server',
        port: 3000
      });

      expect(recovery.success).toBe(true);
      expect(recovery.strategy).toBe('use_alternative_resource');
      expect(recovery.result.newPort).toBeDefined();
      expect(recovery.result.newPort).not.toBe(3000);
    });
  });

  describe('カスケードエラー', () => {
    it('連鎖的エラーの防止', async () => {
      console.log('🌊 テスト: カスケードエラー防止');

      const errors: SystemError[] = [];
      
      // 最初のエラー
      const primaryError: SystemError = {
        id: 'error-1',
        type: 'service_failure',
        service: 'llm-manager',
        message: 'LLM service failed',
        timestamp: new Date(),
        severity: 'critical'
      };

      errors.push(primaryError);

      // 連鎖的エラーをシミュレート
      for (let i = 2; i <= 10; i++) {
        errors.push({
          id: `error-${i}`,
          type: 'downstream_failure',
          service: `service-${i}`,
          message: `Failed due to upstream error`,
          timestamp: new Date(),
          severity: 'high',
          causedBy: `error-${i - 1}`
        });
      }

      // エラーストームの検出
      const errorStorm = errorRecoveryService.detectErrorStorm(errors);
      expect(errorStorm).toBe(true);

      // サーキットブレーカーが作動することを確認
      const circuitBreakerStatus = errorRecoveryService.getCircuitBreakerStatus('llm-manager');
      expect(circuitBreakerStatus).toBe('open');

      // 一定時間後にサーキットブレーカーがリセットされることを確認
      await new Promise(resolve => setTimeout(resolve, 5000));
      const resetStatus = errorRecoveryService.getCircuitBreakerStatus('llm-manager');
      expect(resetStatus).toBe('half-open');
    });
  });

  describe('エラー通知とログ', () => {
    it('エラーの分類と優先度付け', async () => {
      console.log('📊 テスト: エラー分類と優先度');

      const errors: SystemError[] = [
        {
          id: '1',
          type: 'authentication',
          service: 'api',
          message: 'Invalid credentials',
          severity: 'critical',
          timestamp: new Date()
        },
        {
          id: '2',
          type: 'validation',
          service: 'frontend',
          message: 'Invalid input',
          severity: 'low',
          timestamp: new Date()
        },
        {
          id: '3',
          type: 'runtime_crash',
          service: 'webcontainer',
          message: 'Container crashed',
          severity: 'high',
          timestamp: new Date()
        }
      ];

      systemErrors.set(errors);

      // エラーの優先度順ソート
      const prioritizedErrors = errorRecoveryService.prioritizeErrors(errors);
      
      expect(prioritizedErrors[0].severity).toBe('critical');
      expect(prioritizedErrors[1].severity).toBe('high');
      expect(prioritizedErrors[2].severity).toBe('low');
    });

    it('エラーレポートの生成', async () => {
      console.log('📄 テスト: エラーレポート生成');

      const errorReport = await errorRecoveryService.generateErrorReport({
        timeRange: {
          start: new Date(Date.now() - 3600000), // 1時間前
          end: new Date()
        },
        includeResolved: true,
        groupByService: true
      });

      expect(errorReport).toHaveProperty('summary');
      expect(errorReport).toHaveProperty('errorsByService');
      expect(errorReport).toHaveProperty('resolutionStats');
      expect(errorReport).toHaveProperty('recommendations');
    });
  });

  describe('自動修復機能', () => {
    it('既知のエラーパターンの自動修復', async () => {
      console.log('🔧 テスト: 自動修復機能');

      // よくあるインポートエラー
      const importError = new Error('Module not found: @/components/Header');
      importError.name = 'ModuleNotFoundError';
      (importError as any).file = '/src/App.tsx';
      (importError as any).line = 5;

      const autoFix = await errorRecoveryService.attemptAutoFix(importError);

      expect(autoFix.success).toBe(true);
      expect(autoFix.fixType).toBe('create_missing_module');
      expect(autoFix.actions).toContainEqual(
        expect.objectContaining({
          type: 'create_file',
          path: '/src/components/Header.tsx'
        })
      );
    });

    it('依存関係の自動修復', async () => {
      console.log('📦 テスト: 依存関係の自動修復');

      const dependencyError = new Error('Cannot find module "axios"');
      dependencyError.name = 'DependencyError';
      (dependencyError as any).package = 'axios';

      const autoFix = await errorRecoveryService.attemptAutoFix(dependencyError);

      expect(autoFix.success).toBe(true);
      expect(autoFix.fixType).toBe('install_dependency');
      expect(autoFix.actions).toContainEqual(
        expect.objectContaining({
          type: 'run_command',
          command: 'npm install axios'
        })
      );
    });
  });
});