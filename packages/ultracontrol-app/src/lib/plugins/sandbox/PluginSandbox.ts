/**
 * Plugin Sandbox
 * 
 * Provides a secure execution environment for plugins using Web Workers
 * and restricted APIs to prevent malicious code execution.
 */

import { createScopedLogger } from '@/lib/utils/logger';
import type { Plugin, PluginManifest, PluginPermission } from '../api/PluginAPI';

const logger = createScopedLogger('PluginSandbox');

export interface SandboxOptions {
  /**
   * Memory limit in MB
   */
  memoryLimit?: number;
  
  /**
   * CPU time limit in milliseconds
   */
  cpuTimeLimit?: number;
  
  /**
   * Network request timeout in milliseconds
   */
  networkTimeout?: number;
  
  /**
   * Maximum number of concurrent operations
   */
  maxConcurrency?: number;
}

export interface SandboxMessage {
  id: string;
  type: 'call' | 'response' | 'error' | 'event';
  method?: string;
  args?: any[];
  result?: any;
  error?: string;
}

export class PluginSandbox {
  private worker: Worker | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private manifest: PluginManifest;
  private pluginPath: string;
  private options: Required<SandboxOptions>;
  private pendingCalls = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private messageId = 0;
  
  constructor(
    manifest: PluginManifest, 
    pluginPath: string,
    options: SandboxOptions = {}
  ) {
    this.manifest = manifest;
    this.pluginPath = pluginPath;
    this.options = {
      memoryLimit: options.memoryLimit ?? 256, // 256MB default
      cpuTimeLimit: options.cpuTimeLimit ?? 30000, // 30 seconds
      networkTimeout: options.networkTimeout ?? 10000, // 10 seconds
      maxConcurrency: options.maxConcurrency ?? 10
    };
  }
  
  /**
   * Load plugin in sandbox
   */
  async loadPlugin(): Promise<Plugin> {
    logger.info(`Loading plugin ${this.manifest.id} in sandbox`);
    
    try {
      // Create sandbox environment based on plugin type
      if (this.requiresDOM()) {
        await this.createIframeSandbox();
      } else {
        await this.createWorkerSandbox();
      }
      
      // Load plugin code
      const pluginProxy = await this.createPluginProxy();
      
      return pluginProxy;
    } catch (error) {
      logger.error(`Failed to load plugin in sandbox:`, error);
      throw error;
    }
  }
  
  /**
   * Create Web Worker sandbox
   */
  private async createWorkerSandbox(): Promise<void> {
    const workerCode = this.generateWorkerCode();
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    
    this.worker = new Worker(workerUrl, {
      name: `plugin-${this.manifest.id}`,
      type: 'module'
    });
    
    this.worker.onmessage = this.handleMessage.bind(this);
    this.worker.onerror = this.handleError.bind(this);
    
    // Initialize worker with plugin code
    await this.callSandbox('initialize', {
      manifest: this.manifest,
      pluginPath: this.pluginPath,
      permissions: this.manifest.permissions
    });
    
    URL.revokeObjectURL(workerUrl);
  }
  
  /**
   * Create iframe sandbox for UI plugins
   */
  private async createIframeSandbox(): Promise<void> {
    this.iframe = document.createElement('iframe');
    this.iframe.sandbox.add(
      'allow-scripts',
      'allow-same-origin' // Required for API access
    );
    
    // Add additional sandbox permissions based on plugin permissions
    if (this.manifest.permissions.includes('ui:render')) {
      this.iframe.sandbox.add('allow-modals', 'allow-popups');
    }
    
    this.iframe.style.display = 'none';
    document.body.appendChild(this.iframe);
    
    const iframeDoc = this.iframe.contentDocument!;
    const sandboxHtml = this.generateIframeHtml();
    
    iframeDoc.open();
    iframeDoc.write(sandboxHtml);
    iframeDoc.close();
    
    // Set up message channel
    window.addEventListener('message', (event) => {
      if (event.source === this.iframe?.contentWindow) {
        this.handleMessage({ data: event.data });
      }
    });
    
    // Wait for iframe to be ready
    await new Promise<void>((resolve) => {
      const checkReady = () => {
        this.callSandbox('ping').then(() => resolve()).catch(() => {
          setTimeout(checkReady, 100);
        });
      };
      checkReady();
    });
    
    // Initialize iframe with plugin code
    await this.callSandbox('initialize', {
      manifest: this.manifest,
      pluginPath: this.pluginPath,
      permissions: this.manifest.permissions
    });
  }
  
  /**
   * Generate Web Worker code
   */
  private generateWorkerCode(): string {
    return `
      // Plugin Sandbox Worker
      const permissions = new Set();
      const globals = new Map();
      let plugin = null;
      
      // Restricted global object
      const restrictedGlobal = new Proxy({}, {
        get(target, prop) {
          // Allow safe globals
          const safeGlobals = [
            'Object', 'Array', 'String', 'Number', 'Boolean', 'Date',
            'Math', 'JSON', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet',
            'Symbol', 'BigInt', 'Intl', 'TextEncoder', 'TextDecoder',
            'URL', 'URLSearchParams', 'console', 'setTimeout', 'clearTimeout',
            'setInterval', 'clearInterval'
          ];
          
          if (safeGlobals.includes(prop)) {
            return globalThis[prop];
          }
          
          // Check permissions for other globals
          if (prop === 'fetch' && !permissions.has('network:http')) {
            throw new Error('Network access not permitted');
          }
          
          if (prop === 'WebSocket' && !permissions.has('network:websocket')) {
            throw new Error('WebSocket access not permitted');
          }
          
          return globals.get(prop);
        },
        
        set(target, prop, value) {
          globals.set(prop, value);
          return true;
        },
        
        has(target, prop) {
          return globals.has(prop);
        }
      });
      
      // Message handler
      self.onmessage = async (event) => {
        const message = event.data;
        
        try {
          let result;
          
          switch (message.method) {
            case 'initialize':
              const { manifest, pluginPath, permissions: perms } = message.args[0];
              perms.forEach(p => permissions.add(p));
              
              // Load plugin code with fetch
              const response = await fetch(pluginPath + '/' + manifest.main);
              const code = await response.text();
              
              // Create plugin module
              const moduleCode = \`
                (function(global, exports, require, module) {
                  \${code}
                  return module.exports || exports.default || exports;
                })(restrictedGlobal, {}, () => { throw new Error('require not supported'); }, { exports: {} });
              \`;
              
              plugin = eval(moduleCode);
              result = { success: true };
              break;
              
            case 'ping':
              result = 'pong';
              break;
              
            case 'call':
              const { target, method, args } = message.args[0];
              const obj = target === 'plugin' ? plugin : plugin[target];
              result = await obj[method](...args);
              break;
              
            default:
              throw new Error(\`Unknown method: \${message.method}\`);
          }
          
          self.postMessage({
            id: message.id,
            type: 'response',
            result
          });
        } catch (error) {
          self.postMessage({
            id: message.id,
            type: 'error',
            error: error.message
          });
        }
      };
    `;
  }
  
  /**
   * Generate iframe HTML
   */
  private generateIframeHtml(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Plugin Sandbox</title>
        <script>
          const permissions = new Set();
          let plugin = null;
          
          // Message handler
          window.addEventListener('message', async (event) => {
            const message = event.data;
            
            try {
              let result;
              
              switch (message.method) {
                case 'initialize':
                  const { manifest, pluginPath, permissions: perms } = message.args[0];
                  perms.forEach(p => permissions.add(p));
                  
                  // Create script element to load plugin
                  const script = document.createElement('script');
                  script.type = 'module';
                  script.textContent = \`
                    import pluginModule from '\${pluginPath}/\${manifest.main}';
                    window.__plugin = pluginModule;
                  \`;
                  document.head.appendChild(script);
                  
                  // Wait for plugin to load
                  await new Promise(resolve => {
                    const check = () => {
                      if (window.__plugin) {
                        plugin = window.__plugin;
                        resolve();
                      } else {
                        setTimeout(check, 10);
                      }
                    };
                    check();
                  });
                  
                  result = { success: true };
                  break;
                  
                case 'ping':
                  result = 'pong';
                  break;
                  
                case 'call':
                  const { target, method, args } = message.args[0];
                  const obj = target === 'plugin' ? plugin : plugin[target];
                  result = await obj[method](...args);
                  break;
                  
                default:
                  throw new Error(\`Unknown method: \${message.method}\`);
              }
              
              parent.postMessage({
                id: message.id,
                type: 'response',
                result
              }, '*');
            } catch (error) {
              parent.postMessage({
                id: message.id,
                type: 'error',
                error: error.message
              }, '*');
            }
          });
        </script>
      </head>
      <body>
        <div id="plugin-root"></div>
      </body>
      </html>
    `;
  }
  
  /**
   * Create plugin proxy object
   */
  private async createPluginProxy(): Promise<Plugin> {
    const handler: ProxyHandler<any> = {
      get: (target, prop) => {
        if (prop === 'manifest') {
          return this.manifest;
        }
        
        if (prop === 'activate' || prop === 'deactivate' || prop === 'getExports') {
          return (...args: any[]) => {
            return this.callSandbox('call', {
              target: 'plugin',
              method: prop as string,
              args
            });
          };
        }
        
        return undefined;
      }
    };
    
    return new Proxy({}, handler) as Plugin;
  }
  
  /**
   * Call method in sandbox
   */
  private async callSandbox(method: string, ...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = `${this.messageId++}`;
      
      const timeout = setTimeout(() => {
        this.pendingCalls.delete(id);
        reject(new Error(`Sandbox call timeout: ${method}`));
      }, this.options.cpuTimeLimit);
      
      this.pendingCalls.set(id, { resolve, reject, timeout });
      
      const message: SandboxMessage = {
        id,
        type: 'call',
        method,
        args
      };
      
      if (this.worker) {
        this.worker.postMessage(message);
      } else if (this.iframe) {
        this.iframe.contentWindow!.postMessage(message, '*');
      }
    });
  }
  
  /**
   * Handle messages from sandbox
   */
  private handleMessage(event: MessageEvent): void {
    const message: SandboxMessage = event.data;
    
    if (message.type === 'response' || message.type === 'error') {
      const pending = this.pendingCalls.get(message.id);
      
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingCalls.delete(message.id);
        
        if (message.type === 'response') {
          pending.resolve(message.result);
        } else {
          pending.reject(new Error(message.error || 'Unknown error'));
        }
      }
    } else if (message.type === 'event') {
      // Handle events from plugin
      logger.debug(`Plugin event:`, message);
    }
  }
  
  /**
   * Handle errors from sandbox
   */
  private handleError(error: ErrorEvent): void {
    logger.error(`Sandbox error:`, error);
  }
  
  /**
   * Check if plugin requires DOM access
   */
  private requiresDOM(): boolean {
    return this.manifest.type === 'ui' || 
           this.manifest.capabilities.includes('ui-extension');
  }
  
  /**
   * Dispose sandbox
   */
  dispose(): void {
    // Clear pending calls
    this.pendingCalls.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('Sandbox disposed'));
    });
    this.pendingCalls.clear();
    
    // Terminate worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    // Remove iframe
    if (this.iframe) {
      this.iframe.remove();
      this.iframe = null;
    }
    
    logger.info(`Sandbox for plugin ${this.manifest.id} disposed`);
  }
}