/**
 * Agent Selector for UltraControl
 * 
 * Selects the best agent for a given task based on capabilities and availability
 */

import type { AgentIdentity } from '@/lib/protocols/types';
import type { Task } from './TaskDecomposer';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('AgentSelector');

export interface AgentSelector {
  selectAgent(task: Task, availableAgents: AgentIdentity[]): Promise<AgentIdentity | null>;
}

export interface AgentScore {
  agent: AgentIdentity;
  score: number;
  reasons: string[];
}

/**
 * Optimal Agent Selector
 * 
 * Selects the best agent based on multiple criteria:
 * - Capability matching
 * - Current workload
 * - Historical performance
 * - Task type affinity
 */
export class OptimalAgentSelector implements AgentSelector {
  async selectAgent(task: Task, availableAgents: AgentIdentity[]): Promise<AgentIdentity | null> {
    if (availableAgents.length === 0) {
      logger.warn('No available agents');
      return null;
    }
    
    // Score each agent
    const scores = await Promise.all(
      availableAgents.map(agent => this.scoreAgent(agent, task))
    );
    
    // Sort by score (highest first)
    scores.sort((a, b) => b.score - a.score);
    
    // Log selection reasoning
    if (scores.length > 0) {
      logger.info(`Selected agent ${scores[0].agent.id} for task ${task.name}`, {
        score: scores[0].score,
        reasons: scores[0].reasons
      });
    }
    
    return scores[0]?.score > 0 ? scores[0].agent : null;
  }
  
  private async scoreAgent(agent: AgentIdentity, task: Task): Promise<AgentScore> {
    let score = 0;
    const reasons: string[] = [];
    
    // 1. Capability matching (40 points max)
    const capabilityScore = this.scoreCapabilities(agent, task);
    score += capabilityScore.score;
    reasons.push(...capabilityScore.reasons);
    
    // 2. Availability (30 points max)
    const availabilityScore = this.scoreAvailability(agent);
    score += availabilityScore.score;
    reasons.push(...availabilityScore.reasons);
    
    // 3. Task type affinity (20 points max)
    const affinityScore = this.scoreTaskAffinity(agent, task);
    score += affinityScore.score;
    reasons.push(...affinityScore.reasons);
    
    // 4. Performance history (10 points max)
    const performanceScore = this.scorePerformance(agent);
    score += performanceScore.score;
    reasons.push(...performanceScore.reasons);
    
    return { agent, score, reasons };
  }
  
  private scoreCapabilities(agent: AgentIdentity, task: Task): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    
    // Check required capabilities
    if (task.requiredCapabilities && task.requiredCapabilities.length > 0) {
      const matchedCapabilities = task.requiredCapabilities.filter(cap => 
        agent.capabilities.includes(cap)
      );
      
      const matchRatio = matchedCapabilities.length / task.requiredCapabilities.length;
      score = Math.round(matchRatio * 40);
      
      if (matchedCapabilities.length === task.requiredCapabilities.length) {
        reasons.push('Has all required capabilities');
      } else if (matchedCapabilities.length > 0) {
        reasons.push(`Has ${matchedCapabilities.length}/${task.requiredCapabilities.length} required capabilities`);
      } else {
        reasons.push('Missing required capabilities');
      }
    } else {
      // No specific capabilities required, give base score
      score = 20;
      reasons.push('No specific capabilities required');
    }
    
    // Bonus for additional relevant capabilities
    const relevantCapabilities = this.getRelevantCapabilities(task);
    const bonusCapabilities = relevantCapabilities.filter(cap => 
      agent.capabilities.includes(cap) && 
      !task.requiredCapabilities?.includes(cap)
    );
    
    if (bonusCapabilities.length > 0) {
      score += Math.min(10, bonusCapabilities.length * 2);
      reasons.push(`Has ${bonusCapabilities.length} bonus capabilities`);
    }
    
    return { score, reasons };
  }
  
  private scoreAvailability(agent: AgentIdentity): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    
    switch (agent.status) {
      case 'idle':
        score = 30;
        reasons.push('Agent is idle');
        break;
        
      case 'busy':
        score = 10;
        reasons.push('Agent is busy but available');
        break;
        
      case 'error':
        score = 0;
        reasons.push('Agent is in error state');
        break;
        
      case 'offline':
        score = -100; // Effectively disqualifies the agent
        reasons.push('Agent is offline');
        break;
    }
    
    // Check last active time
    const lastActive = new Date(agent.metadata.lastActive);
    const minutesSinceActive = (Date.now() - lastActive.getTime()) / 60000;
    
    if (minutesSinceActive < 1) {
      score += 5;
      reasons.push('Recently active');
    } else if (minutesSinceActive > 30) {
      score -= 5;
      reasons.push('Not recently active');
    }
    
    return { score, reasons };
  }
  
  private scoreTaskAffinity(agent: AgentIdentity, task: Task): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];
    
    // Check provider-task type affinity
    const affinityMap: Record<string, Record<string, number>> = {
      'bolt': {
        'frontend': 20,
        'backend': 10,
        'database': 0,
        'system': 5,
        'general': 10
      },
      'openhands': {
        'frontend': 10,
        'backend': 20,
        'database': 20,
        'system': 20,
        'general': 15
      },
      'devin': {
        'frontend': 15,
        'backend': 15,
        'database': 15,
        'system': 15,
        'general': 20
      }
    };
    
    const providerAffinity = affinityMap[agent.provider]?.[task.type] || 10;
    score = providerAffinity;
    
    if (providerAffinity >= 20) {
      reasons.push(`High affinity: ${agent.provider} excels at ${task.type} tasks`);
    } else if (providerAffinity >= 15) {
      reasons.push(`Good affinity: ${agent.provider} handles ${task.type} tasks well`);
    } else if (providerAffinity <= 5) {
      reasons.push(`Low affinity: ${agent.provider} not optimal for ${task.type} tasks`);
    }
    
    // Special case: WebContainer tasks
    if (task.requiredCapabilities?.includes('webcontainer') && agent.provider === 'bolt') {
      score += 5;
      reasons.push('WebContainer specialist');
    }
    
    // Special case: Docker/system tasks
    if ((task.requiredCapabilities?.includes('docker') || task.type === 'system') && 
        agent.provider === 'openhands') {
      score += 5;
      reasons.push('Docker/system specialist');
    }
    
    return { score, reasons };
  }
  
  private scorePerformance(agent: AgentIdentity): { score: number; reasons: string[] } {
    // In a real implementation, this would look at historical performance metrics
    // For now, we'll use agent metadata
    let score = 5; // Base score
    const reasons: string[] = [];
    
    // Check agent uptime
    const created = new Date(agent.metadata.created);
    const uptimeHours = (Date.now() - created.getTime()) / 3600000;
    
    if (uptimeHours > 24) {
      score += 3;
      reasons.push('Stable uptime');
    } else if (uptimeHours < 1) {
      score -= 2;
      reasons.push('Recently started');
    }
    
    // Check version (newer versions might have improvements)
    const version = agent.metadata.version;
    if (version && version.startsWith('1.')) {
      score += 2;
      reasons.push('Running stable version');
    }
    
    return { score, reasons };
  }
  
  private getRelevantCapabilities(task: Task): string[] {
    const capabilityMap: Record<string, string[]> = {
      'frontend': ['webcontainer', 'preview', 'file:write', 'file:read'],
      'backend': ['execute', 'file:write', 'file:read', 'terminal'],
      'database': ['execute', 'database', 'file:write'],
      'system': ['execute', 'docker', 'terminal', 'shell'],
      'general': ['execute', 'file:write', 'file:read']
    };
    
    return capabilityMap[task.type] || [];
  }
}

/**
 * Round Robin Agent Selector
 * 
 * Simple selector that distributes tasks evenly
 */
export class RoundRobinAgentSelector implements AgentSelector {
  private lastSelectedIndex = 0;
  
  async selectAgent(task: Task, availableAgents: AgentIdentity[]): Promise<AgentIdentity | null> {
    const eligibleAgents = availableAgents.filter(agent => 
      agent.status !== 'offline' && agent.status !== 'error'
    );
    
    if (eligibleAgents.length === 0) {
      return null;
    }
    
    // Select next agent in rotation
    this.lastSelectedIndex = (this.lastSelectedIndex + 1) % eligibleAgents.length;
    return eligibleAgents[this.lastSelectedIndex];
  }
}

/**
 * Capability-based Agent Selector
 * 
 * Selects agents based purely on capability matching
 */
export class CapabilityAgentSelector implements AgentSelector {
  async selectAgent(task: Task, availableAgents: AgentIdentity[]): Promise<AgentIdentity | null> {
    if (!task.requiredCapabilities || task.requiredCapabilities.length === 0) {
      // No specific requirements, select any available agent
      return availableAgents.find(agent => 
        agent.status !== 'offline' && agent.status !== 'error'
      ) || null;
    }
    
    // Find agents with all required capabilities
    const capableAgents = availableAgents.filter(agent => {
      if (agent.status === 'offline' || agent.status === 'error') {
        return false;
      }
      
      return task.requiredCapabilities!.every(cap => 
        agent.capabilities.includes(cap)
      );
    });
    
    if (capableAgents.length === 0) {
      logger.warn(`No agents found with capabilities: ${task.requiredCapabilities.join(', ')}`);
      return null;
    }
    
    // Prefer idle agents
    const idleAgent = capableAgents.find(agent => agent.status === 'idle');
    if (idleAgent) {
      return idleAgent;
    }
    
    // Otherwise return first capable agent
    return capableAgents[0];
  }
}

/**
 * Load-balanced Agent Selector
 * 
 * Selects the least busy agent
 */
export class LoadBalancedAgentSelector implements AgentSelector {
  private agentLoad: Map<string, number> = new Map();
  
  async selectAgent(task: Task, availableAgents: AgentIdentity[]): Promise<AgentIdentity | null> {
    const eligibleAgents = availableAgents.filter(agent => {
      if (agent.status === 'offline' || agent.status === 'error') {
        return false;
      }
      
      // Check capabilities if required
      if (task.requiredCapabilities && task.requiredCapabilities.length > 0) {
        return task.requiredCapabilities.every(cap => 
          agent.capabilities.includes(cap)
        );
      }
      
      return true;
    });
    
    if (eligibleAgents.length === 0) {
      return null;
    }
    
    // Find agent with lowest load
    let selectedAgent = eligibleAgents[0];
    let lowestLoad = this.agentLoad.get(selectedAgent.id) || 0;
    
    for (const agent of eligibleAgents) {
      const load = this.agentLoad.get(agent.id) || 0;
      
      // Prefer idle agents
      if (agent.status === 'idle' && selectedAgent.status !== 'idle') {
        selectedAgent = agent;
        lowestLoad = load;
      } else if (load < lowestLoad && agent.status === selectedAgent.status) {
        selectedAgent = agent;
        lowestLoad = load;
      }
    }
    
    // Update load
    this.agentLoad.set(selectedAgent.id, lowestLoad + 1);
    
    return selectedAgent;
  }
  
  /**
   * Decrease load when task completes
   */
  releaseAgent(agentId: string): void {
    const currentLoad = this.agentLoad.get(agentId) || 0;
    if (currentLoad > 0) {
      this.agentLoad.set(agentId, currentLoad - 1);
    }
  }
}