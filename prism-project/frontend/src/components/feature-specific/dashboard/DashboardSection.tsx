import React from 'react';

interface DashboardSectionProps {
  title: string;
  children?: React.ReactNode;
}

const DashboardSection: React.FC<DashboardSectionProps> = ({ title, children }) => (
  <div className="bg-white rounded-lg shadow-sm mb-8">
    <div className="px-6 py-4 border-b border-gray-200">
      <h2 className="text-lg font-medium">{title}</h2>
    </div>
    <div className="p-6 text-center text-gray-500">
      {children || "No data"}
    </div>
  </div>
);

export default DashboardSection;