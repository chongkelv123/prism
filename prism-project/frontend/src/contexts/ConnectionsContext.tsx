// frontend/src/contexts/ConnectionsContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { apiClient } from '../services/api.service';
import { useAuth } from './AuthContext';

interface ConnectionConfig {
  domain: string;
  email: string;
  apiToken: string;
  projectKey: string;
}

interface ValidationResult {
  valid: boolean;
  message: string;
}

interface ConnectionsContextType {
  validatePlatformConfig: (platform: string, config: ConnectionConfig) => Promise<ValidationResult>;
  createConnection: (platform: string, name: string, config: ConnectionConfig) => Promise<void>;
  isLoading: boolean;
}

const ConnectionsContext = createContext<ConnectionsContextType | undefined>(undefined);

export const useConnections = () => {
  const context = useContext(ConnectionsContext);
  if (context === undefined) {
    throw new Error('useConnections must be used within a ConnectionsProvider');
  }
  return context;
};

interface ConnectionsProviderProps {
  children: ReactNode;
}

export const ConnectionsProvider: React.FC<ConnectionsProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { isAuthenticated, logout } = useAuth();

  const handleAuthError = (action: string) => {
    console.error(`Authentication error during ${action}`);
    // Force logout to refresh auth state
    logout();
  };

  const validatePlatformConfig = async (
    platform: string, 
    config: ConnectionConfig
  ): Promise<ValidationResult> => {
    try {
      setIsLoading(true);

      // Check authentication first
      if (!isAuthenticated) {
        return {
          valid: false,
          message: 'Authentication required. Please log in again.',
        };
      }

      // Validate required fields
      const requiredFields = ['domain', 'email', 'apiToken', 'projectKey'];
      const missingFields = requiredFields.filter(field => !config[field as keyof ConnectionConfig]?.trim());
      
      if (missingFields.length > 0) {
        return {
          valid: false,
          message: `Missing required fields: ${missingFields.join(', ')}`,
        };
      }

      console.log('Validating platform config:', {
        platform,
        configKeys: Object.keys(config),
        hasToken: !!config.apiToken, // Log presence without exposing token
      });

      const response = await apiClient.post(`/api/platforms/${platform}/validate`, {
        config: {
          domain: config.domain.trim(),
          email: config.email.trim(),
          apiToken: config.apiToken.trim(),
          projectKey: config.projectKey.trim(),
        },
      });

      return {
        valid: response.valid || false,
        message: response.message || 'Validation completed',
      };

    } catch (error: any) {
      console.error('Platform validation error:', error);

      if (error.response?.status === 401) {
        handleAuthError('validatePlatformConfig');
        return {
          valid: false,
          message: 'Authentication expired. Please log in again.',
        };
      }

      if (error.response?.status === 403) {
        return {
          valid: false,
          message: 'Insufficient permissions to validate connection.',
        };
      }

      // Handle network errors
      if (!error.response) {
        return {
          valid: false,
          message: 'Network error. Please check your connection and try again.',
        };
      }

      // Extract error message from response
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Connection validation failed';

      return {
        valid: false,
        message: errorMessage,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const createConnection = async (
    platform: string, 
    name: string, 
    config: ConnectionConfig
  ): Promise<void> => {
    try {
      setIsLoading(true);

      if (!isAuthenticated) {
        throw new Error('Authentication required');
      }

      console.log('Creating connection:', {
        platform,
        name,
        configKeys: Object.keys(config),
      });

      await apiClient.post('/api/connections', {
        platform,
        name: name.trim(),
        config: {
          domain: config.domain.trim(),
          email: config.email.trim(),
          apiToken: config.apiToken.trim(),
          projectKey: config.projectKey.trim(),
        },
      });

    } catch (error: any) {
      console.error('Create connection error:', error);

      if (error.response?.status === 401) {
        handleAuthError('createConnection');
        throw new Error('Authentication expired. Please log in again.');
      }

      if (error.response?.status === 403) {
        throw new Error('Insufficient permissions to create connection.');
      }

      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to create connection';

      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const value: ConnectionsContextType = {
    validatePlatformConfig,
    createConnection,
    isLoading,
  };

  return (
    <ConnectionsContext.Provider value={value}>
      {children}
    </ConnectionsContext.Provider>
  );
};