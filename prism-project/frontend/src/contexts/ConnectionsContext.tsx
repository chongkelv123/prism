// frontend/src/contexts/ConnectionsContext.tsx - COMPLETE VERSION
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiClient } from '../services/api.service';
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

interface ConnectionConfig {
  name: string;
  platform: 'monday' | 'jira' | 'trofos';
  config: Record<string, any>;
}

interface ValidationResult {
  valid: boolean;
  message: string;
}

interface ProjectData {
  id: string;
  name: string;
  description?: string;
  status: string;
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    assignee?: string;
  }>;
  team?: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  metrics?: Array<{
    name: string;
    value: number | string;
  }>;
}

interface ConnectionsContextType {
  // Service availability
  isServiceAvailable: boolean;
  error: string | null;
  refreshConnections: () => Promise<void>;
  
  // Connection management
  connections: Connection[];
  isLoading: boolean;
  
  // API functions
  validatePlatformConfig: (platform: string, config: Record<string, any>) => Promise<ValidationResult>;
  createConnection: (connectionData: ConnectionConfig) => Promise<void>;
  testConnection: (connectionId: string) => Promise<{ success: boolean; message: string }>;
  syncConnection: (connectionId: string) => Promise<{ success: boolean; message: string }>;
  deleteConnection: (connectionId: string) => Promise<{ success: boolean; message: string }>;
  getProjectData: (connectionId: string, projectId?: string) => Promise<ProjectData | ProjectData[]>;
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
  // State
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isServiceAvailable, setIsServiceAvailable] = useState<boolean>(false);
  
  const { isAuthenticated, logout } = useAuth();

  // Service health check
  const checkServiceHealth = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔍 Checking platform integrations service health...');
      
      // Check if API Gateway is responding
      const gatewayResponse = await fetch('http://localhost:3000/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!gatewayResponse.ok) {
        throw new Error('API Gateway not responding');
      }
      
      // Check if platform integrations service is responding through gateway
      const serviceResponse = await fetch('http://localhost:3000/api/platform-integrations/health', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!serviceResponse.ok) {
        throw new Error('Platform integrations service not responding');
      }
      
      const serviceData = await serviceResponse.json();
      console.log('✅ Platform integrations service health check passed:', serviceData);
      
      return true;
    } catch (error) {
      console.error('❌ Platform integrations service health check failed:', error);
      return false;
    }
  }, []);

  // Initialize service health check
  useEffect(() => {
    const initializeService = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const isHealthy = await checkServiceHealth();
        setIsServiceAvailable(isHealthy);
        
        if (isHealthy && isAuthenticated) {
          // Load connections if service is healthy and user is authenticated
          await loadConnections();
        } else if (!isHealthy) {
          setError('Platform integrations service is not available');
        }
      } catch (error) {
        console.error('Service initialization failed:', error);
        setIsServiceAvailable(false);
        setError(error instanceof Error ? error.message : 'Service initialization failed');
      } finally {
        setIsLoading(false);
      }
    };

    initializeService();
  }, [isAuthenticated, checkServiceHealth]);

  // Load connections from API
  const loadConnections = useCallback(async () => {
    if (!isAuthenticated || !isServiceAvailable) {
      setConnections([]);
      return;
    }

    try {
      setIsLoading(true);
      console.log('📡 Loading connections...');
      
      const response = await apiClient.get('/api/connections');
      setConnections(response.data || []);
      setError(null);
      
      console.log('✅ Connections loaded:', response.data?.length || 0);
    } catch (error: any) {
      console.error('❌ Failed to load connections:', error);
      
      if (error.response?.status === 401) {
        logout();
        setError('Authentication expired');
      } else if (error.response?.status === 503) {
        setIsServiceAvailable(false);
        setError('Platform integrations service is unavailable');
      } else {
        setError(error.message || 'Failed to load connections');
      }
      
      setConnections([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isServiceAvailable, logout]);

  // Refresh connections and service health
  const refreshConnections = useCallback(async () => {
    console.log('🔄 Refreshing connections and service health...');
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Check service health first
      const isHealthy = await checkServiceHealth();
      setIsServiceAvailable(isHealthy);
      
      if (isHealthy) {
        await loadConnections();
      } else {
        setError('Platform integrations service is not available');
        setConnections([]);
      }
    } catch (error) {
      console.error('Refresh failed:', error);
      setIsServiceAvailable(false);
      setError(error instanceof Error ? error.message : 'Refresh failed');
    } finally {
      setIsLoading(false);
    }
  }, [checkServiceHealth, loadConnections]);

  // Validate platform configuration
  const validatePlatformConfig = useCallback(async (
    platform: string, 
    config: Record<string, any>
  ): Promise<ValidationResult> => {
    if (!isServiceAvailable) {
      return {
        valid: false,
        message: 'Platform integrations service is not available',
      };
    }

    try {
      console.log(`🔍 Validating ${platform} configuration...`);
      
      const response = await apiClient.post(`/api/platforms/${platform}/validate`, { config });
      
      console.log(`✅ ${platform} validation result:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`❌ ${platform} validation failed:`, error);
      
      let errorMessage = 'Validation failed';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required';
      } else if (error.response?.status === 503) {
        setIsServiceAvailable(false);
        errorMessage = 'Service unavailable';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { valid: false, message: errorMessage };
    }
  }, [isServiceAvailable]);

  // Create connection
  const createConnection = useCallback(async (connectionData: ConnectionConfig): Promise<void> => {
    if (!isServiceAvailable) {
      throw new Error('Platform integrations service is not available');
    }

    try {
      setIsLoading(true);
      console.log('🔗 Creating connection:', connectionData.name);
      
      await apiClient.post('/api/connections', connectionData);
      
      // Reload connections after creating
      await loadConnections();
      
      console.log('✅ Connection created successfully');
    } catch (error: any) {
      console.error('❌ Failed to create connection:', error);
      
      let errorMessage = 'Failed to create connection';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required';
      } else if (error.response?.status === 503) {
        setIsServiceAvailable(false);
        errorMessage = 'Service unavailable';
      }
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [isServiceAvailable, loadConnections]);

  // Test connection
  const testConnection = useCallback(async (connectionId: string): Promise<{ success: boolean; message: string }> => {
    if (!isServiceAvailable) {
      return { success: false, message: 'Service unavailable' };
    }

    try {
      console.log('🧪 Testing connection:', connectionId);
      
      const response = await apiClient.post(`/api/connections/${connectionId}/test`);
      
      // Reload connections to get updated status
      await loadConnections();
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Connection test failed:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Test failed'
      };
    }
  }, [isServiceAvailable, loadConnections]);

  // Sync connection
  const syncConnection = useCallback(async (connectionId: string): Promise<{ success: boolean; message: string }> => {
    if (!isServiceAvailable) {
      return { success: false, message: 'Service unavailable' };
    }

    try {
      console.log('🔄 Syncing connection:', connectionId);
      
      const response = await apiClient.post(`/api/connections/${connectionId}/sync`);
      
      // Reload connections to get updated data
      await loadConnections();
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Connection sync failed:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Sync failed'
      };
    }
  }, [isServiceAvailable, loadConnections]);

  // Delete connection
  const deleteConnection = useCallback(async (connectionId: string): Promise<{ success: boolean; message: string }> => {
    if (!isServiceAvailable) {
      return { success: false, message: 'Service unavailable' };
    }

    try {
      console.log('🗑️ Deleting connection:', connectionId);
      
      await apiClient.delete(`/api/connections/${connectionId}`);
      
      // Reload connections after deleting
      await loadConnections();
      
      return { success: true, message: 'Connection deleted successfully' };
    } catch (error: any) {
      console.error('❌ Connection deletion failed:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Deletion failed'
      };
    }
  }, [isServiceAvailable, loadConnections]);

  // Get project data
  const getProjectData = useCallback(async (connectionId: string, projectId?: string): Promise<ProjectData | ProjectData[]> => {
    if (!isServiceAvailable) {
      throw new Error('Service unavailable');
    }

    try {
      console.log('📊 Getting project data for connection:', connectionId);
      
      const url = projectId 
        ? `/api/connections/${connectionId}/projects?projectId=${projectId}`
        : `/api/connections/${connectionId}/projects`;
      
      const response = await apiClient.get(url);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to get project data:', error);
      
      let errorMessage = 'Failed to load project data';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 404) {
        errorMessage = projectId ? 'Project not found' : 'Connection not found';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required';
      }
      
      throw new Error(errorMessage);
    }
  }, [isServiceAvailable]);

  const value: ConnectionsContextType = {
    // Service availability
    isServiceAvailable,
    error,
    refreshConnections,
    
    // Connection management
    connections,
    isLoading,
    
    // API functions
    validatePlatformConfig,
    createConnection,
    testConnection,
    syncConnection,
    deleteConnection,
    getProjectData,
  };

  return (
    <ConnectionsContext.Provider value={value}>
      {children}
    </ConnectionsContext.Provider>
  );
};