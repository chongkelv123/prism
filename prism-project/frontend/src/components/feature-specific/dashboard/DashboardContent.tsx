import React from 'react';
import StatCard from './StatCard';
import DashboardSection from './DashboardSection';

const DashboardContent: React.FC = () => {
  const stats = [
    { title: 'Active Sprints', value: 0 },
    { title: 'Outstanding Issues', value: 0 },
    { title: 'Unassigned Issues', value: 0 }
  ];

  return (
    <>
      {/* Overview Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Overview</h1>
        <div className="grid grid-cols-3 gap-6">
          {stats.map((stat) => (
            <StatCard key={stat.title} title={stat.title} value={stat.value} />
          ))}
        </div>
      </div>

      {/* My Projects Section */}
      <DashboardSection title="My Projects" />

      {/* Issues Section */}
      <DashboardSection title="Issues for me to do" />
    </>
  );
};

export default DashboardContent;