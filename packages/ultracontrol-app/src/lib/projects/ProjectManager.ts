/**
 * Project Manager
 * 
 * Manages project lifecycle and orchestrates tools
 */

import type { Project } from '../interfaces';
import { AgentOrchestrator } from '../agents/orchestrator/AgentOrchestrator';
import { RuntimeManager } from '../runtime/RuntimeAbstraction';
import { EventService } from '../services/EventService';

export interface ProjectManagerConfig {
  orchestrator: AgentOrchestrator;
  runtimeManager?: RuntimeManager;
  eventService?: EventService;
  integrations?: {
    bolt?: any;
    devin?: any;
    openHands?: any;
  };
}

export class ProjectManager {
  private projects: Map<string, Project> = new Map();
  private config: ProjectManagerConfig;

  constructor(config: ProjectManagerConfig) {
    this.config = config;
  }

  async createProject(params: {
    name: string;
    type: string;
    description?: string;
    features?: string[];
    stack?: any;
  }): Promise<Project> {
    const project: Project = {
      id: `project-${Date.now()}`,
      name: params.name,
      type: params.type as any,
      description: params.description,
      features: params.features || [],
      stack: params.stack,
      status: 'planning',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.projects.set(project.id, project);

    // Emit project created event
    if (this.config.eventService) {
      this.config.eventService.emit('action', {
        type: 'project:created',
        payload: { project }
      });
    }

    return project;
  }

  getProject(id: string): Project | undefined {
    return this.projects.get(id);
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project ${id} not found`);
    }

    const updatedProject = {
      ...project,
      ...updates,
      updatedAt: new Date()
    };

    this.projects.set(id, updatedProject);

    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    this.projects.delete(id);
  }

  listProjects(): Project[] {
    return Array.from(this.projects.values());
  }
}