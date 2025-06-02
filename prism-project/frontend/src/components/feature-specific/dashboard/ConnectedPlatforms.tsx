// frontend/src/components/feature-specific/dashboard/ConnectedPlatforms.tsx
import React from 'react';
import { Plus, RefreshCw, Settings, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardSection from './DashboardSection';

interface Connection {
  id: string;
  name: string;
  platform: 'monday' | 'jira' | 'trofos';
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  projectCount?: number;
  configuration?: Record<string, any>;
  createdAt?: string;
}

interface ConnectedPlatformsProps {
  connections?: Connection[];
}

const ConnectedPlatforms: React.FC<ConnectedPlatformsProps> = ({ connections = [] }) => {
  const navigate = useNavigate();

  const getPlatformInfo = (platform: string) => {
    switch (platform) {
      case 'monday':
        return {
          name: 'Monday.com',
          icon: '📊',
          color: 'bg-orange-500',
          lightColor: 'bg-orange-50',
          borderColor: 'border-orange-200'
        };
      case 'jira':
        return {
          name: 'Jira',
          icon: '🔄',
          color: 'bg-blue-500',
          lightColor: 'bg-blue-50',
          borderColor: 'border-blue-200'
        };
      case 'trofos':
        return {
          name: 'TROFOS',
          icon: '📈',
          color: 'bg-green-500',
          lightColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      default:
        return {
          name: platform,
          icon: '📋',
          color: 'bg-gray-500',
          lightColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'connected':
        return {
          text: 'Connected',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          dotColor: 'bg-green-500'
        };
      case 'disconnected':
        return {
          text: 'Disconnected',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          dotColor: 'bg-gray-500'
        };
      case 'error':
        return {
          text: 'Error',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          dotColor: 'bg-red-500'
        };
      default:
        return {
          text: 'Unknown',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          dotColor: 'bg-gray-500'
        };
    }
  };

  const handleSync = (connectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement sync functionality
    console.log('Syncing connection:', connectionId);
  };

  const handleManageConnection = (connectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/connections`);
  };

  const formatLastSync = (lastSync: string | undefined): string => {
    if (!lastSync) return 'Never synced';
    
    // If it's a relative time string (like "2 hours ago"), return as-is
    if (lastSync.includes('ago') || lastSync === 'Just now') {
      return lastSync;
    }
    
    // If it's an ISO date string, format it
    try {
      const date = new Date(lastSync);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
      
      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
    } catch {
      return lastSync;
    }
  };

  return (
    <DashboardSection 
      title="Connected Platforms"
      actionText={connections.length > 0 ? "Manage" : undefined}
      onAction={() => navigate('/connections')}
    >
      {connections.length === 0 ? (
        // Empty State
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 text-gray-300 mb-4">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-full h-full">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Platforms Connected
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Connect to Monday.com, Jira, or TROFOS to start generating automated reports from your project data.
          </p>
          <button
            onClick={() => navigate('/connections')}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Plus size={20} className="mr-2" />
            Connect Your First Platform
          </button>
        </div>
      ) : (
        // Connected Platforms Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connections.map(connection => {
            const platformInfo = getPlatformInfo(connection.platform);
            const statusInfo = getStatusInfo(connection.status);
            
            return (
              <div 
                key={connection.id}
                className={`relative bg-white border-2 ${platformInfo.borderColor} rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer group ${platformInfo.lightColor}`}
                onClick={() => navigate('/connections')}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center flex-1 min-w-0">
                    <div className={`w-12 h-12 ${platformInfo.color} rounded-lg flex items-center justify-center text-white text-xl mr-3 flex-shrink-0`}>
                      {platformInfo.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate" title={connection.name}>
                        {connection.name}
                      </h3>
                      <p className="text-sm text-gray-500">{platformInfo.name}</p>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleSync(connection.id, e)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Sync Now"
                    >
                      <RefreshCw size={14} />
                    </button>
                    <button
                      onClick={(e) => handleManageConnection(connection.id, e)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded transition-colors"
                      title="Manage Connection"
                    >
                      <Settings size={14} />
                    </button>
                  </div>
                </div>

                {/* Status & Info */}
                <div className="space-y-3">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center px-2.5 py-1 rounded-full ${statusInfo.bgColor}`}>
                      <div className={`w-2 h-2 ${statusInfo.dotColor} rounded-full mr-2`}></div>
                      <span className={`text-xs font-medium ${statusInfo.textColor}`}>
                        {statusInfo.text}
                      </span>
                    </div>
                    
                    {connection.projectCount !== undefined && (
                      <span className="text-sm font-medium text-gray-700">
                        {connection.projectCount} project{connection.projectCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Last Sync */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Last synced:</span>
                    <span className="font-medium">{formatLastSync(connection.lastSync)}</span>
                  </div>

                  {/* Quick Actions Bar */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                    <button
                      onClick={(e) => handleSync(connection.id, e)}
                      className="flex items-center text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      <RefreshCw size={12} className="mr-1" />
                      Sync Now
                    </button>
                    
                    <div className="flex items-center text-xs text-gray-400">
                      <ExternalLink size={12} className="mr-1" />
                      <span>View Details</span>
                    </div>
                  </div>
                </div>

                {/* Connection Status Indicator */}
                {connection.status === 'error' && (
                  <div className="absolute top-2 right-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Add New Platform Card */}
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center text-center hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all min-h-[160px] group"
            onClick={() => navigate('/connections')}
          >
            <div className="w-12 h-12 bg-blue-100 group-hover:bg-blue-200 rounded-lg flex items-center justify-center mb-3 transition-colors">
              <Plus size={24} className="text-blue-600" />
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Add Platform</h3>
            <p className="text-sm text-gray-500 mb-2">Connect to Monday.com, Jira, or TROFOS</p>
            <div className="flex items-center text-xs text-blue-600 group-hover:text-blue-700 font-medium">
              <span>Get Started</span>
              <ExternalLink size={12} className="ml-1" />
            </div>
          </div>
        </div>
      )}

      {/* Summary Footer */}
      {connections.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4 text-gray-600">
              <span>
                <strong className="text-gray-900">{connections.length}</strong> platform{connections.length !== 1 ? 's' : ''} connected
              </span>
              <span>•</span>
              <span>
                <strong className="text-gray-900">
                  {connections.reduce((sum, conn) => sum + (conn.projectCount || 0), 0)}
                </strong> total projects
              </span>
            </div>
            
            <button
              onClick={() => navigate('/connections')}
              className="flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Manage Connections
              <ExternalLink size={14} className="ml-1" />
            </button>
          </div>
        </div>
      )}
    </DashboardSection>
  );
};

export default ConnectedPlatforms;