/**
 * Adaptive Layout System for UltraControl
 * 
 * Provides context-aware, responsive layout that adapts based on:
 * - Current task type
 * - Active agents
 * - User preferences
 * - Screen size and orientation
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStore } from '@nanostores/react';
import { createScopedLogger } from '@/lib/utils/logger';

const logger = createScopedLogger('AdaptiveLayout');

export interface LayoutRegion {
  id: string;
  type: 'main' | 'sidebar' | 'panel' | 'toolbar' | 'statusbar';
  position: 'top' | 'right' | 'bottom' | 'left' | 'center';
  size?: number | string;
  minSize?: number;
  maxSize?: number;
  resizable?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  priority?: number;
}

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  regions: LayoutRegion[];
  conditions?: {
    taskType?: string[];
    activeAgents?: string[];
    screenSize?: 'mobile' | 'tablet' | 'desktop' | 'wide';
  };
}

interface AdaptiveLayoutProps {
  children: React.ReactNode;
  presets?: LayoutPreset[];
  onLayoutChange?: (preset: LayoutPreset) => void;
}

// Default layout presets
const defaultPresets: LayoutPreset[] = [
  {
    id: 'frontend-dev',
    name: 'Frontend Development',
    description: 'Optimized for React/Vue development with preview',
    regions: [
      { id: 'editor', type: 'main', position: 'center', size: '60%' },
      { id: 'preview', type: 'panel', position: 'right', size: '40%', resizable: true },
      { id: 'terminal', type: 'panel', position: 'bottom', size: 200, resizable: true, collapsible: true },
      { id: 'files', type: 'sidebar', position: 'left', size: 240, resizable: true, collapsible: true }
    ],
    conditions: {
      taskType: ['frontend'],
      activeAgents: ['bolt']
    }
  },
  {
    id: 'backend-dev',
    name: 'Backend Development',
    description: 'Focused on code editing with terminal and logs',
    regions: [
      { id: 'editor', type: 'main', position: 'center', size: '70%' },
      { id: 'terminal', type: 'panel', position: 'bottom', size: 300, resizable: true },
      { id: 'logs', type: 'panel', position: 'right', size: '30%', resizable: true, collapsible: true },
      { id: 'files', type: 'sidebar', position: 'left', size: 240, resizable: true, collapsible: true }
    ],
    conditions: {
      taskType: ['backend', 'database'],
      activeAgents: ['openhands']
    }
  },
  {
    id: 'fullstack',
    name: 'Full Stack',
    description: 'Balanced layout for full-stack development',
    regions: [
      { id: 'editor', type: 'main', position: 'center', size: '50%' },
      { id: 'preview', type: 'panel', position: 'right', size: '30%', resizable: true },
      { id: 'terminal', type: 'panel', position: 'bottom', size: 250, resizable: true },
      { id: 'files', type: 'sidebar', position: 'left', size: 200, resizable: true, collapsible: true },
      { id: 'agents', type: 'panel', position: 'right', size: '20%', resizable: true, collapsible: true }
    ],
    conditions: {
      taskType: ['general'],
      activeAgents: ['bolt', 'openhands']
    }
  },
  {
    id: 'chat-focus',
    name: 'Chat Focus',
    description: 'Maximized chat interface for planning and discussions',
    regions: [
      { id: 'chat', type: 'main', position: 'center', size: '70%' },
      { id: 'context', type: 'panel', position: 'right', size: '30%', resizable: true },
      { id: 'suggestions', type: 'panel', position: 'bottom', size: 150, resizable: true, collapsible: true }
    ],
    conditions: {
      taskType: ['planning', 'discussion']
    }
  },
  {
    id: 'mobile',
    name: 'Mobile',
    description: 'Optimized for mobile devices',
    regions: [
      { id: 'main', type: 'main', position: 'center', size: '100%' },
      { id: 'toolbar', type: 'toolbar', position: 'top', size: 48 },
      { id: 'tabs', type: 'panel', position: 'bottom', size: 56 }
    ],
    conditions: {
      screenSize: 'mobile'
    }
  }
];

export const AdaptiveLayout: React.FC<AdaptiveLayoutProps> = ({
  children,
  presets = defaultPresets,
  onLayoutChange
}) => {
  const [currentPreset, setCurrentPreset] = useState<LayoutPreset>(presets[0]);
  const [regions, setRegions] = useState<Map<string, LayoutRegion>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [draggedRegion, setDraggedRegion] = useState<string | null>(null);

  // Get current context from stores
  // const currentTask = useStore(currentTaskStore);
  // const activeAgents = useStore(activeAgentsStore);
  // const userPreferences = useStore(userPreferencesStore);

  // Detect screen size
  const screenSize = useScreenSize();

  // Select best preset based on conditions
  const selectPreset = useCallback(() => {
    // For now, use a simple selection based on screen size
    const matchingPreset = presets.find(preset => {
      if (preset.conditions?.screenSize === screenSize) {
        return true;
      }
      // Additional condition matching would go here
      return false;
    });

    const selected = matchingPreset || presets[0];
    setCurrentPreset(selected);
    
    // Initialize regions
    const regionMap = new Map<string, LayoutRegion>();
    selected.regions.forEach(region => {
      regionMap.set(region.id, { ...region });
    });
    setRegions(regionMap);

    if (onLayoutChange) {
      onLayoutChange(selected);
    }
  }, [presets, screenSize, onLayoutChange]);

  useEffect(() => {
    selectPreset();
  }, [selectPreset]);

  // Handle region resizing
  const handleResize = useCallback((regionId: string, newSize: number | string) => {
    setRegions(prev => {
      const updated = new Map(prev);
      const region = updated.get(regionId);
      if (region) {
        updated.set(regionId, { ...region, size: newSize });
      }
      return updated;
    });
  }, []);

  // Handle region collapse/expand
  const toggleCollapse = useCallback((regionId: string) => {
    setRegions(prev => {
      const updated = new Map(prev);
      const region = updated.get(regionId);
      if (region && region.collapsible) {
        updated.set(regionId, { ...region, collapsed: !region.collapsed });
      }
      return updated;
    });
  }, []);

  // Render layout regions
  const renderRegions = useMemo(() => {
    const sortedRegions = Array.from(regions.values()).sort((a, b) => 
      (a.priority || 0) - (b.priority || 0)
    );

    return sortedRegions.map(region => (
      <LayoutRegion
        key={region.id}
        region={region}
        onResize={handleResize}
        onToggleCollapse={toggleCollapse}
        isDragging={isDragging && draggedRegion === region.id}
      >
        {/* Region content would be rendered here based on region.id */}
        <div className={`region-content region-${region.id}`}>
          {renderRegionContent(region.id)}
        </div>
      </LayoutRegion>
    ));
  }, [regions, handleResize, toggleCollapse, isDragging, draggedRegion]);

  // Render specific content for each region
  const renderRegionContent = (regionId: string): React.ReactNode => {
    // This would be replaced with actual components
    const contentMap: Record<string, React.ReactNode> = {
      'editor': <div>Code Editor</div>,
      'preview': <div>Preview Panel</div>,
      'terminal': <div>Terminal</div>,
      'files': <div>File Explorer</div>,
      'chat': <div>Chat Interface</div>,
      'logs': <div>Logs</div>,
      'agents': <div>Active Agents</div>,
      'context': <div>Context Panel</div>,
      'suggestions': <div>Suggestions</div>,
      'toolbar': <div>Toolbar</div>,
      'tabs': <div>Tabs</div>,
      'main': children
    };

    return contentMap[regionId] || children;
  };

  return (
    <div className={`adaptive-layout preset-${currentPreset.id} screen-${screenSize}`}>
      <div className="layout-container">
        {renderRegions}
      </div>
      
      {/* Layout switcher for manual override */}
      <LayoutSwitcher
        presets={presets}
        currentPreset={currentPreset}
        onPresetChange={setCurrentPreset}
      />
    </div>
  );
};

// Layout Region Component
interface LayoutRegionProps {
  region: LayoutRegion;
  onResize: (regionId: string, newSize: number | string) => void;
  onToggleCollapse: (regionId: string) => void;
  isDragging: boolean;
  children: React.ReactNode;
}

const LayoutRegion: React.FC<LayoutRegionProps> = ({
  region,
  onResize,
  onToggleCollapse,
  isDragging,
  children
}) => {
  const [isResizing, setIsResizing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startSize, setStartSize] = useState<number>(0);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    
    const currentSize = typeof region.size === 'string' 
      ? parseInt(region.size) 
      : region.size || 0;
    setStartSize(currentSize);
  }, [region.size]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = region.position === 'left' || region.position === 'right'
        ? e.clientX - startPos.x
        : e.clientY - startPos.y;

      const newSize = Math.max(
        region.minSize || 100,
        Math.min(
          region.maxSize || 800,
          startSize + (region.position === 'left' || region.position === 'top' ? delta : -delta)
        )
      );

      onResize(region.id, newSize);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, startPos, startSize, region, onResize]);

  const regionClass = `
    layout-region
    region-${region.type}
    position-${region.position}
    ${region.collapsed ? 'collapsed' : ''}
    ${isResizing ? 'resizing' : ''}
    ${isDragging ? 'dragging' : ''}
  `.trim();

  const style: React.CSSProperties = {
    [region.position === 'left' || region.position === 'right' ? 'width' : 'height']: 
      region.collapsed ? 0 : region.size,
  };

  return (
    <div className={regionClass} style={style}>
      {region.collapsible && (
        <button
          className="collapse-toggle"
          onClick={() => onToggleCollapse(region.id)}
          aria-label={region.collapsed ? 'Expand' : 'Collapse'}
        >
          {region.collapsed ? '▶' : '◀'}
        </button>
      )}
      
      <div className="region-content-wrapper">
        {children}
      </div>
      
      {region.resizable && !region.collapsed && (
        <div
          className="resize-handle"
          onMouseDown={handleResizeStart}
          role="separator"
          aria-orientation={
            region.position === 'left' || region.position === 'right' 
              ? 'vertical' 
              : 'horizontal'
          }
        />
      )}
    </div>
  );
};

// Layout Switcher Component
interface LayoutSwitcherProps {
  presets: LayoutPreset[];
  currentPreset: LayoutPreset;
  onPresetChange: (preset: LayoutPreset) => void;
}

const LayoutSwitcher: React.FC<LayoutSwitcherProps> = ({
  presets,
  currentPreset,
  onPresetChange
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="layout-switcher">
      <button
        className="layout-switcher-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Switch layout"
      >
        <span className="icon">⚏</span>
      </button>
      
      {isOpen && (
        <div className="layout-switcher-menu">
          <h3>Layout Presets</h3>
          {presets.map(preset => (
            <button
              key={preset.id}
              className={`preset-option ${preset.id === currentPreset.id ? 'active' : ''}`}
              onClick={() => {
                onPresetChange(preset);
                setIsOpen(false);
              }}
            >
              <strong>{preset.name}</strong>
              <span>{preset.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Hook to detect screen size
function useScreenSize(): 'mobile' | 'tablet' | 'desktop' | 'wide' {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop' | 'wide'>('desktop');

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else if (width < 1920) {
        setScreenSize('desktop');
      } else {
        setScreenSize('wide');
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return screenSize;
}

// Export additional utilities
export { useScreenSize };
export type { LayoutRegionProps, LayoutSwitcherProps };