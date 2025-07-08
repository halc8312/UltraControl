// packages/ultracontrol-app/src/lib/ui/components/index.ts

// Core components
export { Button, PrimaryButton, SecondaryButton, GhostButton, DangerButton } from './Button';
export type { ButtonProps } from './Button';

export { Input, TextInput, EmailInput, PasswordInput, NumberInput, SearchInput } from './Input';
export type { InputProps } from './Input';

export { IconButton } from './IconButton';
export type { IconButtonProps } from './IconButton';

export { Dialog, ConfirmDialog } from './Dialog';
export type { DialogProps, ConfirmDialogProps } from './Dialog';

export { Tooltip } from './Tooltip';
export type { TooltipProps, TooltipPlacement } from './Tooltip';

export { Icon } from './Icon';
export type { IconProps } from './Icon';

export { LoadingSpinner } from './LoadingSpinner';
export type { LoadingSpinnerProps } from './LoadingSpinner';

// Re-export types
export type {
  ComponentSize,
  ComponentVariant,
  ComponentColor,
  BaseComponentProps,
  InteractiveComponentProps,
  SizeableComponentProps,
  VariantComponentProps,
  ColorableComponentProps,
  IconName,
} from '../types';

// Re-export utilities
export { cn, focusRingClasses, panelClasses, overlayClasses } from '../utils';