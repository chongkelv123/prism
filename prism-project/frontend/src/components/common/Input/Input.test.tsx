// src/components/common/Input/Input.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input Component', () => {
  const defaultProps = {
    id: 'test-input',
    name: 'testInput',
    label: 'Test Input',
    value: '',
    onChange: vi.fn()
  };
  
  it('renders with label and input correctly', () => {
    render(<Input {...defaultProps} />);
    
    const label = screen.getByText('Test Input');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', 'test-input');
    
    const input = screen.getByLabelText('Test Input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('id', 'test-input');
    expect(input).toHaveAttribute('name', 'testInput');
  });
  
  it('handles input change correctly', async () => {
    const handleChange = vi.fn();
    const user = userEvent.setup();
    
    render(<Input {...defaultProps} onChange={handleChange} />);
    
    const input = screen.getByLabelText('Test Input');
    await user.type(input, 'test value');
    
    expect(handleChange).toHaveBeenCalled();
  });
  
  it('displays error message when provided', () => {
    render(<Input {...defaultProps} error="This field is required" />);
    
    const error = screen.getByText('This field is required');
    expect(error).toBeInTheDocument();
    expect(error).toHaveClass('text-red-600');
  });
  
  it('respects disabled state', () => {
    render(<Input {...defaultProps} disabled={true} />);
    
    const input = screen.getByLabelText('Test Input');
    expect(input).toBeDisabled();
  });
  
  it('renders with different input types', () => {
    render(<Input {...defaultProps} type="password" />);
    
    const input = screen.getByLabelText('Test Input');
    expect(input).toHaveAttribute('type', 'password');
  });
  
  it('sets required attribute when specified', () => {
    render(<Input {...defaultProps} required={true} />);
    
    const input = screen.getByLabelText('Test Input');
    expect(input).toHaveAttribute('required');
  });
});