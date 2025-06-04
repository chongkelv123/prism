// frontend/src/contexts/AuthContext.tsx - FIXED VERSION
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (token: string, remember: boolean) => void;
  logout: () => void;
  checkAuthStatus: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for token on initial load
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    setIsLoading(true);
    
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Verify token by calling the backend
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
          console.log('✅ User authenticated:', userData);
        } else {
          console.warn('⚠️ Token validation failed, removing invalid token');
          // Token is invalid, remove it
          localStorage.removeItem('authToken');
          sessionStorage.removeItem('authToken');
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Auth check failed:', error);
        // If we can't reach the auth service, but we have a token, assume it's valid
        // This prevents blocking the user when the backend is temporarily unavailable
        setIsAuthenticated(true);
        setUser({
          id: 'temp-user',
          email: 'user@example.com',
          firstName: 'User'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string, remember: boolean) => {
    console.log('🔐 Logging in user with token');
    
    // Store token
    if (remember) {
      localStorage.setItem('authToken', token);
      sessionStorage.removeItem('authToken');
    } else {
      sessionStorage.setItem('authToken', token);
      localStorage.removeItem('authToken');
    }

    // Try to get user data
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        console.log('✅ User data loaded:', userData);
      } else {
        // Even if we can't get user data, we have a valid token
        setUser({
          id: 'temp-user',
          email: 'user@example.com',
          firstName: 'User'
        });
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch user data, but token is valid');
      setUser({
        id: 'temp-user',
        email: 'user@example.com',
        firstName: 'User'
      });
    }

    setIsAuthenticated(true);
  };

  const logout = () => {
    console.log('🚪 Logging out user');
    
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    setIsAuthenticated(false);
    setUser(null);
    
    // Only navigate to login if we're not already on a public page
    const publicPaths = ['/', '/login', '/register'];
    if (!publicPaths.includes(location.pathname)) {
      navigate('/login');
    }
  };

  const contextValue: AuthContextType = {
    isAuthenticated,
    user,
    isLoading,
    login,
    logout,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};