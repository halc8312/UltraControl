/**
 * Plugin API Interface
 * 
 * Defines the core API exposed to plugins for extending UltraControl
 * functionality in a secure and controlled manner.
 */

import type { EventEmitter } from 'events';
import type { LLMProvider } from '@/lib/llm/providers/base';
import type { Agent } from '@/lib/agents/base/Agent';
import type { RuntimeEnvironment } from '@/lib/runtime/RuntimeAbstraction';

/**
 * Plugin manifest that describes plugin metadata and requirements
 */
export interface PluginManifest {
  // Basic metadata
  id: string;
  name: string;
  version: string;
  description: string;
  author: {
    name: string;
    email?: string;
    url?: string;
  };
  
  // Plugin configuration
  main: string; // Entry point file
  type: 'ui' | 'agent' | 'llm' | 'runtime' | 'hybrid';
  engine: {
    ultracontrol: string; // Minimum UltraControl version
    node?: string; // Node.js version requirement
  };
  
  // Permissions and capabilities
  permissions: PluginPermission[];
  capabilities: PluginCapability[];
  
  // Dependencies
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  
  // UI specific
  ui?: {
    components?: string[]; // UI components to register
    routes?: PluginRoute[];
    panels?: PluginPanel[];
    commands?: PluginCommand[];
  };
  
  // Configuration schema
  configSchema?: Record<string, any>; // JSON Schema for config validation
}

/**
 * Plugin permissions that must be explicitly granted
 */
export type PluginPermission = 
  | 'filesystem:read'
  | 'filesystem:write'
  | 'network:http'
  | 'network:websocket'
  | 'process:spawn'
  | 'llm:access'
  | 'agent:create'
  | 'runtime:execute'
  | 'ui:render'
  | 'state:read'
  | 'state:write'
  | 'events:listen'
  | 'events:emit';

/**
 * Plugin capabilities that describe what the plugin provides
 */
export type PluginCapability =
  | 'agent-provider'
  | 'llm-provider'
  | 'runtime-provider'
  | 'ui-extension'
  | 'task-handler'
  | 'file-handler'
  | 'command-provider'
  | 'theme-provider'
  | 'language-support';

/**
 * Plugin route definition for UI extensions
 */
export interface PluginRoute {
  path: string;
  component: string;
  title?: string;
  icon?: string;
  permissions?: string[];
}

/**
 * Plugin panel definition for UI extensions
 */
export interface PluginPanel {
  id: string;
  title: string;
  component: string;
  position: 'left' | 'right' | 'bottom' | 'center';
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
}

/**
 * Plugin command definition
 */
export interface PluginCommand {
  id: string;
  title: string;
  category?: string;
  keybinding?: string;
  when?: string; // Context expression
  handler: string; // Handler function name
}

/**
 * Base plugin interface that all plugins must implement
 */
export interface Plugin {
  manifest: PluginManifest;
  
  /**
   * Called when the plugin is activated
   */
  activate(context: PluginContext): Promise<void> | void;
  
  /**
   * Called when the plugin is deactivated
   */
  deactivate?(): Promise<void> | void;
  
  /**
   * Called to get the plugin's exports
   */
  getExports?(): any;
}

/**
 * Plugin context provided to plugins during activation
 */
export interface PluginContext {
  // Plugin information
  readonly pluginId: string;
  readonly pluginPath: string;
  readonly configuration: PluginConfiguration;
  
  // Core APIs
  readonly workspace: WorkspaceAPI;
  readonly commands: CommandsAPI;
  readonly ui: UIExtensionAPI;
  readonly events: EventsAPI;
  readonly storage: StorageAPI;
  readonly logger: LoggerAPI;
  
  // Extension points
  readonly agents: AgentExtensionAPI;
  readonly llm: LLMExtensionAPI;
  readonly runtime: RuntimeExtensionAPI;
  
  // Subscriptions management
  readonly subscriptions: DisposableCollection;
}

/**
 * Plugin configuration API
 */
export interface PluginConfiguration {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  has(key: string): boolean;
  update(key: string, value: any): Promise<void>;
  onDidChange(listener: (event: ConfigurationChangeEvent) => void): Disposable;
}

export interface ConfigurationChangeEvent {
  affectsConfiguration(key: string): boolean;
}

/**
 * Workspace API for file and project operations
 */
export interface WorkspaceAPI {
  readonly rootPath: string | undefined;
  readonly workspaceFolders: readonly WorkspaceFolder[];
  
  // File operations (subject to permissions)
  readFile(uri: string): Promise<Uint8Array>;
  writeFile(uri: string, content: Uint8Array): Promise<void>;
  deleteFile(uri: string): Promise<void>;
  createDirectory(uri: string): Promise<void>;
  listFiles(pattern: string): Promise<string[]>;
  
  // File watching
  createFileSystemWatcher(pattern: string): FileSystemWatcher;
  
  // Search
  findFiles(include: string, exclude?: string): Promise<string[]>;
  search(query: SearchQuery): Promise<SearchResult[]>;
}

export interface WorkspaceFolder {
  readonly uri: string;
  readonly name: string;
  readonly index: number;
}

export interface FileSystemWatcher extends Disposable {
  readonly onDidCreate: Event<string>;
  readonly onDidChange: Event<string>;
  readonly onDidDelete: Event<string>;
}

export interface SearchQuery {
  pattern: string;
  includes?: string[];
  excludes?: string[];
  maxResults?: number;
  useRegex?: boolean;
}

export interface SearchResult {
  uri: string;
  matches: SearchMatch[];
}

export interface SearchMatch {
  line: number;
  column: number;
  length: number;
  preview: string;
}

/**
 * Commands API for registering and executing commands
 */
export interface CommandsAPI {
  registerCommand(command: string, handler: CommandHandler): Disposable;
  executeCommand<T>(command: string, ...args: any[]): Promise<T>;
  getCommands(): Promise<string[]>;
}

export type CommandHandler = (...args: any[]) => any | Promise<any>;

/**
 * UI Extension API for adding UI components
 */
export interface UIExtensionAPI {
  // Component registration
  registerComponent(name: string, component: any): Disposable;
  registerPanel(panel: PluginPanel): Disposable;
  registerView(viewId: string, provider: ViewProvider): Disposable;
  
  // Status bar
  createStatusBarItem(alignment?: StatusBarAlignment, priority?: number): StatusBarItem;
  
  // Notifications
  showInformationMessage(message: string, ...actions: string[]): Promise<string | undefined>;
  showWarningMessage(message: string, ...actions: string[]): Promise<string | undefined>;
  showErrorMessage(message: string, ...actions: string[]): Promise<string | undefined>;
  
  // Input
  showInputBox(options?: InputBoxOptions): Promise<string | undefined>;
  showQuickPick<T>(items: T[], options?: QuickPickOptions<T>): Promise<T | undefined>;
  
  // Progress
  withProgress<T>(options: ProgressOptions, task: ProgressTask<T>): Promise<T>;
}

export interface ViewProvider {
  resolveView(): HTMLElement | Promise<HTMLElement>;
}

export enum StatusBarAlignment {
  Left = 1,
  Right = 2
}

export interface StatusBarItem extends Disposable {
  alignment: StatusBarAlignment;
  priority?: number;
  text: string;
  tooltip?: string;
  command?: string;
  show(): void;
  hide(): void;
}

export interface InputBoxOptions {
  title?: string;
  prompt?: string;
  placeHolder?: string;
  value?: string;
  validateInput?(value: string): string | undefined | Promise<string | undefined>;
}

export interface QuickPickOptions<T> {
  title?: string;
  placeHolder?: string;
  matchOnDescription?: boolean;
  matchOnDetail?: boolean;
  canPickMany?: boolean;
}

export interface ProgressOptions {
  location: ProgressLocation;
  title?: string;
  cancellable?: boolean;
}

export enum ProgressLocation {
  Notification = 1,
  StatusBar = 2,
  Dialog = 3
}

export type ProgressTask<T> = (progress: Progress<{ message?: string; increment?: number }>, token: CancellationToken) => Promise<T>;

export interface Progress<T> {
  report(value: T): void;
}

export interface CancellationToken {
  readonly isCancellationRequested: boolean;
  readonly onCancellationRequested: Event<void>;
}

/**
 * Events API for plugin communication
 */
export interface EventsAPI {
  on(event: string, listener: EventListener): Disposable;
  once(event: string, listener: EventListener): Disposable;
  emit(event: string, ...args: any[]): void;
  createEventEmitter<T>(): TypedEventEmitter<T>;
}

export type EventListener = (...args: any[]) => void;

export interface TypedEventEmitter<T> {
  event: Event<T>;
  fire(data: T): void;
  dispose(): void;
}

/**
 * Storage API for plugin data persistence
 */
export interface StorageAPI {
  // Local storage (per workspace)
  getLocal<T>(key: string): Promise<T | undefined>;
  getLocal<T>(key: string, defaultValue: T): Promise<T>;
  setLocal(key: string, value: any): Promise<void>;
  deleteLocal(key: string): Promise<void>;
  
  // Global storage (across workspaces)
  getGlobal<T>(key: string): Promise<T | undefined>;
  getGlobal<T>(key: string, defaultValue: T): Promise<T>;
  setGlobal(key: string, value: any): Promise<void>;
  deleteGlobal(key: string): Promise<void>;
  
  // Secret storage (encrypted)
  getSecret(key: string): Promise<string | undefined>;
  setSecret(key: string, value: string): Promise<void>;
  deleteSecret(key: string): Promise<void>;
}

/**
 * Logger API for plugin logging
 */
export interface LoggerAPI {
  trace(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string | Error, ...args: any[]): void;
  
  createChannel(name: string): OutputChannel;
}

export interface OutputChannel extends Disposable {
  readonly name: string;
  append(value: string): void;
  appendLine(value: string): void;
  clear(): void;
  show(preserveFocus?: boolean): void;
  hide(): void;
}

/**
 * Agent Extension API for registering custom agents
 */
export interface AgentExtensionAPI {
  registerAgent(type: string, factory: AgentFactory): Disposable;
  createAgent(type: string, config: any): Promise<Agent>;
  getAgentTypes(): string[];
}

export type AgentFactory = (config: any) => Agent | Promise<Agent>;

/**
 * LLM Extension API for registering custom LLM providers
 */
export interface LLMExtensionAPI {
  registerProvider(name: string, factory: LLMProviderFactory): Disposable;
  createProvider(name: string, config: any): Promise<LLMProvider>;
  getProviderNames(): string[];
}

export type LLMProviderFactory = (config: any) => LLMProvider | Promise<LLMProvider>;

/**
 * Runtime Extension API for registering custom runtime environments
 */
export interface RuntimeExtensionAPI {
  registerRuntime(type: string, factory: RuntimeFactory): Disposable;
  createRuntime(type: string, config: any): Promise<RuntimeEnvironment>;
  getRuntimeTypes(): string[];
}

export type RuntimeFactory = (config: any) => RuntimeEnvironment | Promise<RuntimeEnvironment>;

/**
 * Disposable interface for cleanup
 */
export interface Disposable {
  dispose(): void;
}

/**
 * Collection of disposables
 */
export class DisposableCollection implements Disposable {
  private disposables: Disposable[] = [];
  
  push(...items: Disposable[]): void {
    this.disposables.push(...items);
  }
  
  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
  }
}

/**
 * Event interface
 */
export interface Event<T> {
  (listener: (e: T) => void): Disposable;
}

/**
 * Helper to create a typed event
 */
export function createEvent<T>(): [Event<T>, (data: T) => void] {
  const listeners = new Set<(e: T) => void>();
  
  const event: Event<T> = (listener) => {
    listeners.add(listener);
    return {
      dispose: () => listeners.delete(listener)
    };
  };
  
  const fire = (data: T) => {
    listeners.forEach(listener => listener(data));
  };
  
  return [event, fire];
}