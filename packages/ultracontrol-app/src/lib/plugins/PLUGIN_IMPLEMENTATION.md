# UltraControl Plugin System Implementation Design

## 1. Overview

This document provides the implementation details for the UltraControl plugin system, building upon the architecture defined in PLUGINS_ARCHITECTURE.md. It focuses on the concrete implementation approach using TypeScript for the frontend and Python for the backend.

## 2. Core Plugin Infrastructure

### 2.1 Plugin Type Definitions

```typescript
// packages/ultracontrol-app/src/lib/interfaces/plugins.ts

export interface PluginManifest {
  id: string;                           // Unique plugin identifier (e.g., "com.example.plugin")
  name: string;                         // Display name
  version: string;                      // Semantic version (e.g., "1.0.0")
  description?: string;                 // Plugin description
  author?: string;                      // Author information
  main?: string;                        // Backend entry point (Python module path)
  ui?: string;                          // Frontend entry point (JS/TS module path)
  permissions: PluginPermission[];      // Required permissions
  capabilities: PluginCapability[];     // Provided capabilities
  dependencies?: Record<string, string>; // Plugin dependencies
  icon?: string;                        // Icon path
  homepage?: string;                    // Plugin homepage/docs
  repository?: string;                  // Source repository
  license?: string;                     // License identifier
}

export type PluginPermission = 
  | 'workspace:file:read'
  | 'workspace:file:write'
  | 'workspace:file:execute'
  | 'llm:request:*'
  | 'llm:request:gpt-4'
  | 'llm:request:claude'
  | 'event:subscribe:*'
  | 'event:publish:*'
  | 'ui:component:register'
  | 'ui:theme:modify'
  | 'agent:create'
  | 'agent:control'
  | 'system:config:read'
  | 'network:external:*';

export interface PluginCapability {
  name: string;
  type: CapabilityType;
  description?: string;
  schema?: any; // JSON Schema for input/output
  metadata?: Record<string, any>;
}

export type CapabilityType = 
  | 'action'         // Handles specific actions
  | 'observer'       // Observes events
  | 'ui_component'   // Provides UI components
  | 'llm_provider'   // LLM provider
  | 'agent_type'     // New agent type
  | 'tool'           // Tool for agents
  | 'theme'          // UI theme
  | 'language';      // Language support

export interface PluginInstance {
  manifest: PluginManifest;
  status: PluginStatus;
  instance?: any;
  error?: string;
  loadedAt?: string;
  enabledAt?: string;
}

export type PluginStatus = 
  | 'discovered'
  | 'loading'
  | 'loaded'
  | 'initializing'
  | 'initialized'
  | 'enabling'
  | 'enabled'
  | 'disabling'
  | 'disabled'
  | 'error'
  | 'unloading';
```

### 2.2 Plugin Context API

```typescript
// packages/ultracontrol-app/src/lib/plugins/context.ts

export interface PluginContext {
  // Plugin information
  readonly pluginId: string;
  readonly manifest: PluginManifest;
  
  // Core services
  readonly eventService: IPluginEventService;
  readonly stateService: IPluginStateService;
  readonly uiService: IPluginUIService;
  readonly apiService: IPluginAPIService;
  readonly logger: IPluginLogger;
  
  // Permission checker
  hasPermission(permission: PluginPermission): boolean;
  
  // Storage
  readonly storage: IPluginStorage;
}

export interface IPluginEventService {
  // Subscribe to events (with permission check)
  on(event: string, handler: EventHandler): UnsubscribeFn;
  once(event: string, handler: EventHandler): UnsubscribeFn;
  
  // Publish events (with permission check)
  emit(event: string, data: any): Promise<void>;
  
  // Typed event subscriptions
  onAction(handler: (action: ActionPayload) => void): UnsubscribeFn;
  onObservation(handler: (observation: ObservationPayload) => void): UnsubscribeFn;
  onStateUpdate(handler: (update: StateUpdateMessage) => void): UnsubscribeFn;
}

export interface IPluginStateService {
  // Read-only access to specific stores
  getStore<T>(storeName: string): ReadonlyAtom<T> | null;
  
  // Subscribe to store changes
  subscribeToStore<T>(storeName: string, handler: (value: T) => void): UnsubscribeFn;
}

export interface IPluginUIService {
  // Register UI components
  registerComponent(area: UIArea, component: React.ComponentType<any>): void;
  unregisterComponent(area: UIArea, componentId: string): void;
  
  // Show notifications
  showNotification(message: string, type: 'info' | 'success' | 'warning' | 'error'): void;
  
  // Show dialogs
  showDialog(options: DialogOptions): Promise<any>;
  
  // Register commands
  registerCommand(command: Command): void;
  
  // Register menu items
  registerMenuItem(menu: MenuLocation, item: MenuItem): void;
}

export interface IPluginAPIService {
  // Make API calls through the unified API client
  execution: IExecutionClient;
  filesystem: IFileSystemClient;
  agent: IAgentClient;
  project: IProjectClient;
}

export interface IPluginLogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, error?: Error, ...args: any[]): void;
}

export interface IPluginStorage {
  // Persistent storage for plugin data
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}
```

### 2.3 Plugin Loader

```typescript
// packages/ultracontrol-app/src/lib/plugins/loader.ts

export class PluginLoader {
  private plugins: Map<string, PluginInstance> = new Map();
  private contexts: Map<string, PluginContext> = new Map();
  
  constructor(
    private eventService: EventService,
    private stateManager: StateManager,
    private uiRegistry: UIRegistry,
    private apiClient: IApiClient,
    private permissionManager: PermissionManager
  ) {}

  async discoverPlugins(searchPaths: string[]): Promise<PluginManifest[]> {
    const manifests: PluginManifest[] = [];
    
    for (const path of searchPaths) {
      const pluginDirs = await this.scanDirectory(path);
      
      for (const dir of pluginDirs) {
        try {
          const manifestPath = join(dir, 'plugin.json');
          const manifest = await this.loadManifest(manifestPath);
          
          if (this.validateManifest(manifest)) {
            manifests.push(manifest);
          }
        } catch (error) {
          console.error(`Failed to load plugin manifest from ${dir}:`, error);
        }
      }
    }
    
    return manifests;
  }

  async loadPlugin(manifest: PluginManifest): Promise<void> {
    const pluginId = manifest.id;
    
    if (this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is already loaded`);
    }
    
    this.plugins.set(pluginId, {
      manifest,
      status: 'loading'
    });
    
    try {
      // Check dependencies
      await this.checkDependencies(manifest);
      
      // Create plugin context
      const context = this.createContext(manifest);
      this.contexts.set(pluginId, context);
      
      // Load frontend module if specified
      if (manifest.ui) {
        await this.loadFrontendModule(manifest, context);
      }
      
      // Initialize backend through API if specified
      if (manifest.main) {
        await this.initializeBackend(manifest);
      }
      
      this.updatePluginStatus(pluginId, 'loaded');
    } catch (error) {
      this.updatePluginStatus(pluginId, 'error', error.message);
      throw error;
    }
  }

  async enablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    if (plugin.status !== 'loaded' && plugin.status !== 'disabled') {
      throw new Error(`Plugin ${pluginId} is not in a state that can be enabled`);
    }
    
    this.updatePluginStatus(pluginId, 'enabling');
    
    try {
      const context = this.contexts.get(pluginId);
      
      // Activate frontend module
      if (plugin.manifest.ui && plugin.instance?.activate) {
        await plugin.instance.activate(context);
      }
      
      // Enable backend through API
      if (plugin.manifest.main) {
        await this.apiClient.agent.updateAgent(pluginId, { status: 'enabled' });
      }
      
      this.updatePluginStatus(pluginId, 'enabled');
      
      // Emit plugin enabled event
      this.eventService.sendSystemEvent('PluginEnabled', { pluginId });
    } catch (error) {
      this.updatePluginStatus(pluginId, 'error', error.message);
      throw error;
    }
  }

  async disablePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin || plugin.status !== 'enabled') {
      throw new Error(`Plugin ${pluginId} is not enabled`);
    }
    
    this.updatePluginStatus(pluginId, 'disabling');
    
    try {
      // Deactivate frontend module
      if (plugin.instance?.deactivate) {
        await plugin.instance.deactivate();
      }
      
      // Disable backend through API
      if (plugin.manifest.main) {
        await this.apiClient.agent.updateAgent(pluginId, { status: 'disabled' });
      }
      
      this.updatePluginStatus(pluginId, 'disabled');
      
      // Emit plugin disabled event
      this.eventService.sendSystemEvent('PluginDisabled', { pluginId });
    } catch (error) {
      this.updatePluginStatus(pluginId, 'error', error.message);
      throw error;
    }
  }

  private async loadFrontendModule(manifest: PluginManifest, context: PluginContext): Promise<void> {
    // Dynamic import of plugin module
    const modulePath = this.resolveModulePath(manifest.ui!);
    const module = await import(modulePath);
    
    if (!module.activate || typeof module.activate !== 'function') {
      throw new Error(`Plugin ${manifest.id} frontend module must export an 'activate' function`);
    }
    
    const plugin = this.plugins.get(manifest.id)!;
    plugin.instance = module;
  }

  private createContext(manifest: PluginManifest): PluginContext {
    return new PluginContextImpl(
      manifest,
      this.eventService,
      this.stateManager,
      this.uiRegistry,
      this.apiClient,
      this.permissionManager
    );
  }

  private validateManifest(manifest: any): manifest is PluginManifest {
    // Validate required fields
    return !!(
      manifest.id &&
      manifest.name &&
      manifest.version &&
      Array.isArray(manifest.permissions) &&
      Array.isArray(manifest.capabilities)
    );
  }

  private updatePluginStatus(pluginId: string, status: PluginStatus, error?: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.status = status;
      if (error) {
        plugin.error = error;
      }
      if (status === 'enabled') {
        plugin.enabledAt = new Date().toISOString();
      }
    }
  }
}
```

### 2.4 Permission Manager

```typescript
// packages/ultracontrol-app/src/lib/plugins/permissions.ts

export class PermissionManager {
  private grantedPermissions: Map<string, Set<PluginPermission>> = new Map();
  
  constructor(private userStore: UserPreferencesStore) {}

  async requestPermissions(
    pluginId: string, 
    permissions: PluginPermission[]
  ): Promise<boolean> {
    // Get stored permissions
    const stored = await this.userStore.getPluginPermissions(pluginId);
    
    // Check if all permissions are already granted
    const missing = permissions.filter(p => !stored.includes(p));
    
    if (missing.length === 0) {
      this.grantedPermissions.set(pluginId, new Set(permissions));
      return true;
    }
    
    // Show permission dialog to user
    const granted = await this.showPermissionDialog(pluginId, missing);
    
    if (granted) {
      const allPermissions = [...stored, ...missing];
      await this.userStore.setPluginPermissions(pluginId, allPermissions);
      this.grantedPermissions.set(pluginId, new Set(allPermissions));
      return true;
    }
    
    return false;
  }

  hasPermission(pluginId: string, permission: PluginPermission): boolean {
    const permissions = this.grantedPermissions.get(pluginId);
    if (!permissions) return false;
    
    // Check exact permission
    if (permissions.has(permission)) return true;
    
    // Check wildcard permissions
    const permissionParts = permission.split(':');
    for (let i = permissionParts.length - 1; i > 0; i--) {
      const wildcardPermission = permissionParts.slice(0, i).join(':') + ':*';
      if (permissions.has(wildcardPermission as PluginPermission)) {
        return true;
      }
    }
    
    return false;
  }

  revokePermissions(pluginId: string): void {
    this.grantedPermissions.delete(pluginId);
    this.userStore.removePluginPermissions(pluginId);
  }

  private async showPermissionDialog(
    pluginId: string,
    permissions: PluginPermission[]
  ): Promise<boolean> {
    // Implementation would show a UI dialog
    // For now, return true in development
    return process.env.NODE_ENV === 'development';
  }
}
```

## 3. Backend Plugin System (Python)

### 3.1 Plugin Base Class

```python
# packages/OpenHands-main/openhands/plugins/base.py

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from openhands.events.stream import EventStream
from openhands.events.event import Event
from openhands.events.action import Action
from openhands.events.observation import Observation


@dataclass
class PluginManifest:
    id: str
    name: str
    version: str
    description: Optional[str] = None
    author: Optional[str] = None
    permissions: List[str] = None
    capabilities: List[Dict[str, Any]] = None


class PluginContext:
    """Context provided to plugins for accessing core functionality"""
    
    def __init__(
        self,
        plugin_id: str,
        event_stream: EventStream,
        config: Dict[str, Any],
        logger: Any
    ):
        self.plugin_id = plugin_id
        self.event_stream = event_stream
        self.config = config
        self.logger = logger
        self._storage = {}
    
    def subscribe_event(self, event_type: str, handler):
        """Subscribe to specific event types"""
        # Check permission before subscribing
        if not self.has_permission(f"event:subscribe:{event_type}"):
            raise PermissionError(f"Plugin {self.plugin_id} lacks permission to subscribe to {event_type}")
        
        self.event_stream.subscribe(
            subscriber_id=f"plugin_{self.plugin_id}",
            callback=handler,
            callback_id=f"{self.plugin_id}_{event_type}_handler"
        )
    
    def emit_event(self, event: Event):
        """Emit an event to the event stream"""
        # Check permission before emitting
        event_type = type(event).__name__
        if not self.has_permission(f"event:publish:{event_type}"):
            raise PermissionError(f"Plugin {self.plugin_id} lacks permission to publish {event_type}")
        
        self.event_stream.add_event(event, source=f"plugin:{self.plugin_id}")
    
    def has_permission(self, permission: str) -> bool:
        """Check if plugin has a specific permission"""
        # Implementation would check against granted permissions
        return True  # Simplified for now
    
    def get_storage(self, key: str, default=None):
        """Get plugin-specific storage"""
        return self._storage.get(key, default)
    
    def set_storage(self, key: str, value: Any):
        """Set plugin-specific storage"""
        self._storage[key] = value


class BasePlugin(ABC):
    """Base class for all backend plugins"""
    
    def __init__(self, context: PluginContext):
        self.context = context
        self.logger = context.logger
    
    @abstractmethod
    def initialize(self):
        """Initialize the plugin"""
        pass
    
    @abstractmethod
    def shutdown(self):
        """Clean up plugin resources"""
        pass
    
    def register_action_handler(self, action_type: str, handler):
        """Register a handler for a specific action type"""
        def wrapped_handler(event: Event):
            if isinstance(event, Action) and event.action_type == action_type:
                return handler(event)
        
        self.context.subscribe_event("Action", wrapped_handler)
    
    def register_tool(self, name: str, func, description: str):
        """Register a tool that agents can use"""
        # Implementation would register with tool registry
        pass
```

### 3.2 Plugin Loader (Python)

```python
# packages/OpenHands-main/openhands/plugins/loader.py

import importlib
import json
import os
from pathlib import Path
from typing import Dict, List, Optional

from openhands.plugins.base import BasePlugin, PluginContext, PluginManifest


class PluginLoader:
    """Loads and manages backend plugins"""
    
    def __init__(self, event_stream, config, logger):
        self.event_stream = event_stream
        self.config = config
        self.logger = logger
        self.plugins: Dict[str, BasePlugin] = {}
        self.manifests: Dict[str, PluginManifest] = {}
    
    def discover_plugins(self, search_paths: List[str]) -> List[PluginManifest]:
        """Discover available plugins"""
        manifests = []
        
        for search_path in search_paths:
            path = Path(search_path)
            if not path.exists():
                continue
            
            for plugin_dir in path.iterdir():
                if plugin_dir.is_dir():
                    manifest_path = plugin_dir / "plugin.json"
                    if manifest_path.exists():
                        try:
                            manifest = self._load_manifest(manifest_path)
                            manifests.append(manifest)
                        except Exception as e:
                            self.logger.error(f"Failed to load manifest from {manifest_path}: {e}")
        
        return manifests
    
    def load_plugin(self, manifest: PluginManifest) -> bool:
        """Load a plugin"""
        plugin_id = manifest.id
        
        if plugin_id in self.plugins:
            self.logger.warning(f"Plugin {plugin_id} is already loaded")
            return False
        
        try:
            # Import the plugin module
            if manifest.main:
                module = importlib.import_module(manifest.main)
                
                # Look for plugin class or initialization function
                if hasattr(module, 'Plugin') and issubclass(module.Plugin, BasePlugin):
                    # Create plugin context
                    context = PluginContext(
                        plugin_id=plugin_id,
                        event_stream=self.event_stream,
                        config=self.config.get('plugins', {}).get(plugin_id, {}),
                        logger=self.logger.getChild(plugin_id)
                    )
                    
                    # Instantiate plugin
                    plugin = module.Plugin(context)
                    plugin.initialize()
                    
                    self.plugins[plugin_id] = plugin
                    self.manifests[plugin_id] = manifest
                    
                    self.logger.info(f"Loaded plugin: {plugin_id}")
                    return True
                elif hasattr(module, 'initialize_plugin'):
                    # Legacy support for functional plugins
                    context = PluginContext(
                        plugin_id=plugin_id,
                        event_stream=self.event_stream,
                        config=self.config.get('plugins', {}).get(plugin_id, {}),
                        logger=self.logger.getChild(plugin_id)
                    )
                    
                    module.initialize_plugin(context)
                    self.manifests[plugin_id] = manifest
                    
                    self.logger.info(f"Loaded functional plugin: {plugin_id}")
                    return True
                else:
                    self.logger.error(f"Plugin {plugin_id} must have a Plugin class or initialize_plugin function")
                    return False
        except Exception as e:
            self.logger.error(f"Failed to load plugin {plugin_id}: {e}")
            return False
    
    def unload_plugin(self, plugin_id: str) -> bool:
        """Unload a plugin"""
        if plugin_id not in self.plugins:
            return False
        
        try:
            plugin = self.plugins[plugin_id]
            plugin.shutdown()
            del self.plugins[plugin_id]
            del self.manifests[plugin_id]
            
            self.logger.info(f"Unloaded plugin: {plugin_id}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to unload plugin {plugin_id}: {e}")
            return False
    
    def _load_manifest(self, path: Path) -> PluginManifest:
        """Load plugin manifest from JSON file"""
        with open(path, 'r') as f:
            data = json.load(f)
        
        return PluginManifest(
            id=data['id'],
            name=data['name'],
            version=data['version'],
            description=data.get('description'),
            author=data.get('author'),
            permissions=data.get('permissions', []),
            capabilities=data.get('capabilities', [])
        )
```

## 4. Example Plugin Implementation

### 4.1 Plugin Structure

```
my-awesome-plugin/
├── plugin.json
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts
│       └── components/
│           └── AwesomePanel.tsx
└── backend/
    ├── __init__.py
    ├── plugin.py
    └── tools.py
```

### 4.2 Manifest (plugin.json)

```json
{
  "id": "com.example.awesome-plugin",
  "name": "Awesome Plugin",
  "version": "1.0.0",
  "description": "An awesome plugin that does awesome things",
  "author": "John Doe <john@example.com>",
  "main": "backend.plugin",
  "ui": "frontend/dist/index.js",
  "permissions": [
    "workspace:file:read",
    "workspace:file:write",
    "llm:request:gpt-4",
    "event:subscribe:FileChanged",
    "event:publish:CustomNotification",
    "ui:component:register"
  ],
  "capabilities": [
    {
      "name": "awesome-tool",
      "type": "tool",
      "description": "Does something awesome with files"
    },
    {
      "name": "AwesomePanel",
      "type": "ui_component",
      "area": "sidebar_bottom",
      "component": "AwesomePanel"
    }
  ]
}
```

### 4.3 Backend Implementation

```python
# backend/plugin.py

from openhands.plugins.base import BasePlugin
from openhands.events.action import FileReadAction, FileWriteAction
from openhands.events.observation import FileReadObservation

from .tools import awesome_file_processor


class Plugin(BasePlugin):
    """Awesome Plugin backend implementation"""
    
    def initialize(self):
        """Initialize the plugin"""
        self.logger.info("Awesome Plugin initializing...")
        
        # Register action handlers
        self.register_action_handler("ProcessFile", self.handle_process_file)
        
        # Register tools for agents
        self.register_tool(
            name="awesome_processor",
            func=awesome_file_processor,
            description="Process files in an awesome way"
        )
        
        # Subscribe to file change events
        self.context.subscribe_event("FileChanged", self.on_file_changed)
    
    def shutdown(self):
        """Clean up resources"""
        self.logger.info("Awesome Plugin shutting down...")
    
    def handle_process_file(self, action: Action):
        """Handle ProcessFile actions"""
        file_path = action.args.get("path")
        if not file_path:
            return
        
        # Read file
        read_action = FileReadAction(path=file_path)
        self.context.emit_event(read_action)
        
        # Process file content (simplified)
        # In real implementation, would wait for FileReadObservation
        processed_content = f"# Processed by Awesome Plugin\n{content}"
        
        # Write processed content
        write_action = FileWriteAction(
            path=file_path,
            content=processed_content
        )
        self.context.emit_event(write_action)
    
    def on_file_changed(self, event):
        """React to file changes"""
        self.logger.info(f"File changed: {event.path}")
```

### 4.4 Frontend Implementation

```typescript
// frontend/src/index.ts

import type { PluginContext } from '@ultracontrol/plugin-sdk';
import { AwesomePanel } from './components/AwesomePanel';

export function activate(context: PluginContext) {
  console.log('Awesome Plugin activating...');
  
  // Register UI component
  context.uiService.registerComponent('sidebar_bottom', AwesomePanel);
  
  // Subscribe to events
  const unsubscribe = context.eventService.onObservation((observation) => {
    if (observation.observationType === 'FileProcessed') {
      context.uiService.showNotification(
        'File processed successfully!',
        'success'
      );
    }
  });
  
  // Register command
  context.uiService.registerCommand({
    id: 'awesome.processCurrentFile',
    title: 'Process Current File',
    handler: async () => {
      const currentFile = await getCurrentFile(); // Implementation needed
      context.eventService.emit('ProcessFile', {
        path: currentFile
      });
    }
  });
  
  // Store cleanup function
  context.storage.set('cleanup', unsubscribe);
}

export function deactivate(context: PluginContext) {
  console.log('Awesome Plugin deactivating...');
  
  // Clean up subscriptions
  const cleanup = context.storage.get('cleanup');
  if (cleanup) cleanup();
}
```

```tsx
// frontend/src/components/AwesomePanel.tsx

import React, { useState, useEffect } from 'react';
import { usePluginContext } from '@ultracontrol/plugin-sdk';
import { Button } from '@/lib/ui/components';

export const AwesomePanel: React.FC = () => {
  const context = usePluginContext();
  const [files, setFiles] = useState<string[]>([]);
  
  useEffect(() => {
    // Load processed files from storage
    context.storage.get('processedFiles').then(stored => {
      if (stored) setFiles(stored);
    });
  }, []);
  
  const handleProcessFile = async () => {
    const result = await context.uiService.showDialog({
      title: 'Select File',
      type: 'file-picker'
    });
    
    if (result.file) {
      context.eventService.emit('ProcessFile', {
        path: result.file
      });
      
      const updatedFiles = [...files, result.file];
      setFiles(updatedFiles);
      context.storage.set('processedFiles', updatedFiles);
    }
  };
  
  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-4">Awesome Plugin</h3>
      
      <Button onClick={handleProcessFile} className="mb-4">
        Process File
      </Button>
      
      <div className="space-y-2">
        <h4 className="font-medium">Processed Files:</h4>
        {files.map(file => (
          <div key={file} className="text-sm text-gray-600">
            {file}
          </div>
        ))}
      </div>
    </div>
  );
};
```

## 5. Plugin Development Kit (SDK)

### 5.1 Frontend SDK Package

```json
// packages/plugin-sdk-frontend/package.json
{
  "name": "@ultracontrol/plugin-sdk",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./react": "./dist/react.js"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  }
}
```

### 5.2 Backend SDK Package

```python
# packages/plugin-sdk-backend/setup.py

from setuptools import setup, find_packages

setup(
    name="ultracontrol-plugin-sdk",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "openhands>=0.1.0",
    ],
    python_requires=">=3.8",
)
```

## 6. Plugin Registry Service

### 6.1 Registry API

```typescript
// packages/ultracontrol-app/src/lib/plugins/registry.ts

export interface PluginRegistry {
  // Discover plugins
  discover(): Promise<PluginManifest[]>;
  
  // Search plugins
  search(query: string, filters?: PluginFilters): Promise<PluginManifest[]>;
  
  // Get plugin details
  getPlugin(pluginId: string): Promise<PluginDetails>;
  
  // Install plugin
  install(pluginId: string): Promise<void>;
  
  // Uninstall plugin
  uninstall(pluginId: string): Promise<void>;
  
  // Update plugin
  update(pluginId: string): Promise<void>;
  
  // Get installed plugins
  getInstalled(): Promise<PluginManifest[]>;
  
  // Check for updates
  checkUpdates(): Promise<PluginUpdate[]>;
}

export interface PluginFilters {
  type?: CapabilityType[];
  permissions?: PluginPermission[];
  author?: string;
  minRating?: number;
}

export interface PluginDetails extends PluginManifest {
  readme: string;
  changelog: string;
  screenshots: string[];
  downloads: number;
  rating: number;
  reviews: number;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
}

export interface PluginUpdate {
  pluginId: string;
  currentVersion: string;
  latestVersion: string;
  changelog: string;
}
```

## 7. Security Considerations

### 7.1 Sandboxing Strategy

1. **Frontend Sandboxing**:
   - Run plugins in Web Workers when possible
   - Use iframe for complete isolation of untrusted plugins
   - Content Security Policy (CSP) restrictions

2. **Backend Sandboxing**:
   - Run plugins in Docker containers
   - Use Python's restricted execution mode
   - Resource limits (CPU, memory, disk)

3. **Permission Enforcement**:
   - All API calls check permissions
   - Capability-based security model
   - Audit logging of all plugin actions

### 7.2 Plugin Signing

```typescript
// Plugin verification
export interface PluginSignature {
  algorithm: 'RSA-SHA256' | 'ECDSA-SHA256';
  signature: string;
  certificate: string;
  timestamp: string;
}

export async function verifyPlugin(
  manifest: PluginManifest,
  signature: PluginSignature
): Promise<boolean> {
  // Verify signature against trusted certificates
  // Check certificate chain
  // Validate timestamp
  return true; // Implementation needed
}
```

## 8. Plugin Store UI

### 8.1 Plugin Manager Component

```tsx
// packages/ultracontrol-app/src/components/plugins/PluginManager.tsx

import React, { useState, useEffect } from 'react';
import { usePluginRegistry } from '@/lib/plugins/hooks';
import { PluginCard } from './PluginCard';
import { SearchInput, Button } from '@/lib/ui/components';

export const PluginManager: React.FC = () => {
  const registry = usePluginRegistry();
  const [plugins, setPlugins] = useState([]);
  const [installed, setInstalled] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    loadPlugins();
  }, []);
  
  const loadPlugins = async () => {
    const [available, installedList] = await Promise.all([
      registry.search(searchQuery),
      registry.getInstalled()
    ]);
    
    setPlugins(available);
    setInstalled(installedList);
  };
  
  const handleInstall = async (pluginId: string) => {
    await registry.install(pluginId);
    await loadPlugins();
  };
  
  const handleUninstall = async (pluginId: string) => {
    await registry.uninstall(pluginId);
    await loadPlugins();
  };
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Plugin Manager</h2>
      
      <SearchInput
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search plugins..."
        className="mb-6"
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plugins.map(plugin => (
          <PluginCard
            key={plugin.id}
            plugin={plugin}
            isInstalled={installed.some(p => p.id === plugin.id)}
            onInstall={() => handleInstall(plugin.id)}
            onUninstall={() => handleUninstall(plugin.id)}
          />
        ))}
      </div>
    </div>
  );
};
```

## 9. Future Enhancements

1. **Plugin Marketplace**:
   - Central registry for discovering plugins
   - Rating and review system
   - Monetization options for developers

2. **Hot Reloading**:
   - Development mode with automatic plugin reload
   - No restart required for updates

3. **Plugin Composition**:
   - Plugins can depend on and extend other plugins
   - Plugin inheritance and mixins

4. **Advanced Sandboxing**:
   - WebAssembly (WASM) runtime for plugins
   - Capability-based operating system (CapOS) integration

5. **Plugin Analytics**:
   - Usage tracking and telemetry
   - Performance monitoring
   - Error reporting

6. **AI-Assisted Plugin Development**:
   - Generate plugin boilerplate from description
   - Suggest APIs based on intended functionality
   - Automated testing and validation

This implementation design provides a solid foundation for the UltraControl plugin system, enabling extensibility while maintaining security and stability.