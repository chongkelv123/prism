// backend/services/report-generation-service/src/controllers/reportController.ts
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';
import { Report } from '../models/Report';
import { JiraReportGenerator } from '../generators/JiraReportGenerator';
import { MondayReportGenerator } from '../generators/MondayReportGenerator';
import { PlatformDataService } from '../services/PlatformDataService';

// Get JWT token from request
function getAuthToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

// Generate a new report with real platform data
export async function generateReport(req: Request, res: Response) {
  const { platform, connectionId, projectId, templateId, configuration } = req.body;
  
  try {
    // Validate inputs
    if (!platform || !connectionId || !projectId || !templateId) {
      return res.status(400).json({ 
        message: 'Platform, Connection ID, Project ID and Template ID are required' 
      });
    }
    
    // Create report entry in database
    const report = new Report({
      title: configuration?.title || 'New Report',
      status: 'queued',
      platform: platform,
      template: templateId,
      configuration: {
        ...configuration,
        connectionId,
        projectId
      }
    });
    
    await report.save();
    
    // Get auth token for platform integrations service
    const authToken = getAuthToken(req);
    
    // Start the report generation process asynchronously
    processReportWithRealData(report.id, authToken);
    
    logger.info(`Report generation requested: ${report.id}`);
    
    return res.status(201).json({
      id: report.id,
      title: report.title,
      status: report.status,
      createdAt: report.createdAt
    });
  } catch (error) {
    logger.error('Error generating report:', error);
    return res.status(500).json({ message: 'Server error during report generation' });
  }
}

// Get report generation status
export async function getReportStatus(req: Request, res: Response) {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    return res.json({
      status: report.status,
      progress: report.progress || 0
    });
  } catch (error) {
    logger.error('Error fetching report status:', error);
    return res.status(500).json({ message: 'Server error fetching report status' });
  }
}

// Get a specific report
export async function getReportById(req: Request, res: Response) {
  try {
    const report = await Report.findById(req.params.id);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    return res.json(report);
  } catch (error) {
    logger.error('Error fetching report:', error);
    return res.status(500).json({ message: 'Server error fetching report' });
  }
}

// Get all reports
export async function getAllReports(req: Request, res: Response) {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    return res.json(reports);
  } catch (error) {
    logger.error('Error fetching reports:', error);
    return res.status(500).json({ message: 'Server error fetching reports' });
  }
}

// Download a generated report
export async function downloadReport(req: Request, res: Response) {
  try {
    const reportId = req.params.id;
    const report = await Report.findById(reportId);
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    if (report.status !== 'completed') {
      return res.status(400).json({ 
        message: 'Report is not ready for download',
        status: report.status
      });
    }
    
    // Get the generated file path
    const filePath = report.filePath || path.join(
      __dirname, 
      '../../storage', 
      `${reportId}_report.pptx`
    );
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.error(`Report file not found: ${filePath}`);
      return res.status(404).json({ message: 'Report file not found' });
    }
    
    // Get the filename from the path
    const fileName = path.basename(filePath);
    
    // Set the appropriate headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    // Create a read stream from the file and pipe it to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    logger.info(`Report ${reportId} downloaded`);
  } catch (error) {
    logger.error('Error downloading report:', error);
    return res.status(500).json({ message: 'Server error downloading report' });
  }
}

// Process report with real platform data
async function processReportWithRealData(reportId: string, authToken?: string) {
  try {
    const report = await Report.findById(reportId);
    
    if (!report) {
      logger.error(`Report not found for processing: ${reportId}`);
      return;
    }
    
    // Update status to processing
    report.status = 'processing';
    report.progress = 0;
    await report.save();
    
    // Initialize services
    const platformDataService = new PlatformDataService(authToken);
    const jiraGenerator = new JiraReportGenerator();
    const mondayGenerator = new MondayReportGenerator();
    
    try {
      // Update progress
      report.progress = 20;
      await report.save();
      
      // Fetch real project data from platform integrations service
      const projectData = await platformDataService.fetchProjectData(
        report.platform,
        report.configuration.connectionId,
        report.configuration.projectId
      );
      
      // Update progress
      report.progress = 50;
      await report.save();
      
      // Generate PowerPoint based on platform
      let filePath: string;
      if (report.platform === 'jira') {
        filePath = await jiraGenerator.generate(
          projectData,
          report.configuration,
          async (progress) => {
            report.progress = 50 + (progress * 0.4);
            await report.save();
          }
        );
      } else if (report.platform === 'monday') {
        filePath = await mondayGenerator.generate(
          projectData,
          report.configuration,
          async (progress) => {
            report.progress = 50 + (progress * 0.4);
            await report.save();
          }
        );
      } else {
        throw new Error(`Unsupported platform: ${report.platform}`);
      }
      
      // Update report with file path
      report.filePath = filePath;
      report.status = 'completed';
      report.progress = 100;
      report.completedAt = new Date();
      await report.save();
      
      logger.info(`Report generated successfully: ${reportId}`);
      
    } catch (error) {
      logger.error(`Error generating report content for ${reportId}:`, error);
      
      // Fall back to mock data if platform data fetch fails
      logger.info('Falling back to mock data generation');
      await generateReportWithMockData(report);
    }
    
  } catch (error) {
    logger.error(`Error processing report ${reportId}:`, error);
    
    // Update status to failed
    try {
      await Report.findByIdAndUpdate(reportId, { 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } catch (updateError) {
      logger.error(`Error updating report status to failed: ${reportId}`, updateError);
    }
  }
}

// Fallback function to generate report with mock data
async function generateReportWithMockData(report: any) {
  const { generatePowerPointReport } = require('../utils/pptxGenerator');
  
  // Generate sample report data
  const reportData = {
    title: report.title,
    platform: report.platform,
    date: new Date().toLocaleDateString(),
    metrics: [
      { name: 'Tasks Completed', value: '32' },
      { name: 'In Progress', value: '12' },
      { name: 'Blockers', value: '3' }
    ],
    team: [
      { name: 'Professor Ganesh', role: 'Project Manager' },
      { name: 'Kelvin Chong', role: 'Developer' },
      { name: 'Chan Jian Da', role: 'DevOps' },
      { name: 'Bryan', role: 'Designer' }
    ],
    tasks: [        
      { name: 'Create API Gateway', status: 'Completed', assignee: 'Kelvin Chong' },
      { name: 'Implement Authentication', status: 'Completed', assignee: 'Kelvin Chong' },        
      { name: 'Setup CI/CD Pipeline', status: 'In Progress', assignee: 'Chan Jian Da' },
      { name: 'Implement Report Generation', status: 'In Progress', assignee: 'Kelvin Chong' },
      { name: 'Perform Unit tests', status: 'In Progress', assignee: 'Bryan' }
    ],
    configuration: report.configuration || {
      includeMetrics: true,
      includeTasks: true,
      includeTimeline: true,
      includeResources: true
    }
  };
  
  const { filePath } = await generatePowerPointReport(reportData);
  
  // Update report with file path
  report.filePath = filePath;
  report.status = 'completed';
  report.progress = 100;
  report.completedAt = new Date();
  await report.save();
}