// packages/ultracontrol-app/src/lib/ui/utils.ts

import type { ComponentSize, ComponentVariant, ComponentColor } from './types';

// Utility function to combine class names
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Size mappings
export const sizeClasses: Record<ComponentSize, string> = {
  xs: 'text-xs px-2 py-1',
  sm: 'text-sm px-3 py-1.5',
  md: 'text-base px-4 py-2',
  lg: 'text-lg px-5 py-2.5',
  xl: 'text-xl px-6 py-3',
};

export const iconSizeClasses: Record<ComponentSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

// Variant mappings for buttons
export const buttonVariantClasses: Record<ComponentVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400 disabled:bg-gray-100 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
  ghost: 'bg-transparent hover:bg-gray-100 active:bg-gray-200 dark:hover:bg-gray-800 dark:active:bg-gray-700',
  danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-400',
  success: 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:bg-green-400',
  warning: 'bg-yellow-600 text-white hover:bg-yellow-700 active:bg-yellow-800 disabled:bg-yellow-400',
};

// Input variant classes
export const inputVariantClasses: Record<'default' | 'error', string> = {
  default: 'border-gray-300 focus:border-blue-500 dark:border-gray-600 dark:focus:border-blue-400',
  error: 'border-red-500 focus:border-red-600 dark:border-red-400 dark:focus:border-red-500',
};

// Color utility
export const colorClasses: Record<ComponentColor, string> = {
  default: 'text-gray-900 dark:text-gray-100',
  primary: 'text-blue-600 dark:text-blue-400',
  secondary: 'text-gray-600 dark:text-gray-400',
  accent: 'text-purple-600 dark:text-purple-400',
  danger: 'text-red-600 dark:text-red-400',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
};

// Base component classes
export const baseInputClasses = 'w-full rounded-md border bg-white px-3 py-2 text-sm placeholder-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:placeholder-gray-500 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-900';

export const baseButtonClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

// Focus ring classes
export const focusRingClasses = 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-blue-400 dark:focus:ring-offset-gray-900';

// Loading animation classes
export const loadingSpinnerClasses = 'animate-spin h-4 w-4';

// Overlay classes
export const overlayClasses = 'fixed inset-0 bg-black/50 dark:bg-black/70';

// Panel/Card classes
export const panelClasses = 'rounded-lg border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800';

// Helper to generate data attributes
export function dataAttr(condition: boolean | undefined) {
  return condition ? '' : undefined;
}