// packages/ultracontrol-app/src/lib/ui/components/LoadingSpinner.tsx
import React from 'react';
import type { BaseComponentProps, ComponentSize } from '../types';
import { cn, iconSizeClasses } from '../utils';

export interface LoadingSpinnerProps extends BaseComponentProps {
  size?: ComponentSize;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  className,
  size = 'md',
  ...props
}) => {
  return (
    <svg
      className={cn(
        'animate-spin',
        iconSizeClasses[size],
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
};