// frontend/src/services/report.service.ts
// FIXED VERSION - Proper response handling for generateReport

import { apiClient } from './api.service';

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

// ✅ HELPER FUNCTION TO GET AUTH HEADERS
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

const reportService = {
  // Get all reports with authentication
  async getReports(): Promise<Report[]> {
    try {
      const response = await apiClient.get('/api/reports');
      return response.data;
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  },

  // ✅ FIXED Generate report with proper response handling
  async generateReport(data: ReportGenerationRequest): Promise<Report> {
    try {
      console.log('🚀 Generating report with data:', data);
      
      // Transform frontend data to backend format
      const backendPayload = {
        platform: data.platformId,
        connectionId: data.configuration.connectionId,
        projectId: data.configuration.projectId,
        templateId: data.templateId,
        configuration: {
          ...data.configuration,
          // Remove internal fields that backend doesn't need
          connectionId: undefined,
          projectId: undefined,
          connectionName: undefined,
          projectName: undefined
        }
      };

      console.log('📤 Sending to backend:', backendPayload);
      
      // ✅ MAKE REQUEST WITH AUTH HEADERS
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(backendPayload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Backend error response:', errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const reportData = await response.json();
      console.log('📨 Backend response:', reportData);
      
      // ✅ HANDLE MULTIPLE POSSIBLE ID FORMATS FROM BACKEND
      const reportId = reportData.id || reportData._id || reportData.reportId;
      
      if (!reportId) {
        console.error('❌ No report ID in response:', reportData);
        throw new Error('Backend did not return a valid report ID');
      }

      // ✅ RETURN STANDARDIZED REPORT OBJECT
      const report: Report = {
        id: reportId,
        title: reportData.title || 'Generated Report',
        status: reportData.status || 'queued',
        createdAt: reportData.createdAt || new Date().toISOString(),
        completedAt: reportData.completedAt,
        platform: reportData.platform || data.platformId,
        template: reportData.template || data.templateId,
        configuration: reportData.configuration || data.configuration
      };

      console.log('✅ Returning standardized report:', report);
      return report;
      
    } catch (error) {
      console.error('❌ Error generating report:', error);
      throw error;
    }
  },

  // ✅ FIXED Check report status with auth headers
  async getReportStatus(id: string): Promise<{ status: string, progress?: number }> {
    try {
      console.log(`🔍 Checking status for report: ${id}`);
      
      // ✅ VALIDATE ID BEFORE MAKING REQUEST
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error(`Invalid report ID: ${id}`);
      }

      const response = await fetch(`/api/reports/${id}/status`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ Status check failed for ${id}:`, errorData);
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const statusData = await response.json();
      console.log(`📊 Report ${id} status:`, statusData);
      return statusData;
      
    } catch (error) {
      console.error('❌ Error checking report status:', error);
      throw error;
    }
  },

  // ✅ FIXED Download report with auth headers and validation
  async downloadReport(id: string, reportData?: Record<string, any>): Promise<void> {
    try {
      console.log(`📥 Downloading report: ${id}`);

      // ✅ VALIDATE ID
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error(`Invalid report ID: ${id}`);
      }

      // Get the authentication token
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        console.error('❌ No authentication token found');
        throw new Error('Authentication required. Please login again.');
      }

      const response = await fetch(`/api/reports/${id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Download failed for ${id}:`, errorText);
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `report-${id}.pptx`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`✅ Report downloaded: ${filename}`);
      
    } catch (error) {
      console.error('❌ Error downloading report:', error);
      throw error;
    }
  }
};

export default reportService;