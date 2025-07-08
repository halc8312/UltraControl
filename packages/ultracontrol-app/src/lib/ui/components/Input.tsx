// packages/ultracontrol-app/src/lib/ui/components/Input.tsx
import React, { forwardRef } from 'react';
import type { InteractiveComponentProps, SizeableComponentProps } from '../types';
import { cn, sizeClasses, inputVariantClasses, baseInputClasses } from '../utils';

export interface InputProps extends 
  InteractiveComponentProps,
  SizeableComponentProps,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  error?: boolean;
  errorMessage?: string;
  label?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      disabled = false,
      error = false,
      errorMessage,
      label,
      helperText,
      leftIcon,
      rightIcon,
      fullWidth = true,
      size = 'md',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name;
    const hasError = error || !!errorMessage;
    const describedBy = [
      errorMessage && `${inputId}-error`,
      helperText && `${inputId}-helper`,
    ].filter(Boolean).join(' ');

    return (
      <div className={cn('space-y-1', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-500 dark:text-gray-400">{leftIcon}</span>
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={describedBy || undefined}
            className={cn(
              baseInputClasses,
              sizeClasses[size],
              inputVariantClasses[hasError ? 'error' : 'default'],
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            {...props}
          />
          
          {rightIcon && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-500 dark:text-gray-400">{rightIcon}</span>
            </div>
          )}
        </div>
        
        {errorMessage && (
          <p id={`${inputId}-error`} className="text-sm text-red-600 dark:text-red-400">
            {errorMessage}
          </p>
        )}
        
        {helperText && !errorMessage && (
          <p id={`${inputId}-helper`} className="text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Specialized input components
export const TextInput = Input;

export const EmailInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>((props, ref) => (
  <Input ref={ref} type="email" {...props} />
));
EmailInput.displayName = 'EmailInput';

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>((props, ref) => (
  <Input ref={ref} type="password" {...props} />
));
PasswordInput.displayName = 'PasswordInput';

export const NumberInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>((props, ref) => (
  <Input ref={ref} type="number" {...props} />
));
NumberInput.displayName = 'NumberInput';

export const SearchInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>((props, ref) => (
  <Input ref={ref} type="search" {...props} />
));
SearchInput.displayName = 'SearchInput';