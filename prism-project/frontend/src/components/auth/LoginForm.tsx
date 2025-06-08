// frontend/src/components/auth/LoginForm.tsx - FIXED VERSION
import React from 'react';
import AuthHeader from './AuthHeader';
import FormInput from '../common/Input/FormInput';
import Checkbox from '../common/Checkbox/Checkbox';
import ErrorAlert from '../common/Alert/ErrorAlert';
import PrimaryButton from '../common/Button/PrimaryButton';
import LinkButton from '../common/Button/LinkButton';
import CenteredCard from '../layout/CenteredCard';
import { useLoginForm } from '../../features/auth/hooks/useLoginForm';

interface LoginFormProps {
  onLoginSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const { formData, errors, isLoading, handleChange, handleSubmit } = useLoginForm(onLoginSuccess);

  return (
    <CenteredCard>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Welcome Back</h1>
        <p className="text-gray-600">Please sign in to your account</p>
      </div>
      
      {errors.general && <ErrorAlert message={errors.general} />}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormInput
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          disabled={isLoading}
        />
        
        <FormInput
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          disabled={isLoading}
        />
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <input
              id="remember"
              name="remember"
              type="checkbox"
              checked={formData.remember}
              onChange={handleChange}
              disabled={isLoading}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
              Remember me
            </label>
          </div>
          <LinkButton to="/forgot-password">Forgot password?</LinkButton>
        </div>              

        <PrimaryButton 
          isLoading={isLoading} 
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </PrimaryButton>
        
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <LinkButton to="/register">Sign up</LinkButton>
          </p>
        </div>
      </form>
    </CenteredCard>
  );
};

export default LoginForm;