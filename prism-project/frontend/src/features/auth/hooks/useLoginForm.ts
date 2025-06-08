// frontend/src/features/auth/hooks/useLoginForm.ts - FIXED VERSION
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../../../services/auth.service';
import { validateEmail } from '../../../utils/validation';
import { useAuth } from '../../../contexts/AuthContext';

interface LoginFormData {
  email: string;
  password: string;
  remember: boolean;
}

interface LoginFormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export const useLoginForm = (onSuccess?: () => void) => {
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    remember: false,
  });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: LoginFormErrors = {};
    if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (formData.password.trim() === '') {
      newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear error when user starts typing
    if (errors[name as keyof LoginFormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('🔴 Form submit triggered');
    e.preventDefault();
    
    console.log('🔴 Form data:', formData);
    
    if (!validate()) {
      console.log('🔴 Form validation failed');
      return;
    }
    
    console.log('🔴 Form validation passed, setting loading...');
    setIsLoading(true);
    
    try {
      console.log('🔄 Starting login process...');
      
      // Step 1: Call login service to get token
      const loginResponse = await login(formData.email, formData.password);
      console.log('✅ Login service successful, got token');
      
      // Step 2: Use AuthContext to store token and fetch user data
      await authLogin(loginResponse.accessToken, formData.remember);
      console.log('✅ AuthContext login completed');
      
      // Step 3: Handle success
      if (onSuccess) {
        onSuccess();
        return; // Don't navigate if callback is provided
      }
      
      // Determine where to redirect
      const from = (location.state as any)?.from?.pathname;
      let redirectTo = '/dashboard'; // Default to dashboard
      
      // If user was trying to access a protected route, redirect there
      if (from && from !== '/login' && from !== '/register' && from !== '/landing' && from !== '/') {
        redirectTo = from;
      }
      
      console.log(`🚀 Redirecting to: ${redirectTo}`);
      
      // Navigate with a small delay to ensure React state updates
      setTimeout(() => {
        navigate(redirectTo, { replace: true });
      }, 100);
      
    } catch (err: any) {
      console.error('❌ Login error:', err);
      
      // Extract error message from response
      let errorMessage = 'Login failed. Please try again.';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message === 'Invalid email or password') {
        errorMessage = 'Invalid email or password';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setErrors({ 
        general: errorMessage
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { formData, errors, isLoading, handleChange, handleSubmit };
};