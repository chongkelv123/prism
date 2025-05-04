import React from 'react';
import { FileText, Layout, Link } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
  // Determine which icon to use
  const getIcon = () => {
    switch (icon) {
      case 'FileText':
        return <FileText size={24} className="text-blue-500" />;
      case 'Layout':
        return <Layout size={24} className="text-blue-500" />;
      case 'Link':
        return <Link size={24} className="text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-gray-500 text-sm">{title}</h3>
        {icon && getIcon()}
      </div>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
};

export default StatCard;