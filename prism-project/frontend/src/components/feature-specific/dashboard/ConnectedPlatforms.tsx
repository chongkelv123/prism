// frontend/src/components/feature-specific/dashboard/ConnectedPlatforms.tsx - IMPROVED VERSION
import React from 'react';
import { Plus, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardSection from './DashboardSection';

// Hook to safely access connections context
const useOptionalConnections = () => {
  try {
    const { useConnections } = require('../../../contexts/ConnectionsContext');
    const context = useConnections();
    return {
      hasConnectionsProvider: true,
      ...context
    };
  } catch (error) {
    // If ConnectionsProvider is not available, return safe defaults
    console.log('ConnectionsProvider not available in current context');
    return {
      hasConnectionsProvider: false,
      connections: [],
      isLoading: false,
      error: null,
      isServiceAvailable: false,
      syncConnection: async (id: string) => {
        console.log('Connections service not available');
        return { success: false, message: 'Connections service not available' };
      }
    };
  }
};

const ConnectedPlatforms: React.FC = () => {
  const navigate = useNavigate();
  const { hasConnectionsProvider, connections, isLoading, syncConnection, isServiceAvailable } = useOptionalConnections();

  const handleSyncConnection = async (id: string) => {
    try {
      const result = await syncConnection(id);
      if (!result.success) {
        console.log('Sync failed:', result.message);
      }
    } catch (error) {
      console.error('Failed to sync connection:', error);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
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
      <DashboardSection title="Platform Connections">
        <div className="space-y-4">
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

  // Show platform connection overview even if no connections yet
  return (
    <DashboardSection 
      title="Platform Connections"
      actionText="Manage All"
      onAction={() => navigate('/connections')}
    >
      {connections.length === 0 ? (
        // No connections yet - show getting started
        <div className="text-center py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Platform Preview Cards */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <h3 className="font-medium text-gray-900">Monday.com</h3>
                  <p className="text-sm text-gray-500">Boards & Items</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Sync your Monday.com boards and track project progress automatically.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">🔄</span>
                <div>
                  <h3 className="font-medium text-gray-900">Jira</h3>
                  <p className="text-sm text-gray-500">Issues & Sprints</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Connect to Jira Cloud and generate reports from your project data.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">📈</span>
                <div>
                  <h3 className="font-medium text-gray-900">TROFOS</h3>
                  <p className="text-sm text-gray-500">Projects & Resources</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Integrate with TROFOS for comprehensive project management reports.
              </p>
            </div>
          </div>

          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Connect Your First Platform
            </h3>
            <p className="text-gray-600 mb-4">
              Start generating automated PowerPoint reports by connecting to your project management tools.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/connections')}
                className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus size={20} className="mr-2" />
                Connect Platform
              </button>
              
              <button
                onClick={() => window.open('https://docs.prism.com/getting-started', '_blank')}
                className="flex items-center justify-center px-6 py-3 bg-white text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
              >
                <ExternalLink size={16} className="mr-2" />
                View Guide
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Show existing connections
        <div className="space-y-4">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{getPlatformIcon(connection.platform)}</span>
                  <div>
                    <h3 className="font-medium text-gray-900">{connection.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{connection.platform}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(connection.status)}`}>
                  {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  <p className="mb-1">{connection.projectCount} project{connection.projectCount !== 1 ? 's' : ''}</p>
                  {connection.lastSync && (
                    <p>Last synced: {connection.lastSync}</p>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleSyncConnection(connection.id)}
                    className="text-sm text-blue-600 hover:text-blue-800 transition-colors font-medium"
                  >
                    Sync Now
                  </button>
                  <button
                    onClick={() => navigate(`/connections/${connection.id}`)}
                    className="text-sm text-gray-600 hover:text-gray-800 transition-colors font-medium"
                  >
                    Manage
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Add More Connection Card */}
          <div
            onClick={() => navigate('/connections')}
            className="border border-dashed border-gray-300 rounded-lg p-4 flex items-center justify-center text-center hover:border-blue-400 cursor-pointer transition-colors bg-gray-50 hover:bg-blue-50"
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Plus size={16} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Add Another Platform</h3>
                <p className="text-sm text-gray-500">Connect more project management tools</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardSection>
  );
};

export default ConnectedPlatforms;