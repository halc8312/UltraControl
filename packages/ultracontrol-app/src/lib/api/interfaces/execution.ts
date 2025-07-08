// packages/ultracontrol-app/src/lib/api/interfaces/execution.ts

import type { BaseEntity, OperationStatus, Resource } from './base';

/**
 * Code execution interfaces - unified across bolt.new, devin-clone, and OpenHands
 */

// Execution environment types
export type ExecutionEnvironment = 'browser' | 'docker' | 'local' | 'sandbox' | 'cloud';
export type RuntimeType = 'node' | 'python' | 'shell' | 'browser' | 'custom';

// Execution request
export interface ExecutionRequest {
  code: string;
  language: string;
  runtime?: RuntimeType;
  environment?: ExecutionEnvironment;
  context?: ExecutionContext;
  options?: ExecutionOptions;
}

export interface ExecutionContext {
  workingDirectory?: string;
  environmentVariables?: Record<string, string>;
  dependencies?: Dependency[];
  files?: FileResource[];
  timeout?: number;
}

export interface ExecutionOptions {
  captureOutput: boolean;
  captureErrors: boolean;
  stream?: boolean;
  interactive?: boolean;
  privileged?: boolean;
}

export interface Dependency {
  name: string;
  version?: string;
  source?: 'npm' | 'pip' | 'apt' | 'custom';
}

export interface FileResource {
  path: string;
  content?: string;
  url?: string;
  encoding?: string;
}

// Execution response
export interface ExecutionResult {
  id: string;
  status: OperationStatus;
  output?: string;
  error?: string;
  exitCode?: number;
  duration?: number;
  resources?: ResourceUsage;
  artifacts?: Artifact[];
}

export interface ResourceUsage {
  cpu?: number;
  memory?: number;
  disk?: number;
  network?: number;
}

export interface Artifact extends Resource {
  mimeType: string;
  size: number;
  url?: string;
  content?: string;
}

// Execution session
export interface ExecutionSession extends BaseEntity {
  environment: ExecutionEnvironment;
  runtime: RuntimeType;
  status: OperationStatus;
  context: ExecutionContext;
  history: ExecutionHistoryItem[];
}

export interface ExecutionHistoryItem {
  id: string;
  timestamp: string;
  request: ExecutionRequest;
  result: ExecutionResult;
}

// Terminal/Shell interfaces
export interface TerminalSession extends BaseEntity {
  sessionId: string;
  environment: ExecutionEnvironment;
  shell: string;
  status: 'active' | 'inactive' | 'terminated';
  size?: TerminalSize;
}

export interface TerminalSize {
  rows: number;
  cols: number;
}

export interface TerminalCommand {
  sessionId: string;
  command: string;
  workingDirectory?: string;
}

export interface TerminalOutput {
  sessionId: string;
  type: 'stdout' | 'stderr' | 'system';
  data: string;
  timestamp: string;
}

// Process management
export interface Process extends BaseEntity {
  pid: number;
  name: string;
  command: string;
  status: 'running' | 'stopped' | 'terminated';
  parentPid?: number;
  environment: ExecutionEnvironment;
  resources?: ResourceUsage;
}

export interface ProcessSignal {
  processId: string;
  signal: 'SIGTERM' | 'SIGKILL' | 'SIGINT' | 'SIGHUP' | number;
}

// Build/Compile interfaces
export interface BuildRequest {
  projectPath: string;
  buildCommand?: string;
  target?: string;
  environment?: ExecutionEnvironment;
  configuration?: Record<string, any>;
}

export interface BuildResult extends ExecutionResult {
  artifacts: BuildArtifact[];
  logs: BuildLog[];
}

export interface BuildArtifact extends Artifact {
  target: string;
  platform?: string;
  architecture?: string;
}

export interface BuildLog {
  level: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
  source?: string;
}

// WebContainer specific (for bolt.new)
export interface WebContainerConfig {
  template?: string;
  port?: number;
  autoReload?: boolean;
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export interface WebContainerInfo {
  id: string;
  url: string;
  port: number;
  status: 'starting' | 'running' | 'stopped' | 'error';
}

// Docker specific
export interface DockerConfig {
  image: string;
  tag?: string;
  command?: string[];
  volumes?: VolumeMount[];
  ports?: PortMapping[];
  environment?: Record<string, string>;
  network?: string;
}

export interface VolumeMount {
  host: string;
  container: string;
  readOnly?: boolean;
}

export interface PortMapping {
  host: number;
  container: number;
  protocol?: 'tcp' | 'udp';
}