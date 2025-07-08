/**
 * Agent Message Router
 * 
 * Central component for routing messages between agents in the UltraControl protocol.
 */

import type {
  AgentMessage,
  AgentConnection,
  Route,
  QueuedMessage,
  Priority,
  MessageFilter,
  AgentIdentity
} from './types';
import type { AgentMessageHandler } from './handler';
import { PriorityQueue } from '@/lib/utils/priority-queue';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('AgentMessageRouter');

export class AgentMessageRouter {
  private agents: Map<string, AgentMessageHandler> = new Map();
  private connections: Map<string, AgentConnection> = new Map();
  private topics: Map<string, Set<string>> = new Map();
  private messageQueue: PriorityQueue<QueuedMessage>;
  private filters: Map<string, MessageFilter> = new Map();
  private processing = false;
  
  constructor() {
    this.messageQueue = new PriorityQueue((a, b) => {
      // Priority order: critical > high > normal > low
      const priorityValues = { critical: 3, high: 2, normal: 1, low: 0 };
      const aPriority = priorityValues[a.message.priority || 'normal'];
      const bPriority = priorityValues[b.message.priority || 'normal'];
      return bPriority - aPriority;
    });
  }
  
  /**
   * Register an agent handler
   */
  registerAgent(agentId: string, handler: AgentMessageHandler): void {
    logger.info(`Registering agent: ${agentId}`);
    this.agents.set(agentId, handler);
  }
  
  /**
   * Unregister an agent handler
   */
  async unregisterAgent(agentId: string): Promise<void> {
    logger.info(`Unregistering agent: ${agentId}`);
    this.agents.delete(agentId);
    this.connections.delete(agentId);
    
    // Remove from all topics
    this.topics.forEach(subscribers => {
      subscribers.delete(agentId);
    });
  }
  
  /**
   * Route a message to its destination(s)
   */
  async routeMessage(message: AgentMessage): Promise<void> {
    try {
      // Validate message
      this.validateMessage(message);
      
      // Determine routes
      const routes = this.determineRoutes(message);
      
      if (routes.length === 0) {
        logger.warn(`No routes found for message ${message.id}`);
        return;
      }
      
      // Queue or send immediately based on priority
      if (message.priority === 'critical') {
        // Send critical messages immediately
        await Promise.all(routes.map(route => this.sendDirect(route, message)));
      } else {
        // Queue other messages
        this.queueMessage(message, routes);
        this.processQueue();
      }
    } catch (error) {
      logger.error(`Failed to route message ${message.id}:`, error);
      throw error;
    }
  }
  
  /**
   * Subscribe to a topic
   */
  subscribeTopic(agentId: string, topic: string): void {
    if (!this.topics.has(topic)) {
      this.topics.set(topic, new Set());
    }
    this.topics.get(topic)!.add(agentId);
    logger.debug(`Agent ${agentId} subscribed to topic ${topic}`);
  }
  
  /**
   * Unsubscribe from a topic
   */
  unsubscribeTopic(agentId: string, topic: string): void {
    this.topics.get(topic)?.delete(agentId);
    logger.debug(`Agent ${agentId} unsubscribed from topic ${topic}`);
  }
  
  /**
   * Set message filter for an agent
   */
  setFilter(agentId: string, filter: MessageFilter): void {
    this.filters.set(agentId, filter);
  }
  
  /**
   * Validate message structure
   */
  private validateMessage(message: AgentMessage): void {
    if (!message.id || !message.timestamp || !message.version) {
      throw new Error('Invalid message: missing required fields');
    }
    
    if (!message.from || !message.to) {
      throw new Error('Invalid message: missing from/to fields');
    }
    
    if (!message.type || !message.payload) {
      throw new Error('Invalid message: missing type or payload');
    }
    
    // Check TTL
    if (message.ttl) {
      const age = Date.now() - new Date(message.timestamp).getTime();
      if (age > message.ttl) {
        throw new Error('Message TTL exceeded');
      }
    }
  }
  
  /**
   * Determine routes for a message
   */
  private determineRoutes(message: AgentMessage): Route[] {
    const routes: Route[] = [];
    
    if (message.to === '*') {
      // Broadcast to all agents
      for (const [agentId, agent] of this.agents) {
        if (agentId !== message.from.id && this.matchesFilter(agentId, message)) {
          routes.push({ type: 'broadcast', target: agentId });
        }
      }
    } else if (typeof message.to === 'string') {
      // String target - could be topic or agent ID
      if (message.to.startsWith('topic:')) {
        // Topic-based routing
        const topic = message.to.substring(6);
        const subscribers = this.topics.get(topic) || new Set();
        for (const agentId of subscribers) {
          if (this.matchesFilter(agentId, message)) {
            routes.push({ type: 'topic', target: agentId });
          }
        }
      } else {
        // Direct agent ID
        if (this.agents.has(message.to)) {
          routes.push({ type: 'direct', target: message.to });
        }
      }
    } else {
      // Direct routing to specific agent
      const targetId = message.to.id;
      if (this.agents.has(targetId)) {
        routes.push({ type: 'direct', target: targetId });
      }
    }
    
    return routes;
  }
  
  /**
   * Check if message matches agent's filter
   */
  private matchesFilter(agentId: string, message: AgentMessage): boolean {
    const filter = this.filters.get(agentId);
    if (!filter) return true;
    
    if (filter.type && !filter.type.includes(message.type)) {
      return false;
    }
    
    if (filter.from && !filter.from.includes(message.from.id)) {
      return false;
    }
    
    if (filter.priority) {
      const messagePriority = message.priority || 'normal';
      if (!filter.priority.includes(messagePriority)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Queue a message for delivery
   */
  private queueMessage(message: AgentMessage, routes: Route[]): void {
    this.messageQueue.enqueue({
      message,
      routes,
      attempts: 0
    });
  }
  
  /**
   * Process queued messages
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    
    this.processing = true;
    
    try {
      while (!this.messageQueue.isEmpty()) {
        const item = this.messageQueue.dequeue()!;
        
        // Process all routes for this message
        const results = await Promise.allSettled(
          item.routes.map(route => this.sendDirect(route, item.message))
        );
        
        // Check for failures
        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
          logger.warn(`Failed to deliver message ${item.message.id} to ${failures.length} targets`);
          
          // Retry logic could be implemented here
          if (item.attempts < 3) {
            item.attempts++;
            item.nextRetry = new Date(Date.now() + Math.pow(2, item.attempts) * 1000);
            this.messageQueue.enqueue(item);
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }
  
  /**
   * Send message directly to a target
   */
  private async sendDirect(route: Route, message: AgentMessage): Promise<void> {
    const handler = this.agents.get(route.target);
    
    if (!handler) {
      throw new Error(`Agent ${route.target} not found`);
    }
    
    try {
      await handler.handleMessage(message);
      logger.debug(`Delivered ${message.type} message ${message.id} to ${route.target}`);
    } catch (error) {
      logger.error(`Failed to deliver message to ${route.target}:`, error);
      throw error;
    }
  }
  
  /**
   * Get router statistics
   */
  getStats(): Record<string, any> {
    return {
      agents: this.agents.size,
      connections: this.connections.size,
      topics: this.topics.size,
      queueDepth: this.messageQueue.size(),
      filters: this.filters.size
    };
  }
  
  /**
   * Get registered agents
   */
  getAgents(): AgentIdentity[] {
    const agents: AgentIdentity[] = [];
    
    for (const handler of this.agents.values()) {
      agents.push(handler.getIdentity());
    }
    
    return agents;
  }
  
  /**
   * Find agents by capability
   */
  findAgentsByCapability(capability: string): AgentIdentity[] {
    return this.getAgents().filter(agent => 
      agent.capabilities.includes(capability)
    );
  }
  
  /**
   * Find agents by type
   */
  findAgentsByType(type: string): AgentIdentity[] {
    return this.getAgents().filter(agent => agent.type === type);
  }
}