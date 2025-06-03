// frontend/src/pages/ConnectionsPage.tsx (Updated)
import React, { useState, useCallback } from 'react';
import MainLayout from '../components/layout/MainLayout';
import ConnectionsHeader from '../components/feature-specific/connections/ConnectionsHeader';
import ConnectionsList from '../components/feature-specific/connections/ConnectionsList';
import AddConnectionModal from '../components/feature-specific/connections/AddConnectionModal';
import { useConnections, ConnectionConfig } from '../contexts/ConnectionsContext';

const ConnectionsPage: React.FC = () => {
  const { 
    connections, 
    isLoading,
    error,
    testConnection, 
    syncConnection,
    deleteConnection,
    createConnection
  } = useConnections();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAddConnection = useCallback(() => {
    setIsAddModalOpen(true);
  }, []);

  const handleConnectionAdded = useCallback(async (newConnectionData: ConnectionConfig) => {
    try {
      await createConnection(newConnectionData);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Failed to create connection:', error);
      // Error handling is done in the context
    }
  }, [createConnection]);

  const handleTestConnection = useCallback(async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      const result = await testConnection(connectionId);
      if (result.success) {
        // Success notification could be shown here
        console.log('Connection test successful');
      } else {
        // Error notification could be shown here
        console.error('Connection test failed:', result.message);
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
    } finally {
      setActionLoading(null);
    }
  }, [testConnection]);

  const handleSyncConnection = useCallback(async (connectionId: string) => {
    setActionLoading(connectionId);
    try {
      const result = await syncConnection(connectionId);
      if (result.success) {
        console.log('Connection synced successfully');
      } else {
        console.error('Connection sync failed:', result.message);
      }
    } catch (error) {
      console.error('Failed to sync connection:', error);
    } finally {
      setActionLoading(null);
    }
  }, [syncConnection]);

  const handleDeleteConnection = useCallback(async (connectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this connection? This action cannot be undone.')) {
      return;
    }

    setActionLoading(connectionId);
    try {
      const result = await deleteConnection(connectionId);
      if (result.success) {
        console.log('Connection deleted successfully');
      } else {
        console.error('Failed to delete connection:', result.message);
      }
    } catch (error) {
      console.error('Failed to delete connection:', error);
    } finally {
      setActionLoading(null);
    }
  }, [deleteConnection]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <ConnectionsHeader onAddConnection={handleAddConnection} />
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="flex items-center space-x-3">
              <div className="animate-spin h-6 w-6 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
              <span className="text-gray-600">Loading connections...</span>
            </div>
          </div>
        )}
        
        {/* Connections List */}
        {!isLoading && (
          <ConnectionsList 
            connections={connections}
            isLoading={actionLoading !== null}
            onTestConnection={handleTestConnection}
            onSyncConnection={handleSyncConnection}
            onDeleteConnection={handleDeleteConnection}
            actionLoadingId={actionLoading}
          />
        )}
        
        {/* Add Connection Modal */}
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

// frontend/src/components/feature-specific/connections/ConnectionsList.tsx (Updated)
import React from 'react';
import { Connection } from '../../../contexts/ConnectionsContext';
import ConnectionCard from './ConnectionCard';

interface ConnectionsListProps {
  connections: Connection[];
  isLoading: boolean;
  actionLoadingId?: string | null;
  onTestConnection: (connectionId: string) => void;
  onSyncConnection: (connectionId: string) => void;
  onDeleteConnection: (connectionId: string) => void;
}

const ConnectionsList: React.FC<ConnectionsListProps> = ({
  connections,
  isLoading,
  actionLoadingId,
  onTestConnection,
  onSyncConnection,
  onDeleteConnection
}) => {
  if (connections.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Connections Yet
          </h3>
          <p className="text-gray-500 mb-4">
            Connect to your project management platforms to start generating reports
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {connections.map(connection => (
        <ConnectionCard
          key={connection.id}
          connection={connection}
          isLoading={actionLoadingId === connection.id}
          onTestConnection={onTestConnection}
          onSyncConnection={onSyncConnection}
          onDeleteConnection={onDeleteConnection}
        />
      ))}
    </div>
  );
};

export default ConnectionsList;