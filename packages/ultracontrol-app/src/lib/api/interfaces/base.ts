// packages/ultracontrol-app/src/lib/api/interfaces/base.ts

/**
 * Common API interface types for UltraControl unified system
 */

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: ApiMetadata;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
}

export interface ApiMetadata {
  timestamp: string;
  requestId: string;
  version: string;
  duration?: number;
}

// Pagination types
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
  cursor?: string;
}

// Common entity types
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface IdentifiableEntity {
  id: string;
}

// Operation types
export type OperationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Operation extends BaseEntity {
  type: string;
  status: OperationStatus;
  progress?: number;
  result?: any;
  error?: ApiError;
  startedAt?: string;
  completedAt?: string;
}

// Resource types
export interface Resource extends BaseEntity {
  name: string;
  type: string;
  metadata: Record<string, any>;
}

// Event types for real-time updates
export interface ApiEvent<T = any> {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  data: T;
}

// Capability types
export interface Capability {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  configuration?: Record<string, any>;
}

// Authentication types
export interface AuthContext {
  userId?: string;
  sessionId?: string;
  permissions?: string[];
  metadata?: Record<string, any>;
}

// Request context
export interface RequestContext {
  auth?: AuthContext;
  requestId: string;
  timestamp: string;
  source: string;
  metadata?: Record<string, any>;
}

// API Client configuration
export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  auth?: {
    type: 'apiKey' | 'bearer' | 'basic' | 'custom';
    credentials: any;
  };
  retry?: {
    maxAttempts: number;
    delay: number;
    backoff?: 'linear' | 'exponential';
  };
}

// Health check types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  services: HealthServiceStatus[];
}

export interface HealthServiceStatus {
  name: string;
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  error?: string;
  metadata?: Record<string, any>;
}