import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';
import { Report } from '../models/Report';
import { generatePowerPointReport } from '../utils/pptxGenerator';

// Generate a new report
export async function generateReport(req: Request, res: Response) {
  const { platformId, templateId, configuration } = req.body;
  
  try {
    // Validate inputs
    if (!platformId || !templateId) {
      return res.status(400).json({ message: 'Platform ID and Template ID are required' });
    }
    
    // Create report entry in database
    const report = new Report({
      title: configuration?.title || 'New Report',
      status: 'queued',
      platform: platformId,
      template: templateId,
      configuration
    });
    
    await report.save();
    
    // Start the report generation process asynchronously
    // This would typically use a worker queue like Bull
    // For now, we'll simulate with a timeout
    setTimeout(() => {
      processReport(report.id);
    }, 1000);
    
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
    
    // For demo purposes, generate a PowerPoint file on-the-fly
    // In a production environment, we would retrieve a pre-generated file
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
        { name: 'Create API Gateway', status: 'Completed', assignee: 'Chan Jian Da' },
        { name: 'Implement Authentication', status: 'In Progress', assignee: 'Kelvin Chong' },
        { name: 'Design UI Mockups', status: 'Completed', assignee: 'Bryan' },
        { name: 'Setup CI/CD Pipeline', status: 'In Progress', assignee: 'Chan Jian Da' },
        { name: 'Implement Report Generation', status: 'In Progress', assignee: 'Kelvin Chong' }
      ],
      configuration: report.configuration || {
        includeMetrics: true,
        includeTasks: true,
        includeTimeline: true,
        includeResources: true
      }
    };
    
    const { filePath } = await generatePowerPointReport(reportData);
    
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

// Process report (would typically be in a separate worker)
async function processReport(reportId: string) {
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
    
    // Simulate report generation process
    for (let i = 1; i <= 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      report.progress = i * 20;
      await report.save();
    }
    
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
        { name: 'Create API Gateway', status: 'Completed', assignee: 'Chan Jian Da' },
        { name: 'Implement Authentication', status: 'In Progress', assignee: 'Kelvin Chong' },
        { name: 'Design UI Mockups', status: 'Completed', assignee: 'Bryan' },
        { name: 'Setup CI/CD Pipeline', status: 'In Progress', assignee: 'Chan Jian Da' },
        { name: 'Implement Report Generation', status: 'In Progress', assignee: 'Kelvin Chong' }
      ],
      configuration: report.configuration || {
        includeMetrics: true,
        includeTasks: true,
        includeTimeline: true,
        includeResources: true
      }
    };
    
    // Pre-generate the PowerPoint file to ensure it exists
    try {
      // Only generate the file once to avoid duplication
      await generatePowerPointReport(reportData);
    } catch (genError) {
      logger.error(`Error pre-generating PowerPoint for ${reportId}:`, genError);
      // Continue anyway, as we'll generate on-demand for download
    }
    
    // Update status to completed
    report.status = 'completed';
    report.completedAt = new Date();
    await report.save();
    
    logger.info(`Report generated successfully: ${reportId}`);
  } catch (error) {
    logger.error(`Error processing report ${reportId}:`, error);
    
    // Update status to failed
    try {
      await Report.findByIdAndUpdate(reportId, { status: 'failed' });
    } catch (updateError) {
      logger.error(`Error updating report status to failed: ${reportId}`, updateError);
    }
  }
}