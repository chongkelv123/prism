// frontend/src/components/auth/ProtectedRoute.tsx - FIXED VERSION
import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading, checkAuthStatus } = useAuth();
  const location = useLocation();

  // Debug logging to help track authentication state
  useEffect(() => {
    console.log('🔍 ProtectedRoute state:', {
      isAuthenticated,
      isLoading,
      pathname: location.pathname
    });
  }, [isAuthenticated, isLoading, location.pathname]);

  // Re-check auth status if we're not authenticated and not loading
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      console.log('🔄 Re-checking auth status...');
      checkAuthStatus();
    }
  }, [isAuthenticated, isLoading, checkAuthStatus]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    console.log('⏳ Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-3">
          <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
          <span className="text-gray-600">Checking authentication...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('🚫 User not authenticated, redirecting to login');
    console.log('📍 Current location:', location.pathname);
    
    // Don't redirect if already on login page to prevent infinite loops
    if (location.pathname === '/login') {
      console.log('⚠️ Already on login page, not redirecting');
      return null;
    }
    
    // Redirect to login page but save the location they were trying to access
    return <Navigate to="/landing" state={{ from: location }} replace />;
  }

  console.log('✅ User authenticated, rendering protected content');
  return <Outlet />;
};

export default ProtectedRoute;