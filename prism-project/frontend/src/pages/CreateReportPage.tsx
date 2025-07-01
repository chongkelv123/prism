// frontend/src/pages/CreateReportPage.tsx - FIXED VERSION (No ConnectionsProvider)
import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import ReportWizard from '../components/feature-specific/reports/ReportWizard';
import ServiceAvailabilityBanner from '../components/common/ServiceAvailabilityBanner';

const SHOW_DEBUG_PANEL = false; // Set to true to enable debug panel

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
        {SHOW_DEBUG_PANEL && (
          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Debug Information
            </h3>
            <div className="text-xs text-gray-600">
              <p>Using shared ConnectionsContext from router</p>
              <p>Connections should now persist when navigating between pages</p>
              <p>Report Wizard will show all connected platforms</p>
            </div>
          </div>
        )}                
      </div>
    </MainLayout>
  );
};

export default CreateReportPage;