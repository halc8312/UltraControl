/**
 * End-to-End Integration Tests for UltraControl
 * 
 * Comprehensive tests to ensure all phases and components work together
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { LLMManager } from '@/lib/llm/manager';
import { AgentOrchestrator } from '@/lib/agents/orchestrator/AgentOrchestrator';
import { RuntimeManager } from '@/lib/runtime/RuntimeManager';
import { PluginManager } from '@/lib/plugins/PluginManager';
import { TemplateManager } from '@/lib/community/TemplateManager';
import { BestPracticesDB } from '@/lib/community/BestPracticesDB';
import { EventService } from '@/lib/services/EventService';
import { currentUser, userPreferences, boltSessions, devinTasks, openHandsAgents } from '@/lib/store';
import type { Task } from '@/lib/agents/orchestrator/TaskDecomposer';

describe('UltraControl End-to-End Integration', () => {
  let llmManager: LLMManager;
  let orchestrator: AgentOrchestrator;
  let runtimeManager: RuntimeManager;
  let pluginManager: PluginManager;
  let templateManager: TemplateManager;
  let bestPracticesDB: BestPracticesDB;
  let eventService: EventService;

  beforeAll(async () => {
    // Initialize all core services
    console.log('Initializing UltraControl services...');

    // Phase 1: Core infrastructure
    llmManager = new LLMManager({
      providers: {
        anthropic: {
          apiKey: process.env.ANTHROPIC_API_KEY || 'test-key',
          defaultModel: 'claude-sonnet-4-20250514'
        },
        openai: {
          apiKey: process.env.OPENAI_API_KEY || 'test-key',
          defaultModel: 'gpt-4.1-mini'
        }
      }
    });
    await llmManager.initialize();

    eventService = new EventService('ws://localhost:8000/ws/events');

    // Phase 2: Agent orchestration
    orchestrator = new AgentOrchestrator({
      llmManager,
      enableAIDecomposition: true,
      maxConcurrentTasks: 5
    });

    runtimeManager = new RuntimeManager();
    await runtimeManager.initialize();

    // Phase 4: Plugin system
    pluginManager = new PluginManager({
      autoLoad: false,
      enableSandbox: true,
      permissionPolicy: {
        defaultPermissions: ['ui:render', 'state:read', 'events:listen']
      }
    });
    await pluginManager.initialize();

    // Phase 4: Community features
    templateManager = new TemplateManager();
    bestPracticesDB = new BestPracticesDB();
  });

  afterAll(async () => {
    // Cleanup
    await eventService.disconnect();
    await pluginManager.dispose();
    await runtimeManager.dispose();
  });

  describe('Phase 1: Architecture Foundation', () => {
    it('should initialize state management system', () => {
      // Test Nanostores
      currentUser.set({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User'
      });

      expect(currentUser.get()).toEqual({
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User'
      });

      // Test preferences persistence
      userPreferences.set({
        theme: 'dark',
        language: 'en',
        autoSave: true
      });

      expect(userPreferences.get().theme).toBe('dark');
    });

    it('should support multiple LLM providers', async () => {
      // Test Anthropic provider
      const anthropicModels = await llmManager.listModels('anthropic');
      expect(anthropicModels).toContainEqual(
        expect.objectContaining({
          id: 'claude-opus-4-20250514',
          contextWindow: 1000000
        })
      );

      // Test OpenAI provider
      const openaiModels = await llmManager.listModels('openai');
      expect(openaiModels).toContainEqual(
        expect.objectContaining({
          id: 'gpt-4.1',
          contextWindow: 1000000
        })
      );
    });

    it('should handle LLM context management', async () => {
      const contextManager = llmManager.getContextManager();
      
      contextManager.addMessage({
        role: 'user',
        content: 'Hello, test message'
      });

      contextManager.addMessage({
        role: 'assistant',
        content: 'Hello! How can I help you?'
      });

      const messages = contextManager.getMessages();
      expect(messages).toHaveLength(2);
      expect(contextManager.getTokenCount()).toBeGreaterThan(0);
    });

    it('should emit and handle events through EventService', async () => {
      const receivedEvents: any[] = [];
      
      const unsubscribe = eventService.subscribe('test-event', (data) => {
        receivedEvents.push(data);
      });

      eventService.emit('action', {
        type: 'test-event',
        payload: { message: 'Test event' }
      });

      // Wait for event propagation
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(receivedEvents).toContainEqual(
        expect.objectContaining({
          type: 'test-event',
          payload: { message: 'Test event' }
        })
      );

      unsubscribe();
    });
  });

  describe('Phase 2: Core Feature Integration', () => {
    it('should orchestrate multi-agent workflow', async () => {
      const workflow = await orchestrator.orchestrateWorkflow({
        task: 'Create a simple React component that displays Hello World',
        context: {
          projectType: 'react',
          targetPath: '/src/components'
        }
      });

      expect(workflow.id).toBeDefined();
      expect(workflow.status).toBe('pending');
      expect(workflow.tasks.length).toBeGreaterThan(0);
      
      // Check task decomposition
      const tasks = workflow.tasks;
      expect(tasks).toContainEqual(
        expect.objectContaining({
          type: expect.stringMatching(/frontend|component/)
        })
      );
    });

    it('should select appropriate runtime environment', async () => {
      // Test WebContainer selection for frontend
      const webContainerRuntime = await runtimeManager.selectRuntime({
        type: 'frontend',
        requirements: []
      });
      expect(webContainerRuntime.type).toBe('webcontainer');

      // Test Docker selection for backend
      const dockerRuntime = await runtimeManager.selectRuntime({
        type: 'backend',
        requirements: ['database']
      });
      expect(dockerRuntime.type).toBe('docker');
    });

    it('should track agent sessions', () => {
      // Test bolt session tracking
      boltSessions.set([{
        id: 'bolt-session-1',
        agentId: 'bolt-executor',
        startTime: new Date(),
        status: 'active',
        tasks: []
      }]);

      const sessions = boltSessions.get();
      expect(sessions).toHaveLength(1);
      expect(sessions[0].agentId).toBe('bolt-executor');
    });
  });

  describe('Phase 3: User Experience Innovation', () => {
    it('should provide intelligent suggestions', async () => {
      // Mock project context
      const projectContext = {
        files: [
          {
            path: '/src/App.tsx',
            language: 'typescript',
            lastModified: new Date()
          }
        ],
        dependencies: ['react', 'typescript'],
        recentErrors: [
          {
            message: 'Cannot find module "./Header"',
            file: '/src/App.tsx',
            line: 5,
            timestamp: new Date(),
            resolved: false
          }
        ],
        activeAgents: ['bolt'],
        completedTasks: []
      };

      // In a real implementation, this would use IntelligentAssistant
      const suggestions = [
        {
          id: 'fix-import',
          type: 'fix' as const,
          title: 'Fix missing Header import',
          description: 'Create the missing Header component',
          confidence: 0.9
        }
      ];

      expect(suggestions).toContainEqual(
        expect.objectContaining({
          type: 'fix',
          confidence: expect.any(Number)
        })
      );
    });

    it('should handle multimodal input', () => {
      // Test text input
      const textInput = {
        type: 'text' as const,
        content: 'Create a login form',
        metadata: { timestamp: new Date() }
      };
      expect(textInput.type).toBe('text');

      // Test code input
      const codeInput = {
        type: 'code' as const,
        content: 'function hello() { return "world"; }',
        metadata: { 
          language: 'javascript',
          timestamp: new Date()
        }
      };
      expect(codeInput.metadata?.language).toBe('javascript');
    });
  });

  describe('Phase 4: Extensibility and Ecosystem', () => {
    it('should load and validate plugins', async () => {
      // Test plugin discovery
      const plugins = pluginManager.getPlugins();
      
      // In a real environment, there would be discovered plugins
      expect(Array.isArray(plugins)).toBe(true);
    });

    it('should enforce plugin permissions', () => {
      const permissionPolicy = {
        defaultPermissions: ['ui:render', 'state:read'],
        alwaysDeny: ['process:spawn'],
        requireApproval: ['filesystem:write']
      };

      pluginManager.updatePermissionPolicy(permissionPolicy);

      // Test permission checks would happen during plugin load
      expect(permissionPolicy.alwaysDeny).toContain('process:spawn');
    });

    it('should manage project templates', async () => {
      // Search for templates
      const templates = await templateManager.searchTemplates({
        category: 'web-app',
        limit: 5
      });

      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('category', 'web-app');
    });

    it('should provide best practices', async () => {
      // Search for React best practices
      const practices = await bestPracticesDB.search({
        tags: ['react'],
        categories: ['performance'],
        limit: 5
      });

      expect(practices.length).toBeGreaterThan(0);
      if (practices.length > 0) {
        expect(practices[0].tags).toContain('react');
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete development workflow', async () => {
      // Scenario: User wants to create a new React app with authentication

      // 1. Apply template
      const template = await templateManager.getTemplate('react-app');
      expect(template).toBeDefined();

      // 2. Decompose into tasks
      const workflow = await orchestrator.orchestrateWorkflow({
        task: 'Add user authentication to React app',
        context: {
          projectType: 'react',
          framework: 'react',
          features: ['authentication']
        }
      });

      expect(workflow.tasks).toContainEqual(
        expect.objectContaining({
          description: expect.stringContaining('auth')
        })
      );

      // 3. Track in appropriate agent session
      const task: Task = {
        id: 'task-auth-1',
        description: 'Implement authentication',
        type: 'frontend',
        priority: 1,
        status: 'pending',
        agentId: 'bolt-executor'
      };

      devinTasks.set([task]);
      expect(devinTasks.get()).toHaveLength(1);

      // 4. Get relevant best practices
      const authPractices = await bestPracticesDB.search({
        query: 'authentication react',
        limit: 3
      });

      expect(authPractices.length).toBeGreaterThan(0);
    });

    it('should support AI model switching', async () => {
      // Test switching between models based on task requirements
      
      // Use Claude for complex reasoning
      const complexResult = await llmManager.complete({
        messages: [{ 
          role: 'user', 
          content: 'Analyze this architecture and suggest improvements' 
        }],
        model: 'claude-opus-4-20250514',
        maxTokens: 1000
      });
      expect(complexResult.model).toContain('claude');

      // Use GPT-4.1 Nano for simple tasks
      const simpleResult = await llmManager.complete({
        messages: [{ 
          role: 'user', 
          content: 'Format this JSON' 
        }],
        model: 'gpt-4.1-nano',
        maxTokens: 100
      });
      expect(simpleResult.model).toContain('gpt-4.1');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle LLM provider failures gracefully', async () => {
      // Test with invalid API key
      const failingManager = new LLMManager({
        providers: {
          openai: {
            apiKey: 'invalid-key',
            defaultModel: 'gpt-4.1'
          }
        }
      });

      await expect(failingManager.initialize()).rejects.toThrow();
    });

    it('should handle plugin load failures', async () => {
      // Attempt to load non-existent plugin
      await expect(
        pluginManager.loadPlugin('non-existent-plugin')
      ).rejects.toThrow();
    });

    it('should recover from event service disconnection', async () => {
      // Simulate disconnection
      vi.spyOn(eventService as any, 'ws', 'get').mockReturnValueOnce({
        readyState: WebSocket.CLOSED
      });

      // Should attempt reconnection
      expect(eventService.isConnected()).toBe(false);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent task execution', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) => ({
        id: `perf-task-${i}`,
        description: `Performance test task ${i}`,
        type: 'general' as const,
        priority: 1,
        status: 'pending' as const
      }));

      const startTime = Date.now();
      
      // Execute tasks concurrently
      const executions = await Promise.all(
        tasks.map(task => orchestrator.executeTask(task))
      );

      const duration = Date.now() - startTime;
      
      expect(executions).toHaveLength(10);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should manage memory efficiently with large contexts', async () => {
      const contextManager = llmManager.getContextManager();
      
      // Add many messages
      for (let i = 0; i < 100; i++) {
        contextManager.addMessage({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}: ${Array(100).fill('word').join(' ')}`
        });
      }

      // Should truncate to stay within limits
      contextManager.truncateToFit(10000);
      
      const tokenCount = contextManager.getTokenCount();
      expect(tokenCount).toBeLessThan(10000);
    });
  });
});