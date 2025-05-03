import React from 'react';
import { Plus } from 'lucide-react';

interface TemplatesEmptyStateProps {
  onCreateTemplate: () => void;
}

const TemplatesEmptyState: React.FC<TemplatesEmptyStateProps> = ({ onCreateTemplate }) => (
  <div className="text-center py-8">
    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
      <Plus size={24} className="text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">No custom templates yet</h3>
    <p className="text-gray-500 mb-4">Create your first custom template to get started.</p>
    <button 
      onClick={onCreateTemplate}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Create Template
    </button>
  </div>
);

export default TemplatesEmptyState;