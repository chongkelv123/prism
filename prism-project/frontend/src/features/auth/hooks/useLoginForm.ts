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
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    
    try {
      console.log('🔄 Starting login process...');
      
      // Call login service to get token
      const { accessToken } = await login(formData.email, formData.password);
      console.log('✅ Login service successful, got token');
      
      // Use the AuthContext login method and WAIT for it to complete
      await authLogin(accessToken, formData.remember);
      console.log('✅ AuthContext login completed');
      
      // Determine where to redirect
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      console.log(`🚀 Redirecting to: ${from}`);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      } else {
        // Navigate to the intended destination
        navigate(from, { replace: true });
      }
      
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