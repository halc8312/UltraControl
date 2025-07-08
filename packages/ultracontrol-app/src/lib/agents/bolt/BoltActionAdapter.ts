/**
 * Adapter to convert UltraControl agent messages to Bolt actions
 * 
 * This module bridges the gap between UltraControl's agent protocol
 * and bolt.new's action system.
 */

import type { BoltAction, FileAction, ShellAction, StartAction } from '@bolt/types/actions';
import type { RequestMessage } from '@/lib/protocols/types';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('BoltActionAdapter');

export class BoltActionAdapter {
  /**
   * Convert an agent request message to a Bolt action
   */
  static toBoltAction(message: RequestMessage): BoltAction | null {
    const { action, params } = message.payload;
    
    switch (action) {
      case 'execute':
        return this.createShellAction(params.execute);
        
      case 'write':
        return this.createFileAction(params.write);
        
      case 'start':
        return this.createStartAction(params.start);
        
      default:
        logger.warn(`No Bolt action mapping for: ${action}`);
        return null;
    }
  }
  
  /**
   * Create a shell action from execute parameters
   */
  private static createShellAction(params: any): ShellAction {
    return {
      type: 'shell',
      content: params.command
    };
  }
  
  /**
   * Create a file action from write parameters
   */
  private static createFileAction(params: any): FileAction {
    return {
      type: 'file',
      filePath: params.path,
      content: params.content
    };
  }
  
  /**
   * Create a start action from start parameters
   */
  private static createStartAction(params: any): StartAction {
    return {
      type: 'start',
      content: params.command || 'npm run dev'
    };
  }
  
  /**
   * Convert Bolt action results to agent response format
   */
  static fromBoltResult(action: BoltAction, result: any): any {
    switch (action.type) {
      case 'shell':
        return {
          type: 'shell',
          exitCode: result.exitCode || 0,
          output: result.output || '',
          error: result.error || ''
        };
        
      case 'file':
        return {
          type: 'file',
          path: action.filePath,
          written: true,
          size: action.content.length
        };
        
      case 'start':
        return {
          type: 'start',
          started: true,
          process: result.processId || 'unknown'
        };
        
      default:
        return result;
    }
  }
  
  /**
   * Extract action metadata for tracking
   */
  static getActionMetadata(action: BoltAction): Record<string, any> {
    const metadata: Record<string, any> = {
      type: action.type,
      timestamp: new Date().toISOString()
    };
    
    if (action.type === 'file') {
      metadata.filePath = action.filePath;
      metadata.contentLength = action.content.length;
    } else if (action.type === 'shell' || action.type === 'start') {
      metadata.command = action.content;
    }
    
    return metadata;
  }
}

/**
 * Action queue for managing Bolt action execution
 */
export class BoltActionQueue {
  private queue: Array<{
    id: string;
    action: BoltAction;
    callback: (result: any) => void;
    priority: number;
  }> = [];
  
  private processing = false;
  
  /**
   * Add an action to the queue
   */
  enqueue(
    id: string, 
    action: BoltAction, 
    callback: (result: any) => void,
    priority: number = 0
  ): void {
    this.queue.push({ id, action, callback, priority });
    
    // Sort by priority (higher priority first)
    this.queue.sort((a, b) => b.priority - a.priority);
    
    if (!this.processing) {
      this.processNext();
    }
  }
  
  /**
   * Process the next action in the queue
   */
  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }
    
    this.processing = true;
    const item = this.queue.shift()!;
    
    try {
      // Execute action (this would be connected to actual Bolt runtime)
      const result = await this.executeAction(item.action);
      item.callback(result);
    } catch (error) {
      logger.error(`Failed to execute action ${item.id}:`, error);
      item.callback({ error: error.message });
    }
    
    // Process next item
    this.processNext();
  }
  
  /**
   * Execute a Bolt action (placeholder - would connect to actual runtime)
   */
  private async executeAction(action: BoltAction): Promise<any> {
    // This would be replaced with actual Bolt action execution
    logger.debug('Executing action:', action);
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true });
      }, 100);
    });
  }
  
  /**
   * Get current queue size
   */
  get size(): number {
    return this.queue.length;
  }
  
  /**
   * Clear the queue
   */
  clear(): void {
    this.queue = [];
  }
}

/**
 * Bolt action history tracker
 */
export class BoltActionHistory {
  private history: Array<{
    id: string;
    action: BoltAction;
    metadata: Record<string, any>;
    result?: any;
    error?: string;
    startTime: number;
    endTime?: number;
  }> = [];
  
  private maxSize: number;
  
  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }
  
  /**
   * Record action start
   */
  recordStart(id: string, action: BoltAction): void {
    this.history.push({
      id,
      action,
      metadata: BoltActionAdapter.getActionMetadata(action),
      startTime: Date.now()
    });
    
    // Trim history if needed
    if (this.history.length > this.maxSize) {
      this.history.shift();
    }
  }
  
  /**
   * Record action completion
   */
  recordComplete(id: string, result: any): void {
    const entry = this.history.find(h => h.id === id);
    if (entry) {
      entry.result = result;
      entry.endTime = Date.now();
    }
  }
  
  /**
   * Record action error
   */
  recordError(id: string, error: string): void {
    const entry = this.history.find(h => h.id === id);
    if (entry) {
      entry.error = error;
      entry.endTime = Date.now();
    }
  }
  
  /**
   * Get action history
   */
  getHistory(filter?: {
    type?: string;
    since?: number;
    status?: 'completed' | 'error' | 'running';
  }): any[] {
    let filtered = this.history;
    
    if (filter) {
      if (filter.type) {
        filtered = filtered.filter(h => h.action.type === filter.type);
      }
      
      if (filter.since) {
        filtered = filtered.filter(h => h.startTime >= filter.since);
      }
      
      if (filter.status) {
        switch (filter.status) {
          case 'completed':
            filtered = filtered.filter(h => h.result && !h.error);
            break;
          case 'error':
            filtered = filtered.filter(h => h.error);
            break;
          case 'running':
            filtered = filtered.filter(h => !h.endTime);
            break;
        }
      }
    }
    
    return filtered.map(h => ({
      id: h.id,
      type: h.action.type,
      metadata: h.metadata,
      status: h.error ? 'error' : h.result ? 'completed' : 'running',
      duration: h.endTime ? h.endTime - h.startTime : undefined,
      startTime: h.startTime,
      endTime: h.endTime
    }));
  }
  
  /**
   * Get statistics
   */
  getStats(): Record<string, any> {
    const total = this.history.length;
    const completed = this.history.filter(h => h.result && !h.error).length;
    const errors = this.history.filter(h => h.error).length;
    const running = this.history.filter(h => !h.endTime).length;
    
    const byType = this.history.reduce((acc, h) => {
      acc[h.action.type] = (acc[h.action.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const avgDuration = this.history
      .filter(h => h.endTime)
      .reduce((sum, h) => sum + (h.endTime! - h.startTime), 0) / 
      (total - running || 1);
    
    return {
      total,
      completed,
      errors,
      running,
      byType,
      avgDuration: Math.round(avgDuration)
    };
  }
}