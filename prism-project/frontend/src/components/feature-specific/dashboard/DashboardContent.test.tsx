// frontend/src/components/feature-specific/dashboard/DashboardContent.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, TrendingUp, Clock, Users, Zap } from 'lucide-react';
import StatCard from './StatCard';
import DashboardSection from './DashboardSection';
import RecentReports from '../reports/RecentReports';
import QuickActions from './QuickActions';
import ConnectedPlatforms from './ConnectedPlatforms';
import { useConnections } from '../../../contexts/ConnectionsContext';
import { useAuth } from '../../../contexts/AuthContext';

const DashboardContent: React.FC = () => {
  const navigate = useNavigate();
  
  // Safe context usage with error handling
  let connections = [];
  let user = null;
  
  try {
    const connectionsContext = useConnections();
    connections = connectionsContext.connections;
  } catch (error) {
    console.warn('ConnectionsContext not available, using empty connections array');
  }
  
  try {
    const authContext = useAuth();
    user = authContext.user;
  } catch (error) {
    console.warn('AuthContext not available, using null user');
  }

  // Calculate statistics
  const connectedPlatforms = connections.filter(conn => conn.status === 'connected');
  const totalProjects = connections.reduce((sum, conn) => sum + (conn.projectCount || 0), 0);
  
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
      value: connectedPlatforms.length, 
      icon: 'Link',
      trend: `${totalProjects} projects`,
      trendUp: connections.length > 0 ? true : null
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
          
          {/* Recent Activity */}
          <DashboardSection title="Recent Activity">
            <div className="space-y-4">
              {/* Activity Items */}
              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Sprint Review Report</span> was generated from Jira
                  </p>
                  <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp size={16} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">Monday.com</span> connection synced successfully
                  </p>
                  <p className="text-xs text-gray-500 mt-1">1 day ago</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users size={16} className="text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    New team member <span className="font-medium">Bryan Limasarian</span> joined
                  </p>
                  <p className="text-xs text-gray-500 mt-1">3 days ago</p>
                </div>
              </div>
              
              {/* Show more link */}
              <div className="text-center pt-2">
                <button 
                  onClick={() => navigate('/activity')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View all activity
                </button>
              </div>
            </div>
          </DashboardSection>
        </div>
        
        {/* Right Column - Takes 1/3 width on xl screens */}
        <div className="space-y-8">
          {/* Connected Platforms */}
          <ConnectedPlatforms connections={connections} />
          
          {/* Tips & Insights */}
          <DashboardSection title="Tips & Insights">
            <div className="space-y-4">
              {connections.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Plus size={24} className="text-blue-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Get Started</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Connect your first platform to start generating automated reports.
                  </p>
                  <button
                    onClick={() => navigate('/connections')}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Connect a Platform →
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-medium text-blue-900 mb-2">💡 Pro Tip</h3>
                    <p className="text-sm text-blue-800">
                      Schedule automatic report generation to save time and ensure stakeholders always have the latest updates.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-medium text-green-900 mb-2">📊 Data Quality</h3>
                    <p className="text-sm text-green-800">
                      Your connected platforms are syncing well! Consider adding more data sources for comprehensive reporting.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h3 className="font-medium text-purple-900 mb-2">🎨 Templates</h3>
                    <p className="text-sm text-purple-800">
                      Create custom templates to match your organization's branding and reporting standards.
                    </p>
                    <button
                      onClick={() => navigate('/templates')}
                      className="text-sm text-purple-600 hover:text-purple-800 font-medium mt-2 block"
                    >
                      Explore Templates →
                    </button>
                  </div>
                </>
              )}
            </div>
          </DashboardSection>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Need Help Getting Started?</h3>
            <p className="text-gray-600 text-sm">
              Check out our documentation and video tutorials to make the most of PRISM.
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <button className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors">
              Documentation
            </button>
            <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors">
              Watch Tutorial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
            </div>
          </DashboardSection>
        </div>
        
        {/* Right Column - Takes 1/3 width on xl screens */}
        <div className="space-y-8">
          {/* Connected Platforms */}
          <ConnectedPlatforms connections={connections} />
          
          {/* Tips & Insights */}
          <DashboardSection title="Tips & Insights">
            <div className="space-y-4">
              {connections.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Plus size={24} className="text-blue-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Get Started</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Connect your first platform to start generating automated reports.
                  </p>
                  <button
                    onClick={() => navigate('/connections')}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Connect a Platform →
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-medium text-blue-900 mb-2">💡 Pro Tip</h3>
                    <p className="text-sm text-blue-800">
                      Schedule automatic report generation to save time and ensure stakeholders always have the latest updates.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-medium text-green-900 mb-2">📊 Data Quality</h3>
                    <p className="text-sm text-green-800">
                      Your connected platforms are syncing well! Consider adding more data sources for comprehensive reporting.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h3 className="font-medium text-purple-900 mb-2">🎨 Templates</h3>
                    <p className="text-sm text-purple-800">
                      Create custom templates to match your organization's branding and reporting standards.
                    </p>
                    <button
                      onClick={() => navigate('/templates')}
                      className="text-sm text-purple-600 hover:text-purple-800 font-medium mt-2 block"
                    >
                      Explore Templates →
                    </button>
                  </div>
                </>
              )}
            </div>
          </DashboardSection>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Need Help Getting Started?</h3>
            <p className="text-gray-600 text-sm">
              Check out our documentation and video tutorials to make the most of PRISM.
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <button className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors">
              Documentation
            </button>
            <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors">
              Watch Tutorial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;</div>
          </DashboardSection>
        </div>
        
        {/* Right Column - Takes 1/3 width on xl screens */}
        <div className="space-y-8">
          {/* Connected Platforms */}
          <ConnectedPlatforms connections={connections} />
          
          {/* Tips & Insights */}
          <DashboardSection title="Tips & Insights">
            <div className="space-y-4">
              {connections.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Plus size={24} className="text-blue-600" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">Get Started</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Connect your first platform to start generating automated reports.
                  </p>
                  <button
                    onClick={() => navigate('/connections')}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Connect a Platform →
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="font-medium text-blue-900 mb-2">💡 Pro Tip</h3>
                    <p className="text-sm text-blue-800">
                      Schedule automatic report generation to save time and ensure stakeholders always have the latest updates.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-medium text-green-900 mb-2">📊 Data Quality</h3>
                    <p className="text-sm text-green-800">
                      Your connected platforms are syncing well! Consider adding more data sources for comprehensive reporting.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h3 className="font-medium text-purple-900 mb-2">🎨 Templates</h3>
                    <p className="text-sm text-purple-800">
                      Create custom templates to match your organization's branding and reporting standards.
                    </p>
                    <button
                      onClick={() => navigate('/templates')}
                      className="text-sm text-purple-600 hover:text-purple-800 font-medium mt-2 block"
                    >
                      Explore Templates →
                    </button>
                  </div>
                </>
              )}
            </div>
          </DashboardSection>
        </div>
      </div>
      
      {/* Footer Info */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Need Help Getting Started?</h3>
            <p className="text-gray-600 text-sm">
              Check out our documentation and video tutorials to make the most of PRISM.
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 md:mt-0">
            <button className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors">
              Documentation
            </button>
            <button className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors">
              Watch Tutorial
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;