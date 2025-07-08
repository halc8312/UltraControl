// packages/ultracontrol-app/src/lib/api/interfaces/index.ts

/**
 * Unified API interfaces for UltraControl
 * 
 * These interfaces provide a common abstraction layer across:
 * - bolt.new (browser-based execution)
 * - devin-clone (AI planning and task decomposition)
 * - OpenHands (autonomous AI agents)
 */

// Base types
export * from './base';

// Domain-specific interfaces
export * from './execution';
export * from './filesystem';
export * from './agent';
export * from './project';

// Client interfaces
export * from './client';

// Type guards
export { isApiError, isApiResponse } from './guards';

// Common type aliases for convenience
export type {
  ApiResponse,
  ApiError,
  OperationStatus,
  PaginationParams,
  PaginatedResponse,
  RequestContext,
  ApiEvent
} from './base';

export type {
  ExecutionRequest,
  ExecutionResult,
  TerminalSession,
  Process
} from './execution';

export type {
  FileStat,
  FileContent,
  FileTree,
  FileSearchResult
} from './filesystem';

export type {
  Agent,
  AgentTask,
  AgentAction,
  AgentMessage,
  AgentCapability,
  AgentType
} from './agent';

export type {
  Project,
  Workspace,
  ProjectTemplate,
  ProjectType,
  ProjectLanguage,
  ProjectFramework
} from './project';

export type {
  IApiClient,
  IExecutionClient,
  IFileSystemClient,
  IAgentClient,
  IProjectClient
} from './client';