/**
 * Plugin Registry
 * 
 * Central registry for all loaded plugins and their capabilities
 */

import { EventEmitter } from 'events';
import { createScopedLogger } from '@/lib/utils/logger';
import type { 
  LoadedPlugin,
  PluginPermission,
  PluginPanel,
  ViewProvider,
  AgentFactory,
  LLMProviderFactory,
  RuntimeFactory,
  InputBoxOptions,
  QuickPickOptions,
  ProgressOptions,
  Progress,
  CancellationToken
} from '../api/PluginAPI';

const logger = createScopedLogger('PluginRegistry');

export interface RegistryEvents {
  'plugin:registered': (plugin: LoadedPlugin) => void;
  'plugin:unregistered': (pluginId: string) => void;
  'command:registered': (command: string) => void;
  'command:executed': (command: string, result: any) => void;
  'component:registered': (name: string) => void;
  'event:emitted': (event: string, args: any[]) => void;
}

export class PluginRegistry extends EventEmitter {
  // Plugin storage
  private plugins = new Map<string, LoadedPlugin>();
  private pluginPermissions = new Map<string, Set<PluginPermission>>();
  
  // Command registry
  private commands = new Map<string, (...args: any[]) => any>();
  
  // UI registry
  private components = new Map<string, any>();
  private panels = new Map<string, PluginPanel>();
  private views = new Map<string, ViewProvider>();
  private statusBarItems = new Set<any>();
  
  // Extension factories
  private agentFactories = new Map<string, AgentFactory>();
  private llmProviderFactories = new Map<string, LLMProviderFactory>();
  private runtimeFactories = new Map<string, RuntimeFactory>();
  
  constructor() {
    super();
    this.setMaxListeners(100); // Support many plugins
  }
  
  /**
   * Register a plugin
   */
  registerPlugin(plugin: LoadedPlugin): void {
    this.plugins.set(plugin.manifest.id, plugin);
    this.pluginPermissions.set(
      plugin.manifest.id, 
      new Set(plugin.manifest.permissions)
    );
    
    logger.info(`Registered plugin: ${plugin.manifest.id}`);
    this.emit('plugin:registered', plugin);
  }
  
  /**
   * Unregister a plugin
   */
  unregisterPlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;
    
    this.plugins.delete(pluginId);
    this.pluginPermissions.delete(pluginId);
    
    // Clean up plugin registrations
    this.cleanupPluginRegistrations(pluginId);
    
    logger.info(`Unregistered plugin: ${pluginId}`);
    this.emit('plugin:unregistered', pluginId);
  }
  
  /**
   * Get a plugin by ID
   */
  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginId);
  }
  
  /**
   * Get all plugins
   */
  getAllPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Check if plugin has permission
   */
  hasPermission(pluginId: string, permission: PluginPermission): boolean {
    const permissions = this.pluginPermissions.get(pluginId);
    return permissions?.has(permission) ?? false;
  }
  
  /**
   * Register a command
   */
  registerCommand(command: string, handler: (...args: any[]) => any): void {
    if (this.commands.has(command)) {
      logger.warn(`Command ${command} already registered, overwriting`);
    }
    
    this.commands.set(command, handler);
    logger.debug(`Registered command: ${command}`);
    this.emit('command:registered', command);
  }
  
  /**
   * Unregister a command
   */
  unregisterCommand(command: string): void {
    this.commands.delete(command);
    logger.debug(`Unregistered command: ${command}`);
  }
  
  /**
   * Execute a command
   */
  async executeCommand<T>(command: string, ...args: any[]): Promise<T> {
    const handler = this.commands.get(command);
    
    if (!handler) {
      throw new Error(`Command not found: ${command}`);
    }
    
    try {
      const result = await handler(...args);
      this.emit('command:executed', command, result);
      return result;
    } catch (error) {
      logger.error(`Failed to execute command ${command}:`, error);
      throw error;
    }
  }
  
  /**
   * Get all registered commands
   */
  getCommands(): string[] {
    return Array.from(this.commands.keys());
  }
  
  /**
   * Register a UI component
   */
  registerComponent(name: string, component: any): void {
    this.components.set(name, component);
    logger.debug(`Registered component: ${name}`);
    this.emit('component:registered', name);
  }
  
  /**
   * Unregister a UI component
   */
  unregisterComponent(name: string): void {
    this.components.delete(name);
    logger.debug(`Unregistered component: ${name}`);
  }
  
  /**
   * Get a UI component
   */
  getComponent(name: string): any {
    return this.components.get(name);
  }
  
  /**
   * Register a panel
   */
  registerPanel(panel: PluginPanel): void {
    this.panels.set(panel.id, panel);
    logger.debug(`Registered panel: ${panel.id}`);
  }
  
  /**
   * Unregister a panel
   */
  unregisterPanel(panelId: string): void {
    this.panels.delete(panelId);
    logger.debug(`Unregistered panel: ${panelId}`);
  }
  
  /**
   * Get all panels
   */
  getPanels(): PluginPanel[] {
    return Array.from(this.panels.values());
  }
  
  /**
   * Register a view
   */
  registerView(viewId: string, provider: ViewProvider): void {
    this.views.set(viewId, provider);
    logger.debug(`Registered view: ${viewId}`);
  }
  
  /**
   * Unregister a view
   */
  unregisterView(viewId: string): void {
    this.views.delete(viewId);
    logger.debug(`Unregistered view: ${viewId}`);
  }
  
  /**
   * Show status bar item
   */
  showStatusBarItem(item: any): void {
    this.statusBarItems.add(item);
    // In a real implementation, update UI
  }
  
  /**
   * Hide status bar item
   */
  hideStatusBarItem(item: any): void {
    this.statusBarItems.delete(item);
    // In a real implementation, update UI
  }
  
  /**
   * Show message
   */
  async showMessage(
    type: 'info' | 'warning' | 'error',
    message: string,
    actions: string[]
  ): Promise<string | undefined> {
    // In a real implementation, show UI notification
    logger.info(`${type}: ${message}`);
    return undefined;
  }
  
  /**
   * Show input box
   */
  async showInputBox(options?: InputBoxOptions): Promise<string | undefined> {
    // In a real implementation, show UI input
    logger.info('Show input box:', options);
    return undefined;
  }
  
  /**
   * Show quick pick
   */
  async showQuickPick<T>(
    items: T[],
    options?: QuickPickOptions<T>
  ): Promise<T | undefined> {
    // In a real implementation, show UI picker
    logger.info('Show quick pick:', options);
    return undefined;
  }
  
  /**
   * With progress
   */
  async withProgress<T>(
    options: ProgressOptions,
    task: (progress: Progress<any>, token: CancellationToken) => Promise<T>
  ): Promise<T> {
    // In a real implementation, show progress UI
    const progress: Progress<any> = {
      report: (value) => {
        logger.debug('Progress:', value);
      }
    };
    
    const token: CancellationToken = {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }) as any
    };
    
    return task(progress, token);
  }
  
  /**
   * Emit event
   */
  emitEvent(event: string, ...args: any[]): void {
    this.emit(event, ...args);
    this.emit('event:emitted', event, args);
  }
  
  /**
   * Register agent factory
   */
  registerAgentFactory(type: string, factory: AgentFactory): void {
    this.agentFactories.set(type, factory);
    logger.debug(`Registered agent factory: ${type}`);
  }
  
  /**
   * Unregister agent factory
   */
  unregisterAgentFactory(type: string): void {
    this.agentFactories.delete(type);
    logger.debug(`Unregistered agent factory: ${type}`);
  }
  
  /**
   * Create agent
   */
  async createAgent(type: string, config: any): Promise<any> {
    const factory = this.agentFactories.get(type);
    
    if (!factory) {
      throw new Error(`Agent factory not found: ${type}`);
    }
    
    return factory(config);
  }
  
  /**
   * Get agent types
   */
  getAgentTypes(): string[] {
    return Array.from(this.agentFactories.keys());
  }
  
  /**
   * Register LLM provider factory
   */
  registerLLMProviderFactory(name: string, factory: LLMProviderFactory): void {
    this.llmProviderFactories.set(name, factory);
    logger.debug(`Registered LLM provider factory: ${name}`);
  }
  
  /**
   * Unregister LLM provider factory
   */
  unregisterLLMProviderFactory(name: string): void {
    this.llmProviderFactories.delete(name);
    logger.debug(`Unregistered LLM provider factory: ${name}`);
  }
  
  /**
   * Create LLM provider
   */
  async createLLMProvider(name: string, config: any): Promise<any> {
    const factory = this.llmProviderFactories.get(name);
    
    if (!factory) {
      throw new Error(`LLM provider factory not found: ${name}`);
    }
    
    return factory(config);
  }
  
  /**
   * Get LLM provider names
   */
  getLLMProviderNames(): string[] {
    return Array.from(this.llmProviderFactories.keys());
  }
  
  /**
   * Register runtime factory
   */
  registerRuntimeFactory(type: string, factory: RuntimeFactory): void {
    this.runtimeFactories.set(type, factory);
    logger.debug(`Registered runtime factory: ${type}`);
  }
  
  /**
   * Unregister runtime factory
   */
  unregisterRuntimeFactory(type: string): void {
    this.runtimeFactories.delete(type);
    logger.debug(`Unregistered runtime factory: ${type}`);
  }
  
  /**
   * Create runtime
   */
  async createRuntime(type: string, config: any): Promise<any> {
    const factory = this.runtimeFactories.get(type);
    
    if (!factory) {
      throw new Error(`Runtime factory not found: ${type}`);
    }
    
    return factory(config);
  }
  
  /**
   * Get runtime types
   */
  getRuntimeTypes(): string[] {
    return Array.from(this.runtimeFactories.keys());
  }
  
  /**
   * Clean up all registrations for a plugin
   */
  private cleanupPluginRegistrations(pluginId: string): void {
    // Remove commands
    const commandsToRemove: string[] = [];
    for (const [command] of this.commands) {
      if (command.startsWith(`${pluginId}.`)) {
        commandsToRemove.push(command);
      }
    }
    commandsToRemove.forEach(cmd => this.unregisterCommand(cmd));
    
    // Remove components
    const componentsToRemove: string[] = [];
    for (const [name] of this.components) {
      if (name.startsWith(`${pluginId}.`)) {
        componentsToRemove.push(name);
      }
    }
    componentsToRemove.forEach(name => this.unregisterComponent(name));
    
    // Remove panels
    const panelsToRemove: string[] = [];
    for (const [id] of this.panels) {
      if (id.startsWith(`${pluginId}.`)) {
        panelsToRemove.push(id);
      }
    }
    panelsToRemove.forEach(id => this.unregisterPanel(id));
    
    // Remove views
    const viewsToRemove: string[] = [];
    for (const [id] of this.views) {
      if (id.startsWith(`${pluginId}.`)) {
        viewsToRemove.push(id);
      }
    }
    viewsToRemove.forEach(id => this.unregisterView(id));
    
    // Remove agent factories
    const agentTypesToRemove: string[] = [];
    for (const [type] of this.agentFactories) {
      if (type.startsWith(`${pluginId}.`)) {
        agentTypesToRemove.push(type);
      }
    }
    agentTypesToRemove.forEach(type => this.unregisterAgentFactory(type));
    
    // Remove LLM provider factories
    const llmProvidersToRemove: string[] = [];
    for (const [name] of this.llmProviderFactories) {
      if (name.startsWith(`${pluginId}.`)) {
        llmProvidersToRemove.push(name);
      }
    }
    llmProvidersToRemove.forEach(name => this.unregisterLLMProviderFactory(name));
    
    // Remove runtime factories
    const runtimeTypesToRemove: string[] = [];
    for (const [type] of this.runtimeFactories) {
      if (type.startsWith(`${pluginId}.`)) {
        runtimeTypesToRemove.push(type);
      }
    }
    runtimeTypesToRemove.forEach(type => this.unregisterRuntimeFactory(type));
  }
}