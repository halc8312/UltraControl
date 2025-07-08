/**
 * Logger Utility
 * 
 * Provides structured logging with different levels and scopes
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  scope: string;
  message: string;
  data?: any;
}

export interface Logger {
  debug(message: string, data?: any): void;
  info(message: string, data?: any): void;
  warn(message: string, data?: any): void;
  error(message: string, error?: any): void;
}

class LoggerImpl implements Logger {
  private scope: string;
  private minLevel: LogLevel;
  
  constructor(scope: string, minLevel: LogLevel = 'info') {
    this.scope = scope;
    this.minLevel = minLevel;
  }
  
  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }
  
  info(message: string, data?: any): void {
    this.log('info', message, data);
  }
  
  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }
  
  error(message: string, error?: any): void {
    this.log('error', message, error);
  }
  
  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      scope: this.scope,
      message,
      data
    };
    
    // In development, use console methods
    if (process.env.NODE_ENV === 'development') {
      const prefix = `[${entry.timestamp}] [${entry.scope}]`;
      
      switch (level) {
        case 'debug':
          console.debug(prefix, message, data);
          break;
        case 'info':
          console.info(prefix, message, data);
          break;
        case 'warn':
          console.warn(prefix, message, data);
          break;
        case 'error':
          console.error(prefix, message, data);
          break;
      }
    } else {
      // In production, could send to logging service
      console.log(JSON.stringify(entry));
    }
    
    // Store in buffer for retrieval
    logBuffer.push(entry);
    if (logBuffer.length > MAX_LOG_BUFFER) {
      logBuffer.shift();
    }
  }
  
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const minIndex = levels.indexOf(this.minLevel);
    const levelIndex = levels.indexOf(level);
    return levelIndex >= minIndex;
  }
}

// Global log buffer
const MAX_LOG_BUFFER = 1000;
const logBuffer: LogEntry[] = [];

// Logger factory
export function createScopedLogger(scope: string): Logger {
  const minLevel = (process.env.VITE_LOG_LEVEL as LogLevel) || 
                   (process.env.NODE_ENV === 'development' ? 'debug' : 'info');
  return new LoggerImpl(scope, minLevel);
}

// Global logger instance
export const logger = createScopedLogger('Global');

// Get recent logs
export function getRecentLogs(count: number = 100): LogEntry[] {
  return logBuffer.slice(-count);
}

// Clear log buffer
export function clearLogs(): void {
  logBuffer.length = 0;
}

// Filter logs by criteria
export function filterLogs(criteria: {
  level?: LogLevel;
  scope?: string;
  since?: Date;
  search?: string;
}): LogEntry[] {
  return logBuffer.filter(entry => {
    if (criteria.level && entry.level !== criteria.level) return false;
    if (criteria.scope && !entry.scope.includes(criteria.scope)) return false;
    if (criteria.since && new Date(entry.timestamp) < criteria.since) return false;
    if (criteria.search && !entry.message.toLowerCase().includes(criteria.search.toLowerCase())) return false;
    return true;
  });
}

// Export logs as text
export function exportLogs(logs: LogEntry[] = logBuffer): string {
  return logs.map(entry => 
    `${entry.timestamp} [${entry.level.toUpperCase()}] [${entry.scope}] ${entry.message}${
      entry.data ? '\n  Data: ' + JSON.stringify(entry.data, null, 2) : ''
    }`
  ).join('\n');
}

// Set global log level
export function setLogLevel(level: LogLevel): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('logLevel', level);
  }
}