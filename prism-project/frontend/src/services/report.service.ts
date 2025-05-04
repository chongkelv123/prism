import apiClient from './api.service';

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

const reportService = {
  // Get all reports
  async getReports(): Promise<Report[]> {
    const response = await apiClient.get('/api/reports');
    return response.data;
  },
  
  // Get a specific report
  async getReport(id: string): Promise<Report> {
    const response = await apiClient.get(`/api/reports/${id}`);
    return response.data;
  },
  
  // Generate a new report
  async generateReport(data: ReportGenerationRequest): Promise<Report> {
    const response = await apiClient.post('/api/reports/generate', data);
    return response.data;
  },
  
  // Check report generation status
  async getReportStatus(id: string): Promise<{ status: string, progress?: number }> {
    const response = await apiClient.get(`/api/reports/${id}/status`);
    return response.data;
  },
  
  // Download report
  downloadReport(id: string): void {
    window.location.href = `${apiClient.defaults.baseURL}/api/storage/reports/${id}/download`;
  },

  // Get recent reports
  async getRecentReports(limit: number = 5): Promise<Report[]> {
    const response = await apiClient.get(`/api/reports/recent?limit=${limit}`);
    return response.data;
  }
};

export default reportService;