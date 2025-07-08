// packages/ultracontrol-app/src/lib/ui/types.ts

export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ComponentVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
export type ComponentColor = 'default' | 'primary' | 'secondary' | 'accent' | 'danger' | 'success' | 'warning';

export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  'data-testid'?: string;
}

export interface InteractiveComponentProps extends BaseComponentProps {
  disabled?: boolean;
  loading?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export interface SizeableComponentProps {
  size?: ComponentSize;
}

export interface VariantComponentProps {
  variant?: ComponentVariant;
}

export interface ColorableComponentProps {
  color?: ComponentColor;
}

// Icon types
export type IconName = 
  | 'check'
  | 'close'
  | 'chevron-down'
  | 'chevron-up'
  | 'chevron-left'
  | 'chevron-right'
  | 'menu'
  | 'search'
  | 'settings'
  | 'user'
  | 'home'
  | 'file'
  | 'folder'
  | 'code'
  | 'terminal'
  | 'play'
  | 'pause'
  | 'stop'
  | 'refresh'
  | 'download'
  | 'upload'
  | 'copy'
  | 'paste'
  | 'edit'
  | 'delete'
  | 'add'
  | 'remove'
  | 'info'
  | 'warning'
  | 'error'
  | 'question'
  | 'sun'
  | 'moon'
  | 'github'
  | 'external-link'
  | 'loading';