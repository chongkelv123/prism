// frontend/src/contexts/ConnectionsContext.tsx - COMPLETE FIXED VERSION
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiClient } from '../services/api.service';
import { useAuth } from './AuthContext';
import { ConnectionMigration } from '../utils/connectionMigration';

export interface Connection {
  id: string;
  name: string;
  platform: 'monday' | 'jira' | 'trofos';
  status: 'connected' | 'disconnected' | 'error';
  projectCount: number;
  lastSync?: string;
  lastSyncError?: string;
  createdAt: string;
  metadata?: {
    selectedProjects?: string[];
    defaultTemplate?: string;
    reportPreferences?: {
      includeCharts?: boolean;
      includeTeamInfo?: boolean;
      dateRange?: number;
    };
  };
}

interface ConnectionConfig {
  name: string;
  platform: 'monday' | 'jira' | 'trofos';
  config: Record<string, any>;
  metadata?: any;
}

interface ConnectionsContextType {
  connections: Connection[];
  isLoading: boolean;
  error: string | null;
  isServiceAvailable: boolean;
  
  // Core operations
  createConnection: (connectionData: ConnectionConfig) => Promise<void>;
  deleteConnection: (connectionId: string) => Promise<{ success: boolean; message: string }>;
  refreshConnections: () => Promise<void>;
  
  // Service operations
  checkServiceHealth: () => Promise<boolean>;
  validatePlatformConfig: (platform: string, config: Record<string, any>) => Promise<{valid: boolean, message: string}>;
  testConnection: (connectionId: string) => Promise<{ success: boolean; message: string }>;
  syncConnection: (connectionId: string) => Promise<{ success: boolean; message: string }>;
  getProjectData: (connectionId: string, projectId?: string) => Promise<any>;
}

const ConnectionsContext = createContext<ConnectionsContextType | undefined>(undefined);

export const useConnections = () => {
  const context = useContext(ConnectionsContext);
  if (context === undefined) {
    throw new Error('useConnections must be used within a ConnectionsProvider');
  }
  return context;
};

export const ConnectionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isServiceAvailable, setIsServiceAvailable] = useState<boolean>(false);
  
  const { isAuthenticated, user, logout } = useAuth();

  // Check service health - FIXED ENDPOINTS
  const checkServiceHealth = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🏥 Checking platform integrations service health...');
      
      // First check API Gateway health
      const gatewayResponse = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!gatewayResponse.ok) {
        throw new Error(`API Gateway unhealthy: ${gatewayResponse.status}`);
      }
      
      console.log('✅ API Gateway health check passed');
      
      // Then check Platform Integrations Service through gateway
      const serviceResponse = await apiClient.get('/api/platform-integrations/health');
      
      if (serviceResponse) {
        console.log('✅ Platform integrations service is healthy:', serviceResponse);
        setIsServiceAvailable(true);
        setError(null);
        return true;
      } else {
        throw new Error('Invalid response from platform integrations service');
      }
      
    } catch (error: any) {
      console.error('❌ Service health check failed:', error);
      setIsServiceAvailable(false);
      
      let errorMessage = 'Platform integrations service is not available';
      
      // Enhanced error detection
      if (error.response?.status === 503) {
        errorMessage = 'Platform integrations service is temporarily unavailable';
      } else if (error.response?.status === 404) {
        errorMessage = 'API Gateway not configured correctly';
      } else if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error')) {
        errorMessage = 'Cannot connect to platform integrations service';
      } else if (error.message.includes('fetch failed')) {
        errorMessage = 'Network connection failed';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      return false;
    }
  }, []);

  const loadConnections = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    if (!isServiceAvailable) {
      // Load from cache
      const userStorageKey = `prism-connections-${user.id}`;
      const cachedData = localStorage.getItem(userStorageKey);
      if (cachedData) {
        setConnections(JSON.parse(cachedData));
      }
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔄 Loading from backend...');
      
      const response = await apiClient.get('/api/connections');
      const backendConnections = response.data || [];
      
      console.log('✅ Backend loaded:', backendConnections.length, 'connections');
      
      // Transform to ensure proper format
      const connections = backendConnections.map(conn => ({
        id: conn.id,
        name: conn.name,
        platform: conn.platform,
        status: conn.status || 'connected',
        projectCount: conn.projectCount || 1,
        lastSync: conn.lastSync || new Date().toISOString(),
        createdAt: conn.createdAt || new Date().toISOString(),
        metadata: conn.metadata || {}
      }));
      
      setConnections(connections);
      
      // Update cache
      const userStorageKey = `prism-connections-${user.id}`;
      localStorage.setItem(userStorageKey, JSON.stringify(connections));
      
    } catch (error) {
      console.error('❌ Backend load failed:', error);
      // Fallback to cache
      const userStorageKey = `prism-connections-${user.id}`;
      const cachedData = localStorage.getItem(userStorageKey);
      if (cachedData) {
        setConnections(JSON.parse(cachedData));
        setError('Working offline');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, isServiceAvailable]);

  // Add this debug logging to ConnectionsContext.tsx createConnection method
  const createConnection = useCallback(async (connectionData: ConnectionConfig): Promise<void> => {
    if (!isAuthenticated || !user?.id) {
      throw new Error('Authentication required');
    }

    try {
      setIsLoading(true);
      console.log('➕ Creating connection for user:', user.id, connectionData.name);
      
      // DEBUG: Log the exact data being sent to backend
      console.log('🔍 CONNECTION DATA DEBUG:');
      console.log('  - name:', connectionData.name);
      console.log('  - platform:', connectionData.platform);
      console.log('  - config keys:', Object.keys(connectionData.config || {}));
      console.log('  - config values:', connectionData.config);
      console.log('  - metadata:', connectionData.metadata);
      
      if (isServiceAvailable) {
        // Try backend first
        console.log('🌐 Sending to backend...');
        
        try {
          const response = await apiClient.post('/api/connections', connectionData);
          const newConnection = response;
          
          console.log('✅ Backend response:', newConnection);
          
          // Validate the new connection
          const validatedConnection = ConnectionMigration.migrateAndValidateConnections([newConnection])[0];
          
          // Update state and cache
          const updatedConnections = [...connections, validatedConnection];
          setConnections(updatedConnections);
          
          const userStorageKey = `prism-connections-${user.id}`;
          localStorage.setItem(userStorageKey, JSON.stringify(updatedConnections));
          
          console.log('✅ Connection created successfully in backend');
          setError(null);
          
        } catch (backendError: any) {
          console.error('🚨 Backend Error Details:');
          console.error('  - Status:', backendError.response?.status);
          console.error('  - Status Text:', backendError.response?.statusText);
          console.error('  - Error Data:', backendError.response?.data);
          console.error('  - Error Message:', backendError.message);
          console.error('  - Full Error:', backendError);
          
          // Check if it's a validation error vs server error
          if (backendError.response?.status === 400) {
            throw new Error(backendError.response?.data?.message || 'Invalid connection data');
          } else if (backendError.response?.status === 500) {
            throw new Error(backendError.response?.data?.message || 'Server error during connection creation');
          } else {
            throw new Error('Failed to create connection on server');
          }
        }
          
      } else {
        // Fallback to localStorage with user association
        console.log('📴 Service unavailable, using localStorage fallback');
        const newConnection: Connection = {
          id: `conn_${user.id}_${Date.now()}`,
          name: connectionData.name,
          platform: connectionData.platform,
          status: 'connected',
          projectCount: 1,
          lastSync: 'Just now',
          createdAt: new Date().toISOString(),
          metadata: connectionData.metadata
        };
        
        const updatedConnections = [...connections, newConnection];
        setConnections(updatedConnections);
        
        const userStorageKey = `prism-connections-${user.id}`;
        localStorage.setItem(userStorageKey, JSON.stringify(updatedConnections));
        
        console.log('✅ Connection created successfully in localStorage (offline mode)');
      }
      
    } catch (error: any) {
      console.error('❌ Failed to create connection:', error);
      
      let errorMessage = 'Failed to create connection';
      if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connections, isAuthenticated, user?.id, isServiceAvailable]);

  // Delete connection with user association
  const deleteConnection = useCallback(async (connectionId: string): Promise<{ success: boolean; message: string }> => {
    if (!isAuthenticated || !user?.id) {
      return { success: false, message: 'Authentication required' };
    }

    try {
      setIsLoading(true);
      console.log('🗑️ Deleting connection for user:', user.id, connectionId);
      
      if (isServiceAvailable) {
        // Try backend first
        await apiClient.delete(`/api/connections/${connectionId}`);
        console.log('✅ Connection deleted from backend');
      }
      
      // Update state and user-specific cache regardless
      const updatedConnections = connections.filter(conn => conn.id !== connectionId);
      setConnections(updatedConnections);
      
      const userStorageKey = `prism-connections-${user.id}`;
      localStorage.setItem(userStorageKey, JSON.stringify(updatedConnections));
      
      console.log('✅ Connection deleted successfully');
      return { success: true, message: 'Connection deleted successfully' };
      
    } catch (error: any) {
      console.error('❌ Failed to delete connection:', error);
      
      let errorMessage = 'Failed to delete connection';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [connections, isAuthenticated, user?.id, isServiceAvailable]);

  // Refresh connections
  const refreshConnections = useCallback(async () => {
    await loadConnections();
  }, [loadConnections]);

  // Platform operations
  const validatePlatformConfig = useCallback(async (
    platform: string, 
    config: Record<string, any>
  ): Promise<{valid: boolean, message: string}> => {
    if (!isServiceAvailable) {
      return { 
        valid: false, 
        message: 'Platform integrations service is not available' 
      };
    }

    try {
      const response = await apiClient.post(`/api/platforms/${platform}/validate`, { config });
      return response.data;
    } catch (error: any) {
      return { 
        valid: false, 
        message: error.response?.data?.message || 'Validation failed' 
      };
    }
  }, [isServiceAvailable]);

  const testConnection = useCallback(async (connectionId: string): Promise<{ success: boolean; message: string }> => {
    if (!isServiceAvailable) {
      return {
        success: false,
        message: 'Platform integrations service is not available'
      };
    }

    try {
      const response = await apiClient.post(`/api/connections/${connectionId}/test`);
      await loadConnections(); // Refresh to get updated status
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Test failed'
      };
    }
  }, [isServiceAvailable, loadConnections]);

  const syncConnection = useCallback(async (connectionId: string): Promise<{ success: boolean; message: string }> => {
    if (!isServiceAvailable) {
      return {
        success: false,
        message: 'Platform integrations service is not available'
      };
    }

    try {
      const response = await apiClient.post(`/api/connections/${connectionId}/sync`);
      await loadConnections(); // Refresh to get updated data
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Sync failed'
      };
    }
  }, [isServiceAvailable, loadConnections]);

  const getProjectData = useCallback(async (connectionId: string, projectId?: string): Promise<any> => {
    if (!isServiceAvailable) {
      throw new Error('Platform integrations service is not available');
    }

    const url = projectId 
      ? `/api/connections/${connectionId}/projects?projectId=${projectId}`
      : `/api/connections/${connectionId}/projects`;
    
    const response = await apiClient.get(url);
    return response.data;
  }, [isServiceAvailable]);

  // Initialize on auth state change
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      console.log('🔐 User authenticated, initializing connections for user:', user.id);
      loadConnections();
    } else {
      console.log('🚪 User not authenticated, clearing connections');
      setConnections([]);
      setIsServiceAvailable(false);
      setError(null);
    }
  }, [isAuthenticated, user?.id, loadConnections]);

  // Check service health on mount
  useEffect(() => {
    console.log('🏥 Checking service health on mount...');
    checkServiceHealth();
  }, [checkServiceHealth]);

  const value: ConnectionsContextType = {
    connections,
    isLoading,
    error,
    isServiceAvailable,
    createConnection,
    deleteConnection,
    refreshConnections,
    checkServiceHealth,
    validatePlatformConfig,
    testConnection,
    syncConnection,
    getProjectData,
  };

  return (
    <ConnectionsContext.Provider value={value}>
      {children}
    </ConnectionsContext.Provider>
  );
};