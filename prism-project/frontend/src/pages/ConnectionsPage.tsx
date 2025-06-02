// frontend/src/pages/ConnectionsPage.tsx
import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import ConnectionsHeader from '../components/feature-specific/connections/ConnectionsHeader';
import ConnectionsList from '../components/feature-specific/connections/ConnectionsList';
import AddConnectionModal from '../components/feature-specific/connections/AddConnectionModal';
import { useConnections, Connection } from '../contexts/ConnectionsContext';

const ConnectionsPage: React.FC = () => {
  const { connections, addConnection, testConnection, deleteConnection } = useConnections();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddConnection = () => {
    setIsAddModalOpen(true);
  };

  const handleConnectionAdded = (newConnection: Omit<Connection, 'id' | 'createdAt'>) => {
    addConnection(newConnection);
    setIsAddModalOpen(false);
  };

  const handleTestConnection = async (connectionId: string) => {
    setIsLoading(true);
    try {
      await testConnection(connectionId);
    } catch (error) {
      console.error('Failed to test connection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (window.confirm('Are you sure you want to delete this connection?')) {
      deleteConnection(connectionId);
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