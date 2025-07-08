/**
 * Multi-Tool Integration E2E Tests
 * 
 * Tests for the collaboration between Bolt, Devin, and OpenHands
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { LLMManager } from '@/lib/llm/manager';
import { AgentOrchestrator } from '@/lib/agents/orchestrator/AgentOrchestrator';
import { BoltIntegration } from '@/lib/integrations/BoltIntegration';
import { DevinIntegration } from '@/lib/integrations/DevinIntegration';
import { OpenHandsIntegration } from '@/lib/integrations/OpenHandsIntegration';
import { ProjectManager } from '@/lib/projects/ProjectManager';
import { EventService } from '@/lib/services/EventService';
import { boltSessions, devinTasks, openHandsAgents, currentProject } from '@/lib/store';
import type { Project, Task, AgentCollaboration } from '@/lib/interfaces';

describe('Multi-Tool Integration E2E Tests', () => {
  let llmManager: LLMManager;
  let orchestrator: AgentOrchestrator;
  let boltIntegration: BoltIntegration;
  let devinIntegration: DevinIntegration;
  let openHandsIntegration: OpenHandsIntegration;
  let projectManager: ProjectManager;
  let eventService: EventService;

  beforeAll(async () => {
    console.log('🔗 初期化中: マルチツール統合E2Eテスト環境');

    // Core services
    llmManager = new LLMManager({
      providers: {
        anthropic: {
          apiKey: process.env.VITE_ANTHROPIC_API_KEY || 'test-key',
          defaultModel: 'claude-sonnet-4-20250514'
        }
      }
    });
    await llmManager.initialize();

    eventService = new EventService('ws://localhost:8000/ws/events');
    await eventService.connect();

    orchestrator = new AgentOrchestrator({
      llmManager,
      enableAIDecomposition: true,
      maxConcurrentTasks: 10
    });

    // Tool integrations
    boltIntegration = new BoltIntegration({ eventService });
    devinIntegration = new DevinIntegration({ eventService });
    openHandsIntegration = new OpenHandsIntegration({ 
      eventService,
      apiUrl: 'http://localhost:8000'
    });

    projectManager = new ProjectManager({
      orchestrator,
      eventService,
      integrations: {
        bolt: boltIntegration,
        devin: devinIntegration,
        openHands: openHandsIntegration
      }
    });
  });

  afterAll(async () => {
    await eventService.disconnect();
  });

  describe('フルスタックアプリケーション開発', () => {
    it('3つのツールを使用したEコマースサイトの構築', async () => {
      console.log('🛍️ テスト: Eコマースサイト構築（Bolt + Devin + OpenHands）');

      // プロジェクトの作成
      const project = await projectManager.createProject({
        name: 'e-commerce-platform',
        type: 'fullstack',
        description: 'Modern e-commerce platform with React, Node.js, and PostgreSQL',
        features: [
          'user-authentication',
          'product-catalog',
          'shopping-cart',
          'payment-integration',
          'admin-dashboard'
        ],
        stack: {
          frontend: ['react', 'typescript', 'tailwindcss'],
          backend: ['nodejs', 'express', 'typescript'],
          database: ['postgresql', 'redis'],
          infrastructure: ['docker', 'nginx']
        }
      });

      currentProject.set(project);

      // AIによるタスク分解と割り当て
      const workflow = await orchestrator.orchestrateWorkflow({
        task: 'Build a complete e-commerce platform with the specified features',
        context: {
          project,
          requiresCollaboration: true
        }
      });

      // タスクの分類と割り当て
      const taskAssignments = await orchestrator.assignTasksToAgents(workflow.tasks);

      expect(taskAssignments.bolt).toContainEqual(
        expect.objectContaining({
          description: expect.stringMatching(/frontend|UI|React/i)
        })
      );

      expect(taskAssignments.devin).toContainEqual(
        expect.objectContaining({
          description: expect.stringMatching(/API|backend|Node\.js/i)
        })
      );

      expect(taskAssignments.openHands).toContainEqual(
        expect.objectContaining({
          description: expect.stringMatching(/database|PostgreSQL|schema/i)
        })
      );

      // 1. OpenHandsがデータベーススキーマを設計
      console.log('📊 OpenHands: データベース設計開始');
      
      const dbTasks = taskAssignments.openHands;
      const openHandsAgent = await openHandsIntegration.createAgent({
        type: 'database-architect',
        capabilities: ['schema-design', 'query-optimization', 'migration']
      });

      openHandsAgents.set([{
        ...openHandsAgent,
        currentTasks: dbTasks
      }]);

      // データベーススキーマの作成
      const schemaResult = await openHandsIntegration.executeTask({
        agentId: openHandsAgent.id,
        task: dbTasks[0],
        context: {
          entities: ['users', 'products', 'orders', 'payments'],
          relationships: {
            'users-orders': 'one-to-many',
            'orders-products': 'many-to-many',
            'orders-payments': 'one-to-one'
          }
        }
      });

      expect(schemaResult.success).toBe(true);
      expect(schemaResult.artifacts).toContainEqual(
        expect.objectContaining({
          type: 'sql',
          name: expect.stringMatching(/schema\.sql/i)
        })
      );

      // スキーマ情報を他のエージェントと共有
      eventService.emit('action', {
        type: 'agent:share-artifact',
        payload: {
          from: 'openHands',
          to: ['bolt', 'devin'],
          artifact: {
            type: 'database-schema',
            content: schemaResult.artifacts[0].content,
            tables: ['users', 'products', 'orders', 'payments']
          }
        }
      });

      // 2. DevinがバックエンドAPIを実装
      console.log('⚙️ Devin: バックエンドAPI実装開始');
      
      const apiTasks = taskAssignments.devin;
      const devinTaskList = apiTasks.map(task => ({
        ...task,
        assignedAgent: 'devin',
        dependencies: ['database-schema'],
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      devinTasks.set(devinTaskList);

      // API エンドポイントの実装
      const apiImplementation = await devinIntegration.implementAPI({
        tasks: apiTasks,
        schema: schemaResult.artifacts[0].content,
        requirements: {
          authentication: 'JWT',
          validation: 'zod',
          documentation: 'OpenAPI'
        }
      });

      expect(apiImplementation.endpoints).toContainEqual(
        expect.objectContaining({
          path: '/api/products',
          methods: ['GET', 'POST', 'PUT', 'DELETE']
        })
      );

      // API仕様を共有
      eventService.emit('action', {
        type: 'agent:share-artifact',
        payload: {
          from: 'devin',
          to: ['bolt'],
          artifact: {
            type: 'api-specification',
            content: apiImplementation.openApiSpec,
            baseUrl: 'http://localhost:3001/api'
          }
        }
      });

      // 3. BoltがフロントエンドUIを構築
      console.log('🎨 Bolt: フロントエンドUI構築開始');
      
      const uiTasks = taskAssignments.bolt;
      const boltSession = await boltIntegration.createSession({
        projectId: project.id,
        tasks: uiTasks,
        apiSpec: apiImplementation.openApiSpec
      });

      boltSessions.set([boltSession]);

      // UIコンポーネントの生成
      const uiImplementation = await boltIntegration.generateUI({
        sessionId: boltSession.id,
        components: [
          'ProductList',
          'ProductDetail',
          'ShoppingCart',
          'CheckoutForm',
          'UserDashboard'
        ],
        apiEndpoints: apiImplementation.endpoints,
        designSystem: {
          colors: 'modern',
          components: 'shadcn-ui'
        }
      });

      expect(uiImplementation.components).toHaveLength(5);
      expect(uiImplementation.components).toContainEqual(
        expect.objectContaining({
          name: 'ProductList',
          type: 'React.FC',
          hasApiIntegration: true
        })
      );

      // 4. 統合テストの実行
      console.log('🧪 統合テスト実行');

      const integrationTest = await orchestrator.runIntegrationTest({
        frontend: {
          url: 'http://localhost:5173',
          healthCheck: '/health'
        },
        backend: {
          url: 'http://localhost:3001',
          healthCheck: '/api/health'
        },
        database: {
          host: 'localhost',
          port: 5432,
          name: 'ecommerce_test'
        }
      });

      expect(integrationTest.frontend.status).toBe('healthy');
      expect(integrationTest.backend.status).toBe('healthy');
      expect(integrationTest.database.status).toBe('connected');
      expect(integrationTest.apiTests.passed).toBeGreaterThan(0);
    });
  });

  describe('リアルタイムコラボレーション', () => {
    it('エージェント間のリアルタイム同期', async () => {
      console.log('🔄 テスト: エージェント間リアルタイム同期');

      const collaborationEvents: AgentCollaboration[] = [];

      // コラボレーションイベントをサブスクライブ
      eventService.subscribe('agent:collaboration', (event) => {
        collaborationEvents.push(event.payload);
      });

      // Boltがコンポーネントを更新
      const componentUpdate = {
        component: 'ProductCard',
        changes: {
          props: ['price', 'discount', 'rating'],
          styles: { card: 'shadow-lg rounded-lg' }
        }
      };

      await boltIntegration.updateComponent(componentUpdate);

      // Devinが対応するAPIを自動更新
      eventService.emit('action', {
        type: 'agent:collaboration',
        payload: {
          initiator: 'bolt',
          target: 'devin',
          action: 'update_api_for_component',
          data: componentUpdate
        }
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      // コラボレーションイベントが記録されていることを確認
      expect(collaborationEvents).toContainEqual(
        expect.objectContaining({
          initiator: 'bolt',
          target: 'devin',
          action: 'update_api_for_component'
        })
      );

      // DevinがAPIを更新したことを確認
      const apiUpdate = await devinIntegration.getLastUpdate();
      expect(apiUpdate).toMatchObject({
        type: 'api_schema_update',
        fields: expect.arrayContaining(['discount', 'rating'])
      });
    });

    it('コンフリクト解決メカニズム', async () => {
      console.log('⚔️ テスト: コンフリクト解決');

      // 同じファイルを複数のエージェントが編集
      const conflictFile = '/src/components/Header.tsx';

      // Boltによる編集
      const boltEdit = {
        agentId: 'bolt',
        file: conflictFile,
        changes: {
          line: 10,
          content: 'const Header = () => { return <header className="bg-blue-500">...</header> }'
        }
      };

      // Devinによる編集（同じ行）
      const devinEdit = {
        agentId: 'devin',
        file: conflictFile,
        changes: {
          line: 10,
          content: 'const Header = () => { return <header className="bg-gray-900">...</header> }'
        }
      };

      // コンフリクトの検出
      const conflict = await orchestrator.detectConflict([boltEdit, devinEdit]);
      expect(conflict.hasConflict).toBe(true);
      expect(conflict.type).toBe('line_conflict');

      // AI支援によるコンフリクト解決
      const resolution = await orchestrator.resolveConflict(conflict, {
        strategy: 'ai_merge',
        context: {
          projectStyle: 'dark-theme',
          priority: 'design-consistency'
        }
      });

      expect(resolution.success).toBe(true);
      expect(resolution.mergedContent).toContain('bg-gray-900'); // ダークテーマを優先
      expect(resolution.explanation).toContain('design consistency');
    });
  });

  describe('インテリジェントタスク配分', () => {
    it('動的なタスク再割り当て', async () => {
      console.log('🔀 テスト: 動的タスク再割り当て');

      // 初期タスクリスト
      const tasks: Task[] = [
        {
          id: 'task-1',
          description: 'Implement user authentication with OAuth',
          type: 'backend',
          priority: 1,
          estimatedComplexity: 'high',
          status: 'pending'
        },
        {
          id: 'task-2',
          description: 'Create responsive landing page',
          type: 'frontend',
          priority: 2,
          estimatedComplexity: 'medium',
          status: 'pending'
        },
        {
          id: 'task-3',
          description: 'Optimize database queries for performance',
          type: 'database',
          priority: 1,
          estimatedComplexity: 'high',
          status: 'pending'
        }
      ];

      // 初期割り当て
      const initialAssignment = await orchestrator.assignTasksToAgents(tasks);

      // Devinが過負荷状態をシミュレート
      devinIntegration.setLoadStatus({
        currentLoad: 0.9, // 90% 負荷
        queuedTasks: 5,
        averageCompletionTime: 3600 // 1時間
      });

      // 負荷分散のための再割り当て
      const rebalanced = await orchestrator.rebalanceTasks({
        currentAssignments: initialAssignment,
        agentMetrics: {
          bolt: { load: 0.3, queuedTasks: 1 },
          devin: { load: 0.9, queuedTasks: 5 },
          openHands: { load: 0.5, queuedTasks: 2 }
        }
      });

      // 高負荷のDevinからタスクが再割り当てされることを確認
      expect(rebalanced.changes).toContainEqual(
        expect.objectContaining({
          taskId: expect.any(String),
          from: 'devin',
          to: expect.stringMatching(/bolt|openHands/),
          reason: 'load_balancing'
        })
      );
    });

    it('スキルベースのタスクマッチング', async () => {
      console.log('🎯 テスト: スキルベースタスクマッチング');

      // 特殊なスキルを要求するタスク
      const specializedTasks: Task[] = [
        {
          id: 'ml-task',
          description: 'Implement recommendation engine using TensorFlow',
          type: 'ai-ml',
          requiredSkills: ['tensorflow', 'python', 'machine-learning'],
          priority: 1,
          status: 'pending'
        },
        {
          id: 'animation-task',
          description: 'Create complex animations with Framer Motion',
          type: 'frontend',
          requiredSkills: ['react', 'framer-motion', 'animation'],
          priority: 2,
          status: 'pending'
        },
        {
          id: 'security-task',
          description: 'Implement OAuth2 with PKCE flow',
          type: 'security',
          requiredSkills: ['oauth2', 'security', 'cryptography'],
          priority: 1,
          status: 'pending'
        }
      ];

      // エージェントの能力を更新
      await boltIntegration.updateCapabilities({
        skills: ['react', 'typescript', 'animation', 'framer-motion'],
        specializations: ['ui-ux', 'animations']
      });

      await devinIntegration.updateCapabilities({
        skills: ['python', 'nodejs', 'security', 'oauth2', 'cryptography'],
        specializations: ['backend', 'security']
      });

      await openHandsIntegration.updateCapabilities({
        skills: ['python', 'tensorflow', 'machine-learning', 'sql'],
        specializations: ['ai-ml', 'data-science']
      });

      // スキルベースの割り当て
      const skillBasedAssignment = await orchestrator.assignBySkills(specializedTasks);

      expect(skillBasedAssignment['ml-task'].assignedTo).toBe('openHands');
      expect(skillBasedAssignment['animation-task'].assignedTo).toBe('bolt');
      expect(skillBasedAssignment['security-task'].assignedTo).toBe('devin');

      // マッチングスコアが高いことを確認
      Object.values(skillBasedAssignment).forEach(assignment => {
        expect(assignment.matchScore).toBeGreaterThan(0.8);
      });
    });
  });

  describe('クロスツール最適化', () => {
    it('パフォーマンスボトルネックの検出と最適化', async () => {
      console.log('🚀 テスト: クロスツール最適化');

      // パフォーマンスメトリクスの収集
      const metrics = await orchestrator.collectPerformanceMetrics({
        duration: 60000, // 1分間
        includeAgents: ['bolt', 'devin', 'openHands']
      });

      // ボトルネックの分析
      const bottlenecks = await orchestrator.analyzeBottlenecks(metrics);

      expect(bottlenecks).toContainEqual(
        expect.objectContaining({
          type: expect.stringMatching(/api_latency|db_query|render_time/),
          severity: expect.stringMatching(/low|medium|high/),
          recommendation: expect.any(String)
        })
      );

      // 最適化の適用
      for (const bottleneck of bottlenecks) {
        if (bottleneck.type === 'api_latency' && bottleneck.severity === 'high') {
          // DevinにAPIの最適化を指示
          const optimization = await devinIntegration.optimizeAPI({
            endpoints: bottleneck.affectedEndpoints,
            strategies: ['caching', 'query-optimization', 'pagination']
          });

          expect(optimization.improvements).toContainEqual(
            expect.objectContaining({
              endpoint: expect.any(String),
              latencyReduction: expect.any(Number),
              strategy: expect.stringMatching(/caching|query-optimization/)
            })
          );
        }
      }
    });

    it('リソース使用量の最適化', async () => {
      console.log('💾 テスト: リソース使用量最適化');

      // 各ツールのリソース使用状況
      const resourceUsage = {
        bolt: {
          memory: 512 * 1024 * 1024, // 512MB
          cpu: 45, // 45%
          activeConnections: 25
        },
        devin: {
          memory: 1024 * 1024 * 1024, // 1GB
          cpu: 80, // 80%
          activeConnections: 100
        },
        openHands: {
          memory: 2048 * 1024 * 1024, // 2GB
          cpu: 60, // 60%
          activeConnections: 50
        }
      };

      // リソース最適化の提案
      const optimizations = await orchestrator.suggestResourceOptimizations(resourceUsage);

      expect(optimizations).toContainEqual(
        expect.objectContaining({
          agent: 'devin',
          issue: 'high_cpu_usage',
          suggestions: expect.arrayContaining([
            expect.stringContaining('connection pooling'),
            expect.stringContaining('caching'),
            expect.stringContaining('horizontal scaling')
          ])
        })
      );

      // 最適化の実行
      const applied = await orchestrator.applyOptimizations(optimizations);
      expect(applied.success).toBe(true);
      expect(applied.improvements).toContainEqual(
        expect.objectContaining({
          agent: 'devin',
          cpuReduction: expect.any(Number),
          memoryReduction: expect.any(Number)
        })
      );
    });
  });
});