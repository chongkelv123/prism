import React from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const handleSuccess = () => {
    // Redirect to the dashboard or home page after successful login
    navigate('/dashboard');
  }
  return <LoginForm onLoginSuccess={handleSuccess} />;
};

export default LoginPage;