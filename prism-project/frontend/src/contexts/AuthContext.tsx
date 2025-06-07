// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '../services/api.service';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus();
    
    // Listen for auth expiration events
    const handleAuthExpired = () => {
      console.log('Auth expired event received');
      logout();
    };
    
    window.addEventListener('auth-expired', handleAuthExpired);
    
    return () => {
      window.removeEventListener('auth-expired', handleAuthExpired);
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      
      // Check if token exists
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      // Verify token with backend
      const response = await apiClient.get('/api/auth/verify');
      
      if (response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        // Token is invalid
        apiClient.clearAuthToken();
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error: any) {
      console.error('Auth status check failed:', error);
      
      // If verification fails, clear auth state
      apiClient.clearAuthToken();
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      setIsLoading(true);
      
      const response = await apiClient.post('/api/auth/login', {
        email,
        password,
      });

      if (response.token && response.user) {
        // Store token based on rememberMe preference
        if (rememberMe) {
          localStorage.setItem('authToken', response.token);
          sessionStorage.removeItem('authToken'); // Clear session storage
        } else {
          sessionStorage.setItem('authToken', response.token);
          localStorage.removeItem('authToken'); // Clear local storage
        }

        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Clear tokens
    apiClient.clearAuthToken();
    
    // Reset state
    setUser(null);
    setIsAuthenticated(false);
    
    console.log('User logged out');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};