// frontend/src/pages/ConnectionsPage.tsx - FIXED VERSION (No ConnectionsProvider)
import React, { useState, useCallback } from 'react';
import { useConnections } from '../contexts/ConnectionsContext';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import ConnectionsHeader from '../components/feature-specific/connections/ConnectionsHeader';
import ConnectionsList from '../components/feature-specific/connections/ConnectionsList';
import AddConnectionModal from '../components/feature-specific/connections/AddConnectionModal';
import ServiceAvailabilityBanner from '../components/common/ServiceAvailabilityBanner';

// Main component that uses shared ConnectionsContext from router
const ConnectionsPage: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Get auth info for debugging
  const { user, isAuthenticated } = useAuth();

  // Use the shared ConnectionsContext from router (NO local provider)
  const { 
    connections, 
    isLoading, 
    error, 
    createConnection,
    testConnection,
    syncConnection,
    deleteConnection,
    isServiceAvailable 
  } = useConnections();

  console.log('ConnectionsPage: Using shared ConnectionsContext - connections:', connections.length);

  const handleAddConnection = useCallback(() => {
    console.log('Opening add connection modal');
    setIsAddModalOpen(true);
  }, []);

  const handleConnectionAdded = useCallback(async (newConnectionData: any) => {
    console.log('===== CONNECTION CREATION DEBUG =====');
    console.log('Input data:', {
      name: newConnectionData.name,
      platform: newConnectionData.platform,
      hasConfig: !!newConnectionData.config,
      configKeys: newConnectionData.config ? Object.keys(newConnectionData.config) : []
    });

    try {
      setActionLoading('create');
      await createConnection(newConnectionData);
      setIsAddModalOpen(false);
      console.log('Connection creation completed successfully');
    } catch (error: any) {
      console.error('Connection creation failed:', error);
    } finally {
      setActionLoading(null);
    }
  }, [createConnection]);

  const handleTestConnection = useCallback(async (connectionId: string) => {
    console.log('Testing connection:', connectionId);
    try {
      setActionLoading(`test-${connectionId}`);
      const result = await testConnection(connectionId);
      console.log('Test result:', result);
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      setActionLoading(null);
    }
  }, [testConnection]);

  const handleSyncConnection = useCallback(async (connectionId: string) => {
    console.log('Syncing connection:', connectionId);
    try {
      setActionLoading(`sync-${connectionId}`);
      const result = await syncConnection(connectionId);
      console.log('Sync result:', result);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setActionLoading(null);
    }
  }, [syncConnection]);

  const handleDeleteConnection = useCallback(async (connectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this connection?')) {
      return;
    }

    console.log('Deleting connection:', connectionId);
    try {
      setActionLoading(`delete-${connectionId}`);
      const result = await deleteConnection(connectionId);
      console.log('Delete result:', result);
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setActionLoading(null);
    }
  }, [deleteConnection]);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Service Availability Banner */}
        <ServiceAvailabilityBanner />

        {/* Page Header */}
        <ConnectionsHeader onAddConnection={handleAddConnection} />

        {/* Connections List */}
        <ConnectionsList
          connections={connections}
          isLoading={isLoading}
          error={error}
          onTestConnection={handleTestConnection}
          onSyncConnection={handleSyncConnection}
          onDeleteConnection={handleDeleteConnection}
          actionLoading={actionLoading}
        />

        {/* Add Connection Modal */}
        <AddConnectionModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onConnectionAdded={handleConnectionAdded}
          isLoading={actionLoading === 'create'}
        />

        {/* Debug Info Panel */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Connections Debug Panel (Shared Context)
          </h3>
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>Authenticated:</strong> {isAuthenticated ? 'Yes' : 'No'}</p>
            <p><strong>User ID:</strong> {user?.id || 'None'}</p>
            <p><strong>Service Available:</strong> {isServiceAvailable ? 'Yes' : 'No'}</p>
            <p><strong>Connections:</strong> {connections.length}</p>
            <p><strong>Connected:</strong> {connections.filter(c => c.status === 'connected').length}</p>
            <p><strong>Loading:</strong> {isLoading ? 'Yes' : 'No'}</p>
            <p><strong>Error:</strong> {error || 'None'}</p>
            <p><strong>Storage Keys:</strong> prism-connections-{user?.id || 'NO_USER'}</p>
            <p><strong>Context Source:</strong> Shared from Router</p>
          </div>
          
          <div className="mt-3 flex space-x-2">
            <button
              onClick={() => {
                console.log('Current state (SHARED CONTEXT):', {
                  connections,
                  isLoading,
                  error,
                  isServiceAvailable,
                  isAuthenticated,
                  user
                });
              }}
              className="px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded"
            >
              Log State
            </button>
            <button
              onClick={() => {
                const globalData = localStorage.getItem('prism-connections');
                const userData = localStorage.getItem(`prism-connections-${user?.id}`);
                console.log('Storage debug:', { globalData, userData });
              }}
              className="px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded"
            >
              Check Storage
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            How Connections Work:
          </h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>1. Click "Add Connection" to connect a platform</p>
            <p>2. Choose Monday.com or Jira</p>
            <p>3. Enter your credentials and test the connection</p>
            <p>4. Save the connection for generating reports</p>
            <p>5. Use "Test" or "Sync" to verify connections anytime</p>
            <p><strong>Now using shared context - connections persist across pages!</strong></p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ConnectionsPage;