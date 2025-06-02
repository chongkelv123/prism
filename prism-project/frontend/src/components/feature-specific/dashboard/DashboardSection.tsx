import React from 'react';

interface DashboardSectionProps {
  title: string;
  children?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

const DashboardSection: React.FC<DashboardSectionProps> = ({ 
  title, 
  children, 
  actionText, 
  onAction 
}) => (
  <div className="bg-white rounded-lg shadow-sm mb-8">
    <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
      <h2 className="text-lg font-medium">{title}</h2>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {actionText}
        </button>
      )}
    </div>
    <div className="p-6">
      {children || (
        <div className="text-center text-gray-500">
          No data
        </div>
      )}
    </div>
  </div>
);

export default DashboardSection;