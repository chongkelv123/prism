// frontend/src/components/feature-specific/dashboard/DashboardContent.tsx - IMPROVED VERSION
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, TrendingUp, Clock, Users, Zap } from 'lucide-react';
import StatCard from './StatCard';
import DashboardSection from './DashboardSection';
import RecentReports from '../reports/RecentReports';
import QuickActions from './QuickActions';
import { useAuth } from '../../../contexts/AuthContext';

const DashboardContent: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Static stats for now (no connections required)
  const stats = [
    { 
      title: 'Reports Generated', 
      value: 12, 
      icon: 'FileText',
      trend: '+2 this week',
      trendUp: true
    },
    { 
      title: 'Templates Available', 
      value: 8, 
      icon: 'Layout',
      trend: '3 custom',
      trendUp: null
    },
    { 
      title: 'Platform Connections', 
      value: 0, // Will be updated when connections are available
      icon: 'Link',
      trend: 'Connect platforms',
      trendUp: null
    }
  ];

  // Welcome message based on time of day
  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get user's first name or fallback
  const getUserName = () => {
    if (user?.firstName) return user.firstName;
    if (user?.name) return user.name.split(' ')[0];
    return 'there';
  };

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 text-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='27' cy='7' r='1'/%3E%3Ccircle cx='47' cy='7' r='1'/%3E%3Ccircle cx='7' cy='27' r='1'/%3E%3Ccircle cx='27' cy='27' r='1'/%3E%3Ccircle cx='47' cy='27' r='1'/%3E%3Ccircle cx='7' cy='47' r='1'/%3E%3Ccircle cx='27' cy='47' r='1'/%3E%3Ccircle cx='47' cy='47' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-6 lg:mb-0">
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">
              {getWelcomeMessage()}, {getUserName()}! 👋
            </h1>
            <p className="text-xl text-blue-100 mb-4 max-w-2xl">
              Transform your project data into professional PowerPoint presentations with PRISM
            </p>
            <div className="flex flex-wrap gap-4 text-blue-100">
              <div className="flex items-center">
                <Zap size={16} className="mr-2" />
                <span className="text-sm">Automated Reports</span>
              </div>
              <div className="flex items-center">
                <TrendingUp size={16} className="mr-2" />
                <span className="text-sm">Real-time Sync</span>
              </div>
              <div className="flex items-center">
                <Users size={16} className="mr-2" />
                <span className="text-sm">Multi-platform Integration</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={() => navigate('/reports/create')}
              className="flex items-center justify-center px-6 py-3 bg-white text-blue-700 rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <FileText size={20} className="mr-2" />
              Create Report
            </button>
            <button 
              onClick={() => navigate('/connections')}
              className="flex items-center justify-center px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-400 transition-all border border-blue-400"
            >
              <Plus size={20} className="mr-2" />
              Add Platform
            </button>
          </div>
        </div>
      </div>
      
      {/* Statistics Overview */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
          <div className="flex items-center text-sm text-gray-500">
            <Clock size={16} className="mr-1" />
            <span>Updated just now</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <StatCard 
              key={stat.title} 
              title={stat.title} 
              value={stat.value} 
              icon={stat.icon}
              trend={stat.trend}
              trendUp={stat.trendUp}
            />
          ))}
        </div>
      </div>
      
      {/* Quick Actions */}
      <QuickActions />
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Takes 2/3 width on xl screens */}
        <div className="xl:col-span-2 space-y-8">
          {/* Recent Reports */}
          <RecentReports limit={5} />
          
          
        </div>
        
        {/* Right Column - Takes 1/3 width on xl screens */}
        <div className="space-y-8">
          {/* Getting Started */}
          <DashboardSection title="Getting Started">
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Plus size={24} className="text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900 mb-2">Connect Your First Platform</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Start by connecting to Monday.com, Jira, or TROFOS to begin generating automated reports.
                </p>
                <button
                  onClick={() => navigate('/connections')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Connect a Platform →
                </button>
              </div>
            </div>
          </DashboardSection>
                    
        </div>
      </div>
      
      
    </div>
  );
};

export default DashboardContent;