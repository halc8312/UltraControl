/**
 * Central export for all interface types
 */

export * from './llm';
export * from './agents';
export * from './runtime';
export * from './events';
export * from './projects';
export * from './collaboration';
export * from './errors';

// Core types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  autoSave: boolean;
  defaultModel?: string;
  editorSettings?: {
    fontSize: number;
    tabSize: number;
    wordWrap: boolean;
  };
}

// Session types
export interface BoltSession {
  id: string;
  agentId: string;
  projectId?: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'failed' | 'paused';
  tasks: Task[];
  artifacts?: Artifact[];
}

export interface DevinTask extends Task {
  assignedAgent: string;
  createdAt: Date;
  updatedAt: Date;
  dependencies?: string[];
  result?: TaskResult;
}

export interface OpenHandsAgent {
  id: string;
  type: string;
  status: 'active' | 'idle' | 'busy' | 'error';
  capabilities: string[];
  currentTasks: Task[];
  resourceUsage?: {
    cpu: number;
    memory: number;
    gpu?: number;
  };
}

// Task types
export interface Task {
  id: string;
  description: string;
  type: 'frontend' | 'backend' | 'database' | 'infrastructure' | 'ai-ml' | 'security' | 'general';
  priority: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'blocked';
  estimatedComplexity?: 'low' | 'medium' | 'high';
  requiredSkills?: string[];
  dependencies?: string[];
  assignedTo?: string;
  startTime?: Date;
  completionTime?: Date;
  result?: TaskResult;
}

export interface TaskResult {
  success: boolean;
  output?: any;
  error?: string;
  artifacts?: Artifact[];
  metrics?: {
    duration: number;
    retries: number;
    resourceUsage?: any;
  };
}

// Artifact types
export interface Artifact {
  id: string;
  name: string;
  type: 'file' | 'code' | 'documentation' | 'api-spec' | 'database-schema' | 'config';
  path?: string;
  content?: string;
  size?: number;
  createdBy: string;
  createdAt: Date;
  modifiedAt?: Date;
}

// Project types
export interface Project {
  id: string;
  name: string;
  type: 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'desktop';
  description?: string;
  features: string[];
  stack?: {
    frontend?: string[];
    backend?: string[];
    database?: string[];
    infrastructure?: string[];
  };
  status: 'planning' | 'in-progress' | 'testing' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  collaborators?: string[];
}

// Error types
export interface SystemError {
  id: string;
  type: string;
  service: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  stack?: string;
  context?: any;
  causedBy?: string;
  resolved?: boolean;
  resolution?: string;
}

export interface RecoveryAttempt {
  id: string;
  errorId: string;
  strategy: string;
  success: boolean;
  timestamp: Date;
  result?: any;
  retryCount?: number;
}

export interface RecoveryStrategy {
  name: string;
  applicableTo: string[];
  priority: number;
  implementation: (error: Error, context: any) => Promise<any>;
}