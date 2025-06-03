// frontend/src/components/feature-specific/connections/ConnectionsList.tsx
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