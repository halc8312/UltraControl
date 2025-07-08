/**
 * OpenHands Executor Agent Adapter for UltraControl
 * 
 * This module provides an adapter that wraps OpenHands' Docker-based execution
 * capabilities into the UltraControl agent communication protocol.
 * 
 * OpenHands provides full-stack development capabilities with:
 * - Docker container-based execution
 * - Support for any programming language
 * - Database and system-level operations
 * - Persistent file system
 */

import type { AgentIdentity, RequestMessage } from '@/lib/protocols/types';
import { AgentMessageHandler } from '@/lib/protocols/handler';
import { AgentMessageRouter } from '@/lib/protocols/router';
import { generateId } from '@/lib/utils/id';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('OpenHandsExecutorAgent');

export interface OpenHandsExecutorConfig {
  apiUrl: string;
  apiKey?: string;
  dockerImage?: string;
  workspaceDir?: string;
  enableGpu?: boolean;
  memoryLimit?: string;
  cpuLimit?: string;
}

interface DockerExecuteParams {
  command: string;
  workdir?: string;
  env?: Record<string, string>;
  shell?: string;
  timeout?: number;
}

interface SystemExecuteParams {
  language: string;
  code: string;
  workdir?: string;
  env?: Record<string, string>;
}

interface DatabaseParams {
  type: 'postgres' | 'mysql' | 'mongodb' | 'redis';
  operation: 'query' | 'execute' | 'connect';
  connectionString?: string;
  query?: string;
  params?: any[];
}

interface ContainerManagementParams {
  action: 'create' | 'start' | 'stop' | 'remove' | 'list';
  containerName?: string;
  image?: string;
  options?: any;
}

export class OpenHandsExecutorAgent extends AgentMessageHandler {
  private config: OpenHandsExecutorConfig;
  private sessionId: string;
  private containerId?: string;
  private isInitialized = false;

  constructor(config: OpenHandsExecutorConfig, router: AgentMessageRouter) {
    const identity: AgentIdentity = {
      id: `openhands-executor-${generateId()}`,
      type: 'executor',
      provider: 'openhands',
      capabilities: [
        'docker:execute',
        'system:execute',
        'file:write',
        'file:read',
        'file:delete',
        'database:query',
        'database:execute',
        'container:manage',
        'network:access',
        'gpu:compute',
        'persistent:storage'
      ],
      status: 'idle',
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        dockerImage: config.dockerImage || 'openhands/runtime:latest',
        workspaceDir: config.workspaceDir || '/workspace'
      }
    };

    super(identity, router);
    
    this.config = config;
    this.sessionId = generateId();
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      logger.info('Initializing OpenHands executor...');
      
      // Create a new Docker container session
      const response = await fetch(`${this.config.apiUrl}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          image: this.config.dockerImage,
          workspaceDir: this.config.workspaceDir,
          enableGpu: this.config.enableGpu,
          memoryLimit: this.config.memoryLimit,
          cpuLimit: this.config.cpuLimit
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      const data = await response.json();
      this.containerId = data.containerId;
      this.isInitialized = true;
      
      logger.info(`OpenHands container initialized: ${this.containerId}`);
      this.updateStatus('idle');
      
      // Start heartbeat
      this.startHeartbeat();
    } catch (error) {
      logger.error('Failed to initialize OpenHands:', error);
      this.updateStatus('error');
    }
  }

  protected async handleRequest(message: RequestMessage): Promise<void> {
    const { action, params } = message.payload;
    
    if (!this.isInitialized) {
      await this.sendResponse(message, null, new Error('Agent not initialized'));
      return;
    }
    
    try {
      let result: any;
      
      switch (action) {
        case 'execute':
          result = await this.executeCommand(params.execute);
          break;
          
        case 'system:execute':
          result = await this.executeSystem(params.system);
          break;
          
        case 'write':
          result = await this.writeFile(params.write);
          break;
          
        case 'read':
          result = await this.readFile(params.read);
          break;
          
        case 'delete':
          result = await this.deleteFile(params.delete);
          break;
          
        case 'database':
          result = await this.executeDatabase(params.database);
          break;
          
        case 'container':
          result = await this.manageContainer(params.container);
          break;
          
        case 'install':
          result = await this.installPackages(params.install);
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
      case 'restart':
        await this.restartContainer();
        break;
        
      case 'cleanup':
        await this.cleanup();
        break;
        
      case 'snapshot':
        await this.createSnapshot(args[0]);
        break;
        
      case 'restore':
        await this.restoreSnapshot(args[0]);
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
        case 'status':
          result = await this.getStatus();
          break;
          
        case 'processes':
          result = await this.getProcesses();
          break;
          
        case 'files':
          result = await this.listFiles(message.payload.filters?.path || '/workspace');
          break;
          
        case 'resources':
          result = await this.getResourceUsage();
          break;
          
        case 'installed':
          result = await this.getInstalledPackages();
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
  }

  private async executeCommand(params: DockerExecuteParams): Promise<any> {
    this.updateStatus('busy');
    
    try {
      const response = await this.sendToOpenHands('/execute', {
        sessionId: this.sessionId,
        command: params.command,
        workdir: params.workdir,
        env: params.env,
        shell: params.shell || '/bin/bash',
        timeout: params.timeout || 30000
      });
      
      this.updateStatus('idle');
      
      return {
        exitCode: response.exitCode,
        stdout: response.stdout,
        stderr: response.stderr,
        duration: response.duration
      };
    } catch (error) {
      this.updateStatus('idle');
      throw error;
    }
  }

  private async executeSystem(params: SystemExecuteParams): Promise<any> {
    // Execute code in specific language runtime
    const commands: Record<string, string> = {
      python: `python3 -c "${params.code.replace(/"/g, '\\"')}"`,
      javascript: `node -e "${params.code.replace(/"/g, '\\"')}"`,
      typescript: `ts-node -e "${params.code.replace(/"/g, '\\"')}"`,
      java: 'javac Main.java && java Main',
      go: 'go run main.go',
      rust: 'rustc main.rs && ./main',
      cpp: 'g++ -o main main.cpp && ./main',
      ruby: `ruby -e "${params.code.replace(/"/g, '\\"')}"`,
      php: `php -r "${params.code.replace(/"/g, '\\"')}"`
    };
    
    const command = commands[params.language];
    if (!command) {
      throw new Error(`Unsupported language: ${params.language}`);
    }
    
    // For compiled languages, write code to file first
    if (['java', 'go', 'rust', 'cpp'].includes(params.language)) {
      const extensions: Record<string, string> = {
        java: 'java',
        go: 'go',
        rust: 'rs',
        cpp: 'cpp'
      };
      
      const filename = `main.${extensions[params.language]}`;
      await this.writeFile({
        path: `${params.workdir || '/workspace'}/${filename}`,
        content: params.code
      });
    }
    
    return this.executeCommand({
      command,
      workdir: params.workdir,
      env: params.env
    });
  }

  private async writeFile(params: FileWriteParams): Promise<any> {
    const response = await this.sendToOpenHands('/files/write', {
      sessionId: this.sessionId,
      path: params.path,
      content: params.content,
      encoding: params.encoding || 'utf8'
    });
    
    return {
      path: params.path,
      size: response.size,
      created: response.created
    };
  }

  private async readFile(params: FileReadParams): Promise<any> {
    const response = await this.sendToOpenHands('/files/read', {
      sessionId: this.sessionId,
      path: params.path,
      encoding: params.encoding || 'utf8'
    });
    
    return {
      path: params.path,
      content: response.content,
      size: response.size,
      encoding: params.encoding || 'utf8'
    };
  }

  private async deleteFile(params: FileDeleteParams): Promise<any> {
    const response = await this.sendToOpenHands('/files/delete', {
      sessionId: this.sessionId,
      path: params.path,
      recursive: params.recursive || false
    });
    
    return {
      path: params.path,
      deleted: response.success
    };
  }

  private async executeDatabase(params: DatabaseParams): Promise<any> {
    const response = await this.sendToOpenHands('/database', {
      sessionId: this.sessionId,
      type: params.type,
      operation: params.operation,
      connectionString: params.connectionString,
      query: params.query,
      params: params.params
    });
    
    return {
      type: params.type,
      operation: params.operation,
      result: response.result,
      rowCount: response.rowCount,
      duration: response.duration
    };
  }

  private async manageContainer(params: ContainerManagementParams): Promise<any> {
    const response = await this.sendToOpenHands('/containers', {
      sessionId: this.sessionId,
      action: params.action,
      containerName: params.containerName,
      image: params.image,
      options: params.options
    });
    
    return response;
  }

  private async installPackages(params: { packages: string[], manager?: string }): Promise<any> {
    const managers: Record<string, string> = {
      apt: 'apt-get install -y',
      pip: 'pip install',
      npm: 'npm install -g',
      yarn: 'yarn global add',
      gem: 'gem install',
      cargo: 'cargo install',
      go: 'go install'
    };
    
    const manager = params.manager || 'apt';
    const installCommand = managers[manager];
    
    if (!installCommand) {
      throw new Error(`Unknown package manager: ${manager}`);
    }
    
    const command = `${installCommand} ${params.packages.join(' ')}`;
    return this.executeCommand({ command });
  }

  private async listFiles(path: string): Promise<any> {
    const response = await this.sendToOpenHands('/files/list', {
      sessionId: this.sessionId,
      path
    });
    
    return {
      path,
      entries: response.entries
    };
  }

  private async getStatus(): Promise<any> {
    const response = await this.sendToOpenHands('/sessions/status', {
      sessionId: this.sessionId
    });
    
    return {
      status: this.identity.status,
      containerId: this.containerId,
      uptime: response.uptime,
      workspaceDir: this.config.workspaceDir,
      dockerImage: this.config.dockerImage
    };
  }

  private async getProcesses(): Promise<any> {
    const result = await this.executeCommand({
      command: 'ps aux'
    });
    
    return {
      processes: result.stdout
    };
  }

  private async getResourceUsage(): Promise<any> {
    const response = await this.sendToOpenHands('/sessions/resources', {
      sessionId: this.sessionId
    });
    
    return {
      cpu: response.cpu,
      memory: response.memory,
      disk: response.disk,
      network: response.network
    };
  }

  private async getInstalledPackages(): Promise<any> {
    const commands = [
      { manager: 'apt', command: 'dpkg -l' },
      { manager: 'pip', command: 'pip list' },
      { manager: 'npm', command: 'npm list -g --depth=0' }
    ];
    
    const results: Record<string, any> = {};
    
    for (const { manager, command } of commands) {
      try {
        const result = await this.executeCommand({ command });
        results[manager] = result.stdout;
      } catch (error) {
        results[manager] = 'Not available';
      }
    }
    
    return results;
  }

  private async restartContainer(): Promise<void> {
    await this.sendToOpenHands('/sessions/restart', {
      sessionId: this.sessionId
    });
  }

  private async cleanup(): Promise<void> {
    if (this.containerId) {
      await this.sendToOpenHands('/sessions/cleanup', {
        sessionId: this.sessionId
      });
      this.containerId = undefined;
      this.isInitialized = false;
    }
  }

  private async createSnapshot(name: string): Promise<void> {
    await this.sendToOpenHands('/sessions/snapshot', {
      sessionId: this.sessionId,
      name
    });
  }

  private async restoreSnapshot(name: string): Promise<void> {
    await this.sendToOpenHands('/sessions/restore', {
      sessionId: this.sessionId,
      name
    });
  }

  private async sendToOpenHands(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenHands API error: ${error}`);
    }
    
    return response.json();
  }

  private updateStatus(status: AgentStatus): void {
    this.identity.status = status;
    this.identity.metadata.lastActive = new Date().toISOString();
    
    this.sendEvent('agent:status:changed', {
      agentId: this.identity.id,
      status,
      timestamp: new Date().toISOString()
    });
  }

  private startHeartbeat(): void {
    setInterval(async () => {
      try {
        const resources = await this.getResourceUsage();
        
        this.router.routeMessage({
          id: generateId(),
          timestamp: new Date().toISOString(),
          version: '1.0',
          from: this.identity,
          to: '*',
          type: 'heartbeat',
          payload: {
            status: this.identity.status,
            metrics: {
              cpu: resources.cpu.usage,
              memory: resources.memory.usage,
              queueDepth: 0,
              responseTime: 0
            },
            uptime: Date.now() - new Date(this.identity.metadata.created).getTime()
          }
        });
      } catch (error) {
        logger.error('Heartbeat error:', error);
      }
    }, 30000);
  }

  async shutdown(): Promise<void> {
    await this.cleanup();
    await super.shutdown();
  }
}

// Type definitions
interface FileWriteParams {
  path: string;
  content: string;
  encoding?: string;
}

interface FileReadParams {
  path: string;
  encoding?: string;
}

interface FileDeleteParams {
  path: string;
  recursive?: boolean;
}

interface CommandMessage extends AgentMessage {
  type: 'command';
  payload: {
    command: string;
    args: any[];
    async: boolean;
  };
}

interface QueryMessage extends AgentMessage {
  type: 'query';
  payload: {
    query: string;
    filters?: Record<string, any>;
    pagination?: {
      limit: number;
      offset: number;
    };
  };
}

interface EventMessage extends AgentMessage {
  type: 'event';
  payload: {
    eventType: string;
    data: any;
    source: string;
  };
}

type AgentStatus = 'idle' | 'busy' | 'error' | 'offline';

import type { AgentMessage } from '@/lib/protocols/types';