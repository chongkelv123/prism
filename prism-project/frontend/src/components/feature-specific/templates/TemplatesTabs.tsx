import React from 'react';

export type TemplatesTabType = 'default' | 'custom';

interface TemplatesTabsProps {
  activeTab: TemplatesTabType;
  onTabChange: (tab: TemplatesTabType) => void;
}

const TemplatesTabs: React.FC<TemplatesTabsProps> = ({ activeTab, onTabChange }) => (
  <div className="mb-6 border-b border-gray-200">
    <div className="flex space-x-8">
      <button
        className={`pb-4 ${
          activeTab === 'default'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => onTabChange('default')}
      >
        Default Templates
      </button>
      <button
        className={`pb-4 ${
          activeTab === 'custom'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => onTabChange('custom')}
      >
        Custom Templates
      </button>
    </div>
  </div>
);

export default TemplatesTabs;