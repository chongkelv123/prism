import React from 'react';

export type ReportsTabType = 'recent' | 'all';

interface ReportsTabsProps {
  activeTab: ReportsTabType;
  onTabChange: (tab: ReportsTabType) => void;
}

const ReportsTabs: React.FC<ReportsTabsProps> = ({ activeTab, onTabChange }) => (
  <div className="mb-6 border-b border-gray-200">
    <div className="flex space-x-8">
      <button
        className={`pb-4 ${
          activeTab === 'recent'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => onTabChange('recent')}
      >
        Recent Reports
      </button>
      <button
        className={`pb-4 ${
          activeTab === 'all'
            ? 'border-b-2 border-blue-600 text-blue-600'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => onTabChange('all')}
      >
        All Reports
      </button>
    </div>
  </div>
);

export default ReportsTabs;