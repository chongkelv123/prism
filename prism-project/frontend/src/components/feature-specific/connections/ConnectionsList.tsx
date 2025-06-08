// frontend/src/components/feature-specific/connections/ConnectionsList.tsx - COMPLETE WORKING VERSION
import React from 'react';
import { type Connection } from '../../../contexts/ConnectionsContext';
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
  // Safety check to ensure connections is always an array
  const safeConnections = Array.isArray(connections) ? connections : [];
  
  console.log('🔍 ConnectionsList render:', {
    connectionsReceived: connections,
    safeConnectionsLength: safeConnections.length,
    isLoading,
    actionLoadingId
  });

  if (safeConnections.length === 0 && !isLoading) {
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {/* Platform Preview Cards */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">🔄</span>
                <div>
                  <h4 className="font-medium text-gray-900">Jira</h4>
                  <p className="text-sm text-gray-500">Issues & Sprints</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Connect to Jira Cloud and generate reports from your project data.
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <h4 className="font-medium text-gray-900">Monday.com</h4>
                  <p className="text-sm text-gray-500">Boards & Items</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Sync your Monday.com boards and track project progress automatically.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">📈</span>
                <div>
                  <h4 className="font-medium text-gray-900">TROFOS</h4>
                  <p className="text-sm text-gray-500">Projects & Resources</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Integrate with TROFOS for comprehensive project management reports.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {safeConnections.map(connection => (
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
      
      {safeConnections.length > 0 && (
        <div className="text-center text-gray-500 text-sm">
          {safeConnections.length} connection{safeConnections.length !== 1 ? 's' : ''} configured
        </div>
      )}
    </div>
  );
};

export default ConnectionsList;