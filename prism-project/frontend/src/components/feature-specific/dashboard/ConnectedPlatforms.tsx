import React from 'react';
import { Plus } from 'lucide-react';
import DashboardSection from './DashboardSection';
import { useConnections } from '../../../contexts/ConnectionsContext';

const ConnectedPlatforms: React.FC = () => {
  const { connections, isLoading, syncConnection } = useConnections();

  const handleSyncConnection = async (id: string) => {
    try {
      await syncConnection(id);
    } catch (error) {
      console.error('Failed to sync connection:', error);
    }
  };

  const getPlatformIcon = (type: string) => {
    switch (type) {
      case 'monday':
        return '📊';
      case 'jira':
        return '🔄';
      case 'trofos':
        return '📈';
      default:
        return '🔗';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'disconnected':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <DashboardSection title="Connected Platforms">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-200 rounded-lg p-4 animate-pulse">
              <div className="h-6 bg-gray-300 rounded mb-2"></div>
              <div className="h-4 bg-gray-300 rounded mb-1"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title="Connected Platforms">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {connections.map(platform => (
          <div 
            key={platform.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center">
                <span className="text-2xl mr-2">{getPlatformIcon(platform.type)}</span>
                <h3 className="font-medium">{platform.name}</h3>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(platform.status)}`}>
                {platform.status.charAt(0).toUpperCase() + platform.status.slice(1)}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              <p className="mb-1">{platform.projects} projects</p>
              <p>Last synced: {platform.lastSync}</p>
            </div>
            <div className="flex justify-end mt-3">
              <button 
                onClick={() => handleSyncConnection(platform.id)}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Sync Now
              </button>
            </div>
          </div>
        ))}
        
        {/* Add New Platform Card */}
        <div 
          className="border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:border-blue-400 cursor-pointer transition-colors h-full"
          onClick={() => window.location.href = '/connections/new'}
        >
          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center mb-2">
            <Plus size={20} className="text-blue-600" />
          </div>
          <h3 className="font-medium mb-1">Add New Platform</h3>
          <p className="text-sm text-gray-500">Connect to Monday.com, Jira, or TROFOS</p>
        </div>
      </div>
    </DashboardSection>
  );
};

export default ConnectedPlatforms;