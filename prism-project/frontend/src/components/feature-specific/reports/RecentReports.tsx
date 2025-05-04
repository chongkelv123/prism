import React from 'react';
import { FileText, Download, Eye } from 'lucide-react';
import DashboardSection from '../dashboard/DashboardSection';
import { useNavigate } from 'react-router-dom';

interface RecentReportsProps {
  limit?: number;
}

const RecentReports: React.FC<RecentReportsProps> = ({ limit = 3 }) => {
  const navigate = useNavigate();
  
  // Mock data for recent reports
  const reports = [
    { 
      id: 'report-1', 
      title: 'Sprint Review - May 2025', 
      createdAt: '2 hours ago',
      platform: 'Monday.com',
      status: 'completed'
    },
    { 
      id: 'report-2', 
      title: 'Project Status Report', 
      createdAt: '1 day ago',
      platform: 'Jira',
      status: 'completed'
    },
    { 
      id: 'report-3', 
      title: 'Resource Allocation Q2', 
      createdAt: '3 days ago',
      platform: 'TROFOS',
      status: 'completed'
    }
  ];

  // Show only the limited number of reports
  const displayedReports = reports.slice(0, limit);

  return (
    <DashboardSection 
      title="Recent Reports"
      actionText="View All"
      onAction={() => navigate('/reports')}
    >
      {displayedReports.length === 0 ? (
        <div className="text-center py-8">
          <FileText size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-2">No reports generated yet</p>
          <button 
            onClick={() => navigate('/reports/create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Your First Report
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedReports.map(report => (
            <div 
              key={report.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{report.title}</h3>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <span>Generated {report.createdAt}</span>
                    <span className="mx-2">•</span>
                    <span>{report.platform}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100"
                    title="View Report"
                  >
                    <Eye size={18} />
                  </button>
                  <button 
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-gray-100"
                    title="Download Report"
                  >
                    <Download size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardSection>
  );
};

export default RecentReports;