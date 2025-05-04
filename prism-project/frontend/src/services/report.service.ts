// src/services/report.service.ts
import apiClient from './api.service';
import pptxgen from 'pptxgenjs';

export interface ReportGenerationRequest {
  platformId: string;
  templateId: string;
  configuration: Record<string, any>;
}

export interface Report {
  id: string;
  title: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  downloadUrl?: string;
  platform: string;
  template: string;
  configuration: Record<string, any>;
}

// Mock data for platform logos
const platformLogos = {
  monday: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI2IiB5PSI2IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmY3Mjc1IiByeD0iMiIvPjxyZWN0IHg9IjE0IiB5PSI2IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDBkMGQ5IiByeD0iMiIvPjxyZWN0IHg9IjYiIHk9IjE0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZjRiZTQ4IiByeD0iMiIvPjxyZWN0IHg9IjE0IiB5PSIxNCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iIzAwYjZkMCIgcng9IjIiLz48L3N2Zz4=',
  jira: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTEuNTcxIDEyLjU3Nkw4LjQ2OSA5LjQ3MkM3LjM2NSA4LjM2OCA3LjM2NSA2LjU3OSA4LjQ2OSA1LjQ3NUwxNC41MjcgMTEuNTMzQzE1LjYzMSAxMi42MzcgMTUuNjMxIDE0LjQyNSAxNC41MjcgMTUuNTNMOC40NjkgMjEuNTg4QzcuMzY1IDIwLjQ4NCA3LjM2NSAxOC42OTUgOC40NjkgMTcuNTkxTDExLjU3MSAxNC40ODcgMTEuNTcxIDEyLjU3NnoiIGZpbGw9IiMyNjg0RkYiLz48L3N2Zz4=',
  trofos: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptLTIgMTVsLTUtNSAxLjQxLTEuNDFMMTAgMTQuMTdsNy41OS03LjU5TDE5IDhsLTkgOXoiIGZpbGw9IiM1MWExZTQiLz48L3N2Zz4='
};

const reportService = {
  // Get all reports
  async getReports(): Promise<Report[]> {
    try {
      // Try to call the actual API if it exists
      const response = await apiClient.get('/api/reports');
      return response.data;
    } catch (error) {
      // Return mock data if API is not available
      console.log('Using mock data for reports');
      return [
        {
          id: 'report-1',
          title: 'Sprint Review - May 2025',
          status: 'completed',
          createdAt: '2025-05-02T10:30:00Z',
          completedAt: '2025-05-02T10:35:00Z',
          platform: 'monday',
          template: 'sprint-review',
          configuration: { includeMetrics: true }
        },
        {
          id: 'report-2',
          title: 'Project Status Report',
          status: 'completed',
          createdAt: '2025-05-01T14:20:00Z',
          completedAt: '2025-05-01T14:25:00Z',
          platform: 'jira',
          template: 'status-report',
          configuration: { includeTimeline: true }
        }
      ];
    }
  },
  
  // Generate a new report
  async generateReport(data: ReportGenerationRequest): Promise<Report> {
    try {
      // Use the actual API endpoint
      const response = await apiClient.post('/api/reports/generate', data);
      return response.data;
    } catch (error) {
      console.error('Error generating report:', error);
      // Fall back to mock data if API call fails
      return {
        id: `report-${Date.now()}`,
        title: data.configuration?.title || 'New Report',
        status: 'processing',
        createdAt: new Date().toISOString(),
        platform: data.platformId,
        template: data.templateId,
        configuration: data.configuration
      };
    }
  },
  
  // Check report generation status
  async getReportStatus(id: string): Promise<{ status: string, progress?: number }> {
    try {
      // Use the actual API endpoint
      const response = await apiClient.get(`/api/reports/${id}/status`);
      return response.data;
    } catch (error) {
      console.error('Error checking report status:', error);
      // Fall back to mock response if API call fails
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ status: 'completed', progress: 100 });
        }, 3000);
      });
    }
  },
  
  // Download report - client-side implementation
  downloadReport(id: string, reportData?: Record<string, any>): void {
    try {
      // Redirect to the API endpoint for download
      window.location.href = `${apiClient.defaults.baseURL}/api/reports/${id}/download`;
    } catch (error) {
      console.error('Error downloading report:', error);
      // Show error to user
      alert('Failed to download report. Please try again later.');
    }
  }
};

export default reportService;