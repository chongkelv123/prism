import { Request, Response } from 'express';
import logger from '../utils/logger';
import { Report } from '../models/Report';

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