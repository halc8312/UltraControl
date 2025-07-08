/**
 * Task Decomposer for UltraControl
 * 
 * Breaks down complex tasks into executable subtasks
 */

import { generateId } from '@/lib/utils/id';
import { createScopedLogger } from '@/lib/utils/logger';
import type { LLMManager } from '@/lib/llm/manager';

const logger = createScopedLogger('TaskDecomposer');

export interface Task {
  id: string;
  name: string;
  description: string;
  action: string;
  params: Record<string, any>;
  type: 'frontend' | 'backend' | 'database' | 'system' | 'general';
  complexity: 'simple' | 'moderate' | 'complex';
  priority?: 'low' | 'normal' | 'high' | 'critical';
  dependencies?: string[];
  estimatedDuration?: number;
  requiredCapabilities?: string[];
}

export interface TaskContext {
  projectType?: string;
  technologies?: string[];
  existingCode?: boolean;
  constraints?: Record<string, any>;
  preferences?: Record<string, any>;
}

export interface TaskDecomposer {
  decompose(taskDescription: string, context?: TaskContext): Promise<Task[]>;
}

export class DefaultTaskDecomposer implements TaskDecomposer {
  async decompose(taskDescription: string, context?: TaskContext): Promise<Task[]> {
    logger.info(`Decomposing task: ${taskDescription}`);
    
    // Analyze task complexity
    const complexity = this.analyzeComplexity(taskDescription);
    
    // Identify task type
    const taskType = this.identifyTaskType(taskDescription, context);
    
    // Generate subtasks based on patterns
    const tasks = this.generateSubtasks(taskDescription, taskType, complexity, context);
    
    // Establish dependencies
    this.establishDependencies(tasks);
    
    return tasks;
  }
  
  private analyzeComplexity(description: string): 'simple' | 'moderate' | 'complex' {
    const keywords = description.toLowerCase().split(/\s+/);
    
    // Complex indicators
    const complexIndicators = [
      'full-stack', 'fullstack', 'authentication', 'database', 'api',
      'microservice', 'deployment', 'integration', 'migrate', 'refactor',
      'architecture', 'scalable', 'distributed', 'real-time', 'realtime'
    ];
    
    // Simple indicators
    const simpleIndicators = [
      'fix', 'update', 'change', 'add', 'remove', 'rename', 'move',
      'style', 'color', 'text', 'typo', 'comment'
    ];
    
    const complexCount = keywords.filter(k => 
      complexIndicators.some(ind => k.includes(ind))
    ).length;
    
    const simpleCount = keywords.filter(k => 
      simpleIndicators.some(ind => k.includes(ind))
    ).length;
    
    if (complexCount >= 2 || description.length > 200) {
      return 'complex';
    } else if (simpleCount >= 2 || description.length < 50) {
      return 'simple';
    }
    
    return 'moderate';
  }
  
  private identifyTaskType(
    description: string, 
    context?: TaskContext
  ): 'frontend' | 'backend' | 'database' | 'system' | 'general' {
    const lower = description.toLowerCase();
    
    // Check context first
    if (context?.projectType) {
      if (['react', 'vue', 'angular', 'svelte'].includes(context.projectType.toLowerCase())) {
        return 'frontend';
      }
      if (['node', 'python', 'java', 'go'].includes(context.projectType.toLowerCase())) {
        return 'backend';
      }
    }
    
    // Frontend indicators
    if (/\b(ui|ux|frontend|front-end|react|vue|angular|component|page|view|style|css|design)\b/.test(lower)) {
      return 'frontend';
    }
    
    // Database indicators
    if (/\b(database|db|sql|postgres|mysql|mongodb|schema|migration|query)\b/.test(lower)) {
      return 'database';
    }
    
    // Backend indicators
    if (/\b(api|backend|back-end|server|endpoint|route|auth|jwt|rest|graphql)\b/.test(lower)) {
      return 'backend';
    }
    
    // System indicators
    if (/\b(docker|deploy|ci|cd|kubernetes|nginx|server|linux|bash)\b/.test(lower)) {
      return 'system';
    }
    
    return 'general';
  }
  
  private generateSubtasks(
    description: string,
    taskType: string,
    complexity: string,
    context?: TaskContext
  ): Task[] {
    const tasks: Task[] = [];
    
    switch (taskType) {
      case 'frontend':
        tasks.push(...this.generateFrontendTasks(description, complexity, context));
        break;
        
      case 'backend':
        tasks.push(...this.generateBackendTasks(description, complexity, context));
        break;
        
      case 'database':
        tasks.push(...this.generateDatabaseTasks(description, complexity, context));
        break;
        
      case 'system':
        tasks.push(...this.generateSystemTasks(description, complexity, context));
        break;
        
      default:
        tasks.push(...this.generateGeneralTasks(description, complexity, context));
    }
    
    return tasks;
  }
  
  private generateFrontendTasks(
    description: string,
    complexity: string,
    context?: TaskContext
  ): Task[] {
    const tasks: Task[] = [];
    const lower = description.toLowerCase();
    
    // Component creation pattern
    if (lower.includes('component') || lower.includes('create') || lower.includes('build')) {
      tasks.push({
        id: generateId(),
        name: 'Create Component Structure',
        description: 'Set up the component file structure and boilerplate',
        action: 'write',
        params: {
          write: {
            path: 'src/components/NewComponent.tsx',
            content: '// Component implementation'
          }
        },
        type: 'frontend',
        complexity: 'simple',
        priority: 'high',
        estimatedDuration: 300000,
        requiredCapabilities: ['file:write', 'webcontainer']
      });
      
      if (complexity !== 'simple') {
        tasks.push({
          id: generateId(),
          name: 'Add Component Styles',
          description: 'Create and apply component styling',
          action: 'write',
          params: {
            write: {
              path: 'src/components/NewComponent.css',
              content: '/* Component styles */'
            }
          },
          type: 'frontend',
          complexity: 'simple',
          priority: 'normal',
          estimatedDuration: 180000,
          requiredCapabilities: ['file:write']
        });
        
        tasks.push({
          id: generateId(),
          name: 'Add Component Tests',
          description: 'Create unit tests for the component',
          action: 'write',
          params: {
            write: {
              path: 'src/components/__tests__/NewComponent.test.tsx',
              content: '// Component tests'
            }
          },
          type: 'frontend',
          complexity: 'moderate',
          priority: 'normal',
          estimatedDuration: 600000,
          requiredCapabilities: ['file:write', 'execute']
        });
      }
    }
    
    // Authentication UI pattern
    if (lower.includes('auth') || lower.includes('login') || lower.includes('signup')) {
      tasks.push({
        id: generateId(),
        name: 'Create Authentication Forms',
        description: 'Build login and signup forms',
        action: 'write',
        params: {
          write: {
            path: 'src/components/auth/AuthForms.tsx',
            content: '// Auth forms implementation'
          }
        },
        type: 'frontend',
        complexity: 'moderate',
        priority: 'high',
        estimatedDuration: 900000,
        requiredCapabilities: ['file:write', 'webcontainer']
      });
      
      tasks.push({
        id: generateId(),
        name: 'Add Form Validation',
        description: 'Implement client-side form validation',
        action: 'write',
        params: {
          write: {
            path: 'src/utils/validation.ts',
            content: '// Validation logic'
          }
        },
        type: 'frontend',
        complexity: 'moderate',
        priority: 'high',
        estimatedDuration: 600000,
        requiredCapabilities: ['file:write']
      });
    }
    
    // Styling updates
    if (lower.includes('style') || lower.includes('css') || lower.includes('design')) {
      tasks.push({
        id: generateId(),
        name: 'Update Styles',
        description: 'Modify CSS/styling as requested',
        action: 'write',
        params: {
          write: {
            path: 'src/styles/main.css',
            content: '/* Updated styles */'
          }
        },
        type: 'frontend',
        complexity: 'simple',
        priority: 'normal',
        estimatedDuration: 300000,
        requiredCapabilities: ['file:write', 'preview']
      });
    }
    
    return tasks;
  }
  
  private generateBackendTasks(
    description: string,
    complexity: string,
    context?: TaskContext
  ): Task[] {
    const tasks: Task[] = [];
    const lower = description.toLowerCase();
    
    // API endpoint pattern
    if (lower.includes('api') || lower.includes('endpoint') || lower.includes('route')) {
      tasks.push({
        id: generateId(),
        name: 'Create API Endpoint',
        description: 'Implement the API endpoint handler',
        action: 'write',
        params: {
          write: {
            path: 'src/api/routes/new-route.ts',
            content: '// API endpoint implementation'
          }
        },
        type: 'backend',
        complexity: 'moderate',
        priority: 'high',
        estimatedDuration: 600000,
        requiredCapabilities: ['file:write', 'execute']
      });
      
      if (complexity !== 'simple') {
        tasks.push({
          id: generateId(),
          name: 'Add Input Validation',
          description: 'Implement request validation middleware',
          action: 'write',
          params: {
            write: {
              path: 'src/api/middleware/validation.ts',
              content: '// Validation middleware'
            }
          },
          type: 'backend',
          complexity: 'moderate',
          priority: 'high',
          estimatedDuration: 300000,
          requiredCapabilities: ['file:write']
        });
        
        tasks.push({
          id: generateId(),
          name: 'Add API Tests',
          description: 'Create integration tests for the API',
          action: 'write',
          params: {
            write: {
              path: 'src/api/__tests__/new-route.test.ts',
              content: '// API tests'
            }
          },
          type: 'backend',
          complexity: 'moderate',
          priority: 'normal',
          estimatedDuration: 900000,
          requiredCapabilities: ['file:write', 'execute']
        });
      }
    }
    
    // Authentication backend pattern
    if (lower.includes('auth') || lower.includes('jwt') || lower.includes('session')) {
      tasks.push({
        id: generateId(),
        name: 'Implement Authentication Logic',
        description: 'Create authentication service and middleware',
        action: 'write',
        params: {
          write: {
            path: 'src/services/auth.service.ts',
            content: '// Auth service implementation'
          }
        },
        type: 'backend',
        complexity: 'complex',
        priority: 'critical',
        estimatedDuration: 1200000,
        requiredCapabilities: ['file:write', 'execute']
      });
      
      tasks.push({
        id: generateId(),
        name: 'Create Auth Middleware',
        description: 'Implement JWT verification middleware',
        action: 'write',
        params: {
          write: {
            path: 'src/middleware/auth.ts',
            content: '// Auth middleware'
          }
        },
        type: 'backend',
        complexity: 'moderate',
        priority: 'high',
        estimatedDuration: 600000,
        requiredCapabilities: ['file:write']
      });
    }
    
    return tasks;
  }
  
  private generateDatabaseTasks(
    description: string,
    complexity: string,
    context?: TaskContext
  ): Task[] {
    const tasks: Task[] = [];
    const lower = description.toLowerCase();
    
    // Schema/Model pattern
    if (lower.includes('schema') || lower.includes('model') || lower.includes('table')) {
      tasks.push({
        id: generateId(),
        name: 'Create Database Schema',
        description: 'Define database schema or model',
        action: 'write',
        params: {
          write: {
            path: 'src/models/new-model.ts',
            content: '// Model definition'
          }
        },
        type: 'database',
        complexity: 'moderate',
        priority: 'high',
        estimatedDuration: 600000,
        requiredCapabilities: ['file:write']
      });
      
      tasks.push({
        id: generateId(),
        name: 'Create Migration',
        description: 'Generate database migration file',
        action: 'write',
        params: {
          write: {
            path: 'migrations/001_create_table.sql',
            content: '-- Migration SQL'
          }
        },
        type: 'database',
        complexity: 'simple',
        priority: 'high',
        estimatedDuration: 300000,
        requiredCapabilities: ['file:write']
      });
    }
    
    // Query optimization pattern
    if (lower.includes('query') || lower.includes('optimize') || lower.includes('index')) {
      tasks.push({
        id: generateId(),
        name: 'Optimize Database Queries',
        description: 'Analyze and optimize database queries',
        action: 'execute',
        params: {
          execute: {
            command: 'npm run db:analyze',
            cwd: './'
          }
        },
        type: 'database',
        complexity: 'complex',
        priority: 'normal',
        estimatedDuration: 900000,
        requiredCapabilities: ['execute', 'database']
      });
    }
    
    return tasks;
  }
  
  private generateSystemTasks(
    description: string,
    complexity: string,
    context?: TaskContext
  ): Task[] {
    const tasks: Task[] = [];
    const lower = description.toLowerCase();
    
    // Docker pattern
    if (lower.includes('docker') || lower.includes('container')) {
      tasks.push({
        id: generateId(),
        name: 'Create Dockerfile',
        description: 'Set up Docker configuration',
        action: 'write',
        params: {
          write: {
            path: 'Dockerfile',
            content: '# Dockerfile configuration'
          }
        },
        type: 'system',
        complexity: 'moderate',
        priority: 'normal',
        estimatedDuration: 600000,
        requiredCapabilities: ['file:write']
      });
      
      tasks.push({
        id: generateId(),
        name: 'Create Docker Compose',
        description: 'Set up docker-compose configuration',
        action: 'write',
        params: {
          write: {
            path: 'docker-compose.yml',
            content: '# Docker compose configuration'
          }
        },
        type: 'system',
        complexity: 'moderate',
        priority: 'normal',
        estimatedDuration: 600000,
        requiredCapabilities: ['file:write']
      });
    }
    
    // CI/CD pattern
    if (lower.includes('ci') || lower.includes('cd') || lower.includes('deploy')) {
      tasks.push({
        id: generateId(),
        name: 'Set up CI/CD Pipeline',
        description: 'Configure continuous integration and deployment',
        action: 'write',
        params: {
          write: {
            path: '.github/workflows/ci.yml',
            content: '# CI/CD configuration'
          }
        },
        type: 'system',
        complexity: 'complex',
        priority: 'normal',
        estimatedDuration: 1200000,
        requiredCapabilities: ['file:write']
      });
    }
    
    return tasks;
  }
  
  private generateGeneralTasks(
    description: string,
    complexity: string,
    context?: TaskContext
  ): Task[] {
    // For general tasks, create a single task that captures the intent
    return [{
      id: generateId(),
      name: 'Execute Task',
      description: description,
      action: 'execute',
      params: {
        task: description,
        context
      },
      type: 'general',
      complexity,
      priority: 'normal',
      estimatedDuration: complexity === 'simple' ? 300000 : 
                         complexity === 'moderate' ? 900000 : 1800000,
      requiredCapabilities: ['execute']
    }];
  }
  
  private establishDependencies(tasks: Task[]): void {
    // Establish logical dependencies based on task types and names
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      
      // Tests depend on implementation
      if (task.name.toLowerCase().includes('test')) {
        const implTask = tasks.find(t => 
          t.id !== task.id && 
          !t.name.toLowerCase().includes('test') &&
          t.type === task.type
        );
        if (implTask) {
          task.dependencies = [implTask.id];
        }
      }
      
      // Styles depend on component creation
      if (task.name.toLowerCase().includes('style')) {
        const componentTask = tasks.find(t => 
          t.id !== task.id && 
          t.name.toLowerCase().includes('component')
        );
        if (componentTask) {
          task.dependencies = [componentTask.id];
        }
      }
      
      // Migrations depend on schema
      if (task.name.toLowerCase().includes('migration')) {
        const schemaTask = tasks.find(t => 
          t.id !== task.id && 
          t.name.toLowerCase().includes('schema')
        );
        if (schemaTask) {
          task.dependencies = [schemaTask.id];
        }
      }
      
      // Docker compose depends on Dockerfile
      if (task.name.toLowerCase().includes('docker compose')) {
        const dockerfileTask = tasks.find(t => 
          t.id !== task.id && 
          t.name.toLowerCase().includes('dockerfile')
        );
        if (dockerfileTask) {
          task.dependencies = [dockerfileTask.id];
        }
      }
    }
  }
}

/**
 * AI-powered Task Decomposer that uses LLM for intelligent task breakdown
 */
export class AITaskDecomposer implements TaskDecomposer {
  constructor(private llmManager: LLMManager) {}
  
  async decompose(taskDescription: string, context?: TaskContext): Promise<Task[]> {
    const prompt = this.buildDecompositionPrompt(taskDescription, context);
    
    try {
      const response = await this.llmManager.complete({
        messages: [
          {
            role: 'system',
            content: 'You are a task decomposition expert. Break down complex tasks into specific, actionable subtasks. Return a JSON array of tasks.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        maxTokens: 2000
      });
      
      const tasks = JSON.parse(response.content);
      return this.validateAndEnrichTasks(tasks);
    } catch (error) {
      logger.error('AI decomposition failed, falling back to default:', error);
      // Fallback to default decomposer
      const defaultDecomposer = new DefaultTaskDecomposer();
      return defaultDecomposer.decompose(taskDescription, context);
    }
  }
  
  private buildDecompositionPrompt(taskDescription: string, context?: TaskContext): string {
    return `
Decompose the following task into specific, actionable subtasks:

Task: ${taskDescription}

Context:
- Project Type: ${context?.projectType || 'Not specified'}
- Technologies: ${context?.technologies?.join(', ') || 'Not specified'}
- Existing Code: ${context?.existingCode ? 'Yes' : 'No'}

Return a JSON array of task objects with the following structure:
{
  "id": "unique-id",
  "name": "Task Name",
  "description": "Detailed description",
  "action": "execute|write|read|delete",
  "params": { /* action-specific parameters */ },
  "type": "frontend|backend|database|system|general",
  "complexity": "simple|moderate|complex",
  "priority": "low|normal|high|critical",
  "dependencies": ["task-id-1", "task-id-2"],
  "estimatedDuration": 300000,
  "requiredCapabilities": ["capability1", "capability2"]
}

Focus on creating practical, executable tasks that can be performed by specialized agents.
`;
  }
  
  private validateAndEnrichTasks(tasks: any[]): Task[] {
    return tasks.map(task => ({
      id: task.id || generateId(),
      name: task.name || 'Unnamed Task',
      description: task.description || '',
      action: task.action || 'execute',
      params: task.params || {},
      type: task.type || 'general',
      complexity: task.complexity || 'moderate',
      priority: task.priority || 'normal',
      dependencies: task.dependencies || [],
      estimatedDuration: task.estimatedDuration || 600000,
      requiredCapabilities: task.requiredCapabilities || []
    }));
  }
}