// frontend/src/pages/CreateReportPage.tsx - FIXED VERSION (Internal ConnectionsProvider)
import React from 'react';
import { ConnectionsProvider } from '../contexts/ConnectionsContext';
import MainLayout from '../components/layout/MainLayout';
import ReportWizard from '../components/feature-specific/reports/ReportWizard';
import ServiceAvailabilityBanner from '../components/common/ServiceAvailabilityBanner';

// Internal component that uses ConnectionsContext
const CreateReportPageContent: React.FC = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Service Availability Banner */}
        <ServiceAvailabilityBanner />
        
        <div className="py-6">
          <ReportWizard />
        </div>
      </div>
    </MainLayout>
  );
};

// Main component that provides ConnectionsProvider only when needed
const CreateReportPage: React.FC = () => {
  console.log('🔄 CreateReportPage: Rendering with internal ConnectionsProvider');
  
  return (
    <ConnectionsProvider>
      <CreateReportPageContent />
    </ConnectionsProvider>
  );
};

export default CreateReportPage;