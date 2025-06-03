// frontend/src/contexts/ConnectionsContext.tsx - FIXED VERSION
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import connectionService, { Connection, ConnectionConfig, Platform } from '../services/connection.service';

interface ConnectionsContextType {
  connections: Connection[];
  platforms: Platform[];
  isLoading: boolean;
  error: string | null;
  
  // Connection management
  createConnection: (connectionData: ConnectionConfig) => Promise<Connection>;
  refreshConnections: () => Promise<void>;
  testConnection: (connectionId: string) => Promise<{success: boolean, message: string}>;
  syncConnection: (connectionId: string) => Promise<{success: boolean, message: string}>;
  deleteConnection: (connectionId: string) => Promise<{success: boolean, message: string}>;
  
  // Platform management
  getPlatforms: () => Promise<Platform[]>;
  validatePlatformConfig: (platformId: string, config: Record<string, any>) => Promise<{valid: boolean, message: string}>;
  
  // Project data
  getProjectData: (connectionId: string, projectId?: string) => Promise<any>;
}

const ConnectionsContext = createContext<ConnectionsContextType | undefined>(undefined);

export const ConnectionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is authenticated
  const isAuthenticated = () => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return !!token;
  };

  // Load initial data only if authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      loadInitialData();
    } else {
      // Set fallback platforms for unauthenticated users
      setPlatforms([
        {
          id: 'monday',
          name: 'Monday.com',
          description: 'Connect to your Monday.com workspace',
          icon: '📊',
          configFields: [
            { name: 'apiKey', label: 'API Key', type: 'password', required: true }
          ],
          features: ['Boards & Items', 'Status Updates']
        },
        {
          id: 'jira',
          name: 'Jira',
          description: 'Integrate with Jira Cloud',
          icon: '🔄',
          configFields: [
            { name: 'domain', label: 'Domain', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'apiToken', label: 'API Token', type: 'password', required: true },
            { name: 'projectKey', label: 'Project Key', type: 'text', required: true }
          ],
          features: ['Issues & Epics', 'Sprint Data']
        },
        {
          id: 'trofos',
          name: 'TROFOS',
          description: 'Connect to TROFOS server',
          icon: '📈',
          configFields: [
            { name: 'serverUrl', label: 'Server URL', type: 'url', required: true },
            { name: 'apiKey', label: 'API Key', type: 'password', required: true },
            { name: 'projectId', label: 'Project ID', type: 'text', required: true }
          ],
          features: ['Project Metrics', 'Resource Allocation']
        }
      ]);
    }
  }, []);

  const loadInitialData = async () => {
    if (!isAuthenticated()) {
      setError('Please log in to access connections');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadConnections(),
        loadPlatforms()
      ]);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadConnections = async () => {
    try {
      const connectionsData = await connectionService.getConnections();
      setConnections(connectionsData);
    } catch (err) {
      console.error('Failed to load connections:', err);
      // Don't throw here, let the user work with empty connections
      setConnections([]);
      
      // Check if it's an auth error
      if (err?.response?.status === 401) {
        setError('Authentication required. Please log in again.');
      }
    }
  };

  const loadPlatforms = async () => {
    try {
      const platformsData = await connectionService.getPlatforms();
      setPlatforms(platformsData);
    } catch (err) {
      console.error('Failed to load platforms:', err);
      // Keep fallback platforms even if API fails
      // (they're already set in useEffect)
    }
  };

  const createConnection = async (connectionData: ConnectionConfig): Promise<Connection> => {
    if (!isAuthenticated()) {
      throw new Error('Please log in to create connections');
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const newConnection = await connectionService.createConnection(connectionData);
      setConnections(prev => [newConnection, ...prev]);
      return newConnection;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create connection';
      setError(errorMessage);
      
      // Check if it's an auth error
      if (err?.response?.status === 401) {
        setError('Session expired. Please log in again.');
        // Clear tokens
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        // Redirect to login
        window.location.href = '/login';
      }
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshConnections = async (): Promise<void> => {
    if (!isAuthenticated()) {
      setError('Please log in to refresh connections');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await loadConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh connections');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async (connectionId: string): Promise<{success: boolean, message: string}> => {
    if (!isAuthenticated()) {
      return { success: false, message: 'Please log in to test connections' };
    }

    setError(null);
    
    try {
      const result = await connectionService.testConnection(connectionId);
      
      // Update connection status in local state
      if (result.success) {
        setConnections(prev => 
          prev.map(conn => 
            conn.id === connectionId 
              ? { ...conn, status: 'connected', lastSync: 'Just now' }
              : conn
          )
        );
      } else {
        setConnections(prev => 
          prev.map(conn => 
            conn.id === connectionId 
              ? { ...conn, status: 'error' }
              : conn
          )
        );
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const syncConnection = async (connectionId: string): Promise<{success: boolean, message: string}> => {
    if (!isAuthenticated()) {
      return { success: false, message: 'Please log in to sync connections' };
    }

    setError(null);
    
    try {
      const result = await connectionService.syncConnection(connectionId);
      
      // Update connection in local state
      if (result.success) {
        setConnections(prev => 
          prev.map(conn => 
            conn.id === connectionId 
              ? { ...conn, status: 'connected', lastSync: 'Just now' }
              : conn
          )
        );
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection sync failed';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const deleteConnection = async (connectionId: string): Promise<{success: boolean, message: string}> => {
    if (!isAuthenticated()) {
      return { success: false, message: 'Please log in to delete connections' };
    }

    setError(null);
    
    try {
      const result = await connectionService.deleteConnection(connectionId);
      
      if (result.success) {
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete connection';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const getPlatforms = async (): Promise<Platform[]> => {
    if (platforms.length > 0) {
      return platforms;
    }
    
    try {
      const platformsData = await connectionService.getPlatforms();
      setPlatforms(platformsData);
      return platformsData;
    } catch (err) {
      console.error('Failed to get platforms:', err);
      return platforms; // Return cached/fallback platforms
    }
  };

  const validatePlatformConfig = async (platformId: string, config: Record<string, any>): Promise<{valid: boolean, message: string}> => {
    try {
      return await connectionService.validatePlatformConfig(platformId, config);
    } catch (err) {
      return { valid: false, message: 'Validation failed' };
    }
  };

  const getProjectData = async (connectionId: string, projectId?: string): Promise<any> => {
    if (!isAuthenticated()) {
      throw new Error('Please log in to access project data');
    }

    try {
      return await connectionService.getProjectData(connectionId, projectId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get project data';
      setError(errorMessage);
      throw err;
    }
  };

  const contextValue: ConnectionsContextType = {
    connections,
    platforms,
    isLoading,
    error,
    
    createConnection,
    refreshConnections,
    testConnection,
    syncConnection,
    deleteConnection,
    
    getPlatforms,
    validatePlatformConfig,
    
    getProjectData
  };

  return (
    <ConnectionsContext.Provider value={contextValue}>
      {children}
    </ConnectionsContext.Provider>
  );
};

export const useConnections = () => {
  const context = useContext(ConnectionsContext);
  if (context === undefined) {
    throw new Error('useConnections must be used within a ConnectionsProvider');
  }
  return context;
};

// Re-export types for convenience
export type { Connection, ConnectionConfig, Platform };