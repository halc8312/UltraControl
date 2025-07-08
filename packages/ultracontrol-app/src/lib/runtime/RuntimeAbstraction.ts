/**
 * Runtime Abstraction Layer
 * 
 * Provides a unified interface for different execution environments
 * (WebContainers, Docker, Local)
 */

import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('RuntimeAbstraction');

export type RuntimeType = 'webcontainer' | 'docker' | 'local';

export interface RuntimeCapabilities {
  supportsFileSystem: boolean;
  supportsNetworking: boolean;
  supportsDatabase: boolean;
  supportsSystemCalls: boolean;
  supportsDocker: boolean;
  supportedLanguages: string[];
  maxMemoryMB: number;
  maxCPUCores: number;
}

export interface ProcessResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

export interface FileInfo {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: Date;
  permissions?: string;
}

export interface RuntimeConfig {
  type: RuntimeType;
  workDir?: string;
  env?: Record<string, string>;
  limits?: {
    memory?: number;
    cpu?: number;
    timeout?: number;
  };
}

export abstract class RuntimeEnvironment {
  protected config: RuntimeConfig;
  protected capabilities: RuntimeCapabilities;
  public readonly type: RuntimeType;
  public readonly id: string;
  
  constructor(config: RuntimeConfig) {
    this.config = config;
    this.capabilities = this.defineCapabilities();
    this.type = config.type;
    this.id = `runtime-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get runtime capabilities
   */
  getCapabilities(): RuntimeCapabilities {
    return { ...this.capabilities };
  }
  
  /**
   * Check if a capability is supported
   */
  hasCapability(capability: keyof RuntimeCapabilities): boolean {
    return !!this.capabilities[capability];
  }
  
  /**
   * Initialize the runtime environment
   */
  abstract initialize(): Promise<void>;
  
  /**
   * Execute a command
   */
  abstract execute(command: string, options?: {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
  }): Promise<ProcessResult>;
  
  /**
   * File system operations
   */
  abstract writeFile(path: string, content: string | Buffer): Promise<void>;
  abstract readFile(path: string): Promise<string>;
  abstract deleteFile(path: string): Promise<void>;
  abstract listFiles(path: string): Promise<FileInfo[]>;
  abstract createDirectory(path: string, recursive?: boolean): Promise<void>;
  
  /**
   * Process management
   */
  abstract startProcess(command: string, args: string[], options?: {
    cwd?: string;
    env?: Record<string, string>;
    detached?: boolean;
  }): Promise<string>; // Returns process ID
  
  abstract stopProcess(processId: string): Promise<void>;
  abstract getProcessStatus(processId: string): Promise<'running' | 'stopped' | 'error'>;
  
  /**
   * Terminal/Shell operations
   */
  abstract createTerminal(options?: {
    cols?: number;
    rows?: number;
  }): Promise<string>; // Returns terminal ID
  
  abstract writeToTerminal(terminalId: string, data: string): Promise<void>;
  abstract resizeTerminal(terminalId: string, cols: number, rows: number): Promise<void>;
  abstract closeTerminal(terminalId: string): Promise<void>;
  
  /**
   * Cleanup and shutdown
   */
  abstract cleanup(): Promise<void>;
  
  /**
   * Define capabilities for this runtime
   */
  protected abstract defineCapabilities(): RuntimeCapabilities;
}

/**
 * WebContainer Runtime Implementation
 */
export class WebContainerRuntime extends RuntimeEnvironment {
  private webcontainer: any; // WebContainer instance
  private processes: Map<string, any> = new Map();
  private terminals: Map<string, any> = new Map();
  
  protected defineCapabilities(): RuntimeCapabilities {
    return {
      supportsFileSystem: true,
      supportsNetworking: true,
      supportsDatabase: false, // No direct DB access
      supportsSystemCalls: false,
      supportsDocker: false,
      supportedLanguages: ['javascript', 'typescript', 'html', 'css', 'json'],
      maxMemoryMB: 512,
      maxCPUCores: 1
    };
  }
  
  async initialize(): Promise<void> {
    logger.info('Initializing WebContainer runtime');
    // WebContainer initialization would happen here
    // this.webcontainer = await WebContainer.boot();
  }
  
  async execute(command: string, options?: {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
  }): Promise<ProcessResult> {
    const startTime = Date.now();
    
    try {
      const process = await this.webcontainer.spawn('sh', ['-c', command], {
        cwd: options?.cwd || this.config.workDir,
        env: { ...this.config.env, ...options?.env }
      });
      
      let stdout = '';
      let stderr = '';
      
      process.output.pipeTo(new WritableStream({
        write(data) {
          stdout += data;
        }
      }));
      
      const exitCode = await process.exit;
      
      return {
        exitCode,
        stdout,
        stderr,
        duration: Date.now() - startTime
      };
    } catch (error) {
      logger.error('Command execution failed:', error);
      throw error;
    }
  }
  
  async writeFile(path: string, content: string | Buffer): Promise<void> {
    await this.webcontainer.fs.writeFile(path, content);
  }
  
  async readFile(path: string): Promise<string> {
    const content = await this.webcontainer.fs.readFile(path, 'utf8');
    return content;
  }
  
  async deleteFile(path: string): Promise<void> {
    await this.webcontainer.fs.rm(path);
  }
  
  async listFiles(path: string): Promise<FileInfo[]> {
    const entries = await this.webcontainer.fs.readdir(path, { withFileTypes: true });
    
    return entries.map((entry: any) => ({
      path: `${path}/${entry.name}`,
      type: entry.isDirectory() ? 'directory' : 'file'
    }));
  }
  
  async createDirectory(path: string, recursive = false): Promise<void> {
    await this.webcontainer.fs.mkdir(path, { recursive });
  }
  
  async startProcess(command: string, args: string[], options?: {
    cwd?: string;
    env?: Record<string, string>;
    detached?: boolean;
  }): Promise<string> {
    const processId = `proc-${Date.now()}`;
    
    const process = await this.webcontainer.spawn(command, args, {
      cwd: options?.cwd || this.config.workDir,
      env: { ...this.config.env, ...options?.env }
    });
    
    this.processes.set(processId, process);
    return processId;
  }
  
  async stopProcess(processId: string): Promise<void> {
    const process = this.processes.get(processId);
    if (process) {
      process.kill();
      this.processes.delete(processId);
    }
  }
  
  async getProcessStatus(processId: string): Promise<'running' | 'stopped' | 'error'> {
    const process = this.processes.get(processId);
    if (!process) return 'stopped';
    
    // WebContainer doesn't expose process status directly
    // This is a simplified implementation
    return 'running';
  }
  
  async createTerminal(options?: { cols?: number; rows?: number }): Promise<string> {
    const terminalId = `term-${Date.now()}`;
    
    const terminal = await this.webcontainer.spawn('sh', [], {
      terminal: {
        cols: options?.cols || 80,
        rows: options?.rows || 24
      }
    });
    
    this.terminals.set(terminalId, terminal);
    return terminalId;
  }
  
  async writeToTerminal(terminalId: string, data: string): Promise<void> {
    const terminal = this.terminals.get(terminalId);
    if (terminal && terminal.input) {
      const writer = terminal.input.getWriter();
      await writer.write(data);
      writer.releaseLock();
    }
  }
  
  async resizeTerminal(terminalId: string, cols: number, rows: number): Promise<void> {
    const terminal = this.terminals.get(terminalId);
    if (terminal && terminal.resize) {
      terminal.resize({ cols, rows });
    }
  }
  
  async closeTerminal(terminalId: string): Promise<void> {
    const terminal = this.terminals.get(terminalId);
    if (terminal) {
      terminal.kill();
      this.terminals.delete(terminalId);
    }
  }
  
  async cleanup(): Promise<void> {
    // Stop all processes
    for (const [id, process] of this.processes) {
      process.kill();
    }
    this.processes.clear();
    
    // Close all terminals
    for (const [id, terminal] of this.terminals) {
      terminal.kill();
    }
    this.terminals.clear();
  }
}

/**
 * Docker Runtime Implementation
 */
export class DockerRuntime extends RuntimeEnvironment {
  private containerId?: string;
  private dockerClient: any; // Docker API client
  
  protected defineCapabilities(): RuntimeCapabilities {
    return {
      supportsFileSystem: true,
      supportsNetworking: true,
      supportsDatabase: true,
      supportsSystemCalls: true,
      supportsDocker: true,
      supportedLanguages: ['*'], // Supports all languages
      maxMemoryMB: 4096,
      maxCPUCores: 4
    };
  }
  
  async initialize(): Promise<void> {
    logger.info('Initializing Docker runtime');
    // Docker container creation would happen here
    // this.dockerClient = new Docker();
    // this.containerId = await this.createContainer();
  }
  
  async execute(command: string, options?: {
    cwd?: string;
    env?: Record<string, string>;
    timeout?: number;
  }): Promise<ProcessResult> {
    const startTime = Date.now();
    
    try {
      // Execute command in Docker container
      const exec = await this.dockerClient.container(this.containerId).exec({
        Cmd: ['sh', '-c', command],
        WorkingDir: options?.cwd || this.config.workDir,
        Env: this.formatEnv({ ...this.config.env, ...options?.env }),
        AttachStdout: true,
        AttachStderr: true
      });
      
      const stream = await exec.start();
      const result = await this.collectOutput(stream);
      
      return {
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        duration: Date.now() - startTime
      };
    } catch (error) {
      logger.error('Docker command execution failed:', error);
      throw error;
    }
  }
  
  async writeFile(path: string, content: string | Buffer): Promise<void> {
    // Write file to container
    await this.dockerClient.container(this.containerId).putArchive(
      this.createTarArchive(path, content),
      { path: this.getDirectory(path) }
    );
  }
  
  async readFile(path: string): Promise<string> {
    // Read file from container
    const stream = await this.dockerClient.container(this.containerId)
      .getArchive({ path });
    
    const content = await this.extractFromTar(stream);
    return content.toString('utf8');
  }
  
  async deleteFile(path: string): Promise<void> {
    await this.execute(`rm -f ${path}`);
  }
  
  async listFiles(path: string): Promise<FileInfo[]> {
    const result = await this.execute(`ls -la ${path}`);
    return this.parseListOutput(result.stdout);
  }
  
  async createDirectory(path: string, recursive = false): Promise<void> {
    const flag = recursive ? '-p' : '';
    await this.execute(`mkdir ${flag} ${path}`);
  }
  
  async startProcess(command: string, args: string[], options?: {
    cwd?: string;
    env?: Record<string, string>;
    detached?: boolean;
  }): Promise<string> {
    const processId = `docker-proc-${Date.now()}`;
    
    // Start process in container
    const exec = await this.dockerClient.container(this.containerId).exec({
      Cmd: [command, ...args],
      WorkingDir: options?.cwd || this.config.workDir,
      Env: this.formatEnv({ ...this.config.env, ...options?.env }),
      Detach: options?.detached || false
    });
    
    await exec.start({ Detach: true });
    
    return processId;
  }
  
  async stopProcess(processId: string): Promise<void> {
    // In Docker, we'd need to track process PIDs
    // This is a simplified implementation
    await this.execute(`pkill -f ${processId}`);
  }
  
  async getProcessStatus(processId: string): Promise<'running' | 'stopped' | 'error'> {
    try {
      const result = await this.execute(`ps aux | grep ${processId}`);
      return result.stdout.includes(processId) ? 'running' : 'stopped';
    } catch {
      return 'error';
    }
  }
  
  async createTerminal(options?: { cols?: number; rows?: number }): Promise<string> {
    const terminalId = `docker-term-${Date.now()}`;
    
    // Create interactive exec session
    const exec = await this.dockerClient.container(this.containerId).exec({
      Cmd: ['/bin/bash'],
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true
    });
    
    const stream = await exec.start({
      hijack: true,
      stdin: true
    });
    
    // Store terminal session
    // Implementation would track the exec session
    
    return terminalId;
  }
  
  async writeToTerminal(terminalId: string, data: string): Promise<void> {
    // Write to the terminal's stdin
    // Implementation would use the stored exec session
  }
  
  async resizeTerminal(terminalId: string, cols: number, rows: number): Promise<void> {
    // Resize the terminal
    // await this.dockerClient.exec(terminalId).resize({ h: rows, w: cols });
  }
  
  async closeTerminal(terminalId: string): Promise<void> {
    // Close the terminal session
    // Implementation would clean up the exec session
  }
  
  async cleanup(): Promise<void> {
    if (this.containerId) {
      // Stop and remove container
      await this.dockerClient.container(this.containerId).stop();
      await this.dockerClient.container(this.containerId).remove();
    }
  }
  
  private formatEnv(env: Record<string, string>): string[] {
    return Object.entries(env).map(([key, value]) => `${key}=${value}`);
  }
  
  private async collectOutput(stream: any): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    // Collect output from Docker stream
    // Implementation would parse Docker multiplexed stream
    return {
      stdout: '',
      stderr: '',
      exitCode: 0
    };
  }
  
  private createTarArchive(path: string, content: string | Buffer): Buffer {
    // Create tar archive for file upload
    // Implementation would use tar library
    return Buffer.from('');
  }
  
  private async extractFromTar(stream: any): Promise<Buffer> {
    // Extract file content from tar stream
    // Implementation would use tar library
    return Buffer.from('');
  }
  
  private getDirectory(path: string): string {
    const lastSlash = path.lastIndexOf('/');
    return lastSlash > 0 ? path.substring(0, lastSlash) : '/';
  }
  
  private parseListOutput(output: string): FileInfo[] {
    // Parse ls -la output
    const lines = output.split('\n').slice(1); // Skip total line
    const files: FileInfo[] = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split(/\s+/);
      if (parts.length >= 9) {
        files.push({
          path: parts[8],
          type: parts[0].startsWith('d') ? 'directory' : 'file',
          size: parseInt(parts[4]),
          permissions: parts[0]
        });
      }
    }
    
    return files;
  }
}

/**
 * Runtime Factory
 */
export class RuntimeFactory {
  static async create(config: RuntimeConfig): Promise<RuntimeEnvironment> {
    let runtime: RuntimeEnvironment;
    
    switch (config.type) {
      case 'webcontainer':
        runtime = new WebContainerRuntime(config);
        break;
        
      case 'docker':
        runtime = new DockerRuntime(config);
        break;
        
      default:
        throw new Error(`Unsupported runtime type: ${config.type}`);
    }
    
    await runtime.initialize();
    return runtime;
  }
}

/**
 * Runtime Manager
 * 
 * Manages multiple runtime environments and provides smart selection
 */
export class RuntimeManager {
  private runtimes: Map<string, RuntimeEnvironment> = new Map();
  
  async createRuntime(id: string, config: RuntimeConfig): Promise<RuntimeEnvironment> {
    if (this.runtimes.has(id)) {
      throw new Error(`Runtime ${id} already exists`);
    }
    
    const runtime = await RuntimeFactory.create(config);
    this.runtimes.set(id, runtime);
    
    return runtime;
  }
  
  getRuntime(id: string): RuntimeEnvironment | undefined {
    return this.runtimes.get(id);
  }
  
  async removeRuntime(id: string): Promise<void> {
    const runtime = this.runtimes.get(id);
    if (runtime) {
      await runtime.cleanup();
      this.runtimes.delete(id);
    }
  }
  
  /**
   * Select the best runtime for a task
   */
  selectRuntimeForTask(task: {
    type: 'frontend' | 'backend' | 'database' | 'system' | 'general';
    requiredCapabilities?: string[];
    preferredRuntime?: RuntimeType;
  }): RuntimeEnvironment | null {
    // If preferred runtime is specified and available, use it
    if (task.preferredRuntime) {
      for (const runtime of this.runtimes.values()) {
        if (runtime.config.type === task.preferredRuntime) {
          return runtime;
        }
      }
    }
    
    // Otherwise, select based on task type
    const runtimePreference: Record<string, RuntimeType[]> = {
      'frontend': ['webcontainer', 'docker'],
      'backend': ['docker', 'webcontainer'],
      'database': ['docker'],
      'system': ['docker'],
      'general': ['webcontainer', 'docker']
    };
    
    const preferences = runtimePreference[task.type] || ['docker', 'webcontainer'];
    
    for (const preference of preferences) {
      for (const runtime of this.runtimes.values()) {
        if (runtime.config.type === preference) {
          // Check capabilities
          if (task.requiredCapabilities) {
            const hasAllCapabilities = task.requiredCapabilities.every(cap => {
              switch (cap) {
                case 'database':
                  return runtime.getCapabilities().supportsDatabase;
                case 'docker':
                  return runtime.getCapabilities().supportsDocker;
                case 'system':
                  return runtime.getCapabilities().supportsSystemCalls;
                default:
                  return true;
              }
            });
            
            if (!hasAllCapabilities) continue;
          }
          
          return runtime;
        }
      }
    }
    
    return null;
  }
  
  async cleanupAll(): Promise<void> {
    const cleanupPromises = Array.from(this.runtimes.values())
      .map(runtime => runtime.cleanup());
    
    await Promise.all(cleanupPromises);
    this.runtimes.clear();
  }

  // Additional methods for test compatibility
  async initialize(): Promise<void> {
    // Initialize default runtimes
    await this.createRuntime('default-webcontainer', {
      type: 'webcontainer',
      workDir: '/workspace'
    });
    
    await this.createRuntime('default-docker', {
      type: 'docker',
      workDir: '/app'
    });
  }

  async selectRuntime(criteria: {
    type: string;
    requirements?: string[];
  }): Promise<RuntimeEnvironment> {
    const runtime = this.selectRuntimeForTask({
      type: criteria.type as any,
      requiredCapabilities: criteria.requirements
    });

    if (!runtime) {
      // Create a new runtime if none exists
      const runtimeType = criteria.type === 'frontend' ? 'webcontainer' : 'docker';
      const newRuntime = await this.createRuntime(`runtime-${Date.now()}`, {
        type: runtimeType,
        workDir: '/workspace'
      });
      return newRuntime;
    }

    return runtime;
  }

  async dispose(): Promise<void> {
    await this.cleanupAll();
  }
}