// frontend/src/pages/ConnectionsPage.tsx - FIXED VERSION WITH INTERNAL PROVIDER
import React, { useState, useCallback, useEffect } from 'react';
import { ConnectionsProvider } from '../contexts/ConnectionsContext';
import MainLayout from '../components/layout/MainLayout';
import ConnectionsHeader from '../components/feature-specific/connections/ConnectionsHeader';
import ConnectionsList from '../components/feature-specific/connections/ConnectionsList';
import AddConnectionModal from '../components/feature-specific/connections/AddConnectionModal';
import ServiceAvailabilityBanner from '../components/common/ServiceAvailabilityBanner';

interface Connection {
  id: string;
  name: string;
  platform: 'monday' | 'jira' | 'trofos';
  status: 'connected' | 'disconnected' | 'error';
  projectCount: number;
  lastSync?: string;
  lastSyncError?: string;
  createdAt: string;
}

// Internal component that uses ConnectionsContext
const ConnectionsPageContent: React.FC = () => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load connections from localStorage on mount
  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = () => {
    try {
      setIsLoading(true);
      const savedConnections = JSON.parse(localStorage.getItem('prism-connections') || '[]');
      setConnections(savedConnections);
      setError(null);
      console.log('Loaded connections:', savedConnections.length);
    } catch (error) {
      console.error('Failed to load connections:', error);
      setError('Failed to load connections');
      setConnections([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddConnection = useCallback(() => {
    console.log('Opening add connection modal');
    setIsAddModalOpen(true);
  }, []);

  const handleConnectionAdded = useCallback(async (newConnectionData: any) => {
    console.log('Adding new connection:', newConnectionData.name);
    
    try {
      // Create connection object
      const connection: Connection = {
        id: `conn_${Date.now()}`,
        name: newConnectionData.name,
        platform: newConnectionData.platform,
        status: 'connected',
        projectCount: 1,
        lastSync: 'Just now',
        createdAt: new Date().toISOString()
      };

      // Save to localStorage
      const existingConnections = JSON.parse(localStorage.getItem('prism-connections') || '[]');
      const updatedConnections = [...existingConnections, connection];
      localStorage.setItem('prism-connections', JSON.stringify(updatedConnections));

      // Update state
      setConnections(updatedConnections);
      setIsAddModalOpen(false);
      setError(null);

      console.log('Connection added successfully:', connection.id);
    } catch (error) {
      console.error('Failed to add connection:', error);
      setError('Failed to add connection');
    }
  }, []);

  const handleTestConnection = useCallback(async (connectionId: string) => {
    console.log('Testing connection:', connectionId);
    setActionLoading(connectionId);
    
    try {
      // Simulate test (in real app, you'd call your test API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update connection status
      const updatedConnections = connections.map(conn => 
        conn.id === connectionId 
          ? { ...conn, status: 'connected' as const, lastSync: 'Just now' }
          : conn
      );
      
      setConnections(updatedConnections);
      localStorage.setItem('prism-connections', JSON.stringify(updatedConnections));
      
      console.log('Connection test successful');
    } catch (error) {
      console.error('Connection test failed:', error);
      
      // Update connection with error status
      const updatedConnections = connections.map(conn => 
        conn.id === connectionId 
          ? { ...conn, status: 'error' as const, lastSyncError: 'Test failed' }
          : conn
      );
      
      setConnections(updatedConnections);
      localStorage.setItem('prism-connections', JSON.stringify(updatedConnections));
    } finally {
      setActionLoading(null);
    }
  }, [connections]);

  const handleSyncConnection = useCallback(async (connectionId: string) => {
    console.log('Syncing connection:', connectionId);
    setActionLoading(connectionId);
    
    try {
      // Simulate sync (in real app, you'd call your sync API)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update connection
      const updatedConnections = connections.map(conn => 
        conn.id === connectionId 
          ? { ...conn, lastSync: 'Just now', lastSyncError: undefined }
          : conn
      );
      
      setConnections(updatedConnections);
      localStorage.setItem('prism-connections', JSON.stringify(updatedConnections));
      
      console.log('Connection sync successful');
    } catch (error) {
      console.error('Connection sync failed:', error);
      
      const updatedConnections = connections.map(conn => 
        conn.id === connectionId 
          ? { ...conn, lastSyncError: 'Sync failed' }
          : conn
      );
      
      setConnections(updatedConnections);
      localStorage.setItem('prism-connections', JSON.stringify(updatedConnections));
    } finally {
      setActionLoading(null);
    }
  }, [connections]);

  const handleDeleteConnection = useCallback(async (connectionId: string) => {
    if (!window.confirm('Are you sure you want to delete this connection? This action cannot be undone.')) {
      return;
    }

    console.log('Deleting connection:', connectionId);
    setActionLoading(connectionId);
    
    try {
      // Remove from state and localStorage
      const updatedConnections = connections.filter(conn => conn.id !== connectionId);
      setConnections(updatedConnections);
      localStorage.setItem('prism-connections', JSON.stringify(updatedConnections));
      
      console.log('Connection deleted successfully');
    } catch (error) {
      console.error('Failed to delete connection:', error);
      setError('Failed to delete connection');
    } finally {
      setActionLoading(null);
    }
  }, [connections]);

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
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                &times;
              </button>
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

        {/* Simple Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            How Connections Work:
          </h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>1. Click "Add Connection" to connect a platform</p>
            <p>2. Choose Monday.com, Jira, or TROFOS</p>
            <p>3. Enter your credentials and test the connection</p>
            <p>4. Save the connection for generating reports</p>
            <p>5. Use "Test" or "Sync" to verify connections anytime</p>
          </div>
        </div>

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Debug Info:
            </h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Connections: {connections.length}</p>
              <p>Is Loading: {isLoading ? 'Yes' : 'No'}</p>
              <p>Action Loading: {actionLoading || 'None'}</p>
              <p>Modal Open: {isAddModalOpen ? 'Yes' : 'No'}</p>
              <p>Error: {error || 'None'}</p>
              <p>Storage Key: prism-connections</p>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

// Main component that provides ConnectionsProvider only when needed
const ConnectionsPage: React.FC = () => {
  console.log('ConnectionsPage: Rendering with internal ConnectionsProvider');
  
  return (
    <ConnectionsProvider>
      <ConnectionsPageContent />
    </ConnectionsProvider>
  );
};

export default ConnectionsPage;