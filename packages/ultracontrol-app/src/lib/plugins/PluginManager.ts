/**
 * Plugin Manager
 * 
 * Main entry point for the plugin system. Handles plugin discovery,
 * installation, loading, and lifecycle management.
 */

import { EventEmitter } from 'events';
import { createScopedLogger } from '@/lib/utils/logger';
import { PluginLoader, PluginLoadOptions, LoadedPlugin, PluginStatus } from './loader/PluginLoader';
import { PluginRegistry } from './loader/PluginRegistry';
import type { PluginManifest, PluginPermission } from './api/PluginAPI';

const logger = createScopedLogger('PluginManager');

export interface PluginManagerOptions {
  /**
   * Directory where plugins are installed
   */
  pluginsDir?: string;
  
  /**
   * Whether to auto-load plugins on startup
   */
  autoLoad?: boolean;
  
  /**
   * Whether to enable plugin sandboxing
   */
  enableSandbox?: boolean;
  
  /**
   * Permission policy
   */
  permissionPolicy?: PermissionPolicy;
  
  /**
   * Plugin blacklist
   */
  blacklist?: string[];
  
  /**
   * Plugin whitelist (if specified, only these plugins can be loaded)
   */
  whitelist?: string[];
}

export interface PermissionPolicy {
  /**
   * Default permissions granted to all plugins
   */
  defaultPermissions?: PluginPermission[];
  
  /**
   * Permissions that require user approval
   */
  requireApproval?: PluginPermission[];
  
  /**
   * Permissions that are always denied
   */
  alwaysDeny?: PluginPermission[];
  
  /**
   * Per-plugin permission overrides
   */
  pluginOverrides?: Record<string, PluginPermission[]>;
}

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: {
    name: string;
    email?: string;
  };
  status: PluginStatus;
  path: string;
  permissions: PluginPermission[];
  capabilities: string[];
}

export interface PluginSearchResult {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  downloads: number;
  rating: number;
  verified: boolean;
}

export class PluginManager extends EventEmitter {
  private loader: PluginLoader;
  private registry: PluginRegistry;
  private options: Required<PluginManagerOptions>;
  private discoveredPlugins = new Map<string, PluginInfo>();
  private initialized = false;
  
  constructor(options: PluginManagerOptions = {}) {
    super();
    
    this.options = {
      pluginsDir: options.pluginsDir ?? './plugins',
      autoLoad: options.autoLoad ?? true,
      enableSandbox: options.enableSandbox ?? true,
      permissionPolicy: options.permissionPolicy ?? {},
      blacklist: options.blacklist ?? [],
      whitelist: options.whitelist ?? []
    };
    
    this.registry = new PluginRegistry();
    this.loader = new PluginLoader(this.registry);
    
    // Forward registry events
    this.registry.on('plugin:registered', (plugin) => {
      this.emit('plugin:activated', plugin.manifest.id);
    });
    
    this.registry.on('plugin:unregistered', (pluginId) => {
      this.emit('plugin:deactivated', pluginId);
    });
  }
  
  /**
   * Initialize the plugin manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    logger.info('Initializing plugin manager');
    
    try {
      // Discover installed plugins
      await this.discoverPlugins();
      
      // Auto-load plugins if enabled
      if (this.options.autoLoad) {
        await this.loadAllPlugins();
      }
      
      this.initialized = true;
      logger.info('Plugin manager initialized');
      
      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize plugin manager:', error);
      throw error;
    }
  }
  
  /**
   * Discover installed plugins
   */
  async discoverPlugins(): Promise<void> {
    logger.info('Discovering plugins...');
    
    // In a real implementation, scan the plugins directory
    // For now, we'll simulate with some example plugins
    const examplePlugins: PluginInfo[] = [
      {
        id: 'vim-mode',
        name: 'Vim Mode',
        version: '1.0.0',
        description: 'Vim keybindings and modal editing',
        author: { name: 'Example Author' },
        status: PluginStatus.Unloaded,
        path: `${this.options.pluginsDir}/vim-mode`,
        permissions: ['ui:render', 'events:listen'],
        capabilities: ['command-provider', 'ui-extension']
      },
      {
        id: 'github-copilot',
        name: 'GitHub Copilot',
        version: '1.0.0',
        description: 'AI pair programming',
        author: { name: 'GitHub' },
        status: PluginStatus.Unloaded,
        path: `${this.options.pluginsDir}/github-copilot`,
        permissions: ['llm:access', 'filesystem:read', 'network:http'],
        capabilities: ['llm-provider', 'ui-extension']
      },
      {
        id: 'python-support',
        name: 'Python Language Support',
        version: '1.0.0',
        description: 'Python language server and tools',
        author: { name: 'Python Community' },
        status: PluginStatus.Unloaded,
        path: `${this.options.pluginsDir}/python-support`,
        permissions: ['filesystem:read', 'process:spawn'],
        capabilities: ['language-support', 'agent-provider']
      }
    ];
    
    // Apply filters
    for (const plugin of examplePlugins) {
      if (this.isPluginAllowed(plugin.id)) {
        this.discoveredPlugins.set(plugin.id, plugin);
      }
    }
    
    logger.info(`Discovered ${this.discoveredPlugins.size} plugins`);
    this.emit('plugins:discovered', Array.from(this.discoveredPlugins.values()));
  }
  
  /**
   * Load all discovered plugins
   */
  async loadAllPlugins(): Promise<void> {
    const plugins = Array.from(this.discoveredPlugins.values());
    
    for (const pluginInfo of plugins) {
      try {
        await this.loadPlugin(pluginInfo.id);
      } catch (error) {
        logger.error(`Failed to load plugin ${pluginInfo.id}:`, error);
      }
    }
  }
  
  /**
   * Load a specific plugin
   */
  async loadPlugin(pluginId: string): Promise<void> {
    const pluginInfo = this.discoveredPlugins.get(pluginId);
    
    if (!pluginInfo) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    if (!this.isPluginAllowed(pluginId)) {
      throw new Error(`Plugin ${pluginId} is not allowed`);
    }
    
    logger.info(`Loading plugin ${pluginId}`);
    
    const loadOptions: PluginLoadOptions = {
      enableSandbox: this.options.enableSandbox,
      validateManifest: true,
      checkPermissions: true,
      permissionChecker: (permission) => this.checkPermission(pluginId, permission)
    };
    
    const loadedPlugin = await this.loader.loadPlugin(pluginInfo.path, loadOptions);
    
    if (loadedPlugin.status === PluginStatus.Failed) {
      throw loadedPlugin.error || new Error('Plugin load failed');
    }
    
    // Update plugin info
    pluginInfo.status = loadedPlugin.status;
    
    // Auto-activate if loaded successfully
    if (loadedPlugin.status === PluginStatus.Loaded) {
      await this.activatePlugin(pluginId);
    }
    
    this.emit('plugin:loaded', pluginId);
  }
  
  /**
   * Activate a plugin
   */
  async activatePlugin(pluginId: string): Promise<void> {
    logger.info(`Activating plugin ${pluginId}`);
    
    await this.loader.activatePlugin(pluginId);
    
    const pluginInfo = this.discoveredPlugins.get(pluginId);
    if (pluginInfo) {
      pluginInfo.status = PluginStatus.Activated;
    }
  }
  
  /**
   * Deactivate a plugin
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    logger.info(`Deactivating plugin ${pluginId}`);
    
    await this.loader.deactivatePlugin(pluginId);
    
    const pluginInfo = this.discoveredPlugins.get(pluginId);
    if (pluginInfo) {
      pluginInfo.status = PluginStatus.Deactivated;
    }
  }
  
  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    logger.info(`Unloading plugin ${pluginId}`);
    
    await this.loader.unloadPlugin(pluginId);
    
    const pluginInfo = this.discoveredPlugins.get(pluginId);
    if (pluginInfo) {
      pluginInfo.status = PluginStatus.Unloaded;
    }
    
    this.emit('plugin:unloaded', pluginId);
  }
  
  /**
   * Reload a plugin
   */
  async reloadPlugin(pluginId: string): Promise<void> {
    logger.info(`Reloading plugin ${pluginId}`);
    
    await this.loader.reloadPlugin(pluginId);
    
    this.emit('plugin:reloaded', pluginId);
  }
  
  /**
   * Install a plugin from a source
   */
  async installPlugin(source: string): Promise<string> {
    logger.info(`Installing plugin from ${source}`);
    
    // In a real implementation, this would:
    // 1. Download the plugin package
    // 2. Verify signature/checksum
    // 3. Extract to plugins directory
    // 4. Validate manifest
    // 5. Add to discovered plugins
    
    // For now, return a mock plugin ID
    const pluginId = 'newly-installed-plugin';
    
    this.emit('plugin:installed', pluginId);
    
    return pluginId;
  }
  
  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string): Promise<void> {
    logger.info(`Uninstalling plugin ${pluginId}`);
    
    // Ensure plugin is unloaded first
    const loadedPlugin = this.loader.getPlugin(pluginId);
    if (loadedPlugin) {
      await this.unloadPlugin(pluginId);
    }
    
    // In a real implementation, remove plugin files
    this.discoveredPlugins.delete(pluginId);
    
    this.emit('plugin:uninstalled', pluginId);
  }
  
  /**
   * Search for plugins in the marketplace
   */
  async searchPlugins(query: string): Promise<PluginSearchResult[]> {
    logger.info(`Searching for plugins: ${query}`);
    
    // In a real implementation, this would query a plugin marketplace API
    return [
      {
        id: 'example-plugin',
        name: 'Example Plugin',
        version: '1.0.0',
        description: 'An example plugin matching your search',
        author: 'Example Author',
        downloads: 1000,
        rating: 4.5,
        verified: true
      }
    ];
  }
  
  /**
   * Get all discovered plugins
   */
  getPlugins(): PluginInfo[] {
    return Array.from(this.discoveredPlugins.values());
  }
  
  /**
   * Get active plugins
   */
  getActivePlugins(): PluginInfo[] {
    return this.getPlugins().filter(p => p.status === PluginStatus.Activated);
  }
  
  /**
   * Get plugin by ID
   */
  getPlugin(pluginId: string): PluginInfo | undefined {
    return this.discoveredPlugins.get(pluginId);
  }
  
  /**
   * Get plugin status
   */
  getPluginStatus(pluginId: string): PluginStatus | undefined {
    const plugin = this.discoveredPlugins.get(pluginId);
    return plugin?.status;
  }
  
  /**
   * Update permission policy
   */
  updatePermissionPolicy(policy: PermissionPolicy): void {
    this.options.permissionPolicy = policy;
    
    // Re-evaluate loaded plugins
    for (const plugin of this.loader.getAllPlugins()) {
      if (plugin.status === PluginStatus.Activated) {
        // Check if permissions are still valid
        const deniedPermissions = plugin.manifest.permissions.filter(
          p => !this.checkPermission(plugin.manifest.id, p)
        );
        
        if (deniedPermissions.length > 0) {
          logger.warn(
            `Plugin ${plugin.manifest.id} no longer has required permissions:`,
            deniedPermissions
          );
          
          // Deactivate plugin
          this.deactivatePlugin(plugin.manifest.id).catch(error => {
            logger.error(`Failed to deactivate plugin ${plugin.manifest.id}:`, error);
          });
        }
      }
    }
  }
  
  /**
   * Get the plugin registry
   */
  getRegistry(): PluginRegistry {
    return this.registry;
  }
  
  /**
   * Dispose the plugin manager
   */
  async dispose(): Promise<void> {
    logger.info('Disposing plugin manager');
    
    await this.loader.dispose();
    this.removeAllListeners();
    
    this.initialized = false;
  }
  
  /**
   * Check if a plugin is allowed
   */
  private isPluginAllowed(pluginId: string): boolean {
    // Check blacklist
    if (this.options.blacklist.includes(pluginId)) {
      return false;
    }
    
    // Check whitelist
    if (this.options.whitelist.length > 0) {
      return this.options.whitelist.includes(pluginId);
    }
    
    return true;
  }
  
  /**
   * Check if a permission is granted
   */
  private checkPermission(pluginId: string, permission: PluginPermission): boolean {
    const policy = this.options.permissionPolicy;
    
    // Check always deny list
    if (policy.alwaysDeny?.includes(permission)) {
      return false;
    }
    
    // Check plugin-specific overrides
    if (policy.pluginOverrides?.[pluginId]?.includes(permission)) {
      return true;
    }
    
    // Check default permissions
    if (policy.defaultPermissions?.includes(permission)) {
      return true;
    }
    
    // Check if requires approval
    if (policy.requireApproval?.includes(permission)) {
      // In a real implementation, prompt user for approval
      logger.warn(`Permission ${permission} requires user approval for plugin ${pluginId}`);
      return false;
    }
    
    // Default deny
    return false;
  }
}