/**
 * Agent Runtime Integration
 * 
 * Integrates agents with the runtime abstraction layer
 */

import type { AgentIdentity, RequestMessage } from '@/lib/protocols/types';
import { AgentMessageHandler } from '@/lib/protocols/handler';
import { AgentMessageRouter } from '@/lib/protocols/router';
import { RuntimeManager, RuntimeEnvironment, RuntimeType } from '@/lib/runtime';
import { BoltExecutorAgent } from './bolt/BoltExecutorAgent';
import { OpenHandsExecutorAgent } from './openhands/OpenHandsExecutorAgent';
import { generateId } from '@/lib/utils/id';
import { createScopedLogger } from '@/lib/utils/logger';
import type { WebContainer } from '@webcontainer/api';

const logger = createScopedLogger('AgentRuntimeIntegration');

export interface AgentRuntimeConfig {
  router: AgentMessageRouter;
  runtimeManager: RuntimeManager;
  webcontainerPromise?: Promise<WebContainer>;
  dockerConfig?: {
    image: string;
    memory?: number;
    cpu?: number;
  };
}

/**
 * Enhanced Bolt Executor with Runtime Integration
 */
export class IntegratedBoltExecutorAgent extends BoltExecutorAgent {
  private runtime?: RuntimeEnvironment;
  
  constructor(
    private runtimeManager: RuntimeManager,
    config: { webcontainerPromise: Promise<WebContainer> },
    router: AgentMessageRouter
  ) {
    super(config, router);
  }
  
  protected async initializeRuntime(): Promise<void> {
    try {
      // Create WebContainer runtime
      this.runtime = await this.runtimeManager.createRuntime(
        `bolt-runtime-${this.identity.id}`,
        {
          type: 'webcontainer',
          workDir: '/home/project'
        }
      );
      
      logger.info('Bolt runtime initialized');
    } catch (error) {
      logger.error('Failed to initialize Bolt runtime:', error);
      throw error;
    }
  }
  
  protected async handleRequest(message: RequestMessage): Promise<void> {
    // Ensure runtime is available
    if (!this.runtime) {
      await this.initializeRuntime();
    }
    
    const { action, params } = message.payload;
    
    try {
      let result: any;
      
      switch (action) {
        case 'execute':
          result = await this.executeWithRuntime(params.execute);
          break;
          
        case 'write':
          result = await this.writeFileWithRuntime(params.write);
          break;
          
        case 'read':
          result = await this.readFileWithRuntime(params.read);
          break;
          
        default:
          // Fallback to parent implementation
          return super.handleRequest(message);
      }
      
      await this.sendResponse(message, result);
    } catch (error) {
      logger.error(`Failed to handle request ${action}:`, error);
      await this.sendResponse(message, null, error as Error);
    }
  }
  
  private async executeWithRuntime(params: any): Promise<any> {
    if (!this.runtime) throw new Error('Runtime not initialized');
    
    const result = await this.runtime.execute(params.command, {
      cwd: params.cwd,
      env: params.env,
      timeout: params.timeout
    });
    
    return {
      processId: generateId(),
      exitCode: result.exitCode,
      output: result.stdout,
      errors: result.stderr,
      duration: result.duration
    };
  }
  
  private async writeFileWithRuntime(params: any): Promise<any> {
    if (!this.runtime) throw new Error('Runtime not initialized');
    
    await this.runtime.writeFile(params.path, params.content);
    
    return {
      path: params.path,
      size: new TextEncoder().encode(params.content).length,
      created: new Date().toISOString()
    };
  }
  
  private async readFileWithRuntime(params: any): Promise<any> {
    if (!this.runtime) throw new Error('Runtime not initialized');
    
    const content = await this.runtime.readFile(params.path);
    
    return {
      path: params.path,
      content,
      size: content.length,
      encoding: params.encoding || 'utf8'
    };
  }
  
  async shutdown(): Promise<void> {
    if (this.runtime) {
      await this.runtime.cleanup();
    }
    await super.shutdown();
  }
}

/**
 * Enhanced OpenHands Executor with Runtime Integration
 */
export class IntegratedOpenHandsExecutorAgent extends OpenHandsExecutorAgent {
  private runtime?: RuntimeEnvironment;
  
  constructor(
    private runtimeManager: RuntimeManager,
    private dockerConfig: {
      image: string;
      memory?: number;
      cpu?: number;
    },
    router: AgentMessageRouter
  ) {
    super({
      apiUrl: process.env.VITE_OPENHANDS_API_URL || 'http://localhost:8000',
      dockerImage: dockerConfig.image,
      memoryLimit: dockerConfig.memory ? `${dockerConfig.memory}m` : undefined,
      cpuLimit: dockerConfig.cpu ? `${dockerConfig.cpu}` : undefined
    }, router);
  }
  
  protected async initializeRuntime(): Promise<void> {
    try {
      // Create Docker runtime
      this.runtime = await this.runtimeManager.createRuntime(
        `openhands-runtime-${this.identity.id}`,
        {
          type: 'docker',
          workDir: '/workspace',
          limits: {
            memory: this.dockerConfig.memory,
            cpu: this.dockerConfig.cpu
          }
        }
      );
      
      logger.info('OpenHands runtime initialized');
    } catch (error) {
      logger.error('Failed to initialize OpenHands runtime:', error);
      throw error;
    }
  }
  
  protected async handleRequest(message: RequestMessage): Promise<void> {
    // Ensure runtime is available
    if (!this.runtime) {
      await this.initializeRuntime();
    }
    
    const { action, params } = message.payload;
    
    try {
      let result: any;
      
      switch (action) {
        case 'execute':
          result = await this.executeWithRuntime(params.execute);
          break;
          
        case 'write':
          result = await this.writeFileWithRuntime(params.write);
          break;
          
        case 'read':
          result = await this.readFileWithRuntime(params.read);
          break;
          
        case 'database':
          result = await this.executeDatabaseOperation(params.database);
          break;
          
        case 'docker':
          result = await this.executeDockerOperation(params.docker);
          break;
          
        default:
          // Fallback to parent implementation
          return super.handleRequest(message);
      }
      
      await this.sendResponse(message, result);
    } catch (error) {
      logger.error(`Failed to handle request ${action}:`, error);
      await this.sendResponse(message, null, error as Error);
    }
  }
  
  private async executeWithRuntime(params: any): Promise<any> {
    if (!this.runtime) throw new Error('Runtime not initialized');
    
    const result = await this.runtime.execute(params.command, {
      cwd: params.cwd,
      env: params.env,
      timeout: params.timeout
    });
    
    return {
      processId: generateId(),
      exitCode: result.exitCode,
      output: result.stdout,
      errors: result.stderr,
      duration: result.duration
    };
  }
  
  private async writeFileWithRuntime(params: any): Promise<any> {
    if (!this.runtime) throw new Error('Runtime not initialized');
    
    await this.runtime.writeFile(params.path, params.content);
    
    return {
      path: params.path,
      size: new TextEncoder().encode(params.content).length,
      created: new Date().toISOString()
    };
  }
  
  private async readFileWithRuntime(params: any): Promise<any> {
    if (!this.runtime) throw new Error('Runtime not initialized');
    
    const content = await this.runtime.readFile(params.path);
    
    return {
      path: params.path,
      content,
      size: content.length,
      encoding: params.encoding || 'utf8'
    };
  }
  
  private async executeDatabaseOperation(params: any): Promise<any> {
    if (!this.runtime) throw new Error('Runtime not initialized');
    
    // Check if runtime supports database operations
    if (!this.runtime.getCapabilities().supportsDatabase) {
      throw new Error('Current runtime does not support database operations');
    }
    
    // Execute database command
    const command = this.buildDatabaseCommand(params);
    const result = await this.runtime.execute(command);
    
    return {
      success: result.exitCode === 0,
      output: result.stdout,
      error: result.stderr
    };
  }
  
  private async executeDockerOperation(params: any): Promise<any> {
    if (!this.runtime) throw new Error('Runtime not initialized');
    
    // Check if runtime supports Docker operations
    if (!this.runtime.getCapabilities().supportsDocker) {
      throw new Error('Current runtime does not support Docker operations');
    }
    
    const command = `docker ${params.command}`;
    const result = await this.runtime.execute(command);
    
    return {
      success: result.exitCode === 0,
      output: result.stdout,
      error: result.stderr
    };
  }
  
  private buildDatabaseCommand(params: any): string {
    const { type, query, database, host = 'localhost', port, user, password } = params;
    
    switch (type) {
      case 'postgresql':
        return `PGPASSWORD=${password} psql -h ${host} -p ${port || 5432} -U ${user} -d ${database} -c "${query}"`;
        
      case 'mysql':
        return `mysql -h ${host} -P ${port || 3306} -u ${user} -p${password} ${database} -e "${query}"`;
        
      case 'mongodb':
        return `mongo --host ${host}:${port || 27017} -u ${user} -p ${password} ${database} --eval "${query}"`;
        
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }
  
  async shutdown(): Promise<void> {
    if (this.runtime) {
      await this.runtime.cleanup();
    }
    await super.shutdown();
  }
}

/**
 * Agent Runtime Setup Helper
 */
export class AgentRuntimeSetup {
  constructor(private config: AgentRuntimeConfig) {}
  
  async setupAgents(): Promise<{
    boltAgent: IntegratedBoltExecutorAgent;
    openHandsAgent: IntegratedOpenHandsExecutorAgent;
  }> {
    logger.info('Setting up integrated agents');
    
    // Create Bolt agent with WebContainer runtime
    let boltAgent: IntegratedBoltExecutorAgent | undefined;
    if (this.config.webcontainerPromise) {
      boltAgent = new IntegratedBoltExecutorAgent(
        this.config.runtimeManager,
        { webcontainerPromise: this.config.webcontainerPromise },
        this.config.router
      );
    }
    
    // Create OpenHands agent with Docker runtime
    const openHandsAgent = new IntegratedOpenHandsExecutorAgent(
      this.config.runtimeManager,
      this.config.dockerConfig || {
        image: 'ultracontrol/openhands:latest',
        memory: 2048,
        cpu: 2
      },
      this.config.router
    );
    
    // Initialize agents
    if (boltAgent) {
      await boltAgent.initializeRuntime();
    }
    await openHandsAgent.initializeRuntime();
    
    logger.info('Integrated agents setup complete');
    
    return {
      boltAgent: boltAgent!,
      openHandsAgent
    };
  }
}

/**
 * Runtime-aware Task Executor
 */
export class RuntimeTaskExecutor {
  constructor(
    private runtimeManager: RuntimeManager,
    private router: AgentMessageRouter
  ) {}
  
  async executeTask(task: {
    type: 'frontend' | 'backend' | 'database' | 'system' | 'general';
    action: string;
    params: any;
    requiredCapabilities?: string[];
  }): Promise<any> {
    // Select appropriate runtime
    const runtime = this.runtimeManager.selectRuntimeForTask(task);
    
    if (!runtime) {
      throw new Error('No suitable runtime available for task');
    }
    
    logger.info(`Executing task with runtime: ${runtime.config.type}`);
    
    // Execute based on action
    switch (task.action) {
      case 'execute':
        return runtime.execute(task.params.command, task.params);
        
      case 'write':
        await runtime.writeFile(task.params.path, task.params.content);
        return { success: true, path: task.params.path };
        
      case 'read':
        const content = await runtime.readFile(task.params.path);
        return { content, path: task.params.path };
        
      case 'process':
        const processId = await runtime.startProcess(
          task.params.command,
          task.params.args || [],
          task.params.options
        );
        return { processId };
        
      default:
        throw new Error(`Unsupported action: ${task.action}`);
    }
  }
}