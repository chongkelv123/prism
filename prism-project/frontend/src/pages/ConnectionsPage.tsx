// frontend/src/pages/ConnectionsPage.tsx - FIXED WITH INTERNAL PROVIDER
import React, { useState, useCallback } from 'react';
import { ConnectionsProvider, useConnections } from '../contexts/ConnectionsContext';
import MainLayout from '../components/layout/MainLayout';
import ConnectionsHeader from '../components/feature-specific/connections/ConnectionsHeader';
import ConnectionsList from '../components/feature-specific/connections/ConnectionsList';
import AddConnectionModal from '../components/feature-specific/connections/AddConnectionModal';
import ServiceAvailabilityBanner from '../components/common/ServiceAvailabilityBanner';

// Internal component that uses ConnectionsContext
const ConnectionsPageContent: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Now we can safely use ConnectionsContext
  const { 
    connections, 
    isLoading, 
    error, 
    createConnection,
    testConnection,
    syncConnection,
    deleteConnection 
  } = useConnections();

  const handleAddConnection = useCallback(() => {
    console.log('Opening add connection modal');
    setIsAddModalOpen(true);
  }, []);

  const handleConnectionAdded = useCallback(async (newConnectionData: any) => {
    console.log('Adding new connection via ConnectionsContext:', newConnectionData.name);
    
    try {
      // Use ConnectionsContext instead of direct localStorage
      await createConnection({
        name: newConnectionData.name,
        platform: newConnectionData.platform,
        config: newConnectionData.config || {},
        metadata: newConnectionData.metadata || {}
      });
      
      setIsAddModalOpen(false);
      console.log('✅ Connection added successfully via ConnectionsContext');
    } catch (error) {
      console.error('❌ Failed to add connection:', error);
      // Error is handled by ConnectionsContext
    }
  }, [createConnection]);

  const handleTestConnection = useCallback(async (connectionId: string) => {
    console.log('Testing connection via ConnectionsContext:', connectionId);
    setActionLoading(connectionId);
    
    try {
      const result = await testConnection(connectionId);
      console.log('Connection test result:', result);
    } catch (error) {
      console.error('Connection test failed:', error);
    } finally {
      setActionLoading(null);
    }
  }, [testConnection]);

  const handleSyncConnection = useCallback(async (connectionId: string) => {
    console.log('Syncing connection via ConnectionsContext:', connectionId);
    setActionLoading(connectionId);
    
    try {
      const result = await syncConnection(connectionId);
      console.log('Connection sync result:', result);
    } catch (error) {
      console.error('Connection sync failed:', error);
    } finally {
      setActionLoading(null);
    }
  }, [syncConnection]);

  const handleDeleteConnection = useCallback(async (connectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this connection? This action cannot be undone.')) {
      return;
    }

    console.log('Deleting connection via ConnectionsContext:', connectionId);
    setActionLoading(connectionId);
    
    try {
      const result = await deleteConnection(connectionId);
      console.log('Connection delete result:', result);
    } catch (error) {
      console.error('Connection delete failed:', error);
    } finally {
      setActionLoading(null);
    }
  }, [deleteConnection]);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Service Availability Banner */}
        <ServiceAvailabilityBanner />
        
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
          </div>
        </div>

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              🐛 Debug Info (ConnectionsContext):
            </h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Connections: {connections.length}</p>
              <p>Connected: {connections.filter(c => c.status === 'connected').length}</p>
              <p>Is Loading: {isLoading ? 'Yes' : 'No'}</p>
              <p>Action Loading: {actionLoading || 'None'}</p>
              <p>Modal Open: {isAddModalOpen ? 'Yes' : 'No'}</p>
              <p>Error: {error || 'None'}</p>
              <p>Storage: User-specific (prism-connections-USER_ID)</p>
              <p>Statuses: {connections.map(c => c.status).join(', ') || 'None'}</p>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

// Main component that provides ConnectionsProvider (same pattern as CreateReportPage)
const ConnectionsPage: React.FC = () => {
  console.log('🔄 ConnectionsPage: Rendering with internal ConnectionsProvider');
  
  return (
    <ConnectionsProvider>
      <ConnectionsPageContent />
    </ConnectionsProvider>
  );
};

export default ConnectionsPage;