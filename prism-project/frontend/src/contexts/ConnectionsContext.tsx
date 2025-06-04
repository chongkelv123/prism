// frontend/src/contexts/ConnectionsContext.tsx (FIXED)
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

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadConnections(),
        loadPlatforms()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Failed to load initial data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadConnections = async () => {
    try {
      console.log('🔄 Loading connections from backend...');
      const connectionsData = await connectionService.getConnections();
      console.log('✅ Loaded connections:', connectionsData);
      setConnections(connectionsData);
    } catch (err) {
      console.error('❌ Failed to load connections:', err);
      // Don't throw here, let the user work with empty connections
      setConnections([]);
    }
  };

  const loadPlatforms = async () => {
    try {
      console.log('🔄 Loading platforms from backend...');
      const platformsData = await connectionService.getPlatforms();
      console.log('✅ Loaded platforms:', platformsData);
      setPlatforms(platformsData);
    } catch (err) {
      console.error('❌ Failed to load platforms:', err);
      
      // Only use fallback if we can't reach the backend at all
      if (err instanceof Error && err.message.includes('Network Error')) {
        console.warn('🌐 Using fallback platforms due to network error');
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
      } else {
        throw err; // Re-throw if it's not a network error
      }
    }
  };

  const createConnection = async (connectionData: ConnectionConfig): Promise<Connection> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Creating connection:', connectionData);
      const newConnection = await connectionService.createConnection(connectionData);
      console.log('✅ Connection created:', newConnection);
      
      setConnections(prev => [newConnection, ...prev]);
      return newConnection;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create connection';
      console.error('❌ Failed to create connection:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshConnections = async (): Promise<void> => {
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
    setError(null);
    
    try {
      console.log('🔄 Testing connection:', connectionId);
      const result = await connectionService.testConnection(connectionId);
      console.log('✅ Connection test result:', result);
      
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
      console.error('❌ Connection test failed:', err);
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const syncConnection = async (connectionId: string): Promise<{success: boolean, message: string}> => {
    setError(null);
    
    try {
      console.log('🔄 Syncing connection:', connectionId);
      const result = await connectionService.syncConnection(connectionId);
      console.log('✅ Connection sync result:', result);
      
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
      console.error('❌ Connection sync failed:', err);
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const deleteConnection = async (connectionId: string): Promise<{success: boolean, message: string}> => {
    setError(null);
    
    try {
      console.log('🔄 Deleting connection:', connectionId);
      const result = await connectionService.deleteConnection(connectionId);
      console.log('✅ Connection delete result:', result);
      
      if (result.success) {
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete connection';
      console.error('❌ Failed to delete connection:', err);
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const getPlatforms = async (): Promise<Platform[]> => {
    if (platforms.length > 0) {
      return platforms;
    }
    
    try {
      console.log('🔄 Loading platforms...');
      const platformsData = await connectionService.getPlatforms();
      console.log('✅ Loaded platforms:', platformsData);
      setPlatforms(platformsData);
      return platformsData;
    } catch (err) {
      console.error('❌ Failed to get platforms:', err);
      return platforms; // Return cached/fallback platforms
    }
  };

  const validatePlatformConfig = async (platformId: string, config: Record<string, any>): Promise<{valid: boolean, message: string}> => {
    try {
      console.log('🔄 Validating platform config:', { platformId, config: Object.keys(config) });
      const result = await connectionService.validatePlatformConfig(platformId, config);
      console.log('✅ Platform validation result:', result);
      return result;
    } catch (err) {
      console.error('❌ Platform validation failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Validation failed';
      return { valid: false, message: errorMessage };
    }
  };

  const getProjectData = async (connectionId: string, projectId?: string): Promise<any> => {
    try {
      console.log('🔄 Getting project data:', { connectionId, projectId });
      const result = await connectionService.getProjectData(connectionId, projectId);
      console.log('✅ Project data loaded:', result);
      return result;
    } catch (err) {
      console.error('❌ Failed to get project data:', err);
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