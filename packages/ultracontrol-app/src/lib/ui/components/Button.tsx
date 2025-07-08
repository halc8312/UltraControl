// packages/ultracontrol-app/src/lib/ui/components/Button.tsx
import React, { forwardRef } from 'react';
import type { InteractiveComponentProps, SizeableComponentProps, VariantComponentProps } from '../types';
import { cn, sizeClasses, buttonVariantClasses, baseButtonClasses } from '../utils';
import { LoadingSpinner } from './LoadingSpinner';

export interface ButtonProps extends 
  InteractiveComponentProps, 
  SizeableComponentProps, 
  VariantComponentProps,
  React.ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loadingText?: string;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      disabled = false,
      loading = false,
      size = 'md',
      variant = 'primary',
      fullWidth = false,
      leftIcon,
      rightIcon,
      loadingText,
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={cn(
          baseButtonClasses,
          sizeClasses[size],
          buttonVariantClasses[variant],
          fullWidth && 'w-full',
          loading && 'relative cursor-wait',
          className
        )}
        {...props}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner size={size} />
          </span>
        )}
        
        <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>
          {leftIcon && <span className="inline-flex">{leftIcon}</span>}
          {loading && loadingText ? loadingText : children}
          {rightIcon && <span className="inline-flex">{rightIcon}</span>}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

// Convenience button variants
export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="primary" {...props} />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="secondary" {...props} />
);

export const GhostButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="ghost" {...props} />
);

export const DangerButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="danger" {...props} />
);