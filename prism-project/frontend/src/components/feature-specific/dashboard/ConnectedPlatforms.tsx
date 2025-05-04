import React from 'react';
import { Link, Plus } from 'lucide-react';
import DashboardSection from './DashboardSection';

const ConnectedPlatforms: React.FC = () => {
  // Mock data for connected platforms
  const platforms = [
    { id: 'monday-1', name: 'Monday.com', type: 'monday', projects: 3, lastSync: '2 hours ago' },
    { id: 'jira-1', name: 'Jira Cloud', type: 'jira', projects: 2, lastSync: '1 day ago' }
  ];

  return (
    <DashboardSection title="Connected Platforms">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {platforms.map(platform => (
          <div 
            key={platform.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center">
                {platform.type === 'monday' && (
                  <span className="text-2xl mr-2">📊</span>
                )}
                {platform.type === 'jira' && (
                  <span className="text-2xl mr-2">🔄</span>
                )}
                {platform.type === 'trofos' && (
                  <span className="text-2xl mr-2">📈</span>
                )}
                <h3 className="font-medium">{platform.name}</h3>
              </div>
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Connected</span>
            </div>
            <div className="text-sm text-gray-500">
              <p className="mb-1">{platform.projects} projects</p>
              <p>Last synced: {platform.lastSync}</p>
            </div>
            <div className="flex justify-end mt-3">
              <button className="text-sm text-blue-600 hover:text-blue-800">Sync Now</button>
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