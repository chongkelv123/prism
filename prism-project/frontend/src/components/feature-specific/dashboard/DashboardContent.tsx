// frontend/src/components/feature-specific/dashboard/DashboardContent.tsx

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, TrendingUp, Clock, Users, Zap } from 'lucide-react';
import StatCard from './StatCard';
import DashboardSection from './DashboardSection';
import RecentReports from '../reports/RecentReports';
import QuickActions from './QuickActions';
import { useAuth } from '../../../contexts/AuthContext';
import { useDashboardStats } from '../../../hooks/useDashboardStats'; // NEW IMPORT

const DashboardContent: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // USE LIVE DATA instead of static values
  const { 
    reportsGenerated, 
    templatesAvailable, 
    platformConnections, 
    recentReports,
    loading, 
    error 
  } = useDashboardStats();

  // Dynamic stats using REAL DATA
  const stats = [
    { 
      title: 'Reports Generated', 
      value: loading ? '...' : reportsGenerated, // LIVE DATA!
      icon: 'FileText',
      trend: loading ? 'Loading...' : `${reportsGenerated} total`,
      trendUp: reportsGenerated > 0
    },
    { 
      title: 'Templates Available', 
      value: templatesAvailable, 
      icon: 'Layout',
      trend: '',
      trendUp: null
    },
    { 
      title: 'Platform Connections', 
      value: loading ? '...' : platformConnections, // LIVE DATA!
      icon: 'Link',
      trend: platformConnections > 0 ? `${platformConnections} active` : 'Connect platforms',
      trendUp: platformConnections > 0 ? true : null
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
      {/* Success Banner - Show when data loads successfully */}
      {!loading && !error && reportsGenerated > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Live Data Connected!</h3>
              <p className="mt-1 text-sm text-green-700">
                Dashboard is now showing live data: {reportsGenerated} reports found
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Dashboard Data Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <p className="mt-1 text-xs text-red-600">Check console for details. Some data may be cached.</p>
            </div>
          </div>
        </div>
      )}

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
              {getWelcomeMessage()}, {getUserName()}!
            </h1>
            <p className="text-blue-100 text-lg">
              {loading 
                ? 'Loading your dashboard...' 
                : error 
                  ? 'Some issues loading data, but here\'s what we have'
                  : `You have ${reportsGenerated} reports generated across ${platformConnections} platforms`
              }
            </p>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={() => navigate('/reports/create')}
              className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-colors flex items-center space-x-2"
            >
              <Plus size={20} />
              <span>Generate Report</span>
            </button>
            
            <button
              onClick={() => navigate('/connections')}
              className="bg-blue-500 bg-opacity-20 backdrop-blur text-white px-6 py-3 rounded-xl font-semibold hover:bg-opacity-30 transition-all border border-blue-300 border-opacity-30"
            >
              Connect Platform
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards with LIVE DATA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon as any}
            trend={stat.trend}
            trendUp={stat.trendUp}
          />
        ))}
      </div>
      
      {/* Quick Actions */}
      <QuickActions />
      
      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Takes 2/3 width on xl screens */}
        <div className="xl:col-span-2 space-y-8">
          {/* Recent Reports with LIVE DATA */}
          <DashboardSection 
            title="Recent Reports"
            actionText="View All"
            onAction={() => navigate('/reports')}
          >
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
              </div>
            ) : recentReports.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 mb-2">No reports generated yet</p>
                <button 
                  onClick={() => navigate('/reports/create')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Your First Report
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentReports.slice(0, 5).map((report, index) => (
                  <div 
                    key={report.id || index}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {report.title || report.name || `Report ${index + 1}`}
                        </h3>
                        <div className="flex items-center text-sm text-gray-500 mt-1">
                          <span>
                            Generated {report.createdAt 
                              ? new Date(report.createdAt).toLocaleDateString() 
                              : 'recently'
                            }
                          </span>
                          {report.platform && (
                            <>
                              <span className="mx-2">•</span>
                              <span>{report.platform}</span>
                            </>
                          )}
                          {report.status && (
                            <>
                              <span className="mx-2">•</span>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                report.status === 'completed' ? 'bg-green-100 text-green-800' :
                                report.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {report.status}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100"
                          title="View Report"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                        <button 
                          className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100"
                          title="Download Report"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7,10 12,15 17,10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashboardSection>
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
                <h3 className="font-medium text-gray-900 mb-2">
                  {platformConnections === 0 ? 'Connect Your First Platform' : 'Generate More Reports'}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {platformConnections === 0 
                    ? 'Start by connecting to Monday.com, Jira, or TROFOS to begin generating automated reports.'
                    : `You have ${platformConnections} platforms connected. Generate more reports from your project data.`
                  }
                </p>
                <button
                  onClick={() => navigate(platformConnections === 0 ? '/connections' : '/reports/create')}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {platformConnections === 0 ? 'Connect a Platform →' : 'Generate Report →'}
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