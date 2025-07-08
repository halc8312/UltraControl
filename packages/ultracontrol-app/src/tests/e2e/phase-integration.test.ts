/**
 * Phase-specific Integration Tests
 * 
 * Detailed tests for each phase implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdaptiveLayout } from '@/lib/ui/layout/AdaptiveLayout';
import { ContextAwarePanel } from '@/lib/ui/panels/ContextAwarePanel';
import { MultimodalInput } from '@/lib/ui/input/MultimodalInput';
import { IntelligentAssistant } from '@/lib/ui/assistant/IntelligentAssistant';
import { render, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

describe('Phase-specific Integration Tests', () => {
  
  describe('Phase 1: Architecture Foundation Tests', () => {
    it('should sync state across components using Nanostores', async () => {
      // Test that state changes propagate correctly
      const { currentUser } = await import('@/lib/store');
      
      const listener = vi.fn();
      const unsubscribe = currentUser.listen(listener);
      
      currentUser.set({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      });
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'user-123'
        }),
        undefined,
        expect.any(Object)
      );
      
      unsubscribe();
    });

    it('should persist preferences to localStorage', async () => {
      const { userPreferences } = await import('@/lib/store');
      
      userPreferences.set({
        theme: 'dark',
        language: 'ja',
        autoSave: true
      });
      
      // Simulate page reload
      const stored = localStorage.getItem('userPreferences');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.theme).toBe('dark');
      expect(parsed.language).toBe('ja');
    });

    it('should handle LLM prompt chaining', async () => {
      const { PromptChain } = await import('@/lib/llm/chain');
      const { LLMManager } = await import('@/lib/llm/manager');
      
      const manager = new LLMManager({
        providers: {
          openai: {
            apiKey: 'test-key',
            defaultModel: 'gpt-4.1-mini'
          }
        }
      });
      
      const chain = new PromptChain(manager);
      
      chain
        .add({
          messages: [{ role: 'user', content: 'Step 1' }],
          model: 'gpt-4.1-mini'
        })
        .add({
          messages: [{ role: 'user', content: 'Step 2' }],
          model: 'gpt-4.1-mini'
        })
        .parallel([
          {
            messages: [{ role: 'user', content: 'Parallel 1' }],
            model: 'gpt-4.1-mini'
          },
          {
            messages: [{ role: 'user', content: 'Parallel 2' }],
            model: 'gpt-4.1-mini'
          }
        ]);
      
      expect(chain.getSteps()).toHaveLength(3);
      expect(chain.getSteps()[2].parallel).toBe(true);
    });
  });

  describe('Phase 2: Core Features Tests', () => {
    it('should decompose complex tasks intelligently', async () => {
      const { TaskDecomposer, DefaultTaskDecomposer } = 
        await import('@/lib/agents/orchestrator/TaskDecomposer');
      
      const decomposer = new DefaultTaskDecomposer();
      
      const tasks = await decomposer.decompose(
        'Build a full-stack e-commerce application with user authentication, product catalog, and payment processing',
        { projectType: 'fullstack' }
      );
      
      expect(tasks.length).toBeGreaterThan(3);
      
      // Should have frontend tasks
      expect(tasks).toContainEqual(
        expect.objectContaining({
          type: 'frontend'
        })
      );
      
      // Should have backend tasks
      expect(tasks).toContainEqual(
        expect.objectContaining({
          type: 'backend'
        })
      );
      
      // Should have database tasks
      expect(tasks).toContainEqual(
        expect.objectContaining({
          type: 'database'
        })
      );
    });

    it('should select optimal agents based on capabilities', async () => {
      const { AgentSelector, OptimalAgentSelector } = 
        await import('@/lib/agents/orchestrator/AgentSelector');
      
      const selector = new OptimalAgentSelector();
      
      const agents = [
        {
          id: 'bolt-1',
          type: 'bolt',
          status: 'available' as const,
          capabilities: ['frontend', 'react', 'vue'],
          load: 0.3
        },
        {
          id: 'openhands-1',
          type: 'openhands',
          status: 'available' as const,
          capabilities: ['backend', 'python', 'database'],
          load: 0.5
        }
      ];
      
      const frontendAgent = await selector.selectAgent(
        {
          id: 'task-1',
          description: 'Create React component',
          type: 'frontend',
          priority: 1,
          status: 'pending',
          requiredCapabilities: ['react']
        },
        agents
      );
      
      expect(frontendAgent?.id).toBe('bolt-1');
      
      const backendAgent = await selector.selectAgent(
        {
          id: 'task-2',
          description: 'Create API endpoint',
          type: 'backend',
          priority: 1,
          status: 'pending',
          requiredCapabilities: ['python']
        },
        agents
      );
      
      expect(backendAgent?.id).toBe('openhands-1');
    });
  });

  describe('Phase 3: User Experience Tests', () => {
    it('should adapt layout based on task context', () => {
      const mockPresets = [
        {
          id: 'coding',
          name: 'Coding',
          layout: {
            sidebar: { width: 300, visible: true },
            editor: { width: '60%', visible: true },
            terminal: { height: 200, visible: true },
            preview: { width: '40%', visible: false }
          },
          triggers: {
            taskTypes: ['frontend', 'backend'],
            screenSize: { min: 1024 }
          }
        }
      ];
      
      const { container } = render(
        <AdaptiveLayout presets={mockPresets}>
          <div>Content</div>
        </AdaptiveLayout>
      );
      
      expect(container.querySelector('.adaptive-layout')).toBeTruthy();
    });

    it('should handle multimodal input correctly', async () => {
      const onSubmit = vi.fn();
      
      const { container, getByPlaceholderText } = render(
        <MultimodalInput 
          onSubmit={onSubmit}
          supportedTypes={['text', 'code', 'image']}
        />
      );
      
      const textarea = getByPlaceholderText(/Type a message/) as HTMLTextAreaElement;
      
      // Test text input
      fireEvent.change(textarea, { target: { value: 'Hello world' } });
      fireEvent.keyDown(textarea, { key: 'Enter' });
      
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'text',
            content: 'Hello world'
          })
        );
      });
      
      // Test code detection
      onSubmit.mockClear();
      fireEvent.change(textarea, { target: { value: '```javascript\nconst x = 1;\n```' } });
      
      await waitFor(() => {
        expect(container.querySelector('.code-mode')).toBeTruthy();
      });
    });

    it('should provide context-aware information', () => {
      const mockContext = {
        currentTask: {
          id: 'task-1',
          description: 'Build authentication system',
          type: 'backend' as const,
          priority: 1,
          status: 'in_progress' as const
        },
        agentStatuses: [
          {
            agentId: 'openhands-1',
            status: 'busy' as const,
            currentTask: 'task-1'
          }
        ],
        recentFiles: [
          {
            path: '/src/auth/login.ts',
            lastModified: new Date(),
            changes: 'added'
          }
        ],
        errors: []
      };
      
      const { container } = render(
        <ContextAwarePanel context={mockContext} position="right" />
      );
      
      expect(container.textContent).toContain('Build authentication system');
      expect(container.textContent).toContain('openhands-1');
      expect(container.textContent).toContain('login.ts');
    });
  });

  describe('Phase 4: Plugin System Tests', () => {
    it('should validate plugin manifest correctly', async () => {
      const { PluginValidator } = await import('@/lib/plugins/loader/PluginValidator');
      
      const validator = new PluginValidator();
      
      const validManifest = {
        id: 'test-plugin',
        name: 'Test Plugin',
        version: '1.0.0',
        description: 'A test plugin',
        author: { name: 'Test Author' },
        main: 'index.js',
        type: 'ui',
        engine: { ultracontrol: '1.0.0' },
        permissions: ['ui:render'],
        capabilities: ['ui-extension']
      };
      
      const validation = await validator.validateManifest(validManifest);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      
      // Test invalid manifest
      const invalidManifest = {
        id: 'test plugin', // Invalid ID format
        name: 'Test',
        version: 'invalid-version'
      };
      
      const invalidValidation = await validator.validateManifest(invalidManifest);
      expect(invalidValidation.valid).toBe(false);
      expect(invalidValidation.errors.length).toBeGreaterThan(0);
    });

    it('should enforce security in plugin sandbox', async () => {
      const { PluginValidator } = await import('@/lib/plugins/loader/PluginValidator');
      
      const validator = new PluginValidator();
      
      const dangerousCode = `
        eval('malicious code');
        require('child_process').exec('rm -rf /');
        process.env.SECRET_KEY;
      `;
      
      const manifest = {
        id: 'dangerous-plugin',
        name: 'Dangerous Plugin',
        version: '1.0.0',
        permissions: [] // No permissions granted
      } as any;
      
      const securityCheck = await validator.checkSecurity(dangerousCode, manifest);
      
      expect(securityCheck.safe).toBe(false);
      expect(securityCheck.issues).toContainEqual(
        expect.objectContaining({
          severity: 'critical',
          message: expect.stringContaining('eval')
        })
      );
    });

    it('should manage template variables correctly', async () => {
      const { TemplateManager } = await import('@/lib/community/TemplateManager');
      
      const manager = new TemplateManager();
      
      // Create a template with variables
      const template = await manager.createTemplate({
        sourcePath: '/mock/project',
        name: 'Test Template',
        description: 'Template with variables',
        category: 'web-app',
        variables: [
          {
            name: 'projectName',
            description: 'Project name',
            type: 'string',
            required: true,
            validation: '^[a-zA-Z0-9-_]+$'
          },
          {
            name: 'useTypeScript',
            description: 'Use TypeScript',
            type: 'boolean',
            default: true
          }
        ]
      });
      
      expect(template.configuration?.variables).toHaveLength(2);
      
      // Test variable validation
      await expect(
        manager.applyTemplate(template.id, {
          targetPath: '/target',
          variables: {
            projectName: 'my-app',
            useTypeScript: true
          }
        })
      ).resolves.not.toThrow();
      
      // Test missing required variable
      await expect(
        manager.applyTemplate(template.id, {
          targetPath: '/target',
          variables: {
            useTypeScript: true
            // Missing projectName
          }
        })
      ).rejects.toThrow('Required variable');
    });
  });

  describe('Cross-Phase Integration', () => {
    it('should integrate LLM suggestions with UI components', async () => {
      const { LLMManager } = await import('@/lib/llm/manager');
      const { ContextManager } = await import('@/lib/llm/context');
      
      const llmManager = new LLMManager({
        providers: {
          anthropic: {
            apiKey: 'test-key',
            defaultModel: 'claude-sonnet-4-20250514'
          }
        }
      });
      
      const contextManager = new ContextManager({
        maxTokens: 100000,
        model: 'claude-sonnet-4-20250514'
      });
      
      const mockProjectContext = {
        files: [
          {
            path: '/src/App.tsx',
            language: 'typescript',
            lastModified: new Date()
          }
        ],
        dependencies: ['react'],
        recentErrors: [],
        activeAgents: [],
        completedTasks: []
      };
      
      const { container } = render(
        <IntelligentAssistant
          llmManager={llmManager}
          contextManager={contextManager}
          maxSuggestions={3}
          autoRefresh={false}
        />
      );
      
      expect(container.querySelector('.intelligent-assistant')).toBeTruthy();
      expect(container.textContent).toContain('AI Assistant');
    });
  });
});