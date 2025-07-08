/**
 * Plugin Validator
 * 
 * Validates plugin manifests and code for security and compatibility
 */

import { z } from 'zod';
import type { PluginManifest, PluginPermission, PluginCapability } from '../api/PluginAPI';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('PluginValidator');

// Zod schemas for validation
const AuthorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  url: z.string().url().optional()
});

const EngineSchema = z.object({
  ultracontrol: z.string().regex(/^\d+\.\d+\.\d+$/),
  node: z.string().regex(/^\d+\.\d+\.\d+$/).optional()
});

const RouteSchema = z.object({
  path: z.string().regex(/^\/[a-zA-Z0-9-_/]*$/),
  component: z.string().min(1),
  title: z.string().optional(),
  icon: z.string().optional(),
  permissions: z.array(z.string()).optional()
});

const PanelSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  component: z.string().min(1),
  position: z.enum(['left', 'right', 'bottom', 'center']),
  defaultSize: z.number().positive().optional(),
  minSize: z.number().positive().optional(),
  maxSize: z.number().positive().optional()
});

const CommandSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: z.string().optional(),
  keybinding: z.string().optional(),
  when: z.string().optional(),
  handler: z.string().min(1)
});

const UIConfigSchema = z.object({
  components: z.array(z.string()).optional(),
  routes: z.array(RouteSchema).optional(),
  panels: z.array(PanelSchema).optional(),
  commands: z.array(CommandSchema).optional()
});

const PermissionSchema = z.enum([
  'filesystem:read',
  'filesystem:write',
  'network:http',
  'network:websocket',
  'process:spawn',
  'llm:access',
  'agent:create',
  'runtime:execute',
  'ui:render',
  'state:read',
  'state:write',
  'events:listen',
  'events:emit'
] as const);

const CapabilitySchema = z.enum([
  'agent-provider',
  'llm-provider',
  'runtime-provider',
  'ui-extension',
  'task-handler',
  'file-handler',
  'command-provider',
  'theme-provider',
  'language-support'
] as const);

const ManifestSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-_]+$/),
  name: z.string().min(1).max(100),
  version: z.string().regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?$/),
  description: z.string().min(1).max(500),
  author: AuthorSchema,
  main: z.string().regex(/^[a-zA-Z0-9-_/]+\.(js|ts)$/),
  type: z.enum(['ui', 'agent', 'llm', 'runtime', 'hybrid']),
  engine: EngineSchema,
  permissions: z.array(PermissionSchema),
  capabilities: z.array(CapabilitySchema),
  dependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional(),
  ui: UIConfigSchema.optional(),
  configSchema: z.record(z.any()).optional()
});

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface SecurityCheckResult {
  safe: boolean;
  issues: SecurityIssue[];
}

export interface SecurityIssue {
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  location?: string;
}

export class PluginValidator {
  /**
   * Validate plugin manifest
   */
  async validateManifest(manifest: any): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Parse with Zod schema
      const parsed = ManifestSchema.parse(manifest);
      
      // Additional validation rules
      
      // Check version compatibility
      const currentVersion = await this.getCurrentVersion();
      if (!this.isVersionCompatible(parsed.engine.ultracontrol, currentVersion)) {
        errors.push(`Incompatible UltraControl version. Required: ${parsed.engine.ultracontrol}, Current: ${currentVersion}`);
      }
      
      // Check permission combinations
      const permissionWarnings = this.checkPermissionCombinations(parsed.permissions);
      warnings.push(...permissionWarnings);
      
      // Check capability requirements
      const capabilityErrors = this.checkCapabilityRequirements(parsed);
      errors.push(...capabilityErrors);
      
      // Validate dependencies
      if (parsed.dependencies) {
        const depWarnings = await this.validateDependencies(parsed.dependencies);
        warnings.push(...depWarnings);
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const zodErrors = error.errors.map(e => 
          `${e.path.join('.')}: ${e.message}`
        );
        errors.push(...zodErrors);
      } else {
        errors.push(`Validation error: ${error}`);
      }
      
      return {
        valid: false,
        errors,
        warnings
      };
    }
  }
  
  /**
   * Perform security checks on plugin code
   */
  async checkSecurity(code: string, manifest: PluginManifest): Promise<SecurityCheckResult> {
    const issues: SecurityIssue[] = [];
    
    // Check for dangerous patterns
    const dangerousPatterns = [
      {
        pattern: /eval\s*\(/g,
        severity: 'critical' as const,
        message: 'Use of eval() is forbidden'
      },
      {
        pattern: /new\s+Function\s*\(/g,
        severity: 'critical' as const,
        message: 'Dynamic function creation is forbidden'
      },
      {
        pattern: /require\s*\(\s*[^'"]/g,
        severity: 'high' as const,
        message: 'Dynamic require() is not allowed'
      },
      {
        pattern: /import\s*\(/g,
        severity: 'medium' as const,
        message: 'Dynamic imports must be reviewed'
      },
      {
        pattern: /process\.env/g,
        severity: 'medium' as const,
        message: 'Direct environment variable access'
      },
      {
        pattern: /child_process/g,
        severity: 'high' as const,
        message: 'Child process spawning requires process:spawn permission'
      }
    ];
    
    for (const { pattern, severity, message } of dangerousPatterns) {
      const matches = code.matchAll(pattern);
      for (const match of matches) {
        issues.push({
          severity,
          type: 'dangerous-pattern',
          message,
          location: `index: ${match.index}`
        });
      }
    }
    
    // Check for permission violations
    const permissionChecks = [
      {
        pattern: /fs\.|require\(['"]fs['"]\)/g,
        permission: 'filesystem:read' as PluginPermission,
        message: 'File system access requires permission'
      },
      {
        pattern: /fetch\(|axios|http\.|https\./g,
        permission: 'network:http' as PluginPermission,
        message: 'Network access requires permission'
      },
      {
        pattern: /WebSocket|ws\.|socket\.io/g,
        permission: 'network:websocket' as PluginPermission,
        message: 'WebSocket access requires permission'
      }
    ];
    
    for (const { pattern, permission, message } of permissionChecks) {
      if (code.match(pattern) && !manifest.permissions.includes(permission)) {
        issues.push({
          severity: 'high',
          type: 'permission-violation',
          message: `${message}: ${permission}`
        });
      }
    }
    
    // Check for known vulnerabilities
    const vulnerabilityPatterns = [
      {
        pattern: /innerHTML\s*=/g,
        severity: 'medium' as const,
        message: 'Direct innerHTML assignment can lead to XSS'
      },
      {
        pattern: /document\.write/g,
        severity: 'medium' as const,
        message: 'document.write() usage is discouraged'
      },
      {
        pattern: /window\.__proto__/g,
        severity: 'high' as const,
        message: 'Prototype pollution attempt detected'
      }
    ];
    
    for (const { pattern, severity, message } of vulnerabilityPatterns) {
      if (code.match(pattern)) {
        issues.push({
          severity,
          type: 'vulnerability',
          message
        });
      }
    }
    
    return {
      safe: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
      issues
    };
  }
  
  /**
   * Validate plugin exports
   */
  validateExports(pluginModule: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check for required exports
    if (!pluginModule.activate && !pluginModule.default?.activate && !pluginModule.Plugin) {
      errors.push('Plugin must export an activate function or Plugin class');
    }
    
    // Check activate function signature
    const plugin = pluginModule.default || pluginModule.Plugin || pluginModule;
    if (plugin.activate && typeof plugin.activate !== 'function') {
      errors.push('activate must be a function');
    }
    
    if (plugin.deactivate && typeof plugin.deactivate !== 'function') {
      errors.push('deactivate must be a function');
    }
    
    // Check for manifest
    if (!plugin.manifest) {
      warnings.push('Plugin should include manifest property');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * Check for dangerous permission combinations
   */
  private checkPermissionCombinations(permissions: PluginPermission[]): string[] {
    const warnings: string[] = [];
    
    // Warn about powerful permission combinations
    if (permissions.includes('filesystem:write') && permissions.includes('network:http')) {
      warnings.push('Plugin can write files and make network requests - potential data exfiltration risk');
    }
    
    if (permissions.includes('process:spawn') && permissions.includes('filesystem:write')) {
      warnings.push('Plugin can spawn processes and write files - high security risk');
    }
    
    if (permissions.includes('state:write') && permissions.includes('events:emit')) {
      warnings.push('Plugin can modify state and emit events - potential for system manipulation');
    }
    
    return warnings;
  }
  
  /**
   * Check capability requirements
   */
  private checkCapabilityRequirements(manifest: PluginManifest): string[] {
    const errors: string[] = [];
    
    // Check type matches capabilities
    switch (manifest.type) {
      case 'agent':
        if (!manifest.capabilities.includes('agent-provider')) {
          errors.push('Agent plugin must have agent-provider capability');
        }
        break;
      case 'llm':
        if (!manifest.capabilities.includes('llm-provider')) {
          errors.push('LLM plugin must have llm-provider capability');
        }
        break;
      case 'runtime':
        if (!manifest.capabilities.includes('runtime-provider')) {
          errors.push('Runtime plugin must have runtime-provider capability');
        }
        break;
      case 'ui':
        if (!manifest.capabilities.includes('ui-extension')) {
          errors.push('UI plugin must have ui-extension capability');
        }
        break;
    }
    
    // Check UI config for UI plugins
    if (manifest.capabilities.includes('ui-extension') && !manifest.ui) {
      errors.push('UI extension must provide ui configuration');
    }
    
    return errors;
  }
  
  /**
   * Validate dependencies
   */
  private async validateDependencies(dependencies: Record<string, string>): Promise<string[]> {
    const warnings: string[] = [];
    
    // List of known problematic packages
    const problematicPackages = [
      'request', // Deprecated
      'node-uuid', // Renamed to uuid
      'jade', // Renamed to pug
    ];
    
    for (const [pkg, version] of Object.entries(dependencies)) {
      if (problematicPackages.includes(pkg)) {
        warnings.push(`Dependency ${pkg} is deprecated or problematic`);
      }
      
      // Check for wildcard versions
      if (version === '*' || version === 'latest') {
        warnings.push(`Dependency ${pkg} uses wildcard version - potential compatibility issues`);
      }
    }
    
    return warnings;
  }
  
  /**
   * Check version compatibility
   */
  private isVersionCompatible(required: string, current: string): boolean {
    const parseVersion = (v: string) => {
      const [major, minor, patch] = v.split('.').map(Number);
      return { major, minor, patch };
    };
    
    const reqVer = parseVersion(required);
    const curVer = parseVersion(current);
    
    // Major version must match
    if (reqVer.major !== curVer.major) {
      return false;
    }
    
    // Current minor version must be >= required
    if (curVer.minor < reqVer.minor) {
      return false;
    }
    
    // If minor versions match, current patch must be >= required
    if (curVer.minor === reqVer.minor && curVer.patch < reqVer.patch) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Get current UltraControl version
   */
  private async getCurrentVersion(): Promise<string> {
    // In a real implementation, this would read from package.json
    return '1.0.0';
  }
}