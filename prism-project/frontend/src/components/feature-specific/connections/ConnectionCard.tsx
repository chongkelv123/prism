// frontend/src/components/feature-specific/connections/ConnectionCard.tsx
import React, { useState } from 'react';
import { MoreVertical, RefreshCw, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Connection } from '../../../contexts/ConnectionsContext';

interface ConnectionCardProps {
  connection: Connection;
  isLoading: boolean;
  onTestConnection: (connectionId: string) => void;
  onDeleteConnection: (connectionId: string) => void;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({
  connection,
  isLoading,
  onTestConnection,
  onDeleteConnection
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const getPlatformInfo = (platform: string) => {
    switch (platform) {
      case 'monday':
        return {
          name: 'Monday.com',
          icon: '📊',
          color: 'bg-orange-500'
        };
      case 'jira':
        return {
          name: 'Jira',
          icon: '🔄',
          color: 'bg-blue-500'
        };
      case 'trofos':
        return {
          name: 'TROFOS',
          icon: '📈',
          color: 'bg-green-500'
        };
      default:
        return {
          name: platform,
          icon: '📋',
          color: 'bg-gray-500'
        };
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'connected':
        return {
          icon: <CheckCircle size={16} className="text-green-500" />,
          text: 'Connected',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800'
        };
      case 'disconnected':
        return {
          icon: <XCircle size={16} className="text-gray-500" />,
          text: 'Disconnected',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800'
        };
      case 'error':
        return {
          icon: <AlertCircle size={16} className="text-red-500" />,
          text: 'Error',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800'
        };
      default:
        return {
          icon: <AlertCircle size={16} className="text-gray-500" />,
          text: 'Unknown',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800'
        };
    }
  };

  const platformInfo = getPlatformInfo(connection.platform);
  const statusInfo = getStatusInfo(connection.status);

  return (
    <div className="relative bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          <div className={`w-10 h-10 ${platformInfo.color} rounded-lg flex items-center justify-center text-white text-lg mr-3`}>
            {platformInfo.icon}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{connection.name}</h3>
            <p className="text-sm text-gray-500">{platformInfo.name}</p>
          </div>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <MoreVertical size={16} />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
              <button
                onClick={() => {
                  onTestConnection(connection.id);
                  setShowMenu(false);
                }}
                disabled={isLoading}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                <RefreshCw size={14} className="mr-2" />
                Test Connection
              </button>
              <button
                onClick={() => {
                  onDeleteConnection(connection.id);
                  setShowMenu(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between mb-4">
        <div className={`flex items-center px-2 py-1 rounded-full ${statusInfo.bgColor}`}>
          {statusInfo.icon}
          <span className={`ml-1 text-xs font-medium ${statusInfo.textColor}`}>
            {statusInfo.text}
          </span>
        </div>
        
        {connection.projectCount !== undefined && (
          <span className="text-sm text-gray-500">
            {connection.projectCount} project{connection.projectCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Sync Info */}
      {connection.lastSync && (
        <div className="text-xs text-gray-500">
          Last synced: {connection.lastSync}
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="flex items-center">
            <div className="animate-spin h-4 w-4 border-t-2 border-b-2 border-blue-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Testing...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionCard;