// packages/ultracontrol-app/src/lib/ui/components/IconButton.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IconButton } from './IconButton';
import { Icon } from './Icon';

describe('IconButton', () => {
  it('renders with icon', () => {
    render(
      <IconButton icon={<Icon name="settings" />} aria-label="Settings" />
    );
    
    const button = screen.getByRole('button', { name: 'Settings' });
    expect(button).toBeInTheDocument();
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('warns when aria-label is missing', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    render(
      <IconButton icon={<Icon name="settings" />} />
    );
    
    expect(consoleSpy).toHaveBeenCalledWith(
      'IconButton: aria-label or title prop is required for accessibility'
    );
    
    consoleSpy.mockRestore();
  });

  it('does not warn when title is provided instead of aria-label', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    render(
      <IconButton icon={<Icon name="settings" />} title="Settings" />
    );
    
    expect(consoleSpy).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(
      <IconButton icon={<Icon name="settings" />} aria-label="Settings" variant="primary" />
    );
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');

    rerender(
      <IconButton icon={<Icon name="settings" />} aria-label="Settings" variant="secondary" />
    );
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200');

    rerender(
      <IconButton icon={<Icon name="settings" />} aria-label="Settings" variant="ghost" />
    );
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(
      <IconButton icon={<Icon name="settings" />} aria-label="Settings" size="xs" />
    );
    expect(screen.getByRole('button')).toHaveClass('p-1');

    rerender(
      <IconButton icon={<Icon name="settings" />} aria-label="Settings" size="sm" />
    );
    expect(screen.getByRole('button')).toHaveClass('p-1.5');

    rerender(
      <IconButton icon={<Icon name="settings" />} aria-label="Settings" size="md" />
    );
    expect(screen.getByRole('button')).toHaveClass('p-2');

    rerender(
      <IconButton icon={<Icon name="settings" />} aria-label="Settings" size="lg" />
    );
    expect(screen.getByRole('button')).toHaveClass('p-2.5');

    rerender(
      <IconButton icon={<Icon name="settings" />} aria-label="Settings" size="xl" />
    );
    expect(screen.getByRole('button')).toHaveClass('p-3');
  });

  it('applies rounded class when rounded is true', () => {
    render(
      <IconButton icon={<Icon name="settings" />} aria-label="Settings" rounded />
    );
    
    expect(screen.getByRole('button')).toHaveClass('rounded-full');
  });

  it('applies square corners when rounded is false', () => {
    render(
      <IconButton icon={<Icon name="settings" />} aria-label="Settings" rounded={false} />
    );
    
    expect(screen.getByRole('button')).toHaveClass('rounded-md');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(
      <IconButton 
        icon={<Icon name="settings" />} 
        aria-label="Settings" 
        onClick={handleClick}
      />
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button when disabled prop is true', () => {
    const handleClick = vi.fn();
    render(
      <IconButton 
        icon={<Icon name="settings" />} 
        aria-label="Settings" 
        disabled
        onClick={handleClick}
      />
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('cursor-not-allowed', 'opacity-50');
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(
      <IconButton 
        icon={<Icon name="settings" />} 
        aria-label="Settings" 
        loading
      />
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('cursor-wait');
    expect(button.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = vi.fn();
    render(
      <IconButton 
        ref={ref}
        icon={<Icon name="settings" />} 
        aria-label="Settings"
      />
    );
    
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
  });

  it('passes through additional props', () => {
    render(
      <IconButton 
        icon={<Icon name="settings" />} 
        aria-label="Settings"
        data-testid="icon-button"
        id="settings-button"
      />
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-testid', 'icon-button');
    expect(button).toHaveAttribute('id', 'settings-button');
  });

  it('defaults to ghost variant', () => {
    render(
      <IconButton icon={<Icon name="settings" />} aria-label="Settings" />
    );
    
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');
  });

  it('uses correct icon size based on button size', () => {
    render(
      <IconButton 
        icon={<Icon name="settings" />} 
        aria-label="Settings" 
        size="xs"
      />
    );
    
    const iconContainer = screen.getByRole('button').querySelector('span');
    expect(iconContainer).toHaveClass('w-3', 'h-3');
  });
});