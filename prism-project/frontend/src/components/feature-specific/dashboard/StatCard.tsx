import React from 'react';

interface StatCardProps {
  title: string;
  value: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm">
    <h3 className="text-gray-500 text-sm">{title}</h3>
    <p className="text-2xl font-semibold mt-1">{value}</p>
  </div>
);

export default StatCard;