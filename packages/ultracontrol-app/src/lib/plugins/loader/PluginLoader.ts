/**
 * Plugin Loader System
 * 
 * Handles plugin discovery, loading, validation, and lifecycle management
 */

import { createScopedLogger } from '@/lib/utils/logger';
import type { 
  Plugin, 
  PluginManifest, 
  PluginContext,
  PluginPermission,
  Disposable
} from '../api/PluginAPI';
import { PluginValidator } from './PluginValidator';
import { PluginSandbox } from '../sandbox/PluginSandbox';
import { PluginContextImpl } from './PluginContext';
import { PluginRegistry } from './PluginRegistry';

const logger = createScopedLogger('PluginLoader');

export interface PluginLoadOptions {
  /**
   * Whether to validate plugin manifest
   */
  validateManifest?: boolean;
  
  /**
   * Whether to check plugin permissions
   */
  checkPermissions?: boolean;
  
  /**
   * Whether to run plugin in sandbox
   */
  enableSandbox?: boolean;
  
  /**
   * Custom permission checker
   */
  permissionChecker?: (permission: PluginPermission) => boolean;
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  plugin: Plugin;
  context: PluginContext;
  sandbox?: PluginSandbox;
  status: PluginStatus;
  error?: Error;
}

export enum PluginStatus {
  Loading = 'loading',
  Loaded = 'loaded',
  Activated = 'activated',
  Deactivated = 'deactivated',
  Failed = 'failed',
  Unloaded = 'unloaded'
}

export class PluginLoader {
  private plugins = new Map<string, LoadedPlugin>();
  private validator = new PluginValidator();
  private registry: PluginRegistry;
  
  constructor(registry: PluginRegistry) {
    this.registry = registry;
  }
  
  /**
   * Load a plugin from a path
   */
  async loadPlugin(
    pluginPath: string, 
    options: PluginLoadOptions = {}
  ): Promise<LoadedPlugin> {
    const {
      validateManifest = true,
      checkPermissions = true,
      enableSandbox = true,
      permissionChecker
    } = options;
    
    logger.info(`Loading plugin from ${pluginPath}`);
    
    try {
      // Load and validate manifest
      const manifest = await this.loadManifest(pluginPath);
      
      if (validateManifest) {
        const validation = await this.validator.validateManifest(manifest);
        if (!validation.valid) {
          throw new Error(`Invalid manifest: ${validation.errors.join(', ')}`);
        }
      }
      
      // Check if plugin already loaded
      if (this.plugins.has(manifest.id)) {
        logger.warn(`Plugin ${manifest.id} already loaded`);
        return this.plugins.get(manifest.id)!;
      }
      
      // Check permissions
      if (checkPermissions && manifest.permissions.length > 0) {
        const checker = permissionChecker || this.defaultPermissionChecker;
        const deniedPermissions = manifest.permissions.filter(p => !checker(p));
        
        if (deniedPermissions.length > 0) {
          throw new Error(`Permission denied: ${deniedPermissions.join(', ')}`);
        }
      }
      
      // Create plugin context
      const context = new PluginContextImpl(manifest.id, pluginPath, this.registry);
      
      // Load plugin code
      let plugin: Plugin;
      let sandbox: PluginSandbox | undefined;
      
      if (enableSandbox) {
        // Create sandbox for plugin execution
        sandbox = new PluginSandbox(manifest, pluginPath);
        plugin = await sandbox.loadPlugin();
      } else {
        // Load plugin directly (less secure)
        plugin = await this.loadPluginCode(pluginPath, manifest);
      }
      
      // Create loaded plugin entry
      const loadedPlugin: LoadedPlugin = {
        manifest,
        plugin,
        context,
        sandbox,
        status: PluginStatus.Loaded,
      };
      
      this.plugins.set(manifest.id, loadedPlugin);
      logger.info(`Plugin ${manifest.id} loaded successfully`);
      
      return loadedPlugin;
    } catch (error) {
      logger.error(`Failed to load plugin from ${pluginPath}:`, error);
      
      const failedPlugin: LoadedPlugin = {
        manifest: { id: 'unknown', name: 'Unknown', version: '0.0.0' } as PluginManifest,
        plugin: null as any,
        context: null as any,
        status: PluginStatus.Failed,
        error: error as Error
      };
      
      return failedPlugin;
    }
  }
  
  /**
   * Activate a loaded plugin
   */
  async activatePlugin(pluginId: string): Promise<void> {
    const loadedPlugin = this.plugins.get(pluginId);
    
    if (!loadedPlugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    if (loadedPlugin.status === PluginStatus.Activated) {
      logger.warn(`Plugin ${pluginId} already activated`);
      return;
    }
    
    if (loadedPlugin.status !== PluginStatus.Loaded && 
        loadedPlugin.status !== PluginStatus.Deactivated) {
      throw new Error(`Cannot activate plugin in status ${loadedPlugin.status}`);
    }
    
    logger.info(`Activating plugin ${pluginId}`);
    
    try {
      // Register plugin with registry
      this.registry.registerPlugin(loadedPlugin);
      
      // Call plugin activation
      await loadedPlugin.plugin.activate(loadedPlugin.context);
      
      loadedPlugin.status = PluginStatus.Activated;
      logger.info(`Plugin ${pluginId} activated successfully`);
    } catch (error) {
      logger.error(`Failed to activate plugin ${pluginId}:`, error);
      loadedPlugin.status = PluginStatus.Failed;
      loadedPlugin.error = error as Error;
      throw error;
    }
  }
  
  /**
   * Deactivate a plugin
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    const loadedPlugin = this.plugins.get(pluginId);
    
    if (!loadedPlugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    if (loadedPlugin.status !== PluginStatus.Activated) {
      logger.warn(`Plugin ${pluginId} not activated`);
      return;
    }
    
    logger.info(`Deactivating plugin ${pluginId}`);
    
    try {
      // Call plugin deactivation
      if (loadedPlugin.plugin.deactivate) {
        await loadedPlugin.plugin.deactivate();
      }
      
      // Dispose context subscriptions
      loadedPlugin.context.subscriptions.dispose();
      
      // Unregister from registry
      this.registry.unregisterPlugin(pluginId);
      
      loadedPlugin.status = PluginStatus.Deactivated;
      logger.info(`Plugin ${pluginId} deactivated successfully`);
    } catch (error) {
      logger.error(`Failed to deactivate plugin ${pluginId}:`, error);
      throw error;
    }
  }
  
  /**
   * Unload a plugin completely
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const loadedPlugin = this.plugins.get(pluginId);
    
    if (!loadedPlugin) {
      return;
    }
    
    // Deactivate if active
    if (loadedPlugin.status === PluginStatus.Activated) {
      await this.deactivatePlugin(pluginId);
    }
    
    logger.info(`Unloading plugin ${pluginId}`);
    
    // Cleanup sandbox if exists
    if (loadedPlugin.sandbox) {
      loadedPlugin.sandbox.dispose();
    }
    
    // Remove from loaded plugins
    this.plugins.delete(pluginId);
    
    logger.info(`Plugin ${pluginId} unloaded`);
  }
  
  /**
   * Get loaded plugin
   */
  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginId);
  }
  
  /**
   * Get all loaded plugins
   */
  getAllPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Get active plugins
   */
  getActivePlugins(): LoadedPlugin[] {
    return this.getAllPlugins().filter(p => p.status === PluginStatus.Activated);
  }
  
  /**
   * Reload a plugin
   */
  async reloadPlugin(pluginId: string): Promise<void> {
    const loadedPlugin = this.plugins.get(pluginId);
    
    if (!loadedPlugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    const pluginPath = loadedPlugin.context.pluginPath;
    const wasActive = loadedPlugin.status === PluginStatus.Activated;
    
    // Unload current plugin
    await this.unloadPlugin(pluginId);
    
    // Reload plugin
    const reloaded = await this.loadPlugin(pluginPath);
    
    // Reactivate if was active
    if (wasActive && reloaded.status === PluginStatus.Loaded) {
      await this.activatePlugin(reloaded.manifest.id);
    }
  }
  
  /**
   * Dispose all plugins
   */
  async dispose(): Promise<void> {
    logger.info('Disposing plugin loader');
    
    // Deactivate all active plugins
    const activePlugins = this.getActivePlugins();
    
    for (const plugin of activePlugins) {
      try {
        await this.deactivatePlugin(plugin.manifest.id);
      } catch (error) {
        logger.error(`Failed to deactivate plugin ${plugin.manifest.id}:`, error);
      }
    }
    
    // Unload all plugins
    const allPlugins = [...this.plugins.keys()];
    
    for (const pluginId of allPlugins) {
      try {
        await this.unloadPlugin(pluginId);
      } catch (error) {
        logger.error(`Failed to unload plugin ${pluginId}:`, error);
      }
    }
    
    this.plugins.clear();
  }
  
  /**
   * Load plugin manifest
   */
  private async loadManifest(pluginPath: string): Promise<PluginManifest> {
    try {
      // In a real implementation, this would read from file system
      // For now, we'll use dynamic import
      const manifestModule = await import(`${pluginPath}/plugin.json`);
      return manifestModule.default as PluginManifest;
    } catch (error) {
      throw new Error(`Failed to load manifest: ${error}`);
    }
  }
  
  /**
   * Load plugin code directly (without sandbox)
   */
  private async loadPluginCode(
    pluginPath: string, 
    manifest: PluginManifest
  ): Promise<Plugin> {
    try {
      const mainPath = `${pluginPath}/${manifest.main}`;
      const pluginModule = await import(mainPath);
      
      // Check if default export is a plugin class
      if (pluginModule.default && typeof pluginModule.default === 'function') {
        return new pluginModule.default() as Plugin;
      }
      
      // Check if there's a named export
      if (pluginModule.Plugin && typeof pluginModule.Plugin === 'function') {
        return new pluginModule.Plugin() as Plugin;
      }
      
      // Check if module itself is the plugin
      if (pluginModule.activate) {
        return pluginModule as Plugin;
      }
      
      throw new Error('No valid plugin export found');
    } catch (error) {
      throw new Error(`Failed to load plugin code: ${error}`);
    }
  }
  
  /**
   * Default permission checker (can be overridden)
   */
  private defaultPermissionChecker = (permission: PluginPermission): boolean => {
    // In a real implementation, this would check user settings
    // For now, we'll allow safe permissions by default
    const safePermissions: PluginPermission[] = [
      'ui:render',
      'state:read',
      'events:listen',
      'filesystem:read'
    ];
    
    return safePermissions.includes(permission);
  };
}