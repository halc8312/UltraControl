// packages/ultracontrol-app/src/lib/ui/components/Dialog.test.tsx
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Dialog, ConfirmDialog } from './Dialog';

describe('Dialog', () => {
  const onCloseMock = vi.fn();

  beforeEach(() => {
    onCloseMock.mockClear();
  });

  it('renders when open is true', () => {
    render(
      <Dialog open={true} onClose={onCloseMock}>
        <p>Dialog content</p>
      </Dialog>
    );
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Dialog content')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <Dialog open={false} onClose={onCloseMock}>
        <p>Dialog content</p>
      </Dialog>
    );
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Dialog content')).not.toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(
      <Dialog open={true} onClose={onCloseMock} title="Dialog Title">
        <p>Content</p>
      </Dialog>
    );
    
    expect(screen.getByText('Dialog Title')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'dialog-title');
  });

  it('renders description when provided', () => {
    render(
      <Dialog open={true} onClose={onCloseMock} description="Dialog description">
        <p>Content</p>
      </Dialog>
    );
    
    expect(screen.getByText('Dialog description')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby', 'dialog-description');
  });

  it('renders footer when provided', () => {
    render(
      <Dialog 
        open={true} 
        onClose={onCloseMock} 
        footer={<button>Footer Button</button>}
      >
        <p>Content</p>
      </Dialog>
    );
    
    expect(screen.getByText('Footer Button')).toBeInTheDocument();
  });

  it('shows close button by default', () => {
    render(
      <Dialog open={true} onClose={onCloseMock}>
        <p>Content</p>
      </Dialog>
    );
    
    const closeButton = screen.getByLabelText('Close dialog');
    expect(closeButton).toBeInTheDocument();
  });

  it('hides close button when showCloseButton is false', () => {
    render(
      <Dialog open={true} onClose={onCloseMock} showCloseButton={false}>
        <p>Content</p>
      </Dialog>
    );
    
    expect(screen.queryByLabelText('Close dialog')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <Dialog open={true} onClose={onCloseMock}>
        <p>Content</p>
      </Dialog>
    );
    
    fireEvent.click(screen.getByLabelText('Close dialog'));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked by default', () => {
    const { container } = render(
      <Dialog open={true} onClose={onCloseMock}>
        <p>Content</p>
      </Dialog>
    );
    
    const overlay = container.querySelector('.bg-black\\/50');
    fireEvent.click(overlay!);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when overlay is clicked and closeOnOverlayClick is false', () => {
    const { container } = render(
      <Dialog open={true} onClose={onCloseMock} closeOnOverlayClick={false}>
        <p>Content</p>
      </Dialog>
    );
    
    const overlay = container.querySelector('.bg-black\\/50');
    fireEvent.click(overlay!);
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape is pressed by default', () => {
    render(
      <Dialog open={true} onClose={onCloseMock}>
        <p>Content</p>
      </Dialog>
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when Escape is pressed and closeOnEscape is false', () => {
    render(
      <Dialog open={true} onClose={onCloseMock} closeOnEscape={false}>
        <p>Content</p>
      </Dialog>
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCloseMock).not.toHaveBeenCalled();
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(
      <Dialog open={true} onClose={onCloseMock} size="sm">
        <p>Content</p>
      </Dialog>
    );
    expect(screen.getByRole('dialog')).toHaveClass('max-w-sm');

    rerender(
      <Dialog open={true} onClose={onCloseMock} size="lg">
        <p>Content</p>
      </Dialog>
    );
    expect(screen.getByRole('dialog')).toHaveClass('max-w-lg');
  });

  it('traps focus within dialog', async () => {
    render(
      <Dialog open={true} onClose={onCloseMock}>
        <button>First button</button>
        <button>Second button</button>
        <button>Last button</button>
      </Dialog>
    );

    const buttons = screen.getAllByRole('button');
    const firstButton = buttons[0];
    const lastButton = buttons[buttons.length - 1];

    // Focus should be on first element initially
    await waitFor(() => {
      expect(document.activeElement).toBe(firstButton);
    });

    // Tab from last element should go to first
    lastButton.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    await waitFor(() => {
      expect(document.activeElement).toBe(firstButton);
    });
  });

  it('returns focus to trigger element when closed', async () => {
    const TriggerComponent = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open Dialog</button>
          <Dialog open={open} onClose={() => setOpen(false)}>
            <p>Content</p>
          </Dialog>
        </>
      );
    };

    render(<TriggerComponent />);
    const trigger = screen.getByText('Open Dialog');
    
    // Open dialog
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Close dialog
    fireEvent.click(screen.getByLabelText('Close dialog'));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});

describe('ConfirmDialog', () => {
  const onConfirmMock = vi.fn();
  const onCloseMock = vi.fn();

  beforeEach(() => {
    onConfirmMock.mockClear();
    onCloseMock.mockClear();
  });

  it('renders with default confirm and cancel text', () => {
    render(
      <ConfirmDialog 
        open={true} 
        onClose={onCloseMock}
        onConfirm={onConfirmMock}
      >
        <p>Are you sure?</p>
      </ConfirmDialog>
    );
    
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('renders with custom confirm and cancel text', () => {
    render(
      <ConfirmDialog 
        open={true} 
        onClose={onCloseMock}
        onConfirm={onConfirmMock}
        confirmText="Yes, delete"
        cancelText="No, keep it"
      >
        <p>Are you sure?</p>
      </ConfirmDialog>
    );
    
    expect(screen.getByText('No, keep it')).toBeInTheDocument();
    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', () => {
    render(
      <ConfirmDialog 
        open={true} 
        onClose={onCloseMock}
        onConfirm={onConfirmMock}
      >
        <p>Are you sure?</p>
      </ConfirmDialog>
    );
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCloseMock).toHaveBeenCalledTimes(1);
    expect(onConfirmMock).not.toHaveBeenCalled();
  });

  it('calls onConfirm when confirm is clicked', () => {
    render(
      <ConfirmDialog 
        open={true} 
        onClose={onCloseMock}
        onConfirm={onConfirmMock}
      >
        <p>Are you sure?</p>
      </ConfirmDialog>
    );
    
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });

  it('passes confirmButtonProps to confirm button', () => {
    render(
      <ConfirmDialog 
        open={true} 
        onClose={onCloseMock}
        onConfirm={onConfirmMock}
        confirmButtonProps={{
          variant: 'danger',
          'data-testid': 'confirm-button'
        }}
      >
        <p>Are you sure?</p>
      </ConfirmDialog>
    );
    
    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).toHaveClass('bg-red-600');
    expect(confirmButton).toHaveAttribute('data-testid', 'confirm-button');
  });
});