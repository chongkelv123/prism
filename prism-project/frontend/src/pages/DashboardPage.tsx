import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import DashboardContent from '../components/feature-specific/dashboard/DashboardContent';

const DashboardPage: React.FC = () => {
  return (
    <MainLayout>
      <DashboardContent />
    </MainLayout>
  );
};

export default DashboardPage;