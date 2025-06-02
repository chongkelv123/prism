// frontend/src/components/feature-specific/connections/ConnectionsHeader.tsx
import React from 'react';
import { Plus } from 'lucide-react';

interface ConnectionsHeaderProps {
  onAddConnection: () => void;
}

const ConnectionsHeader: React.FC<ConnectionsHeaderProps> = ({ onAddConnection }) => (
  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Platform Connections</h1>
      <p className="text-gray-600 mt-1">
        Connect to Monday.com, Jira, and TROFOS to sync your project data
      </p>
    </div>
    
    <button 
      onClick={onAddConnection}
      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      <Plus size={20} className="mr-2" />
      Add Connection
    </button>
  </div>
);

export default ConnectionsHeader;