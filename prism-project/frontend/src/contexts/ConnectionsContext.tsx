// frontend/src/contexts/ConnectionsContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface Connection {
  id: string;
  name: string;
  platform: 'monday' | 'jira' | 'trofos';
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  projectCount?: number;
  configuration: Record<string, any>;
  createdAt: string;
}

interface ConnectionsContextType {
  connections: Connection[];
  addConnection: (connection: Omit<Connection, 'id' | 'createdAt'>) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;
  testConnection: (id: string) => Promise<void>;
}

const ConnectionsContext = createContext<ConnectionsContextType | undefined>(undefined);

export const ConnectionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connections, setConnections] = useState<Connection[]>([]);

  const addConnection = (connectionData: Omit<Connection, 'id' | 'createdAt'>) => {
    const newConnection: Connection = {
      ...connectionData,
      id: `conn-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setConnections(prev => [...prev, newConnection]);
  };

  const updateConnection = (id: string, updates: Partial<Connection>) => {
    setConnections(prev => 
      prev.map(conn => 
        conn.id === id ? { ...conn, ...updates } : conn
      )
    );
  };

  const deleteConnection = (id: string) => {
    setConnections(prev => prev.filter(conn => conn.id !== id));
  };

  const testConnection = async (id: string): Promise<void> => {
    // Update status to indicate testing
    updateConnection(id, { status: 'connected', lastSync: 'Just now' });
    
    // Simulate API call
    return new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  };

  return (
    <ConnectionsContext.Provider value={{
      connections,
      addConnection,
      updateConnection,
      deleteConnection,
      testConnection
    }}>
      {children}
    </ConnectionsContext.Provider>
  );
};

export const useConnections = () => {
  const context = useContext(ConnectionsContext);
  if (context === undefined) {
    console.error('useConnections hook called outside of ConnectionsProvider');
    console.error('Make sure the component is wrapped in ConnectionsProvider');
    throw new Error('useConnections must be used within a ConnectionsProvider');
  }
  return context;
};