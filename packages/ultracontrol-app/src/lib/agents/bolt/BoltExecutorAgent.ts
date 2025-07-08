/**
 * Bolt.new Executor Agent Adapter for UltraControl
 * 
 * This module provides an adapter that wraps bolt.new's execution capabilities
 * into the UltraControl agent communication protocol.
 */

import type { WebContainer } from '@webcontainer/api';
import type { AgentIdentity, AgentMessage, RequestMessage, ResponseMessage } from '@/lib/protocols/types';
import { AgentMessageHandler } from '@/lib/protocols/handler';
import { AgentMessageRouter } from '@/lib/protocols/router';
import { generateId } from '@/lib/utils/id';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('BoltExecutorAgent');

export interface BoltExecutorConfig {
  webcontainerPromise: Promise<WebContainer>;
  workDir?: string;
}

interface ExecuteParams {
  command: string;
  cwd?: string;
  env?: Record<string, string>;
}

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

export class BoltExecutorAgent extends AgentMessageHandler {
  private webcontainer: Promise<WebContainer>;
  private workDir: string;
  private activeProcesses: Map<string, any> = new Map();

  constructor(config: BoltExecutorConfig, router: AgentMessageRouter) {
    const identity: AgentIdentity = {
      id: `bolt-executor-${generateId()}`,
      type: 'executor',
      provider: 'bolt',
      capabilities: [
        'execute',
        'file:write',
        'file:read',
        'file:delete',
        'webcontainer',
        'preview',
        'shell',
        'terminal'
      ],
      status: 'idle',
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        workDir: config.workDir || '/home/project'
      }
    };

    super(identity, router);
    
    this.webcontainer = config.webcontainerPromise;
    this.workDir = config.workDir || '/home/project';
    
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const container = await this.webcontainer;
      logger.info('WebContainer initialized successfully');
      
      // Update agent status
      this.updateStatus('idle');
      
      // Start heartbeat
      this.startHeartbeat();
    } catch (error) {
      logger.error('Failed to initialize WebContainer:', error);
      this.updateStatus('error');
    }
  }

  protected async handleRequest(message: RequestMessage): Promise<void> {
    const { action, params } = message.payload;
    
    try {
      let result: any;
      
      switch (action) {
        case 'execute':
          result = await this.executeCommand(params.execute);
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
          
        case 'preview':
          result = await this.getPreviewUrl();
          break;
          
        case 'terminal':
          result = await this.createTerminal(params.terminal);
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
      case 'stop':
        await this.stopProcess(args[0]);
        break;
        
      case 'restart':
        await this.restartWebContainer();
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
          result = await this.getActiveProcesses();
          break;
          
        case 'files':
          result = await this.listFiles(message.payload.filters?.path || '/');
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
    // Handle incoming events if needed
    logger.debug('Received event:', message.payload.eventType);
  }

  private async executeCommand(params: ExecuteParams): Promise<any> {
    const container = await this.webcontainer;
    const processId = generateId();
    
    this.updateStatus('busy');
    
    try {
      // Create a shell process
      const process = await container.spawn('sh', ['-c', params.command], {
        cwd: params.cwd || this.workDir,
        env: params.env
      });
      
      this.activeProcesses.set(processId, process);
      
      // Collect output
      const output: string[] = [];
      const errors: string[] = [];
      
      process.output.pipeTo(
        new WritableStream({
          write(data) {
            output.push(data);
          }
        })
      );
      
      // Wait for process to complete
      const exitCode = await process.exit;
      
      this.activeProcesses.delete(processId);
      this.updateStatus('idle');
      
      return {
        processId,
        exitCode,
        output: output.join(''),
        errors: errors.join(''),
        duration: Date.now() - new Date().getTime()
      };
    } catch (error) {
      this.activeProcesses.delete(processId);
      this.updateStatus('idle');
      throw error;
    }
  }

  private async writeFile(params: FileWriteParams): Promise<any> {
    const container = await this.webcontainer;
    
    try {
      // Ensure directory exists
      const dirPath = params.path.substring(0, params.path.lastIndexOf('/'));
      if (dirPath && dirPath !== '.') {
        await container.fs.mkdir(dirPath, { recursive: true });
      }
      
      // Write file
      await container.fs.writeFile(
        params.path, 
        params.content,
        params.encoding as BufferEncoding || 'utf8'
      );
      
      return {
        path: params.path,
        size: new TextEncoder().encode(params.content).length,
        created: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to write file:', error);
      throw error;
    }
  }

  private async readFile(params: FileReadParams): Promise<any> {
    const container = await this.webcontainer;
    
    try {
      const content = await container.fs.readFile(
        params.path,
        params.encoding as BufferEncoding || 'utf8'
      );
      
      return {
        path: params.path,
        content: content.toString(),
        size: content.length,
        encoding: params.encoding || 'utf8'
      };
    } catch (error) {
      logger.error('Failed to read file:', error);
      throw error;
    }
  }

  private async deleteFile(params: FileDeleteParams): Promise<any> {
    const container = await this.webcontainer;
    
    try {
      await container.fs.rm(params.path, { 
        recursive: params.recursive || false 
      });
      
      return {
        path: params.path,
        deleted: true
      };
    } catch (error) {
      logger.error('Failed to delete file:', error);
      throw error;
    }
  }

  private async listFiles(path: string): Promise<any> {
    const container = await this.webcontainer;
    
    try {
      const entries = await container.fs.readdir(path, { withFileTypes: true });
      
      return {
        path,
        entries: entries.map(entry => ({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file',
          path: `${path}/${entry.name}`
        }))
      };
    } catch (error) {
      logger.error('Failed to list files:', error);
      throw error;
    }
  }

  private async getPreviewUrl(): Promise<any> {
    const container = await this.webcontainer;
    
    // WebContainer doesn't directly provide preview URLs
    // This would need to be implemented based on the specific setup
    return {
      url: `http://localhost:5173`, // Default preview URL
      ready: true
    };
  }

  private async createTerminal(params: any): Promise<any> {
    const container = await this.webcontainer;
    const terminalId = generateId();
    
    try {
      // Create a shell process for terminal
      const process = await container.spawn('sh', [], {
        terminal: {
          cols: params.cols || 80,
          rows: params.rows || 24
        }
      });
      
      this.activeProcesses.set(terminalId, process);
      
      return {
        terminalId,
        processId: process.pid,
        status: 'created'
      };
    } catch (error) {
      logger.error('Failed to create terminal:', error);
      throw error;
    }
  }

  private async stopProcess(processId: string): Promise<void> {
    const process = this.activeProcesses.get(processId);
    if (process) {
      process.kill();
      this.activeProcesses.delete(processId);
    }
  }

  private async restartWebContainer(): Promise<void> {
    // WebContainer doesn't support restart directly
    // Would need to implement by recreating the container
    logger.warn('WebContainer restart not implemented');
  }

  private async getStatus(): Promise<any> {
    return {
      status: this.identity.status,
      activeProcesses: this.activeProcesses.size,
      workDir: this.workDir,
      uptime: Date.now() - new Date(this.identity.metadata.created).getTime()
    };
  }

  private async getActiveProcesses(): Promise<any> {
    return {
      processes: Array.from(this.activeProcesses.keys()).map(id => ({
        id,
        status: 'running'
      }))
    };
  }

  private updateStatus(status: AgentStatus): void {
    this.identity.status = status;
    this.identity.metadata.lastActive = new Date().toISOString();
    
    // Emit status update event
    this.router.routeMessage({
      id: generateId(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      from: this.identity,
      to: '*',
      type: 'event',
      payload: {
        eventType: 'agent:status:changed',
        data: {
          agentId: this.identity.id,
          status,
          timestamp: new Date().toISOString()
        },
        source: this.identity.id
      }
    });
  }

  private startHeartbeat(): void {
    setInterval(() => {
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
            cpu: 0, // Would need actual metrics
            memory: 0,
            queueDepth: 0,
            responseTime: 0
          },
          uptime: Date.now() - new Date(this.identity.metadata.created).getTime()
        }
      });
    }, 30000); // Every 30 seconds
  }
}

// Type imports for protocol
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