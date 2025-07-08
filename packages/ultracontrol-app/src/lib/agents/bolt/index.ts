/**
 * Bolt.new Agent Integration
 * 
 * Exports the Bolt executor agent and related utilities for integration
 * with the UltraControl platform.
 */

export { BoltExecutorAgent } from './BoltExecutorAgent';
export { BoltActionAdapter, BoltActionQueue, BoltActionHistory } from './BoltActionAdapter';

// Re-export types
export type { BoltExecutorConfig } from './BoltExecutorAgent';

/**
 * Factory function to create a Bolt executor agent
 */
export async function createBoltExecutor(
  webcontainerPromise: Promise<any>,
  router: any,
  config?: {
    workDir?: string;
    enableHistory?: boolean;
    maxHistorySize?: number;
  }
): Promise<BoltExecutorAgent> {
  const { BoltExecutorAgent } = await import('./BoltExecutorAgent');
  
  const agent = new BoltExecutorAgent(
    {
      webcontainerPromise,
      workDir: config?.workDir
    },
    router
  );
  
  // Optionally set up history tracking
  if (config?.enableHistory) {
    const { BoltActionHistory } = await import('./BoltActionAdapter');
    const history = new BoltActionHistory(config.maxHistorySize);
    
    // Attach history to agent (would need to implement this)
    (agent as any).__history = history;
  }
  
  return agent;
}

/**
 * Bolt agent capabilities
 */
export const BOLT_CAPABILITIES = [
  'execute',
  'file:write',
  'file:read', 
  'file:delete',
  'webcontainer',
  'preview',
  'shell',
  'terminal'
] as const;

/**
 * Bolt agent metadata
 */
export const BOLT_AGENT_METADATA = {
  provider: 'bolt',
  version: '1.0.0',
  description: 'Bolt.new WebContainer-based execution agent',
  supportedActions: ['execute', 'write', 'read', 'delete', 'preview', 'terminal'],
  supportedFileTypes: ['*'], // Supports all file types
  maxFileSize: 10 * 1024 * 1024, // 10MB
  features: {
    webContainer: true,
    livePreview: true,
    terminal: true,
    fileSystem: true,
    processManagement: true
  }
} as const;