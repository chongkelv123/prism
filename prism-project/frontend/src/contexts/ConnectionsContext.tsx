// frontend/src/contexts/ConnectionsContext.tsx - COMPLETE WORKING VERSION
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';

// Types
export interface Connection {
  id: string;
  name: string;
  platform: 'monday' | 'jira' | 'trofos';
  status: 'connected' | 'disconnected' | 'error';
  projectCount: number;
  lastSync?: string;
  lastSyncError?: string;
  createdAt: string;
}

export interface ConnectionConfig {
  name: string;
  platform: 'monday' | 'jira' | 'trofos';
  config: Record<string, any>;
}

interface ConnectionsContextType {
  connections: Connection[];
  isLoading: boolean;
  error: string | null;
  isServiceAvailable: boolean;
  
  // Actions
  createConnection: (connectionData: ConnectionConfig) => Promise<void>;
  refreshConnections: () => Promise<void>;
  testConnection: (connectionId: string) => Promise<{success: boolean, message: string}>;
  syncConnection: (connectionId: string) => Promise<{success: boolean, message: string}>;
  deleteConnection: (connectionId: string) => Promise<{success: boolean, message: string}>;
  validatePlatformConfig: (platform: string, config: any) => Promise<{valid: boolean, message: string}>;
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
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isServiceAvailable, setIsServiceAvailable] = useState<boolean>(true);
  
  const { isAuthenticated } = useAuth();

  // Test service availability
  const checkServiceAvailability = useCallback(async () => {
    try {
      const response = await fetch('/api/platforms', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`
        }
      });
      setIsServiceAvailable(response.ok);
      return response.ok;
    } catch (error) {
      console.error('Service availability check failed:', error);
      setIsServiceAvailable(false);
      return false;
    }
  }, []);

  // Load connections when component mounts and user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      checkServiceAvailability().then(available => {
        if (available) {
          refreshConnections();
        }
      });
    } else {
      setConnections([]);
      setError(null);
    }
  }, [isAuthenticated]);

  const refreshConnections = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      console.log('User not authenticated, skipping connections refresh');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch('/api/connections', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 503) {
          setIsServiceAvailable(false);
          setError('Platform integrations service is not available');
          return;
        }
        throw new Error(`Failed to fetch connections: ${response.status}`);
      }
      
      const fetchedConnections = await response.json();
      console.log('✅ Connections fetched:', fetchedConnections);
      
      setConnections(Array.isArray(fetchedConnections) ? fetchedConnections : []);
      setIsServiceAvailable(true);
      
    } catch (error: any) {
      console.error('❌ Failed to fetch connections:', error);
      setConnections([]);
      setIsServiceAvailable(false);
      setError(error.message || 'Failed to fetch connections');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const validatePlatformConfig = useCallback(async (platform: string, config: any): Promise<{valid: boolean, message: string}> => {
    if (!isAuthenticated) {
      return { valid: false, message: 'Authentication required' };
    }

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`/api/platforms/${platform}/validate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ config })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Validation failed: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('❌ Failed to validate platform config:', error);
      return { valid: false, message: error.message || 'Validation failed' };
    }
  }, [isAuthenticated]);

  const createConnection = useCallback(async (connectionData: ConnectionConfig): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch('/api/connections', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(connectionData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to create connection: ${response.status}`);
      }

      console.log('✅ Connection created successfully');
      await refreshConnections();
      
    } catch (error: any) {
      console.error('❌ Failed to create connection:', error);
      setError(error.message || 'Failed to create connection');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, refreshConnections]);

  const testConnection = useCallback(async (connectionId: string): Promise<{success: boolean, message: string}> => {
    if (!isAuthenticated) {
      return { success: false, message: 'Authentication required' };
    }

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`/api/connections/${connectionId}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, message: result.message || 'Test failed' };
      }

      await refreshConnections();
      return result;
    } catch (error: any) {
      console.error('❌ Failed to test connection:', error);
      return { success: false, message: error.message || 'Test failed' };
    }
  }, [isAuthenticated, refreshConnections]);

  const syncConnection = useCallback(async (connectionId: string): Promise<{success: boolean, message: string}> => {
    if (!isAuthenticated) {
      return { success: false, message: 'Authentication required' };
    }

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`/api/connections/${connectionId}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, message: result.message || 'Sync failed' };
      }

      await refreshConnections();
      return result;
    } catch (error: any) {
      console.error('❌ Failed to sync connection:', error);
      return { success: false, message: error.message || 'Sync failed' };
    }
  }, [isAuthenticated, refreshConnections]);

  const deleteConnection = useCallback(async (connectionId: string): Promise<{success: boolean, message: string}> => {
    if (!isAuthenticated) {
      return { success: false, message: 'Authentication required' };
    }

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`/api/connections/${connectionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, message: result.message || 'Delete failed' };
      }

      await refreshConnections();
      return result;
    } catch (error: any) {
      console.error('❌ Failed to delete connection:', error);
      return { success: false, message: error.message || 'Delete failed' };
    }
  }, [isAuthenticated, refreshConnections]);

  const value: ConnectionsContextType = {
    connections,
    isLoading,
    error,
    isServiceAvailable,
    createConnection,
    refreshConnections,
    testConnection,
    syncConnection,
    deleteConnection,
    validatePlatformConfig,
  };

  return (
    <ConnectionsContext.Provider value={value}>
      {children}
    </ConnectionsContext.Provider>
  );
};