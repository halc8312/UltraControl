# UltraControl Agent Communication Protocol Design

## 1. Overview

This document defines the communication protocol for agent interactions within the UltraControl platform. The protocol enables seamless communication between different agent types (bolt.new, devin-clone, OpenHands) while maintaining consistency, reliability, and extensibility.

## 2. Protocol Objectives

- **Interoperability**: Enable different agent types to communicate regardless of implementation
- **Reliability**: Ensure message delivery and handle failures gracefully
- **Performance**: Minimize latency and overhead in agent communications
- **Extensibility**: Support future agent types and message formats
- **Observability**: Provide comprehensive logging and monitoring capabilities
- **Security**: Ensure secure communication between agents

## 3. Core Concepts

### 3.1 Agent Identity

Each agent in the system has a unique identity:

```typescript
interface AgentIdentity {
  id: string;                    // Unique agent instance ID
  type: AgentType;              // 'executor' | 'planner' | 'analyzer' | 'coordinator'
  provider: string;             // 'bolt' | 'devin' | 'openhands' | 'custom'
  capabilities: string[];       // List of capabilities this agent provides
  status: AgentStatus;         // 'idle' | 'busy' | 'error' | 'offline'
  metadata: {
    version: string;
    created: string;
    lastActive: string;
    [key: string]: any;
  };
}
```

### 3.2 Message Structure

All messages follow a standard structure:

```typescript
interface AgentMessage {
  // Message metadata
  id: string;                   // Unique message ID
  timestamp: string;            // ISO 8601 timestamp
  version: '1.0';              // Protocol version
  
  // Routing information
  from: AgentIdentity;         // Sender identity
  to: AgentIdentity | '*';     // Recipient identity or broadcast
  
  // Message content
  type: MessageType;           // Message type
  payload: any;                // Type-specific payload
  
  // Optional fields
  correlationId?: string;      // For request-response patterns
  priority?: Priority;         // 'low' | 'normal' | 'high' | 'critical'
  ttl?: number;               // Time to live in milliseconds
  encryption?: EncryptionInfo; // Encryption metadata
}

type MessageType = 
  | 'request'
  | 'response'
  | 'event'
  | 'command'
  | 'query'
  | 'notification'
  | 'heartbeat'
  | 'error';
```

## 4. Message Types

### 4.1 Request/Response Pattern

For synchronous agent interactions:

```typescript
interface RequestMessage extends AgentMessage {
  type: 'request';
  payload: {
    action: string;              // Action to perform
    params: Record<string, any>; // Action parameters
    timeout?: number;            // Request timeout
  };
}

interface ResponseMessage extends AgentMessage {
  type: 'response';
  correlationId: string;         // Links to original request
  payload: {
    success: boolean;
    result?: any;                // Success result
    error?: {
      code: string;
      message: string;
      details?: any;
    };
    duration: number;            // Processing time in ms
  };
}
```

### 4.2 Event Broadcasting

For asynchronous notifications:

```typescript
interface EventMessage extends AgentMessage {
  type: 'event';
  payload: {
    eventType: string;           // Event type identifier
    data: any;                   // Event-specific data
    source: string;              // Event source
  };
}
```

### 4.3 Command Pattern

For directing agent actions:

```typescript
interface CommandMessage extends AgentMessage {
  type: 'command';
  payload: {
    command: string;             // Command identifier
    args: any[];                 // Command arguments
    async: boolean;              // Fire-and-forget if true
  };
}
```

### 4.4 Query Pattern

For information retrieval:

```typescript
interface QueryMessage extends AgentMessage {
  type: 'query';
  payload: {
    query: string;               // Query identifier
    filters?: Record<string, any>; // Query filters
    pagination?: {
      limit: number;
      offset: number;
    };
  };
}
```

## 5. Communication Channels

### 5.1 Direct Communication

Point-to-point communication between agents:

```typescript
interface DirectChannel {
  send(message: AgentMessage): Promise<void>;
  receive(handler: MessageHandler): Unsubscribe;
  close(): void;
}
```

### 5.2 Broadcast Communication

One-to-many communication:

```typescript
interface BroadcastChannel {
  broadcast(message: AgentMessage): Promise<void>;
  subscribe(filter: MessageFilter, handler: MessageHandler): Unsubscribe;
}
```

### 5.3 Topic-based Communication

Pub/sub pattern for decoupled communication:

```typescript
interface TopicChannel {
  publish(topic: string, message: AgentMessage): Promise<void>;
  subscribe(topic: string, handler: MessageHandler): Unsubscribe;
  unsubscribe(topic: string): void;
}
```

## 6. Protocol Implementation

### 6.1 Message Router

Central component for message routing:

```typescript
class AgentMessageRouter {
  private agents: Map<string, AgentConnection> = new Map();
  private topics: Map<string, Set<string>> = new Map();
  private messageQueue: PriorityQueue<QueuedMessage> = new PriorityQueue();
  
  async routeMessage(message: AgentMessage): Promise<void> {
    // Validate message
    this.validateMessage(message);
    
    // Apply routing rules
    const routes = this.determineRoutes(message);
    
    // Queue or send immediately based on priority
    if (message.priority === 'critical') {
      await Promise.all(routes.map(route => this.sendDirect(route, message)));
    } else {
      this.queueMessage(message, routes);
    }
  }
  
  private determineRoutes(message: AgentMessage): Route[] {
    if (message.to === '*') {
      // Broadcast to all agents
      return Array.from(this.agents.values())
        .filter(agent => agent.status === 'online')
        .map(agent => ({ type: 'direct', target: agent.id }));
    } else if (typeof message.to === 'string' && message.to.startsWith('topic:')) {
      // Topic-based routing
      const topic = message.to.substring(6);
      const subscribers = this.topics.get(topic) || new Set();
      return Array.from(subscribers).map(id => ({ type: 'topic', target: id }));
    } else {
      // Direct routing
      return [{ type: 'direct', target: message.to.id }];
    }
  }
}
```

### 6.2 Message Handler

Base class for agent message handling:

```typescript
abstract class AgentMessageHandler {
  protected identity: AgentIdentity;
  protected router: AgentMessageRouter;
  
  constructor(identity: AgentIdentity, router: AgentMessageRouter) {
    this.identity = identity;
    this.router = router;
  }
  
  async handleMessage(message: AgentMessage): Promise<void> {
    try {
      // Pre-processing
      await this.beforeHandle(message);
      
      // Route to specific handler
      switch (message.type) {
        case 'request':
          await this.handleRequest(message as RequestMessage);
          break;
        case 'command':
          await this.handleCommand(message as CommandMessage);
          break;
        case 'query':
          await this.handleQuery(message as QueryMessage);
          break;
        case 'event':
          await this.handleEvent(message as EventMessage);
          break;
        default:
          await this.handleUnknown(message);
      }
      
      // Post-processing
      await this.afterHandle(message);
    } catch (error) {
      await this.handleError(message, error);
    }
  }
  
  protected abstract handleRequest(message: RequestMessage): Promise<void>;
  protected abstract handleCommand(message: CommandMessage): Promise<void>;
  protected abstract handleQuery(message: QueryMessage): Promise<void>;
  protected abstract handleEvent(message: EventMessage): Promise<void>;
  
  protected async sendResponse(
    request: RequestMessage, 
    result: any, 
    error?: Error
  ): Promise<void> {
    const response: ResponseMessage = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      from: this.identity,
      to: request.from,
      type: 'response',
      correlationId: request.id,
      payload: {
        success: !error,
        result: error ? undefined : result,
        error: error ? {
          code: error.name,
          message: error.message,
          details: error.stack
        } : undefined,
        duration: Date.now() - new Date(request.timestamp).getTime()
      }
    };
    
    await this.router.routeMessage(response);
  }
}
```

## 7. Agent Type Specifications

### 7.1 Executor Agents

Agents that perform code execution and file operations:

```typescript
interface ExecutorRequest extends RequestMessage {
  payload: {
    action: 'execute' | 'write' | 'read' | 'delete';
    params: {
      execute?: {
        command: string;
        cwd?: string;
        env?: Record<string, string>;
      };
      write?: {
        path: string;
        content: string;
        encoding?: string;
      };
      read?: {
        path: string;
        encoding?: string;
      };
      delete?: {
        path: string;
        recursive?: boolean;
      };
    };
  };
}
```

### 7.2 Planner Agents

Agents that decompose tasks and create execution plans:

```typescript
interface PlannerRequest extends RequestMessage {
  payload: {
    action: 'plan' | 'decompose' | 'optimize';
    params: {
      task: string;
      context?: any;
      constraints?: {
        maxSteps?: number;
        timeLimit?: number;
        resources?: string[];
      };
    };
  };
}

interface Plan {
  id: string;
  steps: PlanStep[];
  dependencies: Dependency[];
  estimatedDuration: number;
}

interface PlanStep {
  id: string;
  description: string;
  agent: AgentType;
  action: string;
  params: any;
  priority: Priority;
}
```

### 7.3 Analyzer Agents

Agents that analyze code, errors, and provide insights:

```typescript
interface AnalyzerRequest extends RequestMessage {
  payload: {
    action: 'analyze' | 'diagnose' | 'suggest';
    params: {
      analyze?: {
        code: string;
        language: string;
        rules?: string[];
      };
      diagnose?: {
        error: any;
        context: any;
      };
      suggest?: {
        problem: string;
        constraints: any;
      };
    };
  };
}
```

### 7.4 Coordinator Agents

Agents that orchestrate other agents:

```typescript
interface CoordinatorRequest extends RequestMessage {
  payload: {
    action: 'orchestrate' | 'delegate' | 'monitor';
    params: {
      orchestrate?: {
        workflow: Workflow;
        agents: AgentIdentity[];
      };
      delegate?: {
        task: string;
        candidates: AgentIdentity[];
        strategy: 'round-robin' | 'least-busy' | 'best-fit';
      };
      monitor?: {
        agents: string[];
        metrics: string[];
      };
    };
  };
}
```

## 8. Protocol Extensions

### 8.1 Capability Negotiation

Agents can discover each other's capabilities:

```typescript
interface CapabilityQuery extends QueryMessage {
  payload: {
    query: 'capabilities';
    filters?: {
      type?: AgentType[];
      capability?: string[];
    };
  };
}

interface CapabilityResponse extends ResponseMessage {
  payload: {
    success: true;
    result: {
      agents: Array<{
        identity: AgentIdentity;
        capabilities: CapabilityDescriptor[];
      }>;
    };
  };
}

interface CapabilityDescriptor {
  name: string;
  version: string;
  description: string;
  inputSchema?: any;  // JSON Schema
  outputSchema?: any; // JSON Schema
}
```

### 8.2 Health Monitoring

Periodic health checks between agents:

```typescript
interface HealthCheck extends AgentMessage {
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
```

### 8.3 Transaction Support

For multi-step operations requiring atomicity:

```typescript
interface Transaction {
  id: string;
  steps: TransactionStep[];
  status: 'pending' | 'committed' | 'rolled-back';
  timeout: number;
}

interface TransactionStep {
  agent: AgentIdentity;
  message: AgentMessage;
  compensate?: AgentMessage; // For rollback
}

class TransactionManager {
  async executeTransaction(transaction: Transaction): Promise<void> {
    const completed: string[] = [];
    
    try {
      for (const step of transaction.steps) {
        await this.executeStep(step);
        completed.push(step.agent.id);
      }
      
      await this.commitTransaction(transaction);
    } catch (error) {
      await this.rollbackTransaction(transaction, completed);
      throw error;
    }
  }
}
```

## 9. Error Handling

### 9.1 Error Types

```typescript
enum ErrorCode {
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

interface ProtocolError extends Error {
  code: ErrorCode;
  context: any;
  recoverable: boolean;
}
```

### 9.2 Retry Strategy

```typescript
interface RetryPolicy {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ErrorCode[];
}

class RetryManager {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    policy: RetryPolicy
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < policy.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (!this.isRetryable(error, policy)) {
          throw error;
        }
        
        const delay = this.calculateDelay(attempt, policy);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }
}
```

## 10. Security Considerations

### 10.1 Message Authentication

```typescript
interface SecurityContext {
  authenticate(message: AgentMessage): Promise<boolean>;
  authorize(agent: AgentIdentity, action: string): Promise<boolean>;
  encrypt(message: AgentMessage): Promise<EncryptedMessage>;
  decrypt(message: EncryptedMessage): Promise<AgentMessage>;
}

interface EncryptedMessage extends AgentMessage {
  encryption: {
    algorithm: string;
    keyId: string;
    nonce: string;
  };
  encryptedPayload: string;
}
```

### 10.2 Access Control

```typescript
interface AccessPolicy {
  agent: AgentIdentity;
  permissions: Permission[];
  restrictions: Restriction[];
}

interface Permission {
  resource: string;
  actions: string[];
  conditions?: Condition[];
}

interface Restriction {
  type: 'rate-limit' | 'time-window' | 'resource-quota';
  params: any;
}
```

## 11. Performance Optimization

### 11.1 Message Batching

```typescript
interface BatchMessage extends AgentMessage {
  type: 'batch';
  payload: {
    messages: AgentMessage[];
    sequential: boolean;
  };
}
```

### 11.2 Connection Pooling

```typescript
class ConnectionPool {
  private pools: Map<string, Pool<AgentConnection>> = new Map();
  
  async getConnection(agentId: string): Promise<AgentConnection> {
    const pool = this.pools.get(agentId);
    if (!pool) {
      throw new Error(`No pool for agent ${agentId}`);
    }
    
    return pool.acquire();
  }
  
  async releaseConnection(agentId: string, connection: AgentConnection): Promise<void> {
    const pool = this.pools.get(agentId);
    if (pool) {
      await pool.release(connection);
    }
  }
}
```

## 12. Implementation Example

### 12.1 Bolt Agent Adapter

```typescript
class BoltAgentAdapter extends AgentMessageHandler {
  private boltInstance: any; // Bolt.new instance
  
  constructor(boltInstance: any, router: AgentMessageRouter) {
    super({
      id: generateId(),
      type: 'executor',
      provider: 'bolt',
      capabilities: ['execute', 'webcontainer', 'preview'],
      status: 'idle',
      metadata: {
        version: '1.0.0',
        created: new Date().toISOString(),
        lastActive: new Date().toISOString()
      }
    }, router);
    
    this.boltInstance = boltInstance;
  }
  
  protected async handleRequest(message: RequestMessage): Promise<void> {
    const { action, params } = message.payload;
    
    try {
      let result: any;
      
      switch (action) {
        case 'execute':
          result = await this.executeInWebContainer(params.execute);
          break;
        case 'write':
          result = await this.writeFile(params.write);
          break;
        case 'preview':
          result = await this.getPreviewUrl();
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      await this.sendResponse(message, result);
    } catch (error) {
      await this.sendResponse(message, null, error);
    }
  }
  
  private async executeInWebContainer(params: any): Promise<any> {
    // Delegate to bolt instance
    return this.boltInstance.execute(params.command, {
      cwd: params.cwd,
      env: params.env
    });
  }
}
```

### 12.2 Agent Orchestration Example

```typescript
class TaskOrchestrator {
  private coordinator: CoordinatorAgent;
  private agents: Map<string, AgentIdentity>;
  
  async executeTask(task: string): Promise<any> {
    // Get planner agent
    const planner = this.findAgent('planner');
    
    // Create execution plan
    const planResponse = await this.sendRequest(planner, {
      action: 'plan',
      params: { task }
    });
    
    const plan: Plan = planResponse.payload.result;
    
    // Execute plan steps
    const results = [];
    for (const step of plan.steps) {
      const agent = this.findAgent(step.agent);
      const result = await this.sendRequest(agent, {
        action: step.action,
        params: step.params
      });
      
      results.push(result);
    }
    
    return results;
  }
}
```

## 13. Testing Strategy

### 13.1 Protocol Testing

```typescript
describe('Agent Communication Protocol', () => {
  let router: AgentMessageRouter;
  let agentA: MockAgent;
  let agentB: MockAgent;
  
  beforeEach(() => {
    router = new AgentMessageRouter();
    agentA = new MockAgent('A', router);
    agentB = new MockAgent('B', router);
  });
  
  it('should route direct messages correctly', async () => {
    const message = createMessage(agentA.identity, agentB.identity, {
      type: 'request',
      payload: { action: 'test' }
    });
    
    await router.routeMessage(message);
    
    expect(agentB.receivedMessages).toHaveLength(1);
    expect(agentB.receivedMessages[0]).toEqual(message);
  });
  
  it('should handle broadcast messages', async () => {
    const message = createMessage(agentA.identity, '*', {
      type: 'event',
      payload: { eventType: 'test' }
    });
    
    await router.routeMessage(message);
    
    expect(agentB.receivedMessages).toHaveLength(1);
  });
});
```

## 14. Monitoring and Observability

### 14.1 Metrics Collection

```typescript
interface ProtocolMetrics {
  messagesRouted: Counter;
  messageLatency: Histogram;
  routingErrors: Counter;
  agentResponseTime: Histogram;
  queueDepth: Gauge;
}

class MetricsCollector {
  collect(event: MetricEvent): void {
    switch (event.type) {
      case 'message_sent':
        this.metrics.messagesRouted.inc({ 
          from: event.from, 
          to: event.to, 
          type: event.messageType 
        });
        break;
      case 'message_received':
        this.metrics.messageLatency.observe(
          Date.now() - event.timestamp,
          { agent: event.agent }
        );
        break;
    }
  }
}
```

## 15. Future Enhancements

1. **WebRTC Support**: Direct peer-to-peer communication for low latency
2. **Message Compression**: Automatic compression for large payloads
3. **Circuit Breakers**: Automatic failure detection and recovery
4. **Message Deduplication**: Prevent duplicate message processing
5. **Distributed Tracing**: End-to-end request tracking across agents
6. **Protocol Versioning**: Support for multiple protocol versions
7. **GraphQL Support**: Query language for complex agent interactions

This protocol design provides a robust foundation for agent communication in UltraControl, ensuring reliable, secure, and performant interactions between different agent types.