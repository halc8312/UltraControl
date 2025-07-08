// packages/ultracontrol-app/src/lib/api/interfaces/client.ts

import type { 
  ApiResponse, 
  ApiClientConfig, 
  HealthStatus,
  PaginatedResponse,
  ApiEvent
} from './base';
import type { 
  ExecutionRequest, 
  ExecutionResult,
  ExecutionSession,
  TerminalSession,
  TerminalCommand,
  TerminalOutput,
  Process,
  ProcessSignal,
  BuildRequest,
  BuildResult
} from './execution';
import type {
  FileStat,
  FileContent,
  FileTree,
  FileSearchRequest,
  FileSearchResult,
  FileWatchRequest,
  FileWatchNotification,
  DirectoryListRequest,
  FileReadRequest,
  FileWriteRequest,
  FileCopyRequest,
  FileMoveRequest,
  FileDeleteRequest,
  DirectoryCreateRequest
} from './filesystem';
import type {
  Agent,
  AgentTask,
  AgentAction,
  AgentMessage,
  AgentEvent,
  AgentCreateRequest,
  AgentUpdateRequest,
  AgentTaskRequest,
  AgentTemplate
} from './agent';
import type {
  Project,
  Workspace,
  ProjectTemplate,
  ProjectCreateRequest,
  ProjectImportRequest,
  ProjectExportRequest,
  ProjectAnalysis,
  ProjectSearchRequest,
  ProjectSearchResult
} from './project';

/**
 * Unified API client interfaces
 */

// Event handler types
export type EventHandler<T = any> = (event: T) => void | Promise<void>;
export type UnsubscribeFn = () => void;

// Main API client interface
export interface IApiClient {
  // Configuration
  readonly config: ApiClientConfig;
  configure(config: Partial<ApiClientConfig>): void;
  
  // Health check
  health(): Promise<ApiResponse<HealthStatus>>;
  
  // Sub-clients
  readonly execution: IExecutionClient;
  readonly filesystem: IFileSystemClient;
  readonly agent: IAgentClient;
  readonly project: IProjectClient;
  
  // Events
  on<T = ApiEvent>(event: string, handler: EventHandler<T>): UnsubscribeFn;
  once<T = ApiEvent>(event: string, handler: EventHandler<T>): UnsubscribeFn;
  off(event: string, handler?: EventHandler): void;
  
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

// Execution client interface
export interface IExecutionClient {
  // Code execution
  execute(request: ExecutionRequest): Promise<ApiResponse<ExecutionResult>>;
  executeStream(request: ExecutionRequest): AsyncIterable<ExecutionResult>;
  
  // Sessions
  createSession(environment: string): Promise<ApiResponse<ExecutionSession>>;
  getSession(sessionId: string): Promise<ApiResponse<ExecutionSession>>;
  listSessions(): Promise<ApiResponse<ExecutionSession[]>>;
  closeSession(sessionId: string): Promise<ApiResponse<void>>;
  
  // Terminal
  createTerminal(config?: any): Promise<ApiResponse<TerminalSession>>;
  sendCommand(command: TerminalCommand): Promise<ApiResponse<void>>;
  resizeTerminal(sessionId: string, size: { rows: number; cols: number }): Promise<ApiResponse<void>>;
  closeTerminal(sessionId: string): Promise<ApiResponse<void>>;
  onTerminalOutput(handler: EventHandler<TerminalOutput>): UnsubscribeFn;
  
  // Process management
  listProcesses(): Promise<ApiResponse<Process[]>>;
  getProcess(processId: string): Promise<ApiResponse<Process>>;
  signalProcess(signal: ProcessSignal): Promise<ApiResponse<void>>;
  
  // Build
  build(request: BuildRequest): Promise<ApiResponse<BuildResult>>;
  buildStream(request: BuildRequest): AsyncIterable<BuildResult>;
}

// File system client interface
export interface IFileSystemClient {
  // File operations
  stat(path: string): Promise<ApiResponse<FileStat>>;
  read(request: FileReadRequest): Promise<ApiResponse<FileContent>>;
  write(request: FileWriteRequest): Promise<ApiResponse<void>>;
  copy(request: FileCopyRequest): Promise<ApiResponse<void>>;
  move(request: FileMoveRequest): Promise<ApiResponse<void>>;
  delete(request: FileDeleteRequest): Promise<ApiResponse<void>>;
  
  // Directory operations
  list(request: DirectoryListRequest): Promise<ApiResponse<PaginatedResponse<FileStat>>>;
  createDirectory(request: DirectoryCreateRequest): Promise<ApiResponse<void>>;
  getTree(path: string, depth?: number): Promise<ApiResponse<FileTree>>;
  
  // Search
  search(request: FileSearchRequest): Promise<ApiResponse<PaginatedResponse<FileSearchResult>>>;
  
  // Watch
  watch(request: FileWatchRequest): Promise<ApiResponse<string>>; // returns watchId
  unwatch(watchId: string): Promise<ApiResponse<void>>;
  onFileChange(handler: EventHandler<FileWatchNotification>): UnsubscribeFn;
}

// Agent client interface
export interface IAgentClient {
  // Agent management
  createAgent(request: AgentCreateRequest): Promise<ApiResponse<Agent>>;
  getAgent(agentId: string): Promise<ApiResponse<Agent>>;
  listAgents(): Promise<ApiResponse<Agent[]>>;
  updateAgent(agentId: string, request: AgentUpdateRequest): Promise<ApiResponse<Agent>>;
  deleteAgent(agentId: string): Promise<ApiResponse<void>>;
  
  // Task management
  createTask(agentId: string, request: AgentTaskRequest): Promise<ApiResponse<AgentTask>>;
  getTask(taskId: string): Promise<ApiResponse<AgentTask>>;
  listTasks(agentId?: string): Promise<ApiResponse<AgentTask[]>>;
  cancelTask(taskId: string): Promise<ApiResponse<void>>;
  
  // Actions
  getActions(taskId: string): Promise<ApiResponse<AgentAction[]>>;
  getAction(actionId: string): Promise<ApiResponse<AgentAction>>;
  
  // Communication
  sendMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): Promise<ApiResponse<AgentMessage>>;
  getMessages(agentId: string, since?: string): Promise<ApiResponse<AgentMessage[]>>;
  
  // Templates
  listTemplates(): Promise<ApiResponse<AgentTemplate[]>>;
  getTemplate(templateId: string): Promise<ApiResponse<AgentTemplate>>;
  
  // Events
  onAgentEvent(handler: EventHandler<AgentEvent>): UnsubscribeFn;
}

// Project client interface
export interface IProjectClient {
  // Project management
  createProject(request: ProjectCreateRequest): Promise<ApiResponse<Project>>;
  importProject(request: ProjectImportRequest): Promise<ApiResponse<Project>>;
  getProject(projectId: string): Promise<ApiResponse<Project>>;
  listProjects(): Promise<ApiResponse<Project[]>>;
  updateProject(projectId: string, updates: Partial<Project>): Promise<ApiResponse<Project>>;
  deleteProject(projectId: string): Promise<ApiResponse<void>>;
  exportProject(request: ProjectExportRequest): Promise<ApiResponse<{ url: string }>>;
  
  // Analysis
  analyzeProject(projectId: string): Promise<ApiResponse<ProjectAnalysis>>;
  
  // Search
  searchProjects(request: ProjectSearchRequest): Promise<ApiResponse<ProjectSearchResult>>;
  
  // Templates
  listProjectTemplates(): Promise<ApiResponse<ProjectTemplate[]>>;
  getProjectTemplate(templateId: string): Promise<ApiResponse<ProjectTemplate>>;
  
  // Workspace
  getWorkspace(): Promise<ApiResponse<Workspace>>;
  updateWorkspace(updates: Partial<Workspace>): Promise<ApiResponse<Workspace>>;
}

// Factory function type
export type ApiClientFactory = (config: ApiClientConfig) => IApiClient;