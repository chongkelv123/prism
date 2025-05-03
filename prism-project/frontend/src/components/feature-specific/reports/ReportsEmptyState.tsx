import React from 'react';
import { FileText } from 'lucide-react';

interface ReportsEmptyStateProps {
  onGenerateReport: () => void;
}

const ReportsEmptyState: React.FC<ReportsEmptyStateProps> = ({ onGenerateReport }) => (
  <div className="text-center py-8">
    <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
      <FileText size={24} className="text-gray-400" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 mb-2">No reports available</h3>
    <p className="text-gray-500 mb-4">You haven't generated any reports yet.</p>
    <button 
      onClick={onGenerateReport}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Generate Your First Report
    </button>
  </div>
);

export default ReportsEmptyState;