/**
 * Agent Orchestrator for UltraControl
 * 
 * Coordinates multiple agents to execute complex tasks efficiently
 */

import type {
  AgentIdentity,
  RequestMessage,
  CommandMessage,
  QueryMessage,
  EventMessage,
  AgentMessage,
  Priority
} from '@/lib/protocols/types';
import { AgentMessageHandler } from '@/lib/protocols/handler';
import { AgentMessageRouter } from '@/lib/protocols/router';
import { generateId } from '@/lib/utils/id';
import { createScopedLogger } from '@/lib/utils/logger';
import type { Task, TaskDecomposer } from './TaskDecomposer';
import { DefaultTaskDecomposer } from './TaskDecomposer';
import type { AgentSelector } from './AgentSelector';
import { OptimalAgentSelector } from './AgentSelector';

const logger = createScopedLogger('AgentOrchestrator');

export interface OrchestratorConfig {
  taskDecomposer?: TaskDecomposer;
  agentSelector?: AgentSelector;
  maxConcurrentTasks?: number;
  taskTimeout?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
  dependencies: TaskDependency[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  results?: Map<string, any>;
  errors?: Map<string, Error>;
}

export interface TaskDependency {
  taskId: string;
  dependsOn: string[];
}

export interface TaskExecution {
  task: Task;
  agent: AgentIdentity;
  requestId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  result?: any;
  error?: Error;
}

export class AgentOrchestrator extends AgentMessageHandler {
  private taskDecomposer: TaskDecomposer;
  private agentSelector: AgentSelector;
  private maxConcurrentTasks: number;
  private taskTimeout: number;
  
  private activeWorkflows: Map<string, Workflow> = new Map();
  private taskExecutions: Map<string, TaskExecution> = new Map();
  private pendingResponses: Map<string, (response: any) => void> = new Map();
  
  constructor(config: OrchestratorConfig, router: AgentMessageRouter) {
    const identity: AgentIdentity = {
      id: `orchestrator-${generateId()}`,
      type: 'coordinator',
      provider: 'ultracontrol',
      capabilities: [
        'orchestrate',
        'delegate',
        'monitor',
        'workflow',
        'task-decomposition',
        'agent-selection'
      ],
      status: 'idle',
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        lastActive: new Date().toISOString()
      }
    };

    super(identity, router);
    
    this.taskDecomposer = config.taskDecomposer || new DefaultTaskDecomposer();
    this.agentSelector = config.agentSelector || new OptimalAgentSelector();
    this.maxConcurrentTasks = config.maxConcurrentTasks || 5;
    this.taskTimeout = config.taskTimeout || 300000; // 5 minutes default
    
    this.initialize();
  }
  
  private initialize(): void {
    logger.info('Agent Orchestrator initialized');
    this.updateStatus('idle');
    this.startMonitoring();
  }
  
  protected async handleRequest(message: RequestMessage): Promise<void> {
    const { action, params } = message.payload;
    
    try {
      let result: any;
      
      switch (action) {
        case 'orchestrate':
          result = await this.orchestrateWorkflow(params);
          break;
          
        case 'execute-task':
          result = await this.executeTask(params.task, params.context);
          break;
          
        case 'delegate':
          result = await this.delegateTask(params);
          break;
          
        case 'monitor':
          result = await this.monitorAgents(params);
          break;
          
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      await this.sendResponse(message, result);
    } catch (error) {
      logger.error(`Failed to handle request ${action}:`, error);
      await this.sendResponse(message, null, error as Error);
    }
  }
  
  protected async handleCommand(message: CommandMessage): Promise<void> {
    const { command, args } = message.payload;
    
    switch (command) {
      case 'cancel-workflow':
        await this.cancelWorkflow(args[0]);
        break;
        
      case 'pause-workflow':
        await this.pauseWorkflow(args[0]);
        break;
        
      case 'resume-workflow':
        await this.resumeWorkflow(args[0]);
        break;
        
      default:
        logger.warn(`Unknown command: ${command}`);
    }
  }
  
  protected async handleQuery(message: QueryMessage): Promise<void> {
    const { query } = message.payload;
    
    try {
      let result: any;
      
      switch (query) {
        case 'workflows':
          result = await this.getWorkflows(message.payload.filters);
          break;
          
        case 'workflow-status':
          result = await this.getWorkflowStatus(message.payload.filters?.workflowId);
          break;
          
        case 'agent-load':
          result = await this.getAgentLoad();
          break;
          
        default:
          throw new Error(`Unknown query: ${query}`);
      }
      
      await this.sendResponse(message as any, result);
    } catch (error) {
      await this.sendResponse(message as any, null, error as Error);
    }
  }
  
  protected async handleEvent(message: EventMessage): Promise<void> {
    logger.debug('Received event:', message.payload.eventType);
    
    // Handle agent status changes
    if (message.payload.eventType === 'agent:status:changed') {
      await this.handleAgentStatusChange(message.payload.data);
    }
  }
  
  protected async handleResponse(message: any): Promise<void> {
    const resolver = this.pendingResponses.get(message.correlationId);
    if (resolver) {
      resolver(message.payload);
      this.pendingResponses.delete(message.correlationId);
      
      // Update task execution status
      const execution = this.taskExecutions.get(message.correlationId);
      if (execution) {
        execution.status = message.payload.success ? 'completed' : 'failed';
        execution.completedAt = new Date().toISOString();
        execution.result = message.payload.result;
        execution.error = message.payload.error;
        
        await this.updateWorkflowProgress(execution);
      }
    }
  }
  
  /**
   * Orchestrate a complex workflow
   */
  private async orchestrateWorkflow(params: any): Promise<Workflow> {
    const workflowId = generateId();
    
    // Decompose the task into subtasks
    const tasks = await this.taskDecomposer.decompose(params.task, params.context);
    
    // Create workflow
    const workflow: Workflow = {
      id: workflowId,
      name: params.name || 'Unnamed Workflow',
      description: params.task,
      tasks,
      dependencies: this.extractDependencies(tasks),
      status: 'pending',
      results: new Map(),
      errors: new Map()
    };
    
    this.activeWorkflows.set(workflowId, workflow);
    
    // Start workflow execution
    this.updateStatus('busy');
    workflow.status = 'running';
    workflow.startedAt = new Date().toISOString();
    
    // Execute workflow
    await this.executeWorkflow(workflow);
    
    return workflow;
  }
  
  /**
   * Execute a workflow
   */
  private async executeWorkflow(workflow: Workflow): Promise<void> {
    try {
      // Get ready tasks (no pending dependencies)
      const readyTasks = this.getReadyTasks(workflow);
      
      // Execute tasks in parallel (up to max concurrent)
      const executing = new Map<string, Promise<void>>();
      
      for (const task of readyTasks) {
        if (executing.size >= this.maxConcurrentTasks) {
          // Wait for one to complete
          await Promise.race(executing.values());
        }
        
        const promise = this.executeWorkflowTask(workflow, task);
        executing.set(task.id, promise);
        
        // Remove from executing when done
        promise.finally(() => executing.delete(task.id));
      }
      
      // Wait for all tasks to complete
      await Promise.all(executing.values());
      
      // Check if workflow is complete
      if (this.isWorkflowComplete(workflow)) {
        workflow.status = 'completed';
        workflow.completedAt = new Date().toISOString();
        await this.sendWorkflowCompleteEvent(workflow);
      } else if (this.hasFailedTasks(workflow)) {
        workflow.status = 'failed';
        workflow.completedAt = new Date().toISOString();
        await this.sendWorkflowFailedEvent(workflow);
      } else {
        // Continue with next batch of tasks
        await this.executeWorkflow(workflow);
      }
    } catch (error) {
      logger.error(`Workflow ${workflow.id} execution failed:`, error);
      workflow.status = 'failed';
      workflow.completedAt = new Date().toISOString();
      await this.sendWorkflowFailedEvent(workflow);
    } finally {
      this.updateStatus('idle');
    }
  }
  
  /**
   * Execute a single task within a workflow
   */
  private async executeWorkflowTask(workflow: Workflow, task: Task): Promise<void> {
    try {
      // Select the best agent for this task
      const availableAgents = this.router.findAgentsByType('executor');
      const selectedAgent = await this.agentSelector.selectAgent(task, availableAgents);
      
      if (!selectedAgent) {
        throw new Error(`No suitable agent found for task ${task.id}`);
      }
      
      // Create task execution record
      const requestId = generateId();
      const execution: TaskExecution = {
        task,
        agent: selectedAgent,
        requestId,
        status: 'pending',
        startedAt: new Date().toISOString()
      };
      
      this.taskExecutions.set(requestId, execution);
      
      // Send task to agent
      const response = await this.sendTaskToAgent(selectedAgent, task, requestId);
      
      // Store result
      if (response.success) {
        workflow.results?.set(task.id, response.result);
      } else {
        workflow.errors?.set(task.id, new Error(response.error?.message || 'Unknown error'));
      }
    } catch (error) {
      logger.error(`Failed to execute task ${task.id}:`, error);
      workflow.errors?.set(task.id, error as Error);
    }
  }
  
  /**
   * Execute a standalone task
   */
  private async executeTask(task: string, context?: any): Promise<any> {
    // Decompose the task
    const tasks = await this.taskDecomposer.decompose(task, context);
    
    if (tasks.length === 0) {
      throw new Error('No tasks generated from input');
    }
    
    // For simple case, execute the first task
    if (tasks.length === 1) {
      const availableAgents = this.router.findAgentsByType('executor');
      const selectedAgent = await this.agentSelector.selectAgent(tasks[0], availableAgents);
      
      if (!selectedAgent) {
        throw new Error('No suitable agent found for task');
      }
      
      const response = await this.sendTaskToAgent(selectedAgent, tasks[0], generateId());
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Task execution failed');
      }
      
      return response.result;
    }
    
    // For complex tasks, create a workflow
    const workflow = await this.orchestrateWorkflow({ task, context });
    
    // Wait for completion
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const wf = this.activeWorkflows.get(workflow.id);
        if (wf?.status === 'completed') {
          clearInterval(checkInterval);
          resolve(Array.from(wf.results?.values() || []));
        } else if (wf?.status === 'failed') {
          clearInterval(checkInterval);
          reject(new Error('Workflow failed'));
        }
      }, 1000);
    });
  }
  
  /**
   * Send a task to an agent
   */
  private async sendTaskToAgent(agent: AgentIdentity, task: Task, requestId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(requestId);
        reject(new Error('Task execution timeout'));
      }, this.taskTimeout);
      
      this.pendingResponses.set(requestId, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });
      
      const request: RequestMessage = {
        id: requestId,
        timestamp: new Date().toISOString(),
        version: '1.0',
        from: this.identity,
        to: agent,
        type: 'request',
        payload: {
          action: task.action,
          params: task.params,
          timeout: this.taskTimeout
        },
        priority: task.priority as Priority
      };
      
      this.router.routeMessage(request).catch(error => {
        clearTimeout(timeout);
        this.pendingResponses.delete(requestId);
        reject(error);
      });
    });
  }
  
  /**
   * Delegate a task to the best available agent
   */
  private async delegateTask(params: any): Promise<any> {
    const { task, candidates, strategy = 'best-fit' } = params;
    
    let selectedAgent: AgentIdentity | null = null;
    
    switch (strategy) {
      case 'round-robin':
        selectedAgent = this.selectRoundRobin(candidates);
        break;
        
      case 'least-busy':
        selectedAgent = await this.selectLeastBusy(candidates);
        break;
        
      case 'best-fit':
      default:
        selectedAgent = await this.agentSelector.selectAgent(task, candidates);
        break;
    }
    
    if (!selectedAgent) {
      throw new Error('No suitable agent available');
    }
    
    return this.sendTaskToAgent(selectedAgent, task, generateId());
  }
  
  /**
   * Monitor agent health and performance
   */
  private async monitorAgents(params: any): Promise<any> {
    const { agents = [], metrics = ['status', 'load', 'performance'] } = params;
    
    const results: Record<string, any> = {};
    
    for (const agentId of agents) {
      const agent = this.router.getAgents().find(a => a.id === agentId);
      if (agent) {
        results[agentId] = {
          status: agent.status,
          lastActive: agent.metadata.lastActive,
          // Additional metrics would be collected here
        };
      }
    }
    
    return results;
  }
  
  /**
   * Helper methods
   */
  
  private extractDependencies(tasks: Task[]): TaskDependency[] {
    const dependencies: TaskDependency[] = [];
    
    for (const task of tasks) {
      if (task.dependencies && task.dependencies.length > 0) {
        dependencies.push({
          taskId: task.id,
          dependsOn: task.dependencies
        });
      }
    }
    
    return dependencies;
  }
  
  private getReadyTasks(workflow: Workflow): Task[] {
    const completedTasks = new Set(workflow.results?.keys() || []);
    const failedTasks = new Set(workflow.errors?.keys() || []);
    const executingTasks = new Set(
      Array.from(this.taskExecutions.values())
        .filter(e => e.status === 'running')
        .map(e => e.task.id)
    );
    
    return workflow.tasks.filter(task => {
      // Skip if already processed or executing
      if (completedTasks.has(task.id) || failedTasks.has(task.id) || executingTasks.has(task.id)) {
        return false;
      }
      
      // Check dependencies
      const dependency = workflow.dependencies.find(d => d.taskId === task.id);
      if (dependency) {
        return dependency.dependsOn.every(depId => completedTasks.has(depId));
      }
      
      return true;
    });
  }
  
  private isWorkflowComplete(workflow: Workflow): boolean {
    const completedTasks = workflow.results?.size || 0;
    const failedTasks = workflow.errors?.size || 0;
    return completedTasks + failedTasks === workflow.tasks.length;
  }
  
  private hasFailedTasks(workflow: Workflow): boolean {
    return (workflow.errors?.size || 0) > 0;
  }
  
  private async updateWorkflowProgress(execution: TaskExecution): Promise<void> {
    // Find the workflow containing this task
    for (const [workflowId, workflow] of this.activeWorkflows) {
      const task = workflow.tasks.find(t => t.id === execution.task.id);
      if (task) {
        await this.sendEvent('workflow:task:completed', {
          workflowId,
          taskId: task.id,
          status: execution.status,
          result: execution.result,
          error: execution.error
        });
        break;
      }
    }
  }
  
  private async sendWorkflowCompleteEvent(workflow: Workflow): Promise<void> {
    await this.sendEvent('workflow:completed', {
      workflowId: workflow.id,
      results: Array.from(workflow.results?.entries() || []),
      duration: new Date().getTime() - new Date(workflow.startedAt!).getTime()
    });
  }
  
  private async sendWorkflowFailedEvent(workflow: Workflow): Promise<void> {
    await this.sendEvent('workflow:failed', {
      workflowId: workflow.id,
      errors: Array.from(workflow.errors?.entries() || []).map(([taskId, error]) => ({
        taskId,
        error: error.message
      }))
    });
  }
  
  private selectRoundRobin(candidates: AgentIdentity[]): AgentIdentity | null {
    if (candidates.length === 0) return null;
    
    // Simple round-robin selection
    const index = Math.floor(Math.random() * candidates.length);
    return candidates[index];
  }
  
  private async selectLeastBusy(candidates: AgentIdentity[]): Promise<AgentIdentity | null> {
    if (candidates.length === 0) return null;
    
    // Select agent with 'idle' status
    const idleAgents = candidates.filter(a => a.status === 'idle');
    if (idleAgents.length > 0) {
      return idleAgents[0];
    }
    
    // Otherwise return first available
    return candidates[0];
  }
  
  private async handleAgentStatusChange(data: any): Promise<void> {
    // Handle agent going offline during task execution
    const affectedExecutions = Array.from(this.taskExecutions.values())
      .filter(e => e.agent.id === data.agentId && e.status === 'running');
    
    for (const execution of affectedExecutions) {
      if (data.status === 'offline' || data.status === 'error') {
        // Mark as failed and retry
        execution.status = 'failed';
        execution.error = new Error(`Agent ${data.agentId} became unavailable`);
        
        // Find workflow and retry task
        for (const workflow of this.activeWorkflows.values()) {
          if (workflow.tasks.find(t => t.id === execution.task.id)) {
            workflow.errors?.set(execution.task.id, execution.error);
            // Task will be retried in next workflow execution cycle
          }
        }
      }
    }
  }
  
  private async getWorkflows(filters?: any): Promise<Workflow[]> {
    const workflows = Array.from(this.activeWorkflows.values());
    
    if (!filters) return workflows;
    
    return workflows.filter(wf => {
      if (filters.status && wf.status !== filters.status) return false;
      if (filters.name && !wf.name.includes(filters.name)) return false;
      return true;
    });
  }
  
  private async getWorkflowStatus(workflowId: string): Promise<any> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    
    const taskStatuses = workflow.tasks.map(task => {
      const execution = Array.from(this.taskExecutions.values())
        .find(e => e.task.id === task.id);
      
      return {
        taskId: task.id,
        name: task.name,
        status: execution?.status || 'pending',
        result: workflow.results?.get(task.id),
        error: workflow.errors?.get(task.id)?.message
      };
    });
    
    return {
      workflowId: workflow.id,
      name: workflow.name,
      status: workflow.status,
      progress: {
        total: workflow.tasks.length,
        completed: workflow.results?.size || 0,
        failed: workflow.errors?.size || 0
      },
      tasks: taskStatuses
    };
  }
  
  private async getAgentLoad(): Promise<any> {
    const agents = this.router.getAgents();
    const load: Record<string, any> = {};
    
    for (const agent of agents) {
      const executingTasks = Array.from(this.taskExecutions.values())
        .filter(e => e.agent.id === agent.id && e.status === 'running');
      
      load[agent.id] = {
        status: agent.status,
        type: agent.type,
        activeTasks: executingTasks.length,
        capabilities: agent.capabilities
      };
    }
    
    return load;
  }
  
  private async cancelWorkflow(workflowId: string): Promise<void> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      workflow.status = 'failed';
      workflow.completedAt = new Date().toISOString();
      
      // Cancel all pending tasks
      const executions = Array.from(this.taskExecutions.values())
        .filter(e => workflow.tasks.find(t => t.id === e.task.id));
      
      for (const execution of executions) {
        if (execution.status === 'running' || execution.status === 'pending') {
          execution.status = 'failed';
          execution.error = new Error('Workflow cancelled');
        }
      }
      
      await this.sendEvent('workflow:cancelled', { workflowId });
    }
  }
  
  private async pauseWorkflow(workflowId: string): Promise<void> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow && workflow.status === 'running') {
      workflow.status = 'pending';
      await this.sendEvent('workflow:paused', { workflowId });
    }
  }
  
  private async resumeWorkflow(workflowId: string): Promise<void> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow && workflow.status === 'pending') {
      workflow.status = 'running';
      await this.sendEvent('workflow:resumed', { workflowId });
      
      // Resume execution
      this.executeWorkflow(workflow);
    }
  }
  
  private startMonitoring(): void {
    // Periodic cleanup of completed workflows
    setInterval(() => {
      const now = Date.now();
      const retentionTime = 3600000; // 1 hour
      
      for (const [id, workflow] of this.activeWorkflows) {
        if (workflow.completedAt) {
          const age = now - new Date(workflow.completedAt).getTime();
          if (age > retentionTime) {
            this.activeWorkflows.delete(id);
          }
        }
      }
      
      // Clean up old task executions
      for (const [id, execution] of this.taskExecutions) {
        if (execution.completedAt) {
          const age = now - new Date(execution.completedAt).getTime();
          if (age > retentionTime) {
            this.taskExecutions.delete(id);
          }
        }
      }
    }, 60000); // Every minute
  }
}