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
      // Try to call the actual API if it exists
      const response = await apiClient.post('/api/reports/generate', data);
      return response.data;
    } catch (error) {
      console.log('Using mock data for report generation');
      
      // Create a mock report
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
      // Try to call the actual API if it exists
      const response = await apiClient.get(`/api/reports/${id}/status`);
      return response.data;
    } catch (error) {
      console.log('Using mock data for report status');
      
      // Simulate processing and return completed after 3 seconds
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ status: 'completed', progress: 100 });
        }, 3000);
      });
    }
  },
  
  // Download report - client-side implementation
  downloadReport(id: string, reportData?: Record<string, any>): void {
    // Use the report data if provided, otherwise use a default template
    const data = reportData || {
      title: 'Sample Report',
      platform: 'monday',
      date: new Date().toLocaleDateString(),
      metrics: [
        { name: 'Tasks Completed', value: '32' },
        { name: 'In Progress', value: '12' },
        { name: 'Blockers', value: '3' }
      ],
      team: [
        { name: 'John Doe', role: 'Product Manager' },
        { name: 'Jane Smith', role: 'Developer' },
        { name: 'Mike Johnson', role: 'Designer' }
      ]
    };
    
    // Create a new PowerPoint presentation
    const pptx = new pptxgen();
    
    // Set presentation properties
    pptx.layout = 'LAYOUT_16x9';
    pptx.title = data.title;
    
    // Add title slide
    const slide1 = pptx.addSlide();
    slide1.background = { color: '0D47A1' };
    slide1.addText(data.title, { 
      x: 0.5, 
      y: 1.5, 
      w: '90%', 
      h: 1.5, 
      align: 'center', 
      color: 'FFFFFF', 
      fontSize: 44,
      bold: true 
    });
    
    slide1.addText(`Generated on: ${data.date}`, { 
      x: 0.5, 
      y: 3.5, 
      w: '90%', 
      h: 0.5, 
      align: 'center', 
      color: 'FFFFFF',
      fontSize: 18 
    });
    
    // Add logo based on platform
    if (platformLogos[data.platform]) {
      slide1.addImage({ 
        data: platformLogos[data.platform],
        x: 0.5, 
        y: 0.5, 
        w: 1, 
        h: 1 
      });
    }
    
    // Add metrics slide
    const slide2 = pptx.addSlide();
    slide2.addText('Project Metrics', { 
      x: 0.5, 
      y: 0.5, 
      w: '90%', 
      h: 0.8, 
      fontSize: 36, 
      color: '0D47A1',
      bold: true 
    });
    
    // Add metrics table
    if (data.metrics && data.metrics.length > 0) {
      const tableData = [
        [{ text: 'Metric', options: { bold: true, fontSize: 18, fill: '0D47A1', color: 'FFFFFF' } }, 
         { text: 'Value', options: { bold: true, fontSize: 18, fill: '0D47A1', color: 'FFFFFF' } }],
        ...data.metrics.map(metric => [
          { text: metric.name, options: { fontSize: 16 } },
          { text: metric.value, options: { fontSize: 16 } }
        ])
      ];
      
      slide2.addTable(tableData, { x: 0.5, y: 1.5, w: 8, h: 2 });
    }
    
    // Add team slide if data exists
    if (data.team && data.team.length > 0) {
      const slide3 = pptx.addSlide();
      slide3.addText('Team Members', { 
        x: 0.5, 
        y: 0.5, 
        w: '90%', 
        h: 0.8, 
        fontSize: 36, 
        color: '0D47A1',
        bold: true 
      });
      
      // Add team table
      const teamData = [
        [{ text: 'Name', options: { bold: true, fontSize: 18, fill: '0D47A1', color: 'FFFFFF' } }, 
         { text: 'Role', options: { bold: true, fontSize: 18, fill: '0D47A1', color: 'FFFFFF' } }],
        ...data.team.map(member => [
          { text: member.name, options: { fontSize: 16 } },
          { text: member.role, options: { fontSize: 16 } }
        ])
      ];
      
      slide3.addTable(teamData, { x: 0.5, y: 1.5, w: 8, h: 2 });
    }
    
    // Add a summary slide
    const slide4 = pptx.addSlide();
    slide4.addText('Summary', { 
      x: 0.5, 
      y: 0.5, 
      w: '90%', 
      h: 0.8, 
      fontSize: 36, 
      color: '0D47A1',
      bold: true 
    });
    
    slide4.addText('This is a sample report generated by PRISM.\nThe full version would include detailed project data from your connected platform.', { 
      x: 0.5, 
      y: 1.5, 
      w: '90%', 
      h: 1.5, 
      fontSize: 18,
      bullet: { type: 'number' }
    });
    
    // Generate and download the PPTX file
    pptx.writeFile({ fileName: `${data.title.replace(/\s+/g, '_')}.pptx` });
  }
};

export default reportService;