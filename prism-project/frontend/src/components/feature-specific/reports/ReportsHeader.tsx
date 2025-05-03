import React from 'react';

interface ReportsHeaderProps {
  onGenerateReport: () => void;
}

const ReportsHeader: React.FC<ReportsHeaderProps> = ({ onGenerateReport }) => (
  <div className="flex justify-between items-center mb-6">
    <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
    <button 
      onClick={onGenerateReport}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Generate New Report
    </button>
  </div>
);

export default ReportsHeader;