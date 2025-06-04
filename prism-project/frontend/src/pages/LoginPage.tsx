// frontend/src/pages/LoginPage.tsx - FIXED VERSION
import React from 'react';
import { useLocation } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';

interface LocationState {
  message?: string;
}

const LoginPage: React.FC = () => {
  const location = useLocation();
  const { message } = (location.state as LocationState) || {};
  
  return (
    <div>
      {message && (
        <div className="max-w-md mx-auto mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {message}
        </div>
      )}
      <LoginForm />
    </div>
  );
};

export default LoginPage;