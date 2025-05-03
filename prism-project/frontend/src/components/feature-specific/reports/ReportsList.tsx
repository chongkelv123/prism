import React from 'react';
import DashboardSection from '../../feature-specific/dashboard/DashboardSection';
import ReportsEmptyState from './ReportsEmptyState';

export interface Report {
  id: string;
  title: string;
  createdAt: string;
  status: 'completed' | 'processing' | 'failed';
  source: 'monday' | 'jira' | 'trofos';
}

interface ReportsListProps {
  reports: Report[];
  isLoading: boolean;
  activeTab: 'recent' | 'all';
  onGenerateReport: () => void;
}

const ReportsList: React.FC<ReportsListProps> = ({
  reports,
  isLoading,
  activeTab,
  onGenerateReport
}) => {
  const title = activeTab === 'recent' ? 'Recent Reports' : 'All Reports';

  if (isLoading) {
    return (
      <DashboardSection title={title}>
        <div className="flex justify-center py-8">
          <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
        </div>
      </DashboardSection>
    );
  }

  if (reports.length === 0) {
    return (
      <DashboardSection title={title}>
        <ReportsEmptyState onGenerateReport={onGenerateReport} />
      </DashboardSection>
    );
  }

  return (
    <DashboardSection title={title}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map((report) => (
              <tr key={report.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{report.title}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{report.createdAt}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 capitalize">{report.source}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${
                      report.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : report.status === 'processing'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {report.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-blue-600 hover:text-blue-900">View</button>
                  <button className="ml-4 text-blue-600 hover:text-blue-900">Download</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardSection>
  );
};

export default ReportsList;