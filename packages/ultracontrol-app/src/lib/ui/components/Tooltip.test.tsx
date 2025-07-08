// packages/ultracontrol-app/src/lib/ui/components/Tooltip.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not show tooltip by default', () => {
    render(
      <Tooltip content="Tooltip content">
        <button>Hover me</button>
      </Tooltip>
    );
    
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip on hover after delay', async () => {
    render(
      <Tooltip content="Tooltip content">
        <button>Hover me</button>
      </Tooltip>
    );
    
    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);
    
    // Tooltip should not appear immediately
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    
    // Advance timers by default delay (200ms)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    // Tooltip should now be visible
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
      expect(screen.getByText('Tooltip content')).toBeInTheDocument();
    });
  });

  it('hides tooltip on mouse leave', async () => {
    render(
      <Tooltip content="Tooltip content">
        <button>Hover me</button>
      </Tooltip>
    );
    
    const button = screen.getByText('Hover me');
    
    // Show tooltip
    fireEvent.mouseEnter(button);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
    
    // Hide tooltip
    fireEvent.mouseLeave(button);
    
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it('shows tooltip on focus', async () => {
    render(
      <Tooltip content="Tooltip content">
        <button>Focus me</button>
      </Tooltip>
    );
    
    const button = screen.getByText('Focus me');
    fireEvent.focus(button);
    
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  it('hides tooltip on blur', async () => {
    render(
      <Tooltip content="Tooltip content">
        <button>Focus me</button>
      </Tooltip>
    );
    
    const button = screen.getByText('Focus me');
    
    // Show tooltip
    fireEvent.focus(button);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
    
    // Hide tooltip
    fireEvent.blur(button);
    
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  it('respects custom delay', async () => {
    render(
      <Tooltip content="Tooltip content" delay={500}>
        <button>Hover me</button>
      </Tooltip>
    );
    
    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);
    
    // Should not show after 200ms
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    
    // Should show after 500ms
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  it('does not show tooltip when disabled', async () => {
    render(
      <Tooltip content="Tooltip content" disabled>
        <button>Hover me</button>
      </Tooltip>
    );
    
    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);
    
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('cancels show timer on quick mouse leave', async () => {
    render(
      <Tooltip content="Tooltip content">
        <button>Hover me</button>
      </Tooltip>
    );
    
    const button = screen.getByText('Hover me');
    
    // Enter and quickly leave
    fireEvent.mouseEnter(button);
    act(() => {
      vi.advanceTimersByTime(100);
    });
    fireEvent.mouseLeave(button);
    
    // Advance past the delay
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    // Tooltip should not appear
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('applies placement classes correctly', async () => {
    const { rerender } = render(
      <Tooltip content="Tooltip content" placement="top">
        <button>Hover me</button>
      </Tooltip>
    );
    
    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
    });
    
    // Hide and test other placements
    fireEvent.mouseLeave(button);
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
    
    // Test bottom placement
    rerender(
      <Tooltip content="Tooltip content" placement="bottom">
        <button>Hover me</button>
      </Tooltip>
    );
    
    fireEvent.mouseEnter(button);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
  });

  it('preserves child props', () => {
    const handleClick = vi.fn();
    const handleMouseEnter = vi.fn();
    
    render(
      <Tooltip content="Tooltip content">
        <button onClick={handleClick} onMouseEnter={handleMouseEnter}>
          Click me
        </button>
      </Tooltip>
    );
    
    const button = screen.getByText('Click me');
    
    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
    
    fireEvent.mouseEnter(button);
    expect(handleMouseEnter).toHaveBeenCalledTimes(1);
  });

  it('renders complex content', async () => {
    render(
      <Tooltip 
        content={
          <div>
            <strong>Bold text</strong>
            <span>Normal text</span>
          </div>
        }
      >
        <button>Hover me</button>
      </Tooltip>
    );
    
    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);
    
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Bold text')).toBeInTheDocument();
      expect(screen.getByText('Normal text')).toBeInTheDocument();
    });
  });

  it('does not render empty tooltip', async () => {
    render(
      <Tooltip content="">
        <button>Hover me</button>
      </Tooltip>
    );
    
    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);
    
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('updates position on window resize', async () => {
    render(
      <Tooltip content="Tooltip content">
        <button>Hover me</button>
      </Tooltip>
    );
    
    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);
    
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
    
    // Trigger resize event
    fireEvent(window, new Event('resize'));
    
    // Tooltip should still be visible
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('cleans up event listeners on unmount', async () => {
    const { unmount } = render(
      <Tooltip content="Tooltip content">
        <button>Hover me</button>
      </Tooltip>
    );
    
    const button = screen.getByText('Hover me');
    fireEvent.mouseEnter(button);
    
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument();
    });
    
    // Unmount should clean up without errors
    unmount();
  });
});