// packages/ultracontrol-app/src/lib/api/interfaces/agent.ts

import type { BaseEntity, OperationStatus, Capability, ApiEvent } from './base';
import type { ExecutionRequest, ExecutionResult } from './execution';
import type { FileWriteRequest } from './filesystem';

/**
 * Agent interfaces - unified across bolt.new, devin-clone, and OpenHands
 */

// Agent types
export type AgentType = 
  | 'executor'      // bolt.new - immediate code execution
  | 'planner'       // devin - task planning and decomposition
  | 'autonomous'    // OpenHands - self-directed problem solving
  | 'assistant'     // General purpose assistant
  | 'specialist';   // Domain-specific agent

export type AgentCapability = 
  | 'code-generation'
  | 'code-execution'
  | 'file-manipulation'
  | 'web-browsing'
  | 'task-planning'
  | 'debugging'
  | 'testing'
  | 'documentation'
  | 'refactoring'
  | 'deployment';

// Agent definition
export interface Agent extends BaseEntity {
  name: string;
  type: AgentType;
  description: string;
  capabilities: AgentCapability[];
  configuration: AgentConfiguration;
  status: AgentStatus;
  metadata?: Record<string, any>;
}

export interface AgentConfiguration {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: string[];
  permissions?: AgentPermissions;
  resources?: AgentResources;
  behavior?: AgentBehavior;
}

export interface AgentPermissions {
  fileSystem: {
    read: boolean;
    write: boolean;
    execute: boolean;
    paths?: string[];
  };
  network: {
    enabled: boolean;
    allowedHosts?: string[];
  };
  execution: {
    enabled: boolean;
    environments?: string[];
  };
}

export interface AgentResources {
  maxMemory?: number;
  maxCpu?: number;
  maxExecutionTime?: number;
  maxFileSize?: number;
}

export interface AgentBehavior {
  autoApprove?: boolean;
  confirmActions?: boolean;
  verbosity?: 'quiet' | 'normal' | 'verbose';
  persistence?: boolean;
}

export type AgentStatus = 'idle' | 'thinking' | 'acting' | 'waiting' | 'error' | 'stopped';

// Agent task
export interface AgentTask extends BaseEntity {
  agentId: string;
  title: string;
  description: string;
  goal?: string;
  context?: TaskContext;
  status: OperationStatus;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dependencies?: string[];
  subtasks?: AgentTask[];
  result?: TaskResult;
}

export interface TaskContext {
  workspaceId?: string;
  projectPath?: string;
  files?: string[];
  variables?: Record<string, any>;
  previousTasks?: string[];
}

export interface TaskResult {
  success: boolean;
  output?: any;
  error?: string;
  artifacts?: TaskArtifact[];
  metrics?: TaskMetrics;
}

export interface TaskArtifact {
  type: 'file' | 'code' | 'output' | 'report';
  path?: string;
  content?: string;
  metadata?: Record<string, any>;
}

export interface TaskMetrics {
  duration: number;
  tokensUsed?: number;
  actionsPerformed?: number;
  filesModified?: number;
  testsRun?: number;
  testsPassed?: number;
}

// Agent actions
export interface AgentAction {
  id: string;
  agentId: string;
  taskId?: string;
  type: ActionType;
  payload: any;
  status: OperationStatus;
  timestamp: string;
  result?: ActionResult;
}

export type ActionType = 
  | 'think'          // Planning or reasoning
  | 'code_generate'  // Generate code
  | 'code_execute'   // Execute code
  | 'file_read'      // Read file
  | 'file_write'     // Write file
  | 'file_delete'    // Delete file
  | 'shell_command'  // Run shell command
  | 'web_browse'     // Browse web
  | 'test_run'       // Run tests
  | 'debug'          // Debug code
  | 'ask_user'       // Request user input
  | 'report';        // Generate report

export interface ActionResult {
  success: boolean;
  output?: any;
  error?: string;
  duration?: number;
  affectedResources?: string[];
}

// Agent communication
export interface AgentMessage {
  id: string;
  from: string; // agentId or 'user'
  to: string;   // agentId or 'user'
  type: 'request' | 'response' | 'info' | 'error';
  content: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface AgentConversation {
  id: string;
  participants: string[];
  messages: AgentMessage[];
  status: 'active' | 'paused' | 'completed';
  context?: Record<string, any>;
}

// Agent collaboration
export interface AgentCollaboration extends BaseEntity {
  name: string;
  description: string;
  agents: CollaborationAgent[];
  workflow?: CollaborationWorkflow;
  status: OperationStatus;
}

export interface CollaborationAgent {
  agentId: string;
  role: string;
  responsibilities: string[];
  dependencies?: string[];
}

export interface CollaborationWorkflow {
  type: 'sequential' | 'parallel' | 'dynamic';
  steps?: WorkflowStep[];
  rules?: WorkflowRule[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  agentId: string;
  action: ActionType;
  input?: any;
  conditions?: WorkflowCondition[];
  onSuccess?: string; // next step id
  onFailure?: string; // next step id
}

export interface WorkflowCondition {
  type: 'result' | 'time' | 'resource';
  operator: 'equals' | 'contains' | 'greater' | 'less';
  value: any;
}

export interface WorkflowRule {
  id: string;
  description: string;
  condition: WorkflowCondition;
  action: 'continue' | 'pause' | 'abort' | 'retry';
}

// Agent events
export interface AgentEvent extends ApiEvent {
  agentId: string;
  taskId?: string;
  actionId?: string;
}

export type AgentEventType = 
  | 'agent.started'
  | 'agent.stopped'
  | 'agent.error'
  | 'task.created'
  | 'task.started'
  | 'task.completed'
  | 'task.failed'
  | 'action.started'
  | 'action.completed'
  | 'action.failed'
  | 'message.sent'
  | 'message.received';

// Agent management
export interface AgentCreateRequest {
  name: string;
  type: AgentType;
  description?: string;
  capabilities?: AgentCapability[];
  configuration?: AgentConfiguration;
}

export interface AgentUpdateRequest {
  name?: string;
  description?: string;
  configuration?: Partial<AgentConfiguration>;
  status?: AgentStatus;
}

export interface AgentTaskRequest {
  title: string;
  description: string;
  goal?: string;
  context?: TaskContext;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

// Agent templates
export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  type: AgentType;
  capabilities: AgentCapability[];
  defaultConfiguration: AgentConfiguration;
  exampleTasks?: string[];
}