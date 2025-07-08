// packages/ultracontrol-app/src/lib/api/interfaces/project.ts

import type { BaseEntity, Resource } from './base';
import type { FileTreeNode } from './filesystem';
import type { ExecutionEnvironment } from './execution';

/**
 * Project and workspace interfaces - unified across all tools
 */

// Project types
export type ProjectType = 
  | 'web'           // Web application
  | 'api'           // API/Backend service
  | 'mobile'        // Mobile app
  | 'desktop'       // Desktop application
  | 'library'       // Library/Package
  | 'cli'           // CLI tool
  | 'fullstack'     // Full-stack application
  | 'other';

export type ProjectFramework = 
  | 'react' | 'vue' | 'angular' | 'svelte' | 'solid'
  | 'nextjs' | 'nuxt' | 'gatsby' | 'remix'
  | 'express' | 'fastapi' | 'django' | 'rails'
  | 'react-native' | 'flutter' | 'ionic'
  | 'electron' | 'tauri'
  | 'none' | 'other';

export type ProjectLanguage = 
  | 'javascript' | 'typescript' | 'python' | 'java' | 'csharp'
  | 'go' | 'rust' | 'ruby' | 'php' | 'swift' | 'kotlin'
  | 'other';

// Project definition
export interface Project extends BaseEntity {
  name: string;
  description?: string;
  type: ProjectType;
  language: ProjectLanguage;
  framework?: ProjectFramework;
  path: string;
  repository?: RepositoryInfo;
  dependencies?: ProjectDependency[];
  scripts?: Record<string, string>;
  configuration?: ProjectConfiguration;
  status: ProjectStatus;
  metadata?: Record<string, any>;
}

export interface RepositoryInfo {
  type: 'git' | 'svn' | 'mercurial';
  url: string;
  branch?: string;
  commit?: string;
  isClean?: boolean;
}

export interface ProjectDependency {
  name: string;
  version: string;
  type: 'production' | 'development' | 'peer' | 'optional';
  source?: string;
}

export interface ProjectConfiguration {
  buildTool?: string;
  testFramework?: string;
  linter?: string;
  formatter?: string;
  packageManager?: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'poetry' | 'cargo' | 'maven' | 'gradle';
  environment?: ExecutionEnvironment;
  settings?: Record<string, any>;
}

export type ProjectStatus = 'active' | 'inactive' | 'archived' | 'error';

// Workspace definition
export interface Workspace extends BaseEntity {
  name: string;
  description?: string;
  projects: Project[];
  sharedResources?: Resource[];
  configuration?: WorkspaceConfiguration;
  layout?: WorkspaceLayout;
}

export interface WorkspaceConfiguration {
  defaultEnvironment?: ExecutionEnvironment;
  sharedDependencies?: ProjectDependency[];
  globalSettings?: Record<string, any>;
  tools?: WorkspaceTool[];
}

export interface WorkspaceTool {
  name: string;
  version?: string;
  configuration?: Record<string, any>;
}

export interface WorkspaceLayout {
  type: 'single' | 'multi' | 'monorepo';
  structure?: FileTreeNode;
  conventions?: WorkspaceConventions;
}

export interface WorkspaceConventions {
  fileNaming?: 'camelCase' | 'kebab-case' | 'snake_case' | 'PascalCase';
  folderStructure?: string[];
  codeStyle?: Record<string, any>;
}

// Project templates
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  type: ProjectType;
  language: ProjectLanguage;
  framework?: ProjectFramework;
  files: TemplateFile[];
  dependencies?: ProjectDependency[];
  scripts?: Record<string, string>;
  configuration?: ProjectConfiguration;
  variables?: TemplateVariable[];
}

export interface TemplateFile {
  path: string;
  content: string;
  isTemplate?: boolean;
  permissions?: string;
}

export interface TemplateVariable {
  name: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'choice';
  default?: any;
  required?: boolean;
  choices?: any[];
}

// Project operations
export interface ProjectCreateRequest {
  name: string;
  description?: string;
  type: ProjectType;
  language: ProjectLanguage;
  framework?: ProjectFramework;
  templateId?: string;
  variables?: Record<string, any>;
  path?: string;
  initializeGit?: boolean;
}

export interface ProjectImportRequest {
  source: 'local' | 'git' | 'url' | 'archive';
  path?: string;
  url?: string;
  branch?: string;
  authentication?: {
    type: 'none' | 'ssh' | 'https' | 'token';
    credentials?: any;
  };
}

export interface ProjectExportRequest {
  projectId: string;
  format: 'zip' | 'tar' | 'git';
  includeDependencies?: boolean;
  includeHistory?: boolean;
  excludePatterns?: string[];
}

// Project analysis
export interface ProjectAnalysis {
  projectId: string;
  timestamp: string;
  metrics: ProjectMetrics;
  issues: ProjectIssue[];
  suggestions: ProjectSuggestion[];
}

export interface ProjectMetrics {
  linesOfCode: number;
  fileCount: number;
  complexity?: number;
  testCoverage?: number;
  dependencies: {
    total: number;
    outdated: number;
    vulnerable: number;
  };
  codeQuality?: {
    score: number;
    issues: number;
  };
}

export interface ProjectIssue {
  type: 'error' | 'warning' | 'info';
  category: 'security' | 'performance' | 'quality' | 'dependency' | 'configuration';
  message: string;
  file?: string;
  line?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion?: string;
}

export interface ProjectSuggestion {
  type: 'optimization' | 'refactor' | 'upgrade' | 'feature';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  actions?: SuggestedAction[];
}

export interface SuggestedAction {
  type: 'command' | 'file_change' | 'dependency_update';
  description: string;
  payload: any;
}

// Project search
export interface ProjectSearchRequest {
  query?: string;
  type?: ProjectType;
  language?: ProjectLanguage;
  framework?: ProjectFramework;
  tags?: string[];
  status?: ProjectStatus;
}

export interface ProjectSearchResult {
  projects: Project[];
  total: number;
  facets?: {
    types: Record<ProjectType, number>;
    languages: Record<ProjectLanguage, number>;
    frameworks: Record<string, number>;
  };
}