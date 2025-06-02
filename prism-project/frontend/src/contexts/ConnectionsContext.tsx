import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Connection {
  id: string;
  name: string;
  type: 'monday' | 'jira' | 'trofos';
  status: 'connected' | 'disconnected' | 'error';
  projects: number;
  lastSync: string;
  config?: {
    apiKey?: string;
    domain?: string;
    boardId?: string;
    projectKey?: string;
  };
}

interface ConnectionsContextType {
  connections: Connection[];
  isLoading: boolean;
  error: string | null;
  addConnection: (connection: Omit<Connection, 'id'>) => Promise<void>;
  removeConnection: (id: string) => Promise<void>;
  syncConnection: (id: string) => Promise<void>;
  refreshConnections: () => Promise<void>;
}

const ConnectionsContext = createContext<ConnectionsContextType | undefined>(undefined);

export const ConnectionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data for development - replace with actual API calls
  const mockConnections: Connection[] = [
    {
      id: 'monday-1',
      name: 'Monday.com Workspace',
      type: 'monday',
      status: 'connected',
      projects: 3,
      lastSync: '2 hours ago',
      config: {
        apiKey: 'mock-api-key',
        boardId: 'board-123'
      }
    },
    {
      id: 'jira-1',
      name: 'Jira Cloud',
      type: 'jira',
      status: 'connected',
      projects: 2,
      lastSync: '1 day ago',
      config: {
        domain: 'company.atlassian.net',
        projectKey: 'PRISM'
      }
    }
  ];

  // Load connections on mount
  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      // const response = await apiClient.get('/api/connections');
      // setConnections(response.data);
      
      // For now, use mock data
      setTimeout(() => {
        setConnections(mockConnections);
        setIsLoading(false);
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load connections');
      setConnections(mockConnections); // Fallback to mock data
      setIsLoading(false);
    }
  };

  const addConnection = async (connectionData: Omit<Connection, 'id'>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      // const response = await apiClient.post('/api/connections', connectionData);
      // const newConnection = response.data;
      
      // For now, simulate adding a connection
      const newConnection: Connection = {
        ...connectionData,
        id: `${connectionData.type}-${Date.now()}`,
      };
      
      setConnections(prev => [...prev, newConnection]);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add connection');
      setIsLoading(false);
      throw err;
    }
  };

  const removeConnection = async (id: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      // await apiClient.delete(`/api/connections/${id}`);
      
      setConnections(prev => prev.filter(conn => conn.id !== id));
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove connection');
      setIsLoading(false);
      throw err;
    }
  };

  const syncConnection = async (id: string) => {
    setError(null);
    
    try {
      // TODO: Replace with actual API call
      // await apiClient.post(`/api/connections/${id}/sync`);
      
      // For now, simulate sync by updating lastSync
      setConnections(prev => 
        prev.map(conn => 
          conn.id === id 
            ? { ...conn, lastSync: 'Just now', status: 'connected' as const }
            : conn
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync connection');
      
      // Update connection status to error
      setConnections(prev => 
        prev.map(conn => 
          conn.id === id 
            ? { ...conn, status: 'error' as const }
            : conn
        )
      );
      throw err;
    }
  };

  const refreshConnections = async () => {
    await loadConnections();
  };

  return (
    <ConnectionsContext.Provider value={{
      connections,
      isLoading,
      error,
      addConnection,
      removeConnection,
      syncConnection,
      refreshConnections
    }}>
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