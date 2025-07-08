/**
 * Base Agent Message Handler
 * 
 * Abstract base class for handling agent messages in the UltraControl protocol.
 */

import type {
  AgentIdentity,
  AgentMessage,
  RequestMessage,
  ResponseMessage,
  CommandMessage,
  QueryMessage,
  EventMessage,
  NotificationMessage,
  HeartbeatMessage,
  ErrorMessage
} from './types';
import type { AgentMessageRouter } from './router';
import { generateId } from '@/lib/utils/id';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('AgentMessageHandler');

export abstract class AgentMessageHandler {
  protected identity: AgentIdentity;
  protected router: AgentMessageRouter;
  private messageHandlers: Map<string, Set<(message: AgentMessage) => void>> = new Map();
  
  constructor(identity: AgentIdentity, router: AgentMessageRouter) {
    this.identity = identity;
    this.router = router;
    
    // Register this handler with the router
    router.registerAgent(identity.id, this);
  }
  
  /**
   * Main message handling entry point
   */
  async handleMessage(message: AgentMessage): Promise<void> {
    try {
      // Pre-processing
      await this.beforeHandle(message);
      
      // Route to specific handler based on message type
      switch (message.type) {
        case 'request':
          await this.handleRequest(message as RequestMessage);
          break;
          
        case 'response':
          await this.handleResponse(message as ResponseMessage);
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
          
        case 'notification':
          await this.handleNotification(message as NotificationMessage);
          break;
          
        case 'heartbeat':
          await this.handleHeartbeat(message as HeartbeatMessage);
          break;
          
        case 'error':
          await this.handleError(message as ErrorMessage);
          break;
          
        default:
          await this.handleUnknown(message);
      }
      
      // Post-processing
      await this.afterHandle(message);
      
      // Notify any local subscribers
      this.notifySubscribers(message);
    } catch (error) {
      logger.error(`Error handling message ${message.id}:`, error);
      await this.handleMessageError(message, error);
    }
  }
  
  /**
   * Pre-processing hook
   */
  protected async beforeHandle(message: AgentMessage): Promise<void> {
    logger.debug(`Handling ${message.type} message from ${message.from.id}`);
  }
  
  /**
   * Post-processing hook
   */
  protected async afterHandle(message: AgentMessage): Promise<void> {
    // Update last active timestamp
    this.identity.metadata.lastActive = new Date().toISOString();
  }
  
  /**
   * Abstract methods to be implemented by subclasses
   */
  protected abstract handleRequest(message: RequestMessage): Promise<void>;
  protected abstract handleCommand(message: CommandMessage): Promise<void>;
  protected abstract handleQuery(message: QueryMessage): Promise<void>;
  protected abstract handleEvent(message: EventMessage): Promise<void>;
  
  /**
   * Default handlers that can be overridden
   */
  protected async handleResponse(message: ResponseMessage): Promise<void> {
    logger.debug(`Received response for ${message.correlationId}`);
  }
  
  protected async handleNotification(message: NotificationMessage): Promise<void> {
    logger.info(`Notification: ${message.payload.title} - ${message.payload.message}`);
  }
  
  protected async handleHeartbeat(message: HeartbeatMessage): Promise<void> {
    logger.debug(`Heartbeat from ${message.from.id}`);
  }
  
  protected async handleError(message: ErrorMessage): Promise<void> {
    logger.error(`Error from ${message.from.id}: ${message.payload.message}`);
  }
  
  protected async handleUnknown(message: AgentMessage): Promise<void> {
    logger.warn(`Unknown message type: ${message.type}`);
  }
  
  /**
   * Handle errors during message processing
   */
  protected async handleMessageError(message: AgentMessage, error: any): Promise<void> {
    // Send error response if this was a request
    if (message.type === 'request') {
      await this.sendResponse(message as RequestMessage, null, error);
    }
    
    // Send error notification
    await this.sendError(message.from, {
      code: 'HANDLER_ERROR',
      message: error.message || 'Unknown error',
      details: error.stack,
      recoverable: true
    });
  }
  
  /**
   * Send a response to a request
   */
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
  
  /**
   * Send an event
   */
  protected async sendEvent(eventType: string, data: any): Promise<void> {
    const event: EventMessage = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      from: this.identity,
      to: '*',
      type: 'event',
      payload: {
        eventType,
        data,
        source: this.identity.id
      }
    };
    
    await this.router.routeMessage(event);
  }
  
  /**
   * Send a notification
   */
  protected async sendNotification(
    to: AgentIdentity | '*',
    level: 'info' | 'warning' | 'error' | 'success',
    title: string,
    message: string,
    details?: any
  ): Promise<void> {
    const notification: NotificationMessage = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      from: this.identity,
      to,
      type: 'notification',
      payload: {
        level,
        title,
        message,
        details
      }
    };
    
    await this.router.routeMessage(notification);
  }
  
  /**
   * Send an error message
   */
  protected async sendError(
    to: AgentIdentity,
    error: {
      code: string;
      message: string;
      details?: any;
      recoverable: boolean;
    }
  ): Promise<void> {
    const errorMessage: ErrorMessage = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      version: '1.0',
      from: this.identity,
      to,
      type: 'error',
      payload: error
    };
    
    await this.router.routeMessage(errorMessage);
  }
  
  /**
   * Subscribe to specific message types
   */
  subscribe(messageType: string, handler: (message: AgentMessage) => void): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    
    this.messageHandlers.get(messageType)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers.get(messageType)?.delete(handler);
    };
  }
  
  /**
   * Notify local subscribers
   */
  private notifySubscribers(message: AgentMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          logger.error('Subscriber error:', error);
        }
      });
    }
  }
  
  /**
   * Get agent identity
   */
  getIdentity(): AgentIdentity {
    return { ...this.identity };
  }
  
  /**
   * Update agent status
   */
  protected updateStatus(status: AgentIdentity['status']): void {
    this.identity.status = status;
    this.identity.metadata.lastActive = new Date().toISOString();
  }
  
  /**
   * Cleanup when shutting down
   */
  async shutdown(): Promise<void> {
    this.updateStatus('offline');
    this.messageHandlers.clear();
    await this.router.unregisterAgent(this.identity.id);
  }
}