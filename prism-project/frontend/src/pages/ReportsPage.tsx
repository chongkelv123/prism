import React, { useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import ReportsHeader from '../components/feature-specific/reports/ReportsHeader';
import ReportsOverview from '../components/feature-specific/reports/ReportsOverview';
import ReportsTabs, { ReportsTabType } from '../components/feature-specific/reports/ReportsTabs';
import ReportsList, { Report } from '../components/feature-specific/reports/ReportsList';

const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportsTabType>('recent');
  
  // Example stats data - in a real app, this would come from an API
  const stats = [
    { title: 'Generated Reports', value: 0 },
    { title: 'Scheduled Reports', value: 0 },
    { title: 'Shared Reports', value: 0 }
  ];
  
  // Example reports data - in a real app, this would come from an API
  const reports: Report[] = [];
  const isLoading = false;
  
  const handleGenerateReport = () => {
    // In a real app, this would open a report generation modal or navigate to a form
    console.log('Generate report clicked');
  };
  
  return (
    <MainLayout>
      <ReportsHeader onGenerateReport={handleGenerateReport} />
      <ReportsOverview stats={stats} />
      <ReportsTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <ReportsList 
        reports={reports} 
        isLoading={isLoading} 
        activeTab={activeTab} 
        onGenerateReport={handleGenerateReport} 
      />
    </MainLayout>
  );
};

export default ReportsPage;