// frontend/src/pages/ConnectionsPage.tsx - RESTORED WITH PLATFORM SELECTION
import React, { useState, useCallback } from 'react';
import { ConnectionsProvider, useConnections, type ConnectionConfig } from '../contexts/ConnectionsContext';
import MainLayout from '../components/layout/MainLayout';
import ConnectionsHeader from '../components/feature-specific/connections/ConnectionsHeader';
import ConnectionsList from '../components/feature-specific/connections/ConnectionsList';
import AddConnectionModal from '../components/feature-specific/connections/AddConnectionModal';

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
    // Don't check service availability - let users try the simple connection
    setIsAddModalOpen(true);
  }, []);

  const handleConnectionAdded = useCallback(async (newConnectionData: any) => {
    try {
      await createConnection({
        name: newConnectionData.name,
        platform: newConnectionData.platform,
        config: newConnectionData.config
      });
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Failed to create connection:', error);
      // Error is already handled in the context
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
        alert(`Connection test failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
      alert('Failed to test connection');
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
        alert(`Connection sync failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to sync connection:', error);
      alert('Failed to sync connection');
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
        alert(`Failed to delete connection: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to delete connection:', error);
      alert('Failed to delete connection');
    } finally {
      setActionLoading(null);
    }
  }, [deleteConnection]);

  return (
    <MainLayout>
      <div className="space-y-6">
        <ConnectionsHeader onAddConnection={handleAddConnection} />
        
        {/* Service Availability Banner - Only show if there's an error */}
        {!isServiceAvailable && error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="text-yellow-600 mr-3 mt-0.5">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-yellow-800 mb-1">
                  Platform Integrations Service Notice
                </h3>
                <p className="text-sm text-yellow-700">
                  Complex backend service is unavailable, but you can still use direct platform connections.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Error Display */}
        {error && error !== 'Platform integrations service is not available' && (
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
            connections={connections || []}
            isLoading={actionLoading !== null}
            onTestConnection={handleTestConnection}
            onSyncConnection={handleSyncConnection}
            onDeleteConnection={handleDeleteConnection}
            actionLoadingId={actionLoading}
          />
        )}
        
        {/* Add Connection Modal - THIS WILL USE SIMPLE JIRA FORM */}
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

// Main component that provides ConnectionsProvider
const ConnectionsPage: React.FC = () => {
  console.log('🔄 ConnectionsPage: Rendering with ConnectionsProvider');
  
  return (
    <ConnectionsProvider>
      <ConnectionsPageContent />
    </ConnectionsProvider>
  );
};

export default ConnectionsPage;