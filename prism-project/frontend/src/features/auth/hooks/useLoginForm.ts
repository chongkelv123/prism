// frontend/src/features/auth/hooks/useLoginForm.ts - FIXED TO HANDLE RESPONSE STRUCTURE
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login } from '../../../services/auth.service';
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

interface UseLoginFormProps {
  onSuccess?: () => void;
}

export function useLoginForm({ onSuccess }: UseLoginFormProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login: authLogin } = useAuth();
  
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: '',
    remember: false,
  });
  
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: LoginFormErrors = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
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
      console.log('✅ Login service successful, got response:', loginResponse);
      
      // Handle different response structures
      let token: string;
      
      if (loginResponse.accessToken) {
        // Expected structure: { accessToken: "...", userId: "..." }
        token = loginResponse.accessToken;
        console.log('🔍 Using accessToken from response');
      } else if (loginResponse.token) {
        // Alternative structure: { token: "...", userId: "..." }
        token = loginResponse.token;
        console.log('🔍 Using token from response');
      } else if (typeof loginResponse === 'string') {
        // Direct token string
        token = loginResponse;
        console.log('🔍 Using direct token string');
      } else {
        // Unknown structure - log and throw error
        console.error('❌ Unknown response structure:', loginResponse);
        console.error('❌ Available keys:', Object.keys(loginResponse));
        throw new Error('Invalid login response format. Please contact support.');
      }
      
      console.log('🔐 Using token for authentication');
      
      // Step 2: Use AuthContext to store token and fetch user data
      await authLogin(token, formData.remember);
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
}