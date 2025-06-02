import React from 'react';
import { FileText, Layout, Link, TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon?: string;
  trend?: string;
  trendUp?: boolean | null;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendUp }) => {
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

  const getTrendColor = () => {
    if (trendUp === true) return 'text-green-600';
    if (trendUp === false) return 'text-red-600';
    return 'text-gray-500';
  };

  const getTrendIcon = () => {
    if (trendUp === true) return <TrendingUp size={12} className="text-green-600" />;
    if (trendUp === false) return <TrendingDown size={12} className="text-red-600" />;
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
        {icon && getIcon()}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className={`flex items-center mt-1 ${getTrendColor()}`}>
              {getTrendIcon()}
              <span className="text-xs font-medium ml-1">{trend}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;