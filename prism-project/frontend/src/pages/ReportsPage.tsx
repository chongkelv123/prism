//frontend/src/pages/ReportsPage.tsx

import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import ReportsHeader from '../components/feature-specific/reports/ReportsHeader';
import ReportsOverview from '../components/feature-specific/reports/ReportsOverview';
import ReportsTabs, { ReportsTabType } from '../components/feature-specific/reports/ReportsTabs';
import ReportsList from '../components/feature-specific/reports/ReportsList';
import { useReports } from '../hooks/useReports'; // NEW IMPORT - Use live data
import { useNavigate } from 'react-router-dom';

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ReportsTabType>('recent');
  
  // REPLACE hardcoded data with live data from API
  const { reports, stats, loading, error } = useReports();
  
  const handleGenerateReport = () => {
    navigate('/reports/create');
  };

  // Transform stats for ReportsOverview component (StatCard expects numbers)
  const overviewStats = [
    { title: 'Generated Reports', value: loading ? 0 : stats.generated },
    { title: 'Scheduled Reports', value: loading ? 0 : stats.scheduled },
    { title: 'Shared Reports', value: loading ? 0 : stats.shared }
  ];

  // Filter reports based on active tab
  const filteredReports = activeTab === 'recent' 
    ? reports.slice(0, 10)  // Show last 10 for recent
    : reports;              // Show all for 'all' tab
  
  return (
    <MainLayout>
      {/* Success Banner when data loads */}
      {!loading && !error && reports.length > 0 && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Reports Data Connected!</h3>
              <p className="mt-1 text-sm text-green-700">
                Successfully loaded {reports.length} reports from your database
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Failed to Load Reports</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <p className="mt-1 text-xs text-red-600">Check console for details</p>
            </div>
          </div>
        </div>
      )}

      <ReportsHeader onGenerateReport={handleGenerateReport} />
      <ReportsOverview stats={overviewStats} />
      <ReportsTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <ReportsList 
        reports={filteredReports}
        isLoading={loading}
        activeTab={activeTab} 
        onGenerateReport={handleGenerateReport} 
      />
    </MainLayout>
  );
};

export default ReportsPage;