// frontend/src/services/report.service.ts - FINAL FIXED VERSION
import { apiClient } from './api.service'; // ← FIXED: Use named import

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
    try {
      const response = await apiClient.get('/api/reports');
      return response.data;
    } catch (error) {
      console.log('Using mock data for reports');
      return [];
    }
  },

  // Generate a new report
  async generateReport(data: ReportGenerationRequest): Promise<Report> {
    try {
      console.log('🚀 Generating report with data:', data);
      
      // Transform frontend data to backend format
      const backendPayload = {
        platform: data.platformId, // Backend expects 'platform', not 'platformId'
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
      
      const response = await apiClient.post('/api/reports/generate', backendPayload);
      console.log('📨 Backend response:', response);
      
      return response;
    } catch (error) {
      console.error('❌ Error generating report:', error);
      throw error; // Don't fall back to mock data, let the error bubble up
    }
  },

  // Check report generation status
  async getReportStatus(id: string): Promise<{ status: string, progress?: number }> {
    try {
      console.log(`🔍 Checking status for report: ${id}`);
      const response = await apiClient.get(`/api/reports/${id}/status`);
      console.log(`📊 Report ${id} status:`, response);
      return response;
    } catch (error) {
      console.error('❌ Error checking report status:', error);
      throw error; // Don't fall back to mock data
    }
  },

  // Download report with proper error handling and logging
  async downloadReport(id: string, reportData?: Record<string, any>): Promise<void> {
    try {
      console.log(`📥 Downloading report: ${id}`);

      // Get the authentication token
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        console.error('❌ No authentication token found');
        alert('Authentication required. Please login again.');
        return;
      }

      console.log('🔑 Using auth token for download');

      // Use fetch with authentication headers for download
      const response = await fetch(`/api/reports/${id}/download`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        }
      });

      console.log(`📡 Download response status: ${response.status}`);

      if (!response.ok) {
        let errorMessage = `Download failed: ${response.status} ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Response isn't JSON, use default message
        }
        
        console.error('❌ Download failed:', errorMessage);
        throw new Error(errorMessage);
      }

      // Get the blob from response
      const blob = await response.blob();
      console.log(`📦 Received blob of size: ${blob.size} bytes`);
      
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      // Get filename from Content-Disposition header or create default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `PRISM_Report_${id}.pptx`;
      
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="([^"]*)"/) || contentDisposition.match(/filename=([^;]*)/);
        if (matches && matches[1]) {
          filename = matches[1].trim();
        }
      }

      console.log(`💾 Saving as: ${filename}`);

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the URL object
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Report downloaded successfully:', filename);

      // Show success message
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; z-index: 10000;
        background: #10B981; color: white; padding: 12px 24px;
        border-radius: 8px; font-family: system-ui; font-weight: 500;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      `;
      notification.textContent = `✅ Report downloaded: ${filename}`;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 3000);

    } catch (error) {
      console.error('❌ Error downloading report:', error);
      
      // Show error message
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to download report: ${errorMsg}`);
    }
  }
};

export default reportService;