// src/features/auth/hooks/useRegistrationForm.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRegistrationForm } from './useRegistrationForm';
import { register } from '../../../services/auth.service';
import { useNavigate } from 'react-router-dom';

// Mock dependencies
vi.mock('../../../services/auth.service', () => ({
  register: vi.fn()
}));

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn()
}));

describe('useRegistrationForm', () => {
  const mockNavigate = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as unknown as vi.Mock).mockReturnValue(mockNavigate);
  });

  it('initializes with empty form data and no errors', () => {
    const { result } = renderHook(() => useRegistrationForm());
    
    expect(result.current.formData).toEqual({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
    
    expect(result.current.errors).toEqual({});
    expect(result.current.isSubmitting).toBe(false);
  });

  it('updates form data when handleChange is called', () => {
    const { result } = renderHook(() => useRegistrationForm());
    
    act(() => {
      result.current.handleChange({
        target: {
          name: 'firstName',
          value: 'John'
        }
      } as React.ChangeEvent<HTMLInputElement>);
    });
    
    expect(result.current.formData.firstName).toBe('John');
  });

  it('validates form data and sets errors', async () => {
    const { result } = renderHook(() => useRegistrationForm());
    
    // Set invalid data
    act(() => {
      result.current.handleChange({
        target: { name: 'email', value: 'invalid-email' }
      } as React.ChangeEvent<HTMLInputElement>);
      
      result.current.handleChange({
        target: { name: 'password', value: 'weak' }
      } as React.ChangeEvent<HTMLInputElement>);
      
      result.current.handleChange({
        target: { name: 'confirmPassword', value: 'different' }
      } as React.ChangeEvent<HTMLInputElement>);
    });
    
    // Trigger validation via submit
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    
    // Check for validation errors
    expect(result.current.errors.email).toBeDefined();
    expect(result.current.errors.password).toBeDefined();
    expect(result.current.errors.confirmPassword).toBeDefined();
    expect(register).not.toHaveBeenCalled();
  });

  it('submits valid form data and navigates on success', async () => {
    (register as unknown as vi.Mock).mockResolvedValue({ userId: 'user-123' });
    
    const { result } = renderHook(() => useRegistrationForm());
    
    // Set valid data
    act(() => {
      result.current.handleChange({
        target: { name: 'firstName', value: 'John' }
      } as React.ChangeEvent<HTMLInputElement>);
      
      result.current.handleChange({
        target: { name: 'lastName', value: 'Doe' }
      } as React.ChangeEvent<HTMLInputElement>);
      
      result.current.handleChange({
        target: { name: 'email', value: 'john.doe@example.com' }
      } as React.ChangeEvent<HTMLInputElement>);
      
      result.current.handleChange({
        target: { name: 'password', value: 'StrongPass123' }
      } as React.ChangeEvent<HTMLInputElement>);
      
      result.current.handleChange({
        target: { name: 'confirmPassword', value: 'StrongPass123' }
      } as React.ChangeEvent<HTMLInputElement>);
    });
    
    // Submit the form
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    
    // Check form submission
    expect(register).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      password: 'StrongPass123'
    });
    
    // Check navigation
    expect(mockNavigate).toHaveBeenCalledWith('/login', expect.any(Object));
  });

  it('handles registration errors', async () => {
    (register as unknown as vi.Mock).mockRejectedValue(new Error('Email already exists'));
    
    const { result } = renderHook(() => useRegistrationForm());
    
    // Set valid data
    act(() => {
      result.current.handleChange({
        target: { name: 'firstName', value: 'John' }
      } as React.ChangeEvent<HTMLInputElement>);
      
      result.current.handleChange({
        target: { name: 'lastName', value: 'Doe' }
      } as React.ChangeEvent<HTMLInputElement>);
      
      result.current.handleChange({
        target: { name: 'email', value: 'john.doe@example.com' }
      } as React.ChangeEvent<HTMLInputElement>);
      
      result.current.handleChange({
        target: { name: 'password', value: 'StrongPass123' }
      } as React.ChangeEvent<HTMLInputElement>);
      
      result.current.handleChange({
        target: { name: 'confirmPassword', value: 'StrongPass123' }
      } as React.ChangeEvent<HTMLInputElement>);
    });
    
    // Submit the form
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: vi.fn() } as unknown as React.FormEvent);
    });
    
    // Check error handling
    expect(result.current.errors.general).toBe('Email already exists');
    expect(result.current.isSubmitting).toBe(false);
  });
});