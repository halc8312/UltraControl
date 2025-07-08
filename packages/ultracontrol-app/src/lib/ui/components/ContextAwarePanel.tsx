/**
 * Context-Aware Panel Component
 * 
 * Dynamically displays relevant information and actions based on:
 * - Current task type
 * - Active files
 * - Running processes
 * - Agent activities
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { createScopedLogger } from '@/lib/utils/logger';
import type { Task } from '@/lib/agents/orchestrator/TaskDecomposer';
import type { AgentIdentity } from '@/lib/protocols/types';

const logger = createScopedLogger('ContextAwarePanel');

export interface ContextItem {
  id: string;
  type: 'file' | 'process' | 'agent' | 'task' | 'suggestion' | 'error' | 'info';
  title: string;
  description?: string;
  data: any;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  timestamp: Date;
  actions?: ContextAction[];
}

export interface ContextAction {
  id: string;
  label: string;
  icon?: string;
  handler: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface ContextAwarePanelProps {
  maxItems?: number;
  autoHide?: boolean;
  position?: 'top' | 'right' | 'bottom' | 'left';
  onItemClick?: (item: ContextItem) => void;
}

export const ContextAwarePanel: React.FC<ContextAwarePanelProps> = ({
  maxItems = 10,
  autoHide = true,
  position = 'right',
  onItemClick
}) => {
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  
  // Get relevant data from stores
  // const currentTask = useStore(currentTaskStore);
  // const activeAgents = useStore(activeAgentsStore);
  // const openFiles = useStore(openFilesStore);
  // const runningProcesses = useStore(processesStore);

  // Simulate context gathering for demonstration
  useEffect(() => {
    const gatherContext = () => {
      const items: ContextItem[] = [];
      
      // Add current task context
      items.push({
        id: 'task-1',
        type: 'task',
        title: 'Current Task',
        description: 'Implementing user authentication',
        data: { taskId: 'task-1', type: 'backend' },
        priority: 'high',
        timestamp: new Date(),
        actions: [
          {
            id: 'view-details',
            label: 'View Details',
            handler: () => logger.info('Viewing task details')
          },
          {
            id: 'pause',
            label: 'Pause',
            handler: () => logger.info('Pausing task')
          }
        ]
      });
      
      // Add active agent context
      items.push({
        id: 'agent-1',
        type: 'agent',
        title: 'OpenHands Agent',
        description: 'Running Python server setup',
        data: { agentId: 'openhands-1', status: 'busy' },
        priority: 'normal',
        timestamp: new Date(),
        actions: [
          {
            id: 'view-logs',
            label: 'View Logs',
            handler: () => logger.info('Viewing agent logs')
          }
        ]
      });
      
      // Add file context
      items.push({
        id: 'file-1',
        type: 'file',
        title: 'server.py',
        description: 'Modified 2 minutes ago',
        data: { path: '/src/server.py', modified: true },
        priority: 'normal',
        timestamp: new Date(Date.now() - 120000),
        actions: [
          {
            id: 'open',
            label: 'Open',
            handler: () => logger.info('Opening file')
          },
          {
            id: 'diff',
            label: 'View Changes',
            handler: () => logger.info('Viewing diff')
          }
        ]
      });
      
      // Add process context
      items.push({
        id: 'process-1',
        type: 'process',
        title: 'npm run dev',
        description: 'Running on port 3000',
        data: { pid: 1234, port: 3000 },
        priority: 'normal',
        timestamp: new Date(),
        actions: [
          {
            id: 'restart',
            label: 'Restart',
            handler: () => logger.info('Restarting process')
          },
          {
            id: 'stop',
            label: 'Stop',
            handler: () => logger.info('Stopping process'),
            variant: 'danger'
          }
        ]
      });
      
      // Add suggestions based on context
      items.push({
        id: 'suggestion-1',
        type: 'suggestion',
        title: 'Add error handling',
        description: 'Consider adding try-catch blocks to handle database errors',
        data: { type: 'code-improvement', file: '/src/server.py' },
        priority: 'low',
        timestamp: new Date(),
        actions: [
          {
            id: 'apply',
            label: 'Apply Suggestion',
            handler: () => logger.info('Applying suggestion'),
            variant: 'primary'
          }
        ]
      });
      
      // Add error context if any
      items.push({
        id: 'error-1',
        type: 'error',
        title: 'Type Error in auth.ts',
        description: "Cannot read property 'id' of undefined",
        data: { file: '/src/auth.ts', line: 42 },
        priority: 'critical',
        timestamp: new Date(),
        actions: [
          {
            id: 'fix',
            label: 'Auto Fix',
            handler: () => logger.info('Attempting auto fix'),
            variant: 'primary'
          },
          {
            id: 'goto',
            label: 'Go to Error',
            handler: () => logger.info('Navigating to error')
          }
        ]
      });
      
      setContextItems(items);
    };
    
    // Initial gather
    gatherContext();
    
    // Simulate updates
    const interval = setInterval(() => {
      gatherContext();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Filter and sort items
  const displayItems = useMemo(() => {
    let items = [...contextItems];
    
    // Apply filter
    if (filter !== 'all') {
      items = items.filter(item => item.type === filter);
    }
    
    // Sort by priority and timestamp
    items.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      const aPriority = priorityOrder[a.priority || 'normal'];
      const bPriority = priorityOrder[b.priority || 'normal'];
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
    
    // Limit items
    return items.slice(0, maxItems);
  }, [contextItems, filter, maxItems]);

  // Auto-hide logic
  useEffect(() => {
    if (autoHide && displayItems.length === 0) {
      setIsExpanded(false);
    }
  }, [autoHide, displayItems]);

  const handleItemClick = (item: ContextItem) => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  const getItemIcon = (type: ContextItem['type']): string => {
    const iconMap = {
      file: '📄',
      process: '⚙️',
      agent: '🤖',
      task: '📋',
      suggestion: '💡',
      error: '❌',
      info: 'ℹ️'
    };
    return iconMap[type] || '📌';
  };

  const getItemClass = (item: ContextItem): string => {
    const baseClass = 'context-item';
    const typeClass = `context-item-${item.type}`;
    const priorityClass = item.priority ? `priority-${item.priority}` : '';
    
    return `${baseClass} ${typeClass} ${priorityClass}`.trim();
  };

  return (
    <div className={`context-aware-panel position-${position} ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Panel Header */}
      <div className="panel-header">
        <h3>Context</h3>
        <div className="header-actions">
          <select 
            className="filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="task">Tasks</option>
            <option value="agent">Agents</option>
            <option value="file">Files</option>
            <option value="process">Processes</option>
            <option value="error">Errors</option>
            <option value="suggestion">Suggestions</option>
          </select>
          
          <button
            className="toggle-button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>
      
      {/* Panel Content */}
      <div className="panel-content">
        {displayItems.length === 0 ? (
          <div className="empty-state">
            <p>No context items to display</p>
          </div>
        ) : (
          <div className="context-items">
            {displayItems.map(item => (
              <div
                key={item.id}
                className={getItemClass(item)}
                onClick={() => handleItemClick(item)}
              >
                <div className="item-header">
                  <span className="item-icon">{getItemIcon(item.type)}</span>
                  <span className="item-title">{item.title}</span>
                  <span className="item-time">
                    {formatRelativeTime(item.timestamp)}
                  </span>
                </div>
                
                {item.description && (
                  <div className="item-description">{item.description}</div>
                )}
                
                {item.actions && item.actions.length > 0 && (
                  <div className="item-actions">
                    {item.actions.map(action => (
                      <button
                        key={action.id}
                        className={`action-button ${action.variant || 'secondary'}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          action.handler();
                        }}
                      >
                        {action.icon && <span className="action-icon">{action.icon}</span>}
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Quick Actions */}
      <div className="panel-footer">
        <QuickActions context={displayItems} />
      </div>
    </div>
  );
};

// Quick Actions Component
interface QuickActionsProps {
  context: ContextItem[];
}

const QuickActions: React.FC<QuickActionsProps> = ({ context }) => {
  // Determine relevant quick actions based on context
  const quickActions = useMemo(() => {
    const actions = [];
    
    // Check for errors
    const hasErrors = context.some(item => item.type === 'error');
    if (hasErrors) {
      actions.push({
        id: 'fix-all-errors',
        label: 'Fix All Errors',
        icon: '🔧',
        handler: () => logger.info('Fixing all errors')
      });
    }
    
    // Check for running processes
    const hasProcesses = context.some(item => item.type === 'process');
    if (hasProcesses) {
      actions.push({
        id: 'restart-all',
        label: 'Restart All',
        icon: '🔄',
        handler: () => logger.info('Restarting all processes')
      });
    }
    
    // Always available actions
    actions.push({
      id: 'clear-context',
      label: 'Clear',
      icon: '🗑️',
      handler: () => logger.info('Clearing context')
    });
    
    return actions;
  }, [context]);
  
  return (
    <div className="quick-actions">
      {quickActions.map(action => (
        <button
          key={action.id}
          className="quick-action-button"
          onClick={action.handler}
          title={action.label}
        >
          <span className="action-icon">{action.icon}</span>
          <span className="action-label">{action.label}</span>
        </button>
      ))}
    </div>
  );
};

// Utility function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds > 0) return `${seconds}s ago`;
  return 'just now';
}

// Export utilities
export { formatRelativeTime };
export type { QuickActionsProps };