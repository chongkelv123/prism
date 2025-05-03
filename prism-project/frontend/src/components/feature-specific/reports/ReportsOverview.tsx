import React from 'react';
import StatCard from '../../feature-specific/dashboard/StatCard';

export interface ReportStat {
  title: string;
  value: number;
}

interface ReportsOverviewProps {
  stats: ReportStat[];
}

const ReportsOverview: React.FC<ReportsOverviewProps> = ({ stats }) => (
  <div className="mb-8">
    <h2 className="text-lg font-medium text-gray-900 mb-4">Reports Overview</h2>
    <div className="grid grid-cols-3 gap-6">
      {stats.map((stat) => (
        <StatCard key={stat.title} title={stat.title} value={stat.value} />
      ))}
    </div>
  </div>
);

export default ReportsOverview;