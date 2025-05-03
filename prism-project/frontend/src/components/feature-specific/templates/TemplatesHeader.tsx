import React from 'react';

interface TemplatesHeaderProps {
  onCreateTemplate: () => void;
}

const TemplatesHeader: React.FC<TemplatesHeaderProps> = ({ onCreateTemplate }) => (
  <div className="flex justify-between items-center mb-6">
    <h1 className="text-2xl font-bold text-gray-900">PowerPoint Templates</h1>
    <button 
      onClick={onCreateTemplate}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Create New Template
    </button>
  </div>
);

export default TemplatesHeader;