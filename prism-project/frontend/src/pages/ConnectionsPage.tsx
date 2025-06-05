// frontend/src/pages/ConnectionsPage.tsx - FIXED VERSION (Internal ConnectionsProvider)
import React, { useState, useCallback } from 'react';
import { ConnectionsProvider, useConnections } from '../contexts/ConnectionsContext';
import MainLayout from '../components/layout/MainLayout';
import ConnectionsHeader from '../components/feature-specific/connections/ConnectionsHeader';
import ConnectionsList from '../components/feature-specific/connections/ConnectionsList';
import AddConnectionModal from '../components/feature-specific/connections/AddConnectionModal';
import ServiceAvailabilityBanner from '../components/common/ServiceAvailabilityBanner';

interface ConnectionConfig {
  name: string;
  platform: 'monday' | 'jira' | 'trofos';
  config: Record<string, any>;
}

// Internal component that uses ConnectionsContext
const ConnectionsPageContent: React.FC = () => {
  const { 
    connections, 
    isLoading,
    error,
    isServiceAvailable,
    testConnection, 
    syncConnection,
    deleteConnection,
    createConnection
  } = useConnections();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAddConnection = useCallback(() => {
    if (!isServiceAvailable) {
      alert('Platform integrations service is not available. Please ensure the service is running.');
      return;
    }
    setIsAddModalOpen(true);
  }, [isServiceAvailable]);

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
        console.log('Connection test successful');
      } else {
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
        
        {/* Service Availability Banner */}
        <ServiceAvailabilityBanner />
        
        {/* Error Display */}
        {error && isServiceAvailable && (
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

// Main component that provides ConnectionsProvider only when needed
const ConnectionsPage: React.FC = () => {
  console.log('🔄 ConnectionsPage: Rendering with internal ConnectionsProvider');
  
  return (
    <ConnectionsProvider>
      <ConnectionsPageContent />
    </ConnectionsProvider>
  );
};

export default ConnectionsPage;