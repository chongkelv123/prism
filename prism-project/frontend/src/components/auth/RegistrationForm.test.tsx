import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RegistrationForm } from './RegistrationForm';
import * as useRegistrationFormHook from '../../features/auth/hooks/useRegistrationForm';

// Mock the custom hook
vi.mock('../../features/auth/hooks/useRegistrationForm', () => ({
  useRegistrationForm: vi.fn()
}));

describe('RegistrationForm', () => {
  // Mock form data and handlers
  const mockHandleChange = vi.fn();
  const mockHandleSubmit = vi.fn(e => {
    // We need to prevent default to avoid test errors
    e.preventDefault();
  });
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock implementation
    vi.mocked(useRegistrationFormHook.useRegistrationForm).mockReturnValue({
      formData: {
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: ''
      },
      errors: {},
      isSubmitting: false,
      handleChange: mockHandleChange,
      handleSubmit: mockHandleSubmit
    });
  });

  it('renders registration form correctly', () => {
    render(<RegistrationForm />);
    
    // Check for expected form elements
    expect(screen.getByText('Create an Account')).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();
    expect(screen.getByText(/Already have an account/i)).toBeInTheDocument();
  });

  it('handles input changes', async () => {
    const user = userEvent.setup();
    
    render(<RegistrationForm />);
    
    const firstNameInput = screen.getByLabelText(/First Name/i);
    await user.type(firstNameInput, 'John');
    
    expect(mockHandleChange).toHaveBeenCalled();
  });

  // it('handles form submission', async () => {
  //   render(<RegistrationForm />);
    
  //   // Use fireEvent instead of userEvent for form submission
  //   // This is more reliable for testing form submissions
  //   const form = screen.getByRole('form'); // Make sure your form has role="form"
  //   fireEvent.submit(form);
    
  //   expect(mockHandleSubmit).toHaveBeenCalled();
  // });

  it('displays validation errors', () => {
    // Mock implementation with errors
    vi.mocked(useRegistrationFormHook.useRegistrationForm).mockReturnValue({
      formData: {
        firstName: '',
        lastName: '',
        email: 'invalid-email',
        password: 'weak',
        confirmPassword: 'different'
      },
      errors: {
        email: 'Invalid email address',
        password: 'Password must be at least 8 characters',
        confirmPassword: 'Passwords do not match'
      },
      isSubmitting: false,
      handleChange: mockHandleChange,
      handleSubmit: mockHandleSubmit
    });
    
    render(<RegistrationForm />);
    
    // Check for error messages
    expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
  });

  it('displays general error message', () => {
    // Mock implementation with general error
    vi.mocked(useRegistrationFormHook.useRegistrationForm).mockReturnValue({
      formData: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'StrongPass123',
        confirmPassword: 'StrongPass123'
      },
      errors: {
        general: 'Registration failed. Email already exists.'
      },
      isSubmitting: false,
      handleChange: mockHandleChange,
      handleSubmit: mockHandleSubmit
    });
    
    render(<RegistrationForm />);
    
    // Check for general error message
    expect(screen.getByText('Registration failed. Email already exists.')).toBeInTheDocument();
  });

  it('disables form inputs when submitting', () => {
    // Mock implementation with isSubmitting true
    vi.mocked(useRegistrationFormHook.useRegistrationForm).mockReturnValue({
      formData: {
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: ''
      },
      errors: {},
      isSubmitting: true,
      handleChange: mockHandleChange,
      handleSubmit: mockHandleSubmit
    });
    
    render(<RegistrationForm />);
    
    // Check that inputs are disabled
    expect(screen.getByLabelText(/First Name/i)).toBeDisabled();
    expect(screen.getByLabelText(/Last Name/i)).toBeDisabled();
    expect(screen.getByLabelText(/Email Address/i)).toBeDisabled();
    expect(screen.getByLabelText(/^Password$/i)).toBeDisabled();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeDisabled();
  });
});