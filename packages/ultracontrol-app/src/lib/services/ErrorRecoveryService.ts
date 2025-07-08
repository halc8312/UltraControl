/**
 * Error Recovery Service
 * 
 * Handles error detection, classification, and recovery strategies
 */

import { EventService } from './EventService';
import { AgentOrchestrator } from '../agents/orchestrator/AgentOrchestrator';
import { systemErrors, recoveryAttempts } from '../store';
import type { SystemError, RecoveryAttempt, RecoveryStrategy } from '../interfaces';

export interface ErrorRecoveryConfig {
  eventService: EventService;
  orchestrator: AgentOrchestrator;
  maxRetries?: number;
  backoffMultiplier?: number;
  circuitBreakerThreshold?: number;
  errorStormThreshold?: number;
  errorStormWindow?: number; // milliseconds
}

export class ErrorRecoveryService {
  private config: Required<ErrorRecoveryConfig>;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private retryQueues: Map<string, RetryQueue> = new Map();

  constructor(config: ErrorRecoveryConfig) {
    this.config = {
      maxRetries: 3,
      backoffMultiplier: 2,
      circuitBreakerThreshold: 5,
      errorStormThreshold: 10,
      errorStormWindow: 60000, // 1 minute
      ...config
    };

    this.initializeErrorPatterns();
    this.setupEventListeners();
  }

  private initializeErrorPatterns() {
    // Common error patterns and their fixes
    this.errorPatterns.set('ModuleNotFoundError', {
      pattern: /Module not found: (.+)/,
      autoFix: true,
      strategy: 'create_missing_module'
    });

    this.errorPatterns.set('DependencyError', {
      pattern: /Cannot find module "(.+)"/,
      autoFix: true,
      strategy: 'install_dependency'
    });

    this.errorPatterns.set('ImportError', {
      pattern: /Cannot resolve '(.+)' from/,
      autoFix: true,
      strategy: 'fix_import_path'
    });
  }

  private setupEventListeners() {
    this.config.eventService.subscribe('error:occurred', (event) => {
      this.handleError(event.payload.error, event.payload.context);
    });
  }

  async handleError(error: Error, context: any): Promise<RecoveryResult> {
    // Log error to store
    const systemError: SystemError = {
      id: `error-${Date.now()}`,
      type: this.classifyError(error),
      service: context.service || 'unknown',
      message: error.message,
      timestamp: new Date(),
      severity: this.determineSeverity(error),
      stack: error.stack,
      context
    };

    const currentErrors = systemErrors.get();
    systemErrors.set([...currentErrors, systemError]);

    // Check for error storm
    if (this.detectErrorStorm(currentErrors)) {
      this.activateCircuitBreakers();
    }

    // Attempt recovery
    const recovery = await this.attemptRecovery(error, context);

    // Log recovery attempt
    const attempt: RecoveryAttempt = {
      id: `recovery-${Date.now()}`,
      errorId: systemError.id,
      strategy: recovery.strategy,
      success: recovery.success,
      timestamp: new Date(),
      result: recovery.result
    };

    const currentAttempts = recoveryAttempts.get();
    recoveryAttempts.set([...currentAttempts, attempt]);

    return recovery;
  }

  private classifyError(error: Error): string {
    const errorName = error.name;
    const errorMessage = error.message.toLowerCase();

    if (errorName === 'RateLimitError' || errorMessage.includes('rate limit')) {
      return 'rate_limit';
    }
    if (errorName === 'AuthenticationError' || errorMessage.includes('unauthorized')) {
      return 'authentication';
    }
    if (errorName === 'NetworkError' || errorMessage.includes('network')) {
      return 'network';
    }
    if (errorName === 'TimeoutError' || errorMessage.includes('timeout')) {
      return 'timeout';
    }
    if (errorName === 'ValidationError') {
      return 'validation';
    }
    if (errorName === 'RuntimeError' || errorName === 'RuntimeCrashError') {
      return 'runtime_crash';
    }
    if (errorName === 'OutOfMemoryError') {
      return 'memory';
    }
    if (errorName === 'PermissionError') {
      return 'permission';
    }

    return 'unknown';
  }

  private determineSeverity(error: Error): 'low' | 'medium' | 'high' | 'critical' {
    const errorType = this.classifyError(error);

    if (['authentication', 'permission'].includes(errorType)) {
      return 'critical';
    }
    if (['runtime_crash', 'memory', 'rate_limit'].includes(errorType)) {
      return 'high';
    }
    if (['network', 'timeout'].includes(errorType)) {
      return 'medium';
    }
    
    return 'low';
  }

  detectErrorStorm(errors: SystemError[]): boolean {
    const now = Date.now();
    const recentErrors = errors.filter(
      e => now - e.timestamp.getTime() < this.config.errorStormWindow
    );

    return recentErrors.length >= this.config.errorStormThreshold;
  }

  private activateCircuitBreakers() {
    const services = new Set(systemErrors.get().map(e => e.service));
    
    services.forEach(service => {
      const breaker = this.getOrCreateCircuitBreaker(service);
      breaker.open();
    });
  }

  getCircuitBreakerStatus(service: string): 'open' | 'closed' | 'half-open' {
    const breaker = this.circuitBreakers.get(service);
    return breaker?.status || 'closed';
  }

  private getOrCreateCircuitBreaker(service: string): CircuitBreaker {
    if (!this.circuitBreakers.has(service)) {
      this.circuitBreakers.set(service, new CircuitBreaker(service, {
        threshold: this.config.circuitBreakerThreshold,
        resetTimeout: 5000
      }));
    }
    return this.circuitBreakers.get(service)!;
  }

  private async attemptRecovery(error: Error, context: any): Promise<RecoveryResult> {
    const errorType = this.classifyError(error);

    switch (errorType) {
      case 'rate_limit':
        return this.handleRateLimitError(error, context);
      case 'authentication':
        return this.handleAuthError(error, context);
      case 'network':
      case 'timeout':
        return this.handleNetworkError(error, context);
      case 'runtime_crash':
        return this.handleRuntimeCrash(error, context);
      case 'memory':
        return this.handleMemoryError(error, context);
      case 'permission':
        return this.handlePermissionError(error, context);
      default:
        return this.handleGenericError(error, context);
    }
  }

  private async handleRateLimitError(error: any, context: any): Promise<RecoveryResult> {
    const retryAfter = error.retryAfter || 60;
    
    return {
      success: true,
      strategy: 'wait_and_retry',
      result: {
        waitTime: retryAfter * 1000,
        fallbackUsed: !!context.fallbackModels
      }
    };
  }

  private async handleAuthError(error: Error, context: any): Promise<RecoveryResult> {
    return {
      success: false,
      strategy: 'require_user_action',
      error: 'Authentication failed',
      result: {
        userAction: 'update_api_key',
        service: context.service
      }
    };
  }

  private async handleNetworkError(error: Error, context: any): Promise<RecoveryResult> {
    const retryQueue = this.getOrCreateRetryQueue(context.operation);
    
    if (context.retryCount < this.config.maxRetries) {
      const delay = Math.pow(this.config.backoffMultiplier, context.retryCount) * 1000;
      
      retryQueue.add({
        operation: context.operation,
        context: { ...context, retryCount: (context.retryCount || 0) + 1 },
        delay
      });

      return {
        success: true,
        strategy: 'retry_with_backoff',
        result: {
          retryDelay: delay,
          attemptNumber: context.retryCount + 1
        }
      };
    }

    return {
      success: false,
      strategy: 'max_retries_exceeded',
      error: 'Maximum retry attempts reached'
    };
  }

  private async handleRuntimeCrash(error: any, context: any): Promise<RecoveryResult> {
    return {
      success: true,
      strategy: 'restart_runtime',
      result: {
        oldRuntimeId: context.runtime?.id,
        newRuntimeId: `runtime-${Date.now()}`
      }
    };
  }

  private async handleMemoryError(error: any, context: any): Promise<RecoveryResult> {
    const currentLimit = error.memoryLimit || 512 * 1024 * 1024;
    const newLimit = currentLimit * 2;

    return {
      success: true,
      strategy: 'increase_memory_limit',
      result: {
        oldMemoryLimit: currentLimit,
        newMemoryLimit: newLimit
      }
    };
  }

  private async handlePermissionError(error: any, context: any): Promise<RecoveryResult> {
    // Security check - don't attempt to bypass permissions
    return {
      success: false,
      strategy: 'abort_dangerous_operation',
      error: 'Operation blocked by security policy',
      result: {
        blockedPath: error.path,
        operation: error.operation
      }
    };
  }

  private async handleGenericError(error: Error, context: any): Promise<RecoveryResult> {
    // Check if we have an auto-fix pattern
    for (const [name, pattern] of this.errorPatterns) {
      if (pattern.pattern.test(error.message) && pattern.autoFix) {
        return this.attemptAutoFix(error);
      }
    }

    return {
      success: false,
      strategy: 'no_recovery_available',
      error: error.message
    };
  }

  async attemptAutoFix(error: Error): Promise<RecoveryResult> {
    const errorName = error.name;
    const pattern = this.errorPatterns.get(errorName);

    if (!pattern || !pattern.autoFix) {
      return {
        success: false,
        strategy: 'no_autofix_available',
        error: 'No automatic fix available for this error'
      };
    }

    switch (pattern.strategy) {
      case 'create_missing_module':
        const moduleMatch = error.message.match(/Module not found: (.+)/);
        if (moduleMatch) {
          return {
            success: true,
            fixType: 'create_missing_module',
            strategy: 'autofix',
            actions: [{
              type: 'create_file',
              path: moduleMatch[1] + '.tsx',
              content: this.generateModuleTemplate(moduleMatch[1])
            }]
          };
        }
        break;

      case 'install_dependency':
        const packageMatch = error.message.match(/Cannot find module "(.+)"/);
        if (packageMatch) {
          return {
            success: true,
            fixType: 'install_dependency',
            strategy: 'autofix',
            actions: [{
              type: 'run_command',
              command: `npm install ${packageMatch[1]}`
            }]
          };
        }
        break;
    }

    return {
      success: false,
      strategy: 'autofix_failed',
      error: 'Auto-fix pattern matched but execution failed'
    };
  }

  private generateModuleTemplate(modulePath: string): string {
    const componentName = modulePath.split('/').pop()?.replace('.tsx', '') || 'Component';
    
    return `import React from 'react';

export interface ${componentName}Props {
  // Add props here
}

export const ${componentName}: React.FC<${componentName}Props> = (props) => {
  return (
    <div>
      <h1>${componentName}</h1>
      {/* Add component implementation */}
    </div>
  );
};

export default ${componentName};`;
  }

  async executeTaskWithRetry(task: any, executor: () => Promise<any>): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        return await executor();
      } catch (error: any) {
        lastError = error;
        
        if (attempt < this.config.maxRetries - 1) {
          const delay = Math.pow(this.config.backoffMultiplier, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  prioritizeErrors(errors: SystemError[]): SystemError[] {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    
    return [...errors].sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      if (severityDiff !== 0) return severityDiff;
      
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  async generateErrorReport(options: ErrorReportOptions): Promise<ErrorReport> {
    const errors = systemErrors.get().filter(e => {
      const inTimeRange = e.timestamp >= options.timeRange.start && 
                         e.timestamp <= options.timeRange.end;
      return inTimeRange;
    });

    const recoveries = recoveryAttempts.get().filter(r => {
      const inTimeRange = r.timestamp >= options.timeRange.start && 
                         r.timestamp <= options.timeRange.end;
      return inTimeRange && (options.includeResolved || !r.success);
    });

    const errorsByService = this.groupBy(errors, 'service');
    const successfulRecoveries = recoveries.filter(r => r.success).length;
    const totalRecoveries = recoveries.length;

    return {
      summary: {
        totalErrors: errors.length,
        criticalErrors: errors.filter(e => e.severity === 'critical').length,
        recoveryRate: totalRecoveries > 0 ? successfulRecoveries / totalRecoveries : 0,
        mostCommonError: this.getMostCommon(errors.map(e => e.type))
      },
      errorsByService,
      resolutionStats: {
        successful: successfulRecoveries,
        failed: totalRecoveries - successfulRecoveries,
        averageRecoveryTime: this.calculateAverageRecoveryTime(errors, recoveries)
      },
      recommendations: this.generateRecommendations(errors, recoveries)
    };
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const value = String(item[key]);
      (groups[value] = groups[value] || []).push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private getMostCommon(items: string[]): string {
    const counts = items.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';
  }

  private calculateAverageRecoveryTime(errors: SystemError[], recoveries: RecoveryAttempt[]): number {
    const recoveryTimes: number[] = [];

    recoveries.forEach(recovery => {
      const error = errors.find(e => e.id === recovery.errorId);
      if (error && recovery.success) {
        const time = recovery.timestamp.getTime() - error.timestamp.getTime();
        recoveryTimes.push(time);
      }
    });

    if (recoveryTimes.length === 0) return 0;
    
    return recoveryTimes.reduce((sum, time) => sum + time, 0) / recoveryTimes.length;
  }

  private generateRecommendations(errors: SystemError[], recoveries: RecoveryAttempt[]): string[] {
    const recommendations: string[] = [];
    
    const errorTypes = this.groupBy(errors, 'type');
    
    if (errorTypes.authentication?.length > 2) {
      recommendations.push('Multiple authentication errors detected. Consider reviewing API key configuration.');
    }
    
    if (errorTypes.rate_limit?.length > 5) {
      recommendations.push('Frequent rate limit errors. Consider implementing request throttling or upgrading API plan.');
    }
    
    if (errorTypes.memory?.length > 0) {
      recommendations.push('Memory errors detected. Consider optimizing memory usage or increasing resource limits.');
    }

    const failedRecoveries = recoveries.filter(r => !r.success);
    if (failedRecoveries.length > recoveries.length * 0.5) {
      recommendations.push('High recovery failure rate. Review error recovery strategies.');
    }

    return recommendations;
  }

  private getOrCreateRetryQueue(operation: string): RetryQueue {
    if (!this.retryQueues.has(operation)) {
      this.retryQueues.set(operation, new RetryQueue());
    }
    return this.retryQueues.get(operation)!;
  }
}

// Helper classes
class CircuitBreaker {
  status: 'open' | 'closed' | 'half-open' = 'closed';
  private failures = 0;
  private lastFailure = 0;
  private resetTimer?: NodeJS.Timeout;

  constructor(
    private service: string,
    private config: { threshold: number; resetTimeout: number }
  ) {}

  open() {
    this.status = 'open';
    this.resetTimer = setTimeout(() => {
      this.status = 'half-open';
      this.failures = 0;
    }, this.config.resetTimeout);
  }

  recordSuccess() {
    this.failures = 0;
    this.status = 'closed';
  }

  recordFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    
    if (this.failures >= this.config.threshold) {
      this.open();
    }
  }
}

class RetryQueue {
  private queue: RetryItem[] = [];
  private processing = false;

  add(item: RetryItem) {
    this.queue.push(item);
    if (!this.processing) {
      this.process();
    }
  }

  private async process() {
    this.processing = true;
    
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      await new Promise(resolve => setTimeout(resolve, item.delay));
      // In real implementation, would execute the retry here
    }
    
    this.processing = false;
  }
}

// Types
interface RecoveryResult {
  success: boolean;
  strategy: string;
  result?: any;
  error?: string;
  fixType?: string;
  actions?: any[];
}

interface ErrorPattern {
  pattern: RegExp;
  autoFix: boolean;
  strategy: string;
}

interface RetryItem {
  operation: string;
  context: any;
  delay: number;
}

interface ErrorReportOptions {
  timeRange: {
    start: Date;
    end: Date;
  };
  includeResolved: boolean;
  groupByService?: boolean;
}

interface ErrorReport {
  summary: {
    totalErrors: number;
    criticalErrors: number;
    recoveryRate: number;
    mostCommonError: string;
  };
  errorsByService: Record<string, SystemError[]>;
  resolutionStats: {
    successful: number;
    failed: number;
    averageRecoveryTime: number;
  };
  recommendations: string[];
}