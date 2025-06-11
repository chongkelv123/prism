// frontend/src/contexts/ConnectionsContext.tsx - FIXED VERSION
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { apiClient } from '../services/api.service';
import { useAuth } from './AuthContext';

export interface Connection {
  id: string;
  name: string;
  platform: 'monday' | 'jira';
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
  platform: 'monday' | 'jira';
  config: Record<string, any>;
  metadata?: any;
}

interface ConnectionsContextType {
  connections: Connection[];
  isLoading: boolean;
  error: string | null;
  
  // Core operations
  createConnection: (connectionData: ConnectionConfig) => Promise<void>;
  deleteConnection: (connectionId: string) => Promise<{ success: boolean; message: string }>;
  refreshConnections: () => Promise<void>;
  
  // NEW: Simple migration
  migrateFromLocalStorage: () => Promise<void>;
  
  // Existing operations (simplified)
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
  
  const { isAuthenticated, logout } = useAuth();

  // CACHE KEYS
  const CACHE_KEY = 'prism-connections-cache';
  const MIGRATION_KEY = 'prism-migration-completed';
  const OLD_STORAGE_KEY = 'prism-connections';

  // Load connections: Backend first, fallback to cache
  const loadConnections = useCallback(async () => {
    if (!isAuthenticated) {
      setConnections([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Loading connections from backend...');
      
      // Try backend first
      const response = await apiClient.get('/api/connections');
      const backendConnections = response.data || [];
      
      console.log(`Loaded ${backendConnections.length} connections from backend`);
      
      // Update state and cache
      setConnections(backendConnections);
      localStorage.setItem(CACHE_KEY, JSON.stringify(backendConnections));
      
    } catch (error: any) {
      console.error('Backend load failed, trying cache:', error);
      
      if (error.response?.status === 401) {
        logout();
        return;
      }
      
      // Fallback to cache
      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const cachedConnections = JSON.parse(cachedData);
          setConnections(cachedConnections);
          console.log(`Loaded ${cachedConnections.length} connections from cache`);
          setError('Working offline - using cached data');
        } else {
          setConnections([]);
          setError('Unable to load connections');
        }
      } catch (cacheError) {
        console.error('Cache load failed:', cacheError);
        setConnections([]);
        setError('Failed to load connections');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, logout]);

  // Create connection: Backend first, then cache
  const createConnection = useCallback(async (connectionData: ConnectionConfig): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('Creating connection:', connectionData.name);
      
      // Save to backend
      const response = await apiClient.post('/api/connections', connectionData);
      const newConnection = response.data;
      
      // Update state and cache
      const updatedConnections = [...connections, newConnection];
      setConnections(updatedConnections);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updatedConnections));
      
      console.log('Connection created successfully');
      setError(null);
      
    } catch (error: any) {
      console.error('Failed to create connection:', error);
      
      let errorMessage = 'Failed to create connection';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication required';
      }
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [connections]);

  // Delete connection: Backend first, then cache
  const deleteConnection = useCallback(async (connectionId: string): Promise<{ success: boolean; message: string }> => {
    try {
      setIsLoading(true);
      console.log('Deleting connection:', connectionId);
      
      // Delete from backend
      await apiClient.delete(`/api/connections/${connectionId}`);
      
      // Update state and cache
      const updatedConnections = connections.filter(conn => conn.id !== connectionId);
      setConnections(updatedConnections);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updatedConnections));
      
      console.log('Connection deleted successfully');
      return { success: true, message: 'Connection deleted successfully' };
      
    } catch (error: any) {
      console.error('Failed to delete connection:', error);
      
      let errorMessage = 'Failed to delete connection';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      return { success: false, message: errorMessage };
    } finally {
      setIsLoading(false);
    }
  }, [connections]);

  // NEW: Migration from localStorage
  const migrateFromLocalStorage = useCallback(async (): Promise<void> => {
    const migrationCompleted = localStorage.getItem(MIGRATION_KEY);
    const oldData = localStorage.getItem(OLD_STORAGE_KEY);
    
    if (migrationCompleted || !oldData || !isAuthenticated) {
      return;
    }

    try {
      console.log('Starting localStorage migration...');
      setIsLoading(true);
      
      const oldConnections = JSON.parse(oldData);
      if (!Array.isArray(oldConnections) || oldConnections.length === 0) {
        localStorage.setItem(MIGRATION_KEY, 'true');
        return;
      }
      
      console.log(`Migrating ${oldConnections.length} connections...`);
      
      // Import to backend
      const response = await apiClient.post('/api/connections/import', {
        connections: oldConnections
      });
      
      console.log('Migration response:', response.data);
      
      // Mark migration as completed
      localStorage.setItem(MIGRATION_KEY, 'true');
      
      // Clean up old data
      localStorage.removeItem(OLD_STORAGE_KEY);
      
      // Reload connections from backend
      await loadConnections();
      
      console.log('Migration completed successfully');
      
    } catch (error) {
      console.error('Migration failed:', error);
      // Don't mark as completed if it failed - will retry next time
      setError('Migration failed - will retry next time');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, loadConnections]);

  // Refresh connections
  const refreshConnections = useCallback(async () => {
    await loadConnections();
  }, [loadConnections]);

  // Initialize: Load connections and attempt migration
  useEffect(() => {
    const initialize = async () => {
      if (isAuthenticated) {
        // Try migration first
        await migrateFromLocalStorage();
        // Then load connections (migration will have loaded them if successful)
        if (!localStorage.getItem(MIGRATION_KEY)) {
          await loadConnections();
        }
      }
    };
    
    initialize();
  }, [isAuthenticated, migrateFromLocalStorage, loadConnections]);

  // Simplified platform operations (existing functionality)
  const validatePlatformConfig = useCallback(async (
    platform: string, 
    config: Record<string, any>
  ): Promise<{valid: boolean, message: string}> => {
    try {
      const response = await apiClient.post(`/api/platforms/${platform}/validate`, { config });
      return response.data;
    } catch (error: any) {
      return { 
        valid: false, 
        message: error.response?.data?.message || 'Validation failed' 
      };
    }
  }, []);

  const testConnection = useCallback(async (connectionId: string): Promise<{ success: boolean; message: string }> => {
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
  }, [loadConnections]);

  const syncConnection = useCallback(async (connectionId: string): Promise<{ success: boolean; message: string }> => {
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
  }, [loadConnections]);

  const getProjectData = useCallback(async (connectionId: string, projectId?: string): Promise<any> => {
    const url = projectId 
      ? `/api/connections/${connectionId}/projects?projectId=${projectId}`
      : `/api/connections/${connectionId}/projects`;
    
    const response = await apiClient.get(url);
    return response.data;
  }, []);

  const value: ConnectionsContextType = {
    connections,
    isLoading,
    error,
    createConnection,
    deleteConnection,
    refreshConnections,
    migrateFromLocalStorage,
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