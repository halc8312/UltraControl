// packages/ultracontrol-app/src/lib/ui/components/Icon.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Icon } from './Icon';

describe('Icon', () => {
  it('renders SVG element', () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('applies default size classes', () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-5', 'h-5'); // md size
  });

  it('applies size classes correctly', () => {
    const { rerender, container } = render(<Icon name="check" size="xs" />);
    let svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-3', 'h-3');

    rerender(<Icon name="check" size="sm" />);
    svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-4', 'h-4');

    rerender(<Icon name="check" size="md" />);
    svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-5', 'h-5');

    rerender(<Icon name="check" size="lg" />);
    svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-6', 'h-6');

    rerender(<Icon name="check" size="xl" />);
    svg = container.querySelector('svg');
    expect(svg).toHaveClass('w-8', 'h-8');
  });

  it('uses currentColor by default', () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke', 'currentColor');
  });

  it('applies custom color', () => {
    const { container } = render(<Icon name="check" color="#ff0000" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('stroke', '#ff0000');
  });

  it('applies custom className', () => {
    const { container } = render(<Icon name="check" className="custom-class" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('custom-class', 'w-5', 'h-5');
  });

  it('sets aria-hidden by default', () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders different icons correctly', () => {
    const { container, rerender } = render(<Icon name="check" />);
    
    // Check icon
    let path = container.querySelector('path');
    expect(path).toHaveAttribute('d', expect.stringContaining('M5 13l4 4L19 7'));

    // Close icon
    rerender(<Icon name="close" />);
    path = container.querySelector('path');
    expect(path).toHaveAttribute('d', expect.stringContaining('M6 18L18 6M6 6l12 12'));

    // Search icon
    rerender(<Icon name="search" />);
    path = container.querySelector('path');
    expect(path).toHaveAttribute('d', expect.stringContaining('M21 21l-6-6m2-5a7'));
  });

  it('renders loading icon with animation', () => {
    const { container } = render(<Icon name="loading" />);
    const animatedGroup = container.querySelector('g.animate-spin');
    expect(animatedGroup).toBeInTheDocument();
  });

  it('renders github icon with fill rule', () => {
    const { container } = render(<Icon name="github" />);
    const path = container.querySelector('path');
    expect(path).toHaveAttribute('fill-rule', 'evenodd');
    expect(path).toHaveAttribute('clip-rule', 'evenodd');
  });

  it('passes through additional props', () => {
    const { container } = render(
      <Icon 
        name="check" 
        data-testid="test-icon"
        id="check-icon"
      />
    );
    
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('data-testid', 'test-icon');
    expect(svg).toHaveAttribute('id', 'check-icon');
  });

  it('maintains consistent viewBox', () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it('sets fill to none by default', () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('fill', 'none');
  });

  it('renders complex icons with multiple paths', () => {
    const { container } = render(<Icon name="settings" />);
    const path = container.querySelector('path');
    expect(path).toBeInTheDocument();
    expect(path).toHaveAttribute('stroke-linejoin', 'round');
    expect(path).toHaveAttribute('stroke-width', '2');
  });

  it('renders chevron icons correctly', () => {
    const chevronIcons = ['chevron-down', 'chevron-up', 'chevron-left', 'chevron-right'];
    
    chevronIcons.forEach(iconName => {
      const { container } = render(<Icon name={iconName as any} />);
      const path = container.querySelector('path');
      expect(path).toBeInTheDocument();
      expect(path).toHaveAttribute('stroke-linejoin', 'round');
    });
  });
});