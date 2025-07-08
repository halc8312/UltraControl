// packages/ultracontrol-app/src/lib/ui/components/Input.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input, TextInput, EmailInput, PasswordInput, NumberInput, SearchInput } from './Input';
import { Icon } from './Icon';

describe('Input', () => {
  it('renders basic input', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Input label="Email Address" name="email" />);
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
  });

  it('renders with helper text', () => {
    render(<Input helperText="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('renders with error message', () => {
    render(<Input error errorMessage="Invalid input" />);
    expect(screen.getByText('Invalid input')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveClass('border-red-500');
  });

  it('does not show helper text when error message is present', () => {
    render(
      <Input 
        error 
        errorMessage="Invalid input" 
        helperText="This field is required" 
      />
    );
    expect(screen.getByText('Invalid input')).toBeInTheDocument();
    expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
  });

  it('handles change events', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('disables input when disabled prop is true', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(<Input size="xs" />);
    expect(screen.getByRole('textbox')).toHaveClass('text-xs', 'px-2', 'py-1');

    rerender(<Input size="sm" />);
    expect(screen.getByRole('textbox')).toHaveClass('text-sm', 'px-3', 'py-1.5');

    rerender(<Input size="md" />);
    expect(screen.getByRole('textbox')).toHaveClass('text-base', 'px-4', 'py-2');

    rerender(<Input size="lg" />);
    expect(screen.getByRole('textbox')).toHaveClass('text-lg', 'px-5', 'py-2.5');

    rerender(<Input size="xl" />);
    expect(screen.getByRole('textbox')).toHaveClass('text-xl', 'px-6', 'py-3');
  });

  it('renders with left icon', () => {
    render(
      <Input leftIcon={<Icon name="search" />} />
    );
    expect(screen.getByRole('textbox')).toHaveClass('pl-10');
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('renders with right icon', () => {
    render(
      <Input rightIcon={<Icon name="info" />} />
    );
    expect(screen.getByRole('textbox')).toHaveClass('pr-10');
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('applies fullWidth by default', () => {
    const { container } = render(<Input />);
    expect(container.firstChild).toHaveClass('w-full');
  });

  it('does not apply fullWidth when false', () => {
    const { container } = render(<Input fullWidth={false} />);
    expect(container.firstChild).not.toHaveClass('w-full');
  });

  it('sets aria attributes correctly', () => {
    render(
      <Input 
        name="test-input"
        error 
        errorMessage="Error message" 
        helperText="Helper text"
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'test-input-error');
  });

  it('forwards ref correctly', () => {
    const ref = vi.fn();
    render(<Input ref={ref} />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });

  it('passes through additional props', () => {
    render(
      <Input 
        data-testid="custom-input" 
        autoComplete="email"
        maxLength={50}
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('data-testid', 'custom-input');
    expect(input).toHaveAttribute('autocomplete', 'email');
    expect(input).toHaveAttribute('maxlength', '50');
  });
});

describe('Input variants', () => {
  it('renders TextInput as basic input', () => {
    render(<TextInput placeholder="Text input" />);
    const input = screen.getByPlaceholderText('Text input');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('renders EmailInput with email type', () => {
    render(<EmailInput placeholder="Email input" />);
    const input = screen.getByPlaceholderText('Email input');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('renders PasswordInput with password type', () => {
    render(<PasswordInput placeholder="Password input" />);
    const input = screen.getByPlaceholderText('Password input');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('renders NumberInput with number type', () => {
    render(<NumberInput placeholder="Number input" />);
    const input = screen.getByPlaceholderText('Number input');
    expect(input).toHaveAttribute('type', 'number');
  });

  it('renders SearchInput with search type', () => {
    render(<SearchInput placeholder="Search input" />);
    const input = screen.getByPlaceholderText('Search input');
    expect(input).toHaveAttribute('type', 'search');
  });
});