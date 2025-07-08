/**
 * Plugin Context Implementation
 * 
 * Provides the actual implementation of the Plugin Context API
 * that is passed to plugins during activation.
 */

import type {
  PluginContext,
  PluginConfiguration,
  WorkspaceAPI,
  CommandsAPI,
  UIExtensionAPI,
  EventsAPI,
  StorageAPI,
  LoggerAPI,
  AgentExtensionAPI,
  LLMExtensionAPI,
  RuntimeExtensionAPI,
  DisposableCollection,
  Disposable,
  WorkspaceFolder,
  FileSystemWatcher,
  SearchQuery,
  SearchResult,
  StatusBarItem,
  StatusBarAlignment,
  OutputChannel,
  Event,
  TypedEventEmitter,
  ViewProvider,
  InputBoxOptions,
  QuickPickOptions,
  ProgressOptions,
  ProgressLocation,
  CancellationToken,
  Progress,
  ConfigurationChangeEvent
} from '../api/PluginAPI';
import { DisposableCollection as DisposableCollectionImpl } from '../api/PluginAPI';
import { createEvent } from '../api/PluginAPI';
import { createScopedLogger } from '@/lib/utils/logger';
import type { PluginRegistry } from './PluginRegistry';
import { EventEmitter } from 'events';

const logger = createScopedLogger('PluginContext');

export class PluginContextImpl implements PluginContext {
  readonly pluginId: string;
  readonly pluginPath: string;
  readonly subscriptions = new DisposableCollectionImpl();
  
  readonly workspace: WorkspaceAPI;
  readonly commands: CommandsAPI;
  readonly ui: UIExtensionAPI;
  readonly events: EventsAPI;
  readonly storage: StorageAPI;
  readonly logger: LoggerAPI;
  readonly agents: AgentExtensionAPI;
  readonly llm: LLMExtensionAPI;
  readonly runtime: RuntimeExtensionAPI;
  readonly configuration: PluginConfiguration;
  
  constructor(
    pluginId: string,
    pluginPath: string,
    registry: PluginRegistry
  ) {
    this.pluginId = pluginId;
    this.pluginPath = pluginPath;
    
    // Initialize APIs
    this.workspace = new WorkspaceAPIImpl(pluginId, registry);
    this.commands = new CommandsAPIImpl(pluginId, registry);
    this.ui = new UIExtensionAPIImpl(pluginId, registry);
    this.events = new EventsAPIImpl(pluginId, registry);
    this.storage = new StorageAPIImpl(pluginId);
    this.logger = new LoggerAPIImpl(pluginId);
    this.agents = new AgentExtensionAPIImpl(pluginId, registry);
    this.llm = new LLMExtensionAPIImpl(pluginId, registry);
    this.runtime = new RuntimeExtensionAPIImpl(pluginId, registry);
    this.configuration = new PluginConfigurationImpl(pluginId, registry);
  }
}

/**
 * Workspace API Implementation
 */
class WorkspaceAPIImpl implements WorkspaceAPI {
  private pluginId: string;
  private registry: PluginRegistry;
  
  constructor(pluginId: string, registry: PluginRegistry) {
    this.pluginId = pluginId;
    this.registry = registry;
  }
  
  get rootPath(): string | undefined {
    // In a real implementation, this would get from the actual workspace
    return process.cwd();
  }
  
  get workspaceFolders(): readonly WorkspaceFolder[] {
    return [{
      uri: this.rootPath || '',
      name: 'workspace',
      index: 0
    }];
  }
  
  async readFile(uri: string): Promise<Uint8Array> {
    this.checkPermission('filesystem:read');
    
    // In a real implementation, use fs.promises.readFile
    const response = await fetch(uri);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }
  
  async writeFile(uri: string, content: Uint8Array): Promise<void> {
    this.checkPermission('filesystem:write');
    
    // In a real implementation, use fs.promises.writeFile
    logger.info(`Writing file: ${uri}`);
  }
  
  async deleteFile(uri: string): Promise<void> {
    this.checkPermission('filesystem:write');
    
    // In a real implementation, use fs.promises.unlink
    logger.info(`Deleting file: ${uri}`);
  }
  
  async createDirectory(uri: string): Promise<void> {
    this.checkPermission('filesystem:write');
    
    // In a real implementation, use fs.promises.mkdir
    logger.info(`Creating directory: ${uri}`);
  }
  
  async listFiles(pattern: string): Promise<string[]> {
    this.checkPermission('filesystem:read');
    
    // In a real implementation, use glob
    return [];
  }
  
  createFileSystemWatcher(pattern: string): FileSystemWatcher {
    this.checkPermission('filesystem:read');
    
    const [onCreate, fireCreate] = createEvent<string>();
    const [onChange, fireChange] = createEvent<string>();
    const [onDelete, fireDelete] = createEvent<string>();
    
    // In a real implementation, use chokidar or similar
    
    return {
      onDidCreate: onCreate,
      onDidChange: onChange,
      onDidDelete: onDelete,
      dispose: () => {
        logger.info(`Disposing file watcher for ${pattern}`);
      }
    };
  }
  
  async findFiles(include: string, exclude?: string): Promise<string[]> {
    this.checkPermission('filesystem:read');
    
    // In a real implementation, use glob
    return [];
  }
  
  async search(query: SearchQuery): Promise<SearchResult[]> {
    this.checkPermission('filesystem:read');
    
    // In a real implementation, use ripgrep or similar
    return [];
  }
  
  private checkPermission(permission: string): void {
    if (!this.registry.hasPermission(this.pluginId, permission as any)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}

/**
 * Commands API Implementation
 */
class CommandsAPIImpl implements CommandsAPI {
  private pluginId: string;
  private registry: PluginRegistry;
  
  constructor(pluginId: string, registry: PluginRegistry) {
    this.pluginId = pluginId;
    this.registry = registry;
  }
  
  registerCommand(command: string, handler: (...args: any[]) => any): Disposable {
    const fullCommand = `${this.pluginId}.${command}`;
    
    this.registry.registerCommand(fullCommand, handler);
    
    return {
      dispose: () => {
        this.registry.unregisterCommand(fullCommand);
      }
    };
  }
  
  async executeCommand<T>(command: string, ...args: any[]): Promise<T> {
    return this.registry.executeCommand(command, ...args);
  }
  
  async getCommands(): Promise<string[]> {
    return this.registry.getCommands();
  }
}

/**
 * UI Extension API Implementation
 */
class UIExtensionAPIImpl implements UIExtensionAPI {
  private pluginId: string;
  private registry: PluginRegistry;
  private statusBarItems = new Set<StatusBarItem>();
  
  constructor(pluginId: string, registry: PluginRegistry) {
    this.pluginId = pluginId;
    this.registry = registry;
  }
  
  registerComponent(name: string, component: any): Disposable {
    this.checkPermission('ui:render');
    
    const fullName = `${this.pluginId}.${name}`;
    this.registry.registerComponent(fullName, component);
    
    return {
      dispose: () => {
        this.registry.unregisterComponent(fullName);
      }
    };
  }
  
  registerPanel(panel: any): Disposable {
    this.checkPermission('ui:render');
    
    const fullId = `${this.pluginId}.${panel.id}`;
    this.registry.registerPanel({ ...panel, id: fullId });
    
    return {
      dispose: () => {
        this.registry.unregisterPanel(fullId);
      }
    };
  }
  
  registerView(viewId: string, provider: ViewProvider): Disposable {
    this.checkPermission('ui:render');
    
    const fullId = `${this.pluginId}.${viewId}`;
    this.registry.registerView(fullId, provider);
    
    return {
      dispose: () => {
        this.registry.unregisterView(fullId);
      }
    };
  }
  
  createStatusBarItem(alignment?: StatusBarAlignment, priority?: number): StatusBarItem {
    this.checkPermission('ui:render');
    
    const item: StatusBarItem = {
      alignment: alignment || StatusBarAlignment.Right,
      priority,
      text: '',
      tooltip: undefined,
      command: undefined,
      show: () => {
        this.registry.showStatusBarItem(item);
      },
      hide: () => {
        this.registry.hideStatusBarItem(item);
      },
      dispose: () => {
        this.statusBarItems.delete(item);
        this.registry.hideStatusBarItem(item);
      }
    };
    
    this.statusBarItems.add(item);
    return item;
  }
  
  async showInformationMessage(message: string, ...actions: string[]): Promise<string | undefined> {
    return this.registry.showMessage('info', message, actions);
  }
  
  async showWarningMessage(message: string, ...actions: string[]): Promise<string | undefined> {
    return this.registry.showMessage('warning', message, actions);
  }
  
  async showErrorMessage(message: string, ...actions: string[]): Promise<string | undefined> {
    return this.registry.showMessage('error', message, actions);
  }
  
  async showInputBox(options?: InputBoxOptions): Promise<string | undefined> {
    return this.registry.showInputBox(options);
  }
  
  async showQuickPick<T>(items: T[], options?: QuickPickOptions<T>): Promise<T | undefined> {
    return this.registry.showQuickPick(items, options);
  }
  
  async withProgress<T>(options: ProgressOptions, task: (progress: Progress<any>, token: CancellationToken) => Promise<T>): Promise<T> {
    return this.registry.withProgress(options, task);
  }
  
  private checkPermission(permission: string): void {
    if (!this.registry.hasPermission(this.pluginId, permission as any)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}

/**
 * Events API Implementation
 */
class EventsAPIImpl implements EventsAPI {
  private pluginId: string;
  private registry: PluginRegistry;
  private emitter = new EventEmitter();
  
  constructor(pluginId: string, registry: PluginRegistry) {
    this.pluginId = pluginId;
    this.registry = registry;
  }
  
  on(event: string, listener: (...args: any[]) => void): Disposable {
    this.checkPermission('events:listen');
    
    this.emitter.on(event, listener);
    
    return {
      dispose: () => {
        this.emitter.off(event, listener);
      }
    };
  }
  
  once(event: string, listener: (...args: any[]) => void): Disposable {
    this.checkPermission('events:listen');
    
    this.emitter.once(event, listener);
    
    return {
      dispose: () => {
        this.emitter.off(event, listener);
      }
    };
  }
  
  emit(event: string, ...args: any[]): void {
    this.checkPermission('events:emit');
    
    this.emitter.emit(event, ...args);
    this.registry.emitEvent(`${this.pluginId}.${event}`, ...args);
  }
  
  createEventEmitter<T>(): TypedEventEmitter<T> {
    const [event, fire] = createEvent<T>();
    
    return {
      event,
      fire,
      dispose: () => {
        // Cleanup if needed
      }
    };
  }
  
  private checkPermission(permission: string): void {
    if (!this.registry.hasPermission(this.pluginId, permission as any)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}

/**
 * Storage API Implementation
 */
class StorageAPIImpl implements StorageAPI {
  private pluginId: string;
  private localStorage = new Map<string, any>();
  private globalStorage = new Map<string, any>();
  private secretStorage = new Map<string, string>();
  
  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }
  
  async getLocal<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const fullKey = `${this.pluginId}.${key}`;
    return this.localStorage.get(fullKey) ?? defaultValue;
  }
  
  async setLocal(key: string, value: any): Promise<void> {
    const fullKey = `${this.pluginId}.${key}`;
    this.localStorage.set(fullKey, value);
  }
  
  async deleteLocal(key: string): Promise<void> {
    const fullKey = `${this.pluginId}.${key}`;
    this.localStorage.delete(fullKey);
  }
  
  async getGlobal<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    const fullKey = `${this.pluginId}.${key}`;
    return this.globalStorage.get(fullKey) ?? defaultValue;
  }
  
  async setGlobal(key: string, value: any): Promise<void> {
    const fullKey = `${this.pluginId}.${key}`;
    this.globalStorage.set(fullKey, value);
  }
  
  async deleteGlobal(key: string): Promise<void> {
    const fullKey = `${this.pluginId}.${key}`;
    this.globalStorage.delete(fullKey);
  }
  
  async getSecret(key: string): Promise<string | undefined> {
    const fullKey = `${this.pluginId}.${key}`;
    return this.secretStorage.get(fullKey);
  }
  
  async setSecret(key: string, value: string): Promise<void> {
    const fullKey = `${this.pluginId}.${key}`;
    // In a real implementation, encrypt the value
    this.secretStorage.set(fullKey, value);
  }
  
  async deleteSecret(key: string): Promise<void> {
    const fullKey = `${this.pluginId}.${key}`;
    this.secretStorage.delete(fullKey);
  }
}

/**
 * Logger API Implementation
 */
class LoggerAPIImpl implements LoggerAPI {
  private logger;
  private channels = new Map<string, OutputChannel>();
  
  constructor(pluginId: string) {
    this.logger = createScopedLogger(`Plugin:${pluginId}`);
  }
  
  trace(message: string, ...args: any[]): void {
    this.logger.debug(message, ...args);
  }
  
  debug(message: string, ...args: any[]): void {
    this.logger.debug(message, ...args);
  }
  
  info(message: string, ...args: any[]): void {
    this.logger.info(message, ...args);
  }
  
  warn(message: string, ...args: any[]): void {
    this.logger.warn(message, ...args);
  }
  
  error(message: string | Error, ...args: any[]): void {
    this.logger.error(message, ...args);
  }
  
  createChannel(name: string): OutputChannel {
    if (this.channels.has(name)) {
      return this.channels.get(name)!;
    }
    
    const channel: OutputChannel = {
      name,
      append: (value: string) => {
        this.logger.info(`[${name}] ${value}`);
      },
      appendLine: (value: string) => {
        this.logger.info(`[${name}] ${value}`);
      },
      clear: () => {
        // In a real implementation, clear the channel buffer
      },
      show: (preserveFocus?: boolean) => {
        // In a real implementation, show the output channel
      },
      hide: () => {
        // In a real implementation, hide the output channel
      },
      dispose: () => {
        this.channels.delete(name);
      }
    };
    
    this.channels.set(name, channel);
    return channel;
  }
}

/**
 * Agent Extension API Implementation
 */
class AgentExtensionAPIImpl implements AgentExtensionAPI {
  private pluginId: string;
  private registry: PluginRegistry;
  
  constructor(pluginId: string, registry: PluginRegistry) {
    this.pluginId = pluginId;
    this.registry = registry;
  }
  
  registerAgent(type: string, factory: any): Disposable {
    this.checkPermission('agent:create');
    
    const fullType = `${this.pluginId}.${type}`;
    this.registry.registerAgentFactory(fullType, factory);
    
    return {
      dispose: () => {
        this.registry.unregisterAgentFactory(fullType);
      }
    };
  }
  
  async createAgent(type: string, config: any): Promise<any> {
    this.checkPermission('agent:create');
    
    return this.registry.createAgent(type, config);
  }
  
  getAgentTypes(): string[] {
    return this.registry.getAgentTypes();
  }
  
  private checkPermission(permission: string): void {
    if (!this.registry.hasPermission(this.pluginId, permission as any)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}

/**
 * LLM Extension API Implementation
 */
class LLMExtensionAPIImpl implements LLMExtensionAPI {
  private pluginId: string;
  private registry: PluginRegistry;
  
  constructor(pluginId: string, registry: PluginRegistry) {
    this.pluginId = pluginId;
    this.registry = registry;
  }
  
  registerProvider(name: string, factory: any): Disposable {
    this.checkPermission('llm:access');
    
    const fullName = `${this.pluginId}.${name}`;
    this.registry.registerLLMProviderFactory(fullName, factory);
    
    return {
      dispose: () => {
        this.registry.unregisterLLMProviderFactory(fullName);
      }
    };
  }
  
  async createProvider(name: string, config: any): Promise<any> {
    this.checkPermission('llm:access');
    
    return this.registry.createLLMProvider(name, config);
  }
  
  getProviderNames(): string[] {
    return this.registry.getLLMProviderNames();
  }
  
  private checkPermission(permission: string): void {
    if (!this.registry.hasPermission(this.pluginId, permission as any)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}

/**
 * Runtime Extension API Implementation
 */
class RuntimeExtensionAPIImpl implements RuntimeExtensionAPI {
  private pluginId: string;
  private registry: PluginRegistry;
  
  constructor(pluginId: string, registry: PluginRegistry) {
    this.pluginId = pluginId;
    this.registry = registry;
  }
  
  registerRuntime(type: string, factory: any): Disposable {
    this.checkPermission('runtime:execute');
    
    const fullType = `${this.pluginId}.${type}`;
    this.registry.registerRuntimeFactory(fullType, factory);
    
    return {
      dispose: () => {
        this.registry.unregisterRuntimeFactory(fullType);
      }
    };
  }
  
  async createRuntime(type: string, config: any): Promise<any> {
    this.checkPermission('runtime:execute');
    
    return this.registry.createRuntime(type, config);
  }
  
  getRuntimeTypes(): string[] {
    return this.registry.getRuntimeTypes();
  }
  
  private checkPermission(permission: string): void {
    if (!this.registry.hasPermission(this.pluginId, permission as any)) {
      throw new Error(`Permission denied: ${permission}`);
    }
  }
}

/**
 * Plugin Configuration Implementation
 */
class PluginConfigurationImpl implements PluginConfiguration {
  private pluginId: string;
  private registry: PluginRegistry;
  private config = new Map<string, any>();
  private changeListeners = new Set<(event: ConfigurationChangeEvent) => void>();
  
  constructor(pluginId: string, registry: PluginRegistry) {
    this.pluginId = pluginId;
    this.registry = registry;
    
    // Load initial configuration
    this.loadConfiguration();
  }
  
  get<T>(key: string, defaultValue?: T): T | undefined {
    return this.config.get(key) ?? defaultValue;
  }
  
  has(key: string): boolean {
    return this.config.has(key);
  }
  
  async update(key: string, value: any): Promise<void> {
    const oldValue = this.config.get(key);
    this.config.set(key, value);
    
    // Save configuration
    await this.saveConfiguration();
    
    // Notify listeners
    const event: ConfigurationChangeEvent = {
      affectsConfiguration: (k: string) => k === key
    };
    
    this.changeListeners.forEach(listener => listener(event));
  }
  
  onDidChange(listener: (event: ConfigurationChangeEvent) => void): Disposable {
    this.changeListeners.add(listener);
    
    return {
      dispose: () => {
        this.changeListeners.delete(listener);
      }
    };
  }
  
  private loadConfiguration(): void {
    // In a real implementation, load from storage
    const stored = localStorage.getItem(`plugin-config-${this.pluginId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([key, value]) => {
          this.config.set(key, value);
        });
      } catch (error) {
        logger.error('Failed to load configuration:', error);
      }
    }
  }
  
  private async saveConfiguration(): Promise<void> {
    // In a real implementation, save to storage
    const data = Object.fromEntries(this.config.entries());
    localStorage.setItem(`plugin-config-${this.pluginId}`, JSON.stringify(data));
  }
}