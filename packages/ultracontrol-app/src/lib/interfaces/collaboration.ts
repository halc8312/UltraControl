/**
 * Collaboration interfaces for multi-agent coordination
 */

export interface AgentCollaboration {
  id: string;
  initiator: string;
  target: string | string[];
  action: string;
  data?: any;
  timestamp: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  result?: any;
}

export interface AgentMetrics {
  load: number; // 0-1
  queuedTasks: number;
  averageCompletionTime?: number; // milliseconds
  successRate?: number; // 0-1
  specializations?: string[];
}

export interface TaskAssignment {
  taskId: string;
  assignedTo: string;
  matchScore: number;
  reason?: string;
  alternativeAgents?: string[];
}

export interface ResourceOptimization {
  agent: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
  suggestions: string[];
  estimatedImpact?: {
    cpuReduction?: number;
    memoryReduction?: number;
    latencyReduction?: number;
  };
}

export interface ConflictResolution {
  hasConflict: boolean;
  type?: 'line_conflict' | 'semantic_conflict' | 'dependency_conflict';
  conflictingAgents?: string[];
  file?: string;
  resolution?: {
    success: boolean;
    mergedContent?: string;
    strategy: string;
    explanation: string;
  };
}