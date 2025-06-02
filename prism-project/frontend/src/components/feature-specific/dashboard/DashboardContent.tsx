import React from 'react';
import StatCard from './StatCard';
import { useNavigate } from 'react-router-dom';
import DashboardSection from './DashboardSection';
import RecentReports from '../reports/RecentReports';
import QuickActions from './QuickActions';
import ConnectedPlatforms from './ConnectedPlatforms';
import { useConnections } from '../../../contexts/ConnectionsContext';

const DashboardContent: React.FC = () => {
  const navigate = useNavigate();
  const { connections } = useConnections();

  // Calculate stats based on connections
  const connectedPlatformsCount = connections.filter(conn => conn.status === 'connected').length;
  
  const stats = [
    { title: 'Reports Generated', value: 12, icon: 'FileText' },
    { title: 'Templates Available', value: 8, icon: 'Layout' },
    { title: 'Platform Connections', value: connectedPlatformsCount, icon: 'Link' }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner with CTA */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-6 text-white">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome to PRISM</h1>
            <p className="mb-4">Transform your project data into professional PowerPoint presentations</p>
          </div>
          <button 
            onClick={() => navigate('/reports/create')}
            className="bg-white text-blue-800 px-6 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
          >
            Create Report
          </button>
        </div>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <StatCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} />
        ))}
      </div>
      
      {/* Quick Actions */}
      <QuickActions />
      
      {/* Recent Reports */}
      <RecentReports limit={3} />
      
      {/* Connected Platforms */}
      <ConnectedPlatforms />
    </div>
  );
};

export default DashboardContent;