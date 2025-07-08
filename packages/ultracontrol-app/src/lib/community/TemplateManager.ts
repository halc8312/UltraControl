/**
 * Template Manager
 * 
 * Manages project templates for sharing and reuse within the community
 */

import { createScopedLogger } from '@/lib/utils/logger';
import type { Agent } from '@/lib/agents/base/Agent';
import type { RuntimeEnvironment } from '@/lib/runtime/RuntimeAbstraction';

const logger = createScopedLogger('TemplateManager');

/**
 * Template metadata structure
 */
export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags: string[];
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  version: string;
  createdAt: Date;
  updatedAt: Date;
  downloads: number;
  rating: number;
  featured: boolean;
  
  // Technical details
  framework?: string;
  language?: string;
  dependencies?: Record<string, string>;
  requiredTools?: string[];
  
  // Content
  files: TemplateFile[];
  structure: DirectoryStructure;
  configuration?: TemplateConfiguration;
  
  // Usage
  instructions?: string;
  preview?: {
    images: string[];
    demoUrl?: string;
  };
}

export type TemplateCategory = 
  | 'web-app'
  | 'mobile-app'
  | 'desktop-app'
  | 'api'
  | 'microservice'
  | 'library'
  | 'cli-tool'
  | 'machine-learning'
  | 'data-science'
  | 'blockchain'
  | 'game'
  | 'documentation'
  | 'configuration'
  | 'other';

export interface TemplateFile {
  path: string;
  content: string;
  encoding: 'utf8' | 'base64';
  executable?: boolean;
}

export interface DirectoryStructure {
  name: string;
  type: 'file' | 'directory';
  children?: DirectoryStructure[];
}

export interface TemplateConfiguration {
  variables: TemplateVariable[];
  scripts?: TemplateScript[];
  postInstall?: string[];
}

export interface TemplateVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'choice';
  default?: any;
  required?: boolean;
  choices?: string[];
  validation?: string; // Regex pattern
}

export interface TemplateScript {
  name: string;
  description: string;
  command: string;
  env?: Record<string, string>;
}

export interface TemplateSearchOptions {
  query?: string;
  category?: TemplateCategory;
  tags?: string[];
  author?: string;
  framework?: string;
  language?: string;
  sortBy?: 'downloads' | 'rating' | 'date' | 'name';
  sortOrder?: 'asc' | 'desc';
  featured?: boolean;
  limit?: number;
  offset?: number;
}

export interface TemplateApplyOptions {
  targetPath: string;
  variables?: Record<string, any>;
  runtime?: RuntimeEnvironment;
  agent?: Agent;
  runPostInstall?: boolean;
  overwrite?: boolean;
}

export interface TemplateCreateOptions {
  sourcePath: string;
  name: string;
  description: string;
  category: TemplateCategory;
  tags?: string[];
  includePatterns?: string[];
  excludePatterns?: string[];
  variables?: TemplateVariable[];
  configuration?: TemplateConfiguration;
}

export class TemplateManager {
  private templates = new Map<string, Template>();
  private localStorage = new Map<string, Template>();
  private remoteEndpoint?: string;
  
  constructor(remoteEndpoint?: string) {
    this.remoteEndpoint = remoteEndpoint;
    this.loadLocalTemplates();
  }
  
  /**
   * Search for templates
   */
  async searchTemplates(options: TemplateSearchOptions = {}): Promise<Template[]> {
    logger.info('Searching templates:', options);
    
    let templates = Array.from(this.templates.values());
    
    // Filter by query
    if (options.query) {
      const query = options.query.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Filter by category
    if (options.category) {
      templates = templates.filter(t => t.category === options.category);
    }
    
    // Filter by tags
    if (options.tags && options.tags.length > 0) {
      templates = templates.filter(t => 
        options.tags!.some(tag => t.tags.includes(tag))
      );
    }
    
    // Filter by author
    if (options.author) {
      templates = templates.filter(t => 
        t.author.name.toLowerCase().includes(options.author!.toLowerCase()) ||
        t.author.id === options.author
      );
    }
    
    // Filter by framework
    if (options.framework) {
      templates = templates.filter(t => 
        t.framework?.toLowerCase() === options.framework!.toLowerCase()
      );
    }
    
    // Filter by language
    if (options.language) {
      templates = templates.filter(t => 
        t.language?.toLowerCase() === options.language!.toLowerCase()
      );
    }
    
    // Filter by featured
    if (options.featured !== undefined) {
      templates = templates.filter(t => t.featured === options.featured);
    }
    
    // Sort results
    const sortBy = options.sortBy || 'downloads';
    const sortOrder = options.sortOrder || 'desc';
    
    templates.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'downloads':
          comparison = a.downloads - b.downloads;
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    // Apply pagination
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    
    return templates.slice(offset, offset + limit);
  }
  
  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<Template | undefined> {
    // Check local cache first
    if (this.templates.has(templateId)) {
      return this.templates.get(templateId);
    }
    
    // Try to fetch from remote
    if (this.remoteEndpoint) {
      try {
        const response = await fetch(`${this.remoteEndpoint}/templates/${templateId}`);
        if (response.ok) {
          const template = await response.json();
          this.templates.set(templateId, template);
          return template;
        }
      } catch (error) {
        logger.error('Failed to fetch template:', error);
      }
    }
    
    return undefined;
  }
  
  /**
   * Apply a template to create a new project
   */
  async applyTemplate(
    templateId: string, 
    options: TemplateApplyOptions
  ): Promise<void> {
    const template = await this.getTemplate(templateId);
    
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    logger.info(`Applying template ${template.name} to ${options.targetPath}`);
    
    try {
      // Process template variables
      const variables = this.processVariables(template, options.variables || {});
      
      // Create directory structure
      await this.createDirectoryStructure(
        options.targetPath,
        template.structure,
        options.runtime
      );
      
      // Apply template files
      for (const file of template.files) {
        const processedContent = this.processTemplateContent(
          file.content,
          variables
        );
        
        const filePath = `${options.targetPath}/${file.path}`;
        
        if (options.runtime) {
          await options.runtime.writeFile(filePath, processedContent);
          
          if (file.executable) {
            await options.runtime.execute(`chmod +x ${filePath}`);
          }
        }
      }
      
      // Run post-install scripts if requested
      if (options.runPostInstall && template.configuration?.postInstall) {
        await this.runPostInstallScripts(
          template,
          options.targetPath,
          variables,
          options.runtime
        );
      }
      
      // Update download count
      template.downloads++;
      
      logger.info(`Template ${template.name} applied successfully`);
    } catch (error) {
      logger.error('Failed to apply template:', error);
      throw error;
    }
  }
  
  /**
   * Create a new template from existing project
   */
  async createTemplate(options: TemplateCreateOptions): Promise<Template> {
    logger.info('Creating template from:', options.sourcePath);
    
    const template: Template = {
      id: this.generateTemplateId(),
      name: options.name,
      description: options.description,
      category: options.category,
      tags: options.tags || [],
      author: {
        id: 'current-user', // Would get from auth context
        name: 'Current User'
      },
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      downloads: 0,
      rating: 0,
      featured: false,
      files: [],
      structure: { name: 'root', type: 'directory', children: [] }
    };
    
    // Scan source directory and build template
    // In a real implementation, this would scan the file system
    
    // Add configuration if provided
    if (options.configuration) {
      template.configuration = options.configuration;
    } else if (options.variables) {
      template.configuration = {
        variables: options.variables
      };
    }
    
    // Store locally
    this.localStorage.set(template.id, template);
    this.templates.set(template.id, template);
    
    return template;
  }
  
  /**
   * Share a template with the community
   */
  async shareTemplate(templateId: string): Promise<void> {
    const template = this.localStorage.get(templateId);
    
    if (!template) {
      throw new Error(`Local template ${templateId} not found`);
    }
    
    if (!this.remoteEndpoint) {
      throw new Error('Remote endpoint not configured');
    }
    
    logger.info(`Sharing template ${template.name}`);
    
    try {
      const response = await fetch(`${this.remoteEndpoint}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Would include auth token
        },
        body: JSON.stringify(template)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to share template: ${response.statusText}`);
      }
      
      logger.info(`Template ${template.name} shared successfully`);
    } catch (error) {
      logger.error('Failed to share template:', error);
      throw error;
    }
  }
  
  /**
   * Rate a template
   */
  async rateTemplate(templateId: string, rating: number): Promise<void> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
    
    const template = await this.getTemplate(templateId);
    
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    // In a real implementation, this would update the backend
    logger.info(`Rated template ${template.name} with ${rating} stars`);
  }
  
  /**
   * Get featured templates
   */
  async getFeaturedTemplates(): Promise<Template[]> {
    return this.searchTemplates({ featured: true, limit: 10 });
  }
  
  /**
   * Get popular templates
   */
  async getPopularTemplates(): Promise<Template[]> {
    return this.searchTemplates({ sortBy: 'downloads', limit: 10 });
  }
  
  /**
   * Get recent templates
   */
  async getRecentTemplates(): Promise<Template[]> {
    return this.searchTemplates({ sortBy: 'date', limit: 10 });
  }
  
  /**
   * Process template variables
   */
  private processVariables(
    template: Template,
    providedVariables: Record<string, any>
  ): Record<string, any> {
    const variables: Record<string, any> = {};
    
    if (!template.configuration?.variables) {
      return providedVariables;
    }
    
    for (const varDef of template.configuration.variables) {
      let value = providedVariables[varDef.name];
      
      // Use default if not provided
      if (value === undefined && varDef.default !== undefined) {
        value = varDef.default;
      }
      
      // Check required
      if (varDef.required && value === undefined) {
        throw new Error(`Required variable ${varDef.name} not provided`);
      }
      
      // Validate
      if (value !== undefined && varDef.validation) {
        const regex = new RegExp(varDef.validation);
        if (!regex.test(String(value))) {
          throw new Error(`Variable ${varDef.name} does not match pattern ${varDef.validation}`);
        }
      }
      
      // Check choices
      if (varDef.type === 'choice' && varDef.choices) {
        if (!varDef.choices.includes(value)) {
          throw new Error(`Variable ${varDef.name} must be one of: ${varDef.choices.join(', ')}`);
        }
      }
      
      variables[varDef.name] = value;
    }
    
    return variables;
  }
  
  /**
   * Process template content with variable substitution
   */
  private processTemplateContent(
    content: string,
    variables: Record<string, any>
  ): string {
    // Replace template variables in format {{variableName}}
    return content.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] !== undefined ? String(variables[varName]) : match;
    });
  }
  
  /**
   * Create directory structure
   */
  private async createDirectoryStructure(
    basePath: string,
    structure: DirectoryStructure,
    runtime?: RuntimeEnvironment,
    currentPath: string = ''
  ): Promise<void> {
    const fullPath = currentPath ? `${basePath}/${currentPath}` : basePath;
    
    if (structure.type === 'directory') {
      if (runtime) {
        await runtime.execute(`mkdir -p ${fullPath}`);
      }
      
      if (structure.children) {
        for (const child of structure.children) {
          const childPath = currentPath ? `${currentPath}/${child.name}` : child.name;
          await this.createDirectoryStructure(basePath, child, runtime, childPath);
        }
      }
    }
  }
  
  /**
   * Run post-install scripts
   */
  private async runPostInstallScripts(
    template: Template,
    targetPath: string,
    variables: Record<string, any>,
    runtime?: RuntimeEnvironment
  ): Promise<void> {
    if (!template.configuration?.postInstall || !runtime) {
      return;
    }
    
    logger.info('Running post-install scripts');
    
    for (const script of template.configuration.postInstall) {
      const processedScript = this.processTemplateContent(script, variables);
      
      try {
        await runtime.execute(processedScript, { cwd: targetPath });
      } catch (error) {
        logger.error(`Post-install script failed: ${script}`, error);
        // Continue with other scripts
      }
    }
  }
  
  /**
   * Load local templates
   */
  private loadLocalTemplates(): void {
    // In a real implementation, load from local storage
    
    // Add some example templates
    this.templates.set('react-app', {
      id: 'react-app',
      name: 'React Application',
      description: 'Modern React application with TypeScript and Vite',
      category: 'web-app',
      tags: ['react', 'typescript', 'vite', 'frontend'],
      author: {
        id: 'ultracontrol',
        name: 'UltraControl Team'
      },
      version: '1.0.0',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      downloads: 1500,
      rating: 4.5,
      featured: true,
      framework: 'React',
      language: 'TypeScript',
      dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        'typescript': '^5.0.0',
        'vite': '^4.4.0'
      },
      files: [],
      structure: {
        name: 'root',
        type: 'directory',
        children: [
          { name: 'src', type: 'directory', children: [] },
          { name: 'public', type: 'directory', children: [] },
          { name: 'package.json', type: 'file' },
          { name: 'tsconfig.json', type: 'file' },
          { name: 'vite.config.ts', type: 'file' }
        ]
      },
      configuration: {
        variables: [
          {
            name: 'projectName',
            description: 'Name of your project',
            type: 'string',
            required: true,
            validation: '^[a-zA-Z0-9-_]+$'
          },
          {
            name: 'useRouter',
            description: 'Include React Router?',
            type: 'boolean',
            default: true
          }
        ]
      }
    });
    
    this.templates.set('express-api', {
      id: 'express-api',
      name: 'Express API',
      description: 'RESTful API with Express.js and TypeScript',
      category: 'api',
      tags: ['express', 'typescript', 'api', 'backend'],
      author: {
        id: 'ultracontrol',
        name: 'UltraControl Team'
      },
      version: '1.0.0',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      downloads: 1200,
      rating: 4.7,
      featured: true,
      framework: 'Express',
      language: 'TypeScript',
      dependencies: {
        'express': '^4.18.0',
        'typescript': '^5.0.0',
        'ts-node': '^10.9.0',
        '@types/express': '^4.17.0'
      },
      files: [],
      structure: {
        name: 'root',
        type: 'directory',
        children: [
          { name: 'src', type: 'directory', children: [] },
          { name: 'tests', type: 'directory', children: [] },
          { name: 'package.json', type: 'file' },
          { name: 'tsconfig.json', type: 'file' }
        ]
      }
    });
  }
  
  /**
   * Generate unique template ID
   */
  private generateTemplateId(): string {
    return `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}