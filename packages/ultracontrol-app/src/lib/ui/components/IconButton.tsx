// packages/ultracontrol-app/src/lib/ui/components/IconButton.tsx
import React, { forwardRef } from 'react';
import type { InteractiveComponentProps, SizeableComponentProps, VariantComponentProps } from '../types';
import { cn, iconSizeClasses, buttonVariantClasses, focusRingClasses } from '../utils';
import { LoadingSpinner } from './LoadingSpinner';

export interface IconButtonProps extends 
  InteractiveComponentProps,
  SizeableComponentProps,
  VariantComponentProps,
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: React.ReactNode;
  rounded?: boolean;
}

const iconButtonSizeClasses: Record<string, string> = {
  xs: 'p-1',
  sm: 'p-1.5',
  md: 'p-2',
  lg: 'p-2.5',
  xl: 'p-3',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      disabled = false,
      loading = false,
      size = 'md',
      variant = 'ghost',
      icon,
      rounded = false,
      type = 'button',
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    if (!ariaLabel && !props.title) {
      console.warn('IconButton: aria-label or title prop is required for accessibility');
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-label={ariaLabel}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-200',
          focusRingClasses,
          buttonVariantClasses[variant],
          iconButtonSizeClasses[size],
          rounded ? 'rounded-full' : 'rounded-md',
          isDisabled && 'cursor-not-allowed opacity-50',
          loading && 'cursor-wait',
          className
        )}
        {...props}
      >
        {loading ? (
          <LoadingSpinner size={size} />
        ) : (
          <span className={cn('inline-flex', iconSizeClasses[size])}>
            {icon}
          </span>
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';