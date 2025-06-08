// frontend/src/contexts/AuthContext.tsx - FIXED VERSION
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getCurrentUser } from '../services/auth.service';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, rememberMe?: boolean) => Promise<void>;
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
        console.log('No auth token found');
        setIsAuthenticated(false);
        setUser(null);
        return;
      }

      console.log('Token found, verifying with backend...');
      
      // Verify token with backend using auth service
      const userData = await getCurrentUser();
      
      if (userData) {
        console.log('✅ User verified:', userData);
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        console.log('❌ Invalid token, clearing auth state');
        // Token is invalid
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error: any) {
      console.error('Auth status check failed:', error);
      
      // If verification fails, clear auth state
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // This method receives a token and stores it, then fetches user data
  const login = async (token: string, rememberMe: boolean = false) => {
    try {
      console.log('🔐 AuthContext: Storing token and fetching user data...');
      
      // Store token based on rememberMe preference
      if (rememberMe) {
        localStorage.setItem('authToken', token);
        sessionStorage.removeItem('authToken'); // Clear session storage
      } else {
        sessionStorage.setItem('authToken', token);
        localStorage.removeItem('authToken'); // Clear local storage
      }

      // Fetch user data using the stored token
      const userData = await getCurrentUser();
      
      if (userData) {
        setUser(userData);
        setIsAuthenticated(true);
        console.log('✅ AuthContext: Login successful');
      } else {
        throw new Error('Failed to fetch user data after login');
      }
    } catch (error: any) {
      console.error('❌ AuthContext: Login failed:', error);
      // Clear tokens on error
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    }
  };

  const logout = () => {
    // Clear tokens
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    
    // Reset state
    setUser(null);
    setIsAuthenticated(false);
    
    console.log('🚪 User logged out');
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