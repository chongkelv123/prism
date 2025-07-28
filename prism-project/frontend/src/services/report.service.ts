// frontend/src/services/report.service.ts
// UPDATED VERSION - Add TROFOS endpoint support alongside existing Jira endpoints

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

// ✅ NEW: Platform-specific endpoint mapping
const getPlatformEndpoints = (platformId: string) => {
  const endpointMapping = {
    jira: {
      standard: '/api/reports/generate-jira-standard',
      executive: '/api/reports/generate-jira-executive',
      detailed: '/api/reports/generate-jira-detailed'
    },
    trofos: {
      standard: '/api/reports/generate-trofos-standard',
      executive: '/api/reports/generate-trofos-executive',
      detailed: '/api/reports/generate-trofos-detailed'
    },
    monday: {
      standard: '/api/reports/generate', // Fallback to generic endpoint for Monday.com
      executive: '/api/reports/generate',
      detailed: '/api/reports/generate'
    }
  };

  return endpointMapping[platformId as keyof typeof endpointMapping] || endpointMapping.monday;
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

  // ✅ UPDATED: Generate report with platform-specific endpoint routing
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

      // ✅ NEW: Get platform-specific endpoints
      const platformEndpoints = getPlatformEndpoints(data.platformId);
      
      // ✅ NEW: Map template to correct platform-specific endpoint  
      const endpoint = platformEndpoints[
        (data.templateId as 'standard' | 'executive' | 'detailed')
      ] || platformEndpoints['standard'];

      console.log(`🎯 Using endpoint for ${data.platformId}:`, endpoint);

      // ✅ MAKE REQUEST WITH AUTH HEADERS TO CORRECT PLATFORM ENDPOINT
      const response = await fetch(endpoint, {
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

  // ✅ Check report status with auth headers
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

  // ✅ Download report with auth headers and validation
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

      // Check if report exists and get download URL
      const response = await fetch(`/api/reports/${id}/download`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to download report');
      }

      // Get the blob data
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Use report data to create meaningful filename
      const filename = reportData?.title 
        ? `${reportData.title.replace(/[^a-zA-Z0-9]/g, '_')}.pptx`
        : `report_${id}.pptx`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      
      console.log('✅ Report downloaded successfully:', filename);

    } catch (error) {
      console.error('❌ Error downloading report:', error);
      throw error;
    }
  }
};

export default reportService;