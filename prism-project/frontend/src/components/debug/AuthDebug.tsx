// frontend/src/components/debug/AuthDebug.tsx - TEMPORARY DEBUG COMPONENT
import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

const SHOW_AUTH_DEBUG = false; // Set to true to enable debug panel

const AuthDebug: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🐛 Auth Debug - State changed:', {
      isAuthenticated,
      isLoading,
      user,
      pathname: location.pathname,
      hasToken: !!(localStorage.getItem('authToken') || sessionStorage.getItem('authToken')),
      timestamp: new Date().toISOString()
    });
  }, [isAuthenticated, isLoading, user, location.pathname]);

  // Only show in development
  if (!SHOW_AUTH_DEBUG || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <div className="mb-2 font-bold">🐛 Auth Debug</div>
      <div>Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
      <div>Loading: {isLoading ? '⏳' : '✅'}</div>
      <div>User: {user ? `${user.firstName || 'Unknown'}` : 'None'}</div>
      <div>Path: {location.pathname}</div>
      <div>Token: {(localStorage.getItem('authToken') || sessionStorage.getItem('authToken')) ? '✅' : '❌'}</div>
      <button 
        onClick={() => navigate('/dashboard')}
        className="mt-2 px-2 py-1 bg-blue-500 text-white rounded text-xs"
      >
        Go to Dashboard
      </button>
    </div>
  );
};

export default AuthDebug;

// Add this to your App.tsx or main layout:
// import AuthDebug from './components/debug/AuthDebug';
// 
// Then add <AuthDebug /> somewhere in your JSX