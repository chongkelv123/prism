// frontend/src/pages/ConnectionsPage.tsx
import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import ConnectionsHeader from '../components/feature-specific/connections/ConnectionsHeader';
import ConnectionsList from '../components/feature-specific/connections/ConnectionsList';
import AddConnectionModal from '../components/feature-specific/connections/AddConnectionModal';

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

const ConnectionsPage: React.FC = () => {
  const [connections, setConnections] = useState<Connection[]>([
    {
      id: 'conn-1',
      name: 'Monday.com Workspace',
      platform: 'monday',
      status: 'connected',
      lastSync: '2 hours ago',
      projectCount: 3,
      configuration: { workspaceId: 'ws123', apiKey: '***' },
      createdAt: '2025-04-15T10:30:00Z'
    },
    {
      id: 'conn-2', 
      name: 'Jira Cloud Instance',
      platform: 'jira',
      status: 'connected',
      lastSync: '1 day ago',
      projectCount: 2,
      configuration: { domain: 'company.atlassian.net', projectKey: 'PRISM' },
      createdAt: '2025-04-10T14:20:00Z'
    }
  ]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddConnection = () => {
    setIsAddModalOpen(true);
  };

  const handleConnectionAdded = (newConnection: Omit<Connection, 'id' | 'createdAt'>) => {
    const connection: Connection = {
      ...newConnection,
      id: `conn-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    
    setConnections(prev => [...prev, connection]);
    setIsAddModalOpen(false);
  };

  const handleTestConnection = async (connectionId: string) => {
    setIsLoading(true);
    // TODO: Implement connection testing logic
    
    // Simulate API call
    setTimeout(() => {
      setConnections(prev => 
        prev.map(conn => 
          conn.id === connectionId 
            ? { ...conn, status: 'connected', lastSync: 'Just now' }
            : conn
        )
      );
      setIsLoading(false);
    }, 2000);
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <ConnectionsHeader onAddConnection={handleAddConnection} />
        
        <ConnectionsList 
          connections={connections}
          isLoading={isLoading}
          onTestConnection={handleTestConnection}
          onDeleteConnection={handleDeleteConnection}
        />
        
        {isAddModalOpen && (
          <AddConnectionModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onConnectionAdded={handleConnectionAdded}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default ConnectionsPage;