import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import ReportWizard from '../components/feature-specific/reports/ReportWizard';

const CreateReportPage: React.FC = () => {
  return (
    <MainLayout>
      <div className="py-6">
        <ReportWizard />
      </div>
    </MainLayout>
  );
};

export default CreateReportPage;