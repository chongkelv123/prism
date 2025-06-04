// frontend/src/contexts/ConnectionsContext.tsx - IMPROVED ERROR HANDLING VERSION
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import connectionService, { Connection, ConnectionConfig, Platform } from '../services/connection.service';
import { useAuth } from './AuthContext';

interface ConnectionsContextType {
  connections: Connection[];
  platforms: Platform[];
  isLoading: boolean;
  error: string | null;
  isServiceAvailable: boolean;
  
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
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isServiceAvailable, setIsServiceAvailable] = useState(true);

  // Load initial data only when authenticated, with retry logic
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      console.log('🔄 ConnectionsProvider: User authenticated, loading connections data...');
      loadInitialDataWithRetry();
    } else if (!isAuthenticated && !authLoading) {
      console.log('🚫 ConnectionsProvider: User not authenticated, clearing connections data');
      // Clear data when not authenticated
      setConnections([]);
      setPlatforms([]);
      setError(null);
      setIsServiceAvailable(true);
    }
  }, [isAuthenticated, authLoading]);

  const loadInitialDataWithRetry = async (retryCount = 0) => {
    const maxRetries = 2;
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        loadConnections(),
        loadPlatforms()
      ]);
      setIsServiceAvailable(true);
    } catch (err) {
      console.error(`❌ ConnectionsProvider: Failed to load data (attempt ${retryCount + 1}):`, err);
      
      // Check if it's a service unavailable error
      if (err?.response?.status === 503 || err?.code === 'ECONNREFUSED' || err?.message?.includes('Service unavailable')) {
        setIsServiceAvailable(false);
        setError('Platform integrations service is not available. Basic functionality will work without it.');
        
        // Use fallback data
        setPlatforms(getFallbackPlatforms());
        setConnections([]);
      } else if (retryCount < maxRetries) {
        // Retry after a delay
        console.log(`🔄 ConnectionsProvider: Retrying in ${(retryCount + 1) * 1000}ms...`);
        setTimeout(() => {
          loadInitialDataWithRetry(retryCount + 1);
        }, (retryCount + 1) * 1000);
        return;
      } else {
        // Final failure after retries
        setIsServiceAvailable(false);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load connections';
        setError(`Service temporarily unavailable: ${errorMessage}`);
        
        // Use fallback data
        setPlatforms(getFallbackPlatforms());
        setConnections([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackPlatforms = (): Platform[] => {
    return [
      {
        id: 'monday',
        name: 'Monday.com',
        description: 'Connect to your Monday.com workspace to sync boards, items, and project data.',
        icon: '📊',
        configFields: [
          { name: 'apiKey', label: 'API Key', type: 'password', required: true }
        ],
        features: ['Boards & Items', 'Status Updates', 'Team Members', 'Time Tracking']
      },
      {
        id: 'jira',
        name: 'Jira',
        description: 'Integrate with Jira to pull issues, sprints, and project metrics.',
        icon: '🔄',
        configFields: [
          { name: 'domain', label: 'Jira Domain', type: 'text', required: true, placeholder: 'company.atlassian.net' },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'apiToken', label: 'API Token', type: 'password', required: true },
          { name: 'projectKey', label: 'Project Key', type: 'text', required: true, placeholder: 'PRISM' }
        ],
        features: ['Issues & Epics', 'Sprint Data', 'Story Points', 'Workflow Status']
      },
      {
        id: 'trofos',
        name: 'TROFOS',
        description: 'Connect to TROFOS for comprehensive project and resource management data.',
        icon: '📈',
        configFields: [
          { name: 'serverUrl', label: 'Server URL', type: 'url', required: true, placeholder: 'https://your-trofos-server.com' },
          { name: 'apiKey', label: 'API Key', type: 'password', required: true },
          { name: 'projectId', label: 'Project ID', type: 'text', required: true }
        ],
        features: ['Project Metrics', 'Resource Allocation', 'Backlog Items', 'Sprint Progress']
      }
    ];
  };

  const loadConnections = async () => {
    try {
      console.log('🔄 ConnectionsProvider: Loading connections from backend...');
      const connectionsData = await connectionService.getConnections();
      console.log('✅ ConnectionsProvider: Loaded connections:', connectionsData);
      setConnections(connectionsData);
    } catch (err) {
      console.error('❌ ConnectionsProvider: Failed to load connections:', err);
      
      // Check if it's an auth error vs service unavailable
      if (err?.response?.status === 401) {
        console.warn('🔒 ConnectionsProvider: Authentication required for connections');
        throw new Error('Authentication required');
      } else if (err?.response?.status === 503 || err?.code === 'ECONNREFUSED') {
        throw new Error('Service unavailable');
      }
      
      // For other errors, don't throw - just use empty connections
      setConnections([]);
    }
  };

  const loadPlatforms = async () => {
    try {
      console.log('🔄 ConnectionsProvider: Loading platforms from backend...');
      const platformsData = await connectionService.getPlatforms();
      console.log('✅ ConnectionsProvider: Loaded platforms:', platformsData);
      setPlatforms(platformsData);
    } catch (err) {
      console.error('❌ ConnectionsProvider: Failed to load platforms:', err);
      
      // Check if it's an auth error vs service unavailable
      if (err?.response?.status === 401) {
        console.warn('🔒 ConnectionsProvider: Authentication required for platforms');
        throw new Error('Authentication required');
      } else if (err?.response?.status === 503 || err?.code === 'ECONNREFUSED') {
        throw new Error('Service unavailable');
      }
      
      // Use fallback platforms if backend is unavailable
      console.warn('🌐 ConnectionsProvider: Using fallback platforms');
      setPlatforms(getFallbackPlatforms());
    }
  };

  const createConnection = async (connectionData: ConnectionConfig): Promise<Connection> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    if (!isServiceAvailable) {
      throw new Error('Platform integrations service is not available');
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 ConnectionsProvider: Creating connection:', connectionData);
      const newConnection = await connectionService.createConnection(connectionData);
      console.log('✅ ConnectionsProvider: Connection created:', newConnection);
      
      setConnections(prev => [newConnection, ...prev]);
      return newConnection;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create connection';
      console.error('❌ ConnectionsProvider: Failed to create connection:', err);
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshConnections = async (): Promise<void> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    if (!isServiceAvailable) {
      console.warn('⚠️ ConnectionsProvider: Service not available, skipping refresh');
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
    if (!isAuthenticated) {
      return { success: false, message: 'Authentication required' };
    }

    if (!isServiceAvailable) {
      return { success: false, message: 'Platform integrations service is not available' };
    }

    setError(null);
    
    try {
      console.log('🔄 ConnectionsProvider: Testing connection:', connectionId);
      const result = await connectionService.testConnection(connectionId);
      console.log('✅ ConnectionsProvider: Connection test result:', result);
      
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
      console.error('❌ ConnectionsProvider: Connection test failed:', err);
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const syncConnection = async (connectionId: string): Promise<{success: boolean, message: string}> => {
    if (!isAuthenticated) {
      return { success: false, message: 'Authentication required' };
    }

    if (!isServiceAvailable) {
      return { success: false, message: 'Platform integrations service is not available' };
    }

    setError(null);
    
    try {
      console.log('🔄 ConnectionsProvider: Syncing connection:', connectionId);
      const result = await connectionService.syncConnection(connectionId);
      console.log('✅ ConnectionsProvider: Connection sync result:', result);
      
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
      console.error('❌ ConnectionsProvider: Connection sync failed:', err);
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const deleteConnection = async (connectionId: string): Promise<{success: boolean, message: string}> => {
    if (!isAuthenticated) {
      return { success: false, message: 'Authentication required' };
    }

    if (!isServiceAvailable) {
      return { success: false, message: 'Platform integrations service is not available' };
    }

    setError(null);
    
    try {
      console.log('🔄 ConnectionsProvider: Deleting connection:', connectionId);
      const result = await connectionService.deleteConnection(connectionId);
      console.log('✅ ConnectionsProvider: Connection delete result:', result);
      
      if (result.success) {
        setConnections(prev => prev.filter(conn => conn.id !== connectionId));
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete connection';
      console.error('❌ ConnectionsProvider: Failed to delete connection:', err);
      setError(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const getPlatforms = async (): Promise<Platform[]> => {
    if (platforms.length > 0) {
      return platforms;
    }
    
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    if (!isServiceAvailable) {
      return getFallbackPlatforms();
    }
    
    try {
      console.log('🔄 ConnectionsProvider: Loading platforms...');
      const platformsData = await connectionService.getPlatforms();
      console.log('✅ ConnectionsProvider: Loaded platforms:', platformsData);
      setPlatforms(platformsData);
      return platformsData;
    } catch (err) {
      console.error('❌ ConnectionsProvider: Failed to get platforms:', err);
      return getFallbackPlatforms(); // Return fallback platforms
    }
  };

  const validatePlatformConfig = async (platformId: string, config: Record<string, any>): Promise<{valid: boolean, message: string}> => {
    if (!isAuthenticated) {
      return { valid: false, message: 'Authentication required' };
    }

    if (!isServiceAvailable) {
      return { valid: false, message: 'Platform integrations service is not available' };
    }

    try {
      console.log('🔄 ConnectionsProvider: Validating platform config:', { platformId, config: Object.keys(config) });
      const result = await connectionService.validatePlatformConfig(platformId, config);
      console.log('✅ ConnectionsProvider: Platform validation result:', result);
      return result;
    } catch (err) {
      console.error('❌ ConnectionsProvider: Platform validation failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Validation failed';
      return { valid: false, message: errorMessage };
    }
  };

  const getProjectData = async (connectionId: string, projectId?: string): Promise<any> => {
    if (!isAuthenticated) {
      throw new Error('Authentication required');
    }

    if (!isServiceAvailable) {
      throw new Error('Platform integrations service is not available');
    }

    try {
      console.log('🔄 ConnectionsProvider: Getting project data:', { connectionId, projectId });
      const result = await connectionService.getProjectData(connectionId, projectId);
      console.log('✅ ConnectionsProvider: Project data loaded:', result);
      return result;
    } catch (err) {
      console.error('❌ ConnectionsProvider: Failed to get project data:', err);
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
    isServiceAvailable,
    
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