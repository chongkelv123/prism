// frontend/src/pages/CreateReportPage.tsx - FIXED VERSION (No ConnectionsProvider)
import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import ReportWizard from '../components/feature-specific/reports/ReportWizard';
import ServiceAvailabilityBanner from '../components/common/ServiceAvailabilityBanner';

// Main component that uses shared ConnectionsContext from router
const CreateReportPage: React.FC = () => {
  console.log('CreateReportPage: Using shared ConnectionsProvider from router');
  
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Service Availability Banner */}
        <ServiceAvailabilityBanner />
        
        <div className="py-6">
          <ReportWizard />
        </div>
        
        {/* Debug Info to verify shared context */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-green-700 mb-2">
            Report Creation Status
          </h3>
          <div className="text-xs text-green-600">
            <p>Using shared ConnectionsContext from router</p>
            <p>Connections should now persist when navigating between pages</p>
            <p>Report Wizard will show all connected platforms</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default CreateReportPage;