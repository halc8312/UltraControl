// packages/ultracontrol-app/src/lib/ui/components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button, PrimaryButton, SecondaryButton, GhostButton, DangerButton } from './Button';
import { Icon } from './Icon';

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('applies variant classes correctly', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');

    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200');

    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');

    rerender(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Button size="xs">XS</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-xs', 'px-2', 'py-1');

    rerender(<Button size="sm">SM</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-sm', 'px-3', 'py-1.5');

    rerender(<Button size="md">MD</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-base', 'px-4', 'py-2');

    rerender(<Button size="lg">LG</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-lg', 'px-5', 'py-2.5');

    rerender(<Button size="xl">XL</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-xl', 'px-6', 'py-3');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables button when disabled prop is true', () => {
    const handleClick = vi.fn();
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('cursor-wait');
    expect(screen.getByRole('button').querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows loading text when provided', () => {
    render(<Button loading loadingText="Saving...">Save</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Saving...');
  });

  it('renders with left icon', () => {
    render(
      <Button leftIcon={<Icon name="check" />}>
        With Icon
      </Button>
    );
    
    const button = screen.getByRole('button');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with right icon', () => {
    render(
      <Button rightIcon={<Icon name="chevron-right" />}>
        Next
      </Button>
    );
    
    const button = screen.getByRole('button');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('applies fullWidth class when fullWidth is true', () => {
    render(<Button fullWidth>Full Width</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('forwards ref correctly', () => {
    const ref = vi.fn();
    render(<Button ref={ref}>Button</Button>);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLButtonElement));
  });

  it('passes through additional props', () => {
    render(
      <Button data-testid="custom-button" aria-label="Custom label">
        Button
      </Button>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-testid', 'custom-button');
    expect(button).toHaveAttribute('aria-label', 'Custom label');
  });
});

describe('Button variants', () => {
  it('renders PrimaryButton with primary variant', () => {
    render(<PrimaryButton>Primary</PrimaryButton>);
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');
  });

  it('renders SecondaryButton with secondary variant', () => {
    render(<SecondaryButton>Secondary</SecondaryButton>);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200');
  });

  it('renders GhostButton with ghost variant', () => {
    render(<GhostButton>Ghost</GhostButton>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');
  });

  it('renders DangerButton with danger variant', () => {
    render(<DangerButton>Danger</DangerButton>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });
});