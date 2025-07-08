/**
 * Agent Communication Protocol Type Definitions
 * 
 * Core types for the UltraControl agent communication protocol.
 */

// Agent Types
export type AgentType = 'executor' | 'planner' | 'analyzer' | 'coordinator';
export type AgentStatus = 'idle' | 'busy' | 'error' | 'offline';
export type Priority = 'low' | 'normal' | 'high' | 'critical';

// Agent Identity
export interface AgentIdentity {
  id: string;
  type: AgentType;
  provider: string;
  capabilities: string[];
  status: AgentStatus;
  metadata: {
    version: string;
    created: string;
    lastActive: string;
    [key: string]: any;
  };
}

// Message Types
export type MessageType = 
  | 'request'
  | 'response'
  | 'event'
  | 'command'
  | 'query'
  | 'notification'
  | 'heartbeat'
  | 'error';

// Base Message Structure
export interface AgentMessage {
  id: string;
  timestamp: string;
  version: '1.0';
  from: AgentIdentity;
  to: AgentIdentity | '*';
  type: MessageType;
  payload: any;
  correlationId?: string;
  priority?: Priority;
  ttl?: number;
  encryption?: EncryptionInfo;
}

// Encryption Info
export interface EncryptionInfo {
  algorithm: string;
  keyId: string;
  nonce: string;
}

// Request/Response Messages
export interface RequestMessage extends AgentMessage {
  type: 'request';
  payload: {
    action: string;
    params: Record<string, any>;
    timeout?: number;
  };
}

export interface ResponseMessage extends AgentMessage {
  type: 'response';
  correlationId: string;
  payload: {
    success: boolean;
    result?: any;
    error?: {
      code: string;
      message: string;
      details?: any;
    };
    duration: number;
  };
}

// Event Message
export interface EventMessage extends AgentMessage {
  type: 'event';
  payload: {
    eventType: string;
    data: any;
    source: string;
  };
}

// Command Message
export interface CommandMessage extends AgentMessage {
  type: 'command';
  payload: {
    command: string;
    args: any[];
    async: boolean;
  };
}

// Query Message
export interface QueryMessage extends AgentMessage {
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

// Notification Message
export interface NotificationMessage extends AgentMessage {
  type: 'notification';
  payload: {
    level: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    details?: any;
  };
}

// Heartbeat Message
export interface HeartbeatMessage extends AgentMessage {
  type: 'heartbeat';
  payload: {
    status: AgentStatus;
    metrics: {
      cpu: number;
      memory: number;
      queueDepth: number;
      responseTime: number;
    };
    uptime: number;
  };
}

// Error Message
export interface ErrorMessage extends AgentMessage {
  type: 'error';
  payload: {
    code: string;
    message: string;
    details?: any;
    recoverable: boolean;
  };
}

// Capability Descriptor
export interface CapabilityDescriptor {
  name: string;
  version: string;
  description: string;
  inputSchema?: any;
  outputSchema?: any;
}

// Route Types
export interface Route {
  type: 'direct' | 'topic' | 'broadcast';
  target: string;
}

// Transaction Types
export interface Transaction {
  id: string;
  steps: TransactionStep[];
  status: 'pending' | 'committed' | 'rolled-back';
  timeout: number;
}

export interface TransactionStep {
  agent: AgentIdentity;
  message: AgentMessage;
  compensate?: AgentMessage;
}

// Error Codes
export enum ErrorCode {
  // Protocol errors
  INVALID_MESSAGE = 'PROTOCOL_001',
  UNSUPPORTED_VERSION = 'PROTOCOL_002',
  ROUTING_FAILED = 'PROTOCOL_003',
  
  // Agent errors
  AGENT_UNAVAILABLE = 'AGENT_001',
  AGENT_TIMEOUT = 'AGENT_002',
  AGENT_OVERLOADED = 'AGENT_003',
  
  // Execution errors
  EXECUTION_FAILED = 'EXEC_001',
  PERMISSION_DENIED = 'EXEC_002',
  RESOURCE_EXHAUSTED = 'EXEC_003',
}

// Protocol Error
export interface ProtocolError extends Error {
  code: ErrorCode;
  context: any;
  recoverable: boolean;
}

// Handler Types
export type MessageHandler = (message: AgentMessage) => void | Promise<void>;
export type UnsubscribeFn = () => void;

// Channel Types
export interface DirectChannel {
  send(message: AgentMessage): Promise<void>;
  receive(handler: MessageHandler): UnsubscribeFn;
  close(): void;
}

export interface BroadcastChannel {
  broadcast(message: AgentMessage): Promise<void>;
  subscribe(filter: MessageFilter, handler: MessageHandler): UnsubscribeFn;
}

export interface TopicChannel {
  publish(topic: string, message: AgentMessage): Promise<void>;
  subscribe(topic: string, handler: MessageHandler): UnsubscribeFn;
  unsubscribe(topic: string): void;
}

// Filter Types
export interface MessageFilter {
  type?: MessageType[];
  from?: string[];
  to?: string[];
  priority?: Priority[];
}

// Connection Types
export interface AgentConnection {
  id: string;
  status: 'connected' | 'disconnected' | 'error';
  agent: AgentIdentity;
  lastSeen: Date;
  send(message: AgentMessage): Promise<void>;
  close(): void;
}

// Queued Message
export interface QueuedMessage {
  message: AgentMessage;
  routes: Route[];
  attempts: number;
  nextRetry?: Date;
}