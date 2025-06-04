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
    console.log('🔴 Form submit triggered'); // Add this
    e.preventDefault();
    
    console.log('🔴 Form data:', formData); // Add this
    
    if (!validate()) {
      console.log('🔴 Form validation failed'); // Add this
      return;
    }
    
    console.log('🔴 Form validation passed, setting loading...'); // Add this
    setIsLoading(true);
    
    try {
      console.log('🔄 Starting login process...');
      
      // Call login service to get token
      const { accessToken } = await login(formData.email, formData.password);
      console.log('✅ Login service successful, got token');
      
      // Use the AuthContext login method and WAIT for it to complete
      await authLogin(accessToken, formData.remember);
      console.log('✅ AuthContext login completed');
      
      // Call onSuccess callback if provided
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
      
      // Use a Promise-based timeout to ensure React has time to update the auth state
      await new Promise(resolve => {
        setTimeout(() => {
          navigate(redirectTo, { replace: true });
          resolve(void 0);
        }, 150); // Small delay to prevent race conditions
      });
      
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setErrors({ 
        general: err.message || 'Invalid email or password. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { formData, errors, isLoading, handleChange, handleSubmit };
};