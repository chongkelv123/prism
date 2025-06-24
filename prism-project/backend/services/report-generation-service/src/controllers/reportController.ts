// backend/services/report-generation-service/src/controllers/reportController.ts
// UPDATED - Template Integration Support - Windows Compatible (No Unicode/Symbols)

import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';
import { Report } from '../models/Report';
import { PlatformDataService, ReportGenerationConfig } from '../services/PlatformDataService';
import { DataAnalyticsService } from '../services/DataAnalyticsService';
import { 
  TemplateReportGenerator, 
  EnhancedJiraReportGenerator, 
  EnhancedMondayReportGenerator,
  TrofosReportGenerator,
  TemplateRecommendationService
} from '../generators/TemplateReportGenerator';

// Get JWT token from request
function getAuthToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

// Generate a new report with template support
export async function generateReport(req: Request, res: Response) {
  const { platform, connectionId, projectId, templateId, configuration } = req.body;
  
  try {
    // Validate inputs
    if (!platform || !connectionId || !projectId) {
      return res.status(400).json({ 
        message: 'Platform, Connection ID, and Project ID are required' 
      });
    }

    // Default to standard template if not specified
    const selectedTemplate = templateId || 'standard';

    // Validate template ID
    if (!['standard', 'executive', 'detailed'].includes(selectedTemplate)) {
      return res.status(400).json({
        message: `Invalid template ID: ${selectedTemplate}. Must be one of: standard, executive, detailed`
      });
    }
    
    // Create report entry in database
    const report = new Report({
      title: configuration?.title || 'New Report',
      status: 'queued',
      platform: platform,
      template: selectedTemplate,
      configuration: {
        ...configuration,
        connectionId,
        projectId,
        templateId: selectedTemplate
      }
    });
    
    await report.save();
    
    // Get auth token for platform integrations service
    const authToken = getAuthToken(req);
    
    // Start the report generation process asynchronously
    processReportWithTemplateSystem(report.id, authToken);
    
    logger.info(`Template-based report generation requested: ${report.id}`, {
      template: selectedTemplate,
      platform,
      projectId
    });
    
    return res.status(201).json({
      id: report.id,
      title: report.title,
      status: report.status,
      template: selectedTemplate,
      createdAt: report.createdAt
    });
  } catch (error) {
    logger.error('Error generating template-based report:', error);
    return res.status(500).json({ message: 'Server error during report generation' });
  }
}

// Process report with new template system
async function processReportWithTemplateSystem(reportId: string, authToken?: string) {
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
    
    try {
      // Update progress
      report.progress = 10;
      await report.save();
      
      // Create proper ReportGenerationConfig object
      const reportConfig: ReportGenerationConfig = {
        platform: report.platform,
        connectionId: report.configuration.connectionId,
        projectId: report.configuration.projectId,
        templateId: report.template,
        configuration: report.configuration
      };

      // Fetch real project data from platform integrations service
      const projectData = await platformDataService.fetchProjectData(reportConfig);
      
      // Update progress
      report.progress = 30;
      await report.save();
      
      // Log what data was fetched
      logger.info(`Fetched project data for template report ${reportId}:`, {
        platform: projectData.platform,
        projectName: projectData.name,
        taskCount: projectData.tasks?.length || 0,
        metricsCount: projectData.metrics?.length || 0,
        templateId: report.template,
        isFallbackData: projectData.fallbackData || false
      });
      
      // Generate PowerPoint using template system
      let filePath: string;
      
      // Use enhanced generators with template support
      if (report.platform === 'jira') {
        const jiraGenerator = new EnhancedJiraReportGenerator();
        filePath = await jiraGenerator.generate(
          projectData,
          report.configuration,
          async (progress) => {
            report.progress = 30 + (progress * 0.6);
            await report.save();
          }
        );
      } else if (report.platform === 'monday') {
        const mondayGenerator = new EnhancedMondayReportGenerator();
        filePath = await mondayGenerator.generate(
          projectData,
          report.configuration,
          async (progress) => {
            report.progress = 30 + (progress * 0.6);
            await report.save();
          }
        );
      } else if (report.platform === 'trofos') {
        const trofosGenerator = new TrofosReportGenerator();
        filePath = await trofosGenerator.generate(
          projectData,
          report.configuration,
          async (progress) => {
            report.progress = 30 + (progress * 0.6);
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
      
      logger.info(`Template report generated successfully: ${reportId}`, {
        filePath,
        platform: report.platform,
        template: report.template,
        realData: !projectData.fallbackData
      });
      
    } catch (error) {
      logger.error(`Error generating template report content for ${reportId}:`, error);
      
      // Update status to failed
      report.status = 'failed';
      report.error = error instanceof Error ? error.message : 'Unknown error';
      await report.save();
    }
    
  } catch (error) {
    logger.error(`Error processing template report ${reportId}:`, error);
    
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

// Get template recommendations for a project
export async function getTemplateRecommendations(req: Request, res: Response) {
  try {
    const { platform, connectionId, projectId } = req.query;
    
    if (!platform || !connectionId || !projectId) {
      return res.status(400).json({
        message: 'Platform, connectionId, and projectId are required'
      });
    }

    // Get auth token for platform integrations service
    const authToken = getAuthToken(req);
    const platformDataService = new PlatformDataService(authToken);
    
    // Create config for data fetching
    const reportConfig: ReportGenerationConfig = {
      platform: platform as string,
      connectionId: connectionId as string,
      projectId: projectId as string,
      templateId: 'standard', // Default for recommendation analysis
      configuration: {}
    };

    try {
      // Fetch project data for analysis
      const projectData = await platformDataService.fetchProjectData(reportConfig);
      
      // Get template recommendations
      const recommendations = TemplateRecommendationService.getRecommendations(projectData);
      
      // Get template metadata
      const templateMetadata = TemplateReportGenerator.getTemplateMetadata();
      
      // Calculate analytics for preview
      const analytics = DataAnalyticsService.calculateAnalytics(projectData);
      const templateMetrics = DataAnalyticsService.getTemplateMetrics(projectData);
      
      return res.json({
        recommendations,
        templateMetadata,
        templateMetrics,
        projectSummary: {
          name: projectData.name,
          platform: projectData.platform,
          taskCount: projectData.tasks?.length || 0,
          teamSize: projectData.team?.length || 0,
          metricsCount: projectData.metrics?.length || 0,
          sprintCount: projectData.sprints?.length || 0,
          completionRate: analytics.completionRate,
          riskLevel: analytics.riskLevel
        }
      });

    } catch (dataError) {
      logger.warn('Failed to fetch project data for recommendations, using defaults', dataError);
      
      // Return basic recommendations without project data
      const fallbackData = { 
        id: projectId as string, 
        name: 'Project', 
        platform: platform as string, 
        tasks: [], 
        team: [], 
        metrics: [],
        status: 'active'
      };
      
      const recommendations = TemplateRecommendationService.getRecommendations(fallbackData);
      const templateMetadata = TemplateReportGenerator.getTemplateMetadata();
      
      return res.json({
        recommendations,
        templateMetadata,
        templateMetrics: {
          standard: { slideCount: 8, features: [], estimatedGenTime: 45 },
          executive: { slideCount: 5, features: [], estimatedGenTime: 30 },
          detailed: { slideCount: 15, features: [], estimatedGenTime: 90 }
        },
        projectSummary: {
          name: 'Unknown Project',
          platform: platform as string,
          taskCount: 0,
          teamSize: 0,
          metricsCount: 0,
          sprintCount: 0,
          completionRate: 0,
          riskLevel: 'unknown'
        },
        warning: 'Limited project data available for recommendations'
      });
    }

  } catch (error) {
    logger.error('Error getting template recommendations:', error);
    return res.status(500).json({ 
      message: 'Server error getting template recommendations',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Get template feature comparison
export async function getTemplateComparison(req: Request, res: Response) {
  try {
    const comparison = TemplateRecommendationService.getFeatureComparison();
    const metadata = TemplateReportGenerator.getTemplateMetadata();
    
    return res.json({
      comparison,
      templates: metadata
    });
  } catch (error) {
    logger.error('Error getting template comparison:', error);
    return res.status(500).json({ 
      message: 'Server error getting template comparison' 
    });
  }
}

// Preview template with project data
export async function previewTemplate(req: Request, res: Response) {
  try {
    const { templateId, platform, connectionId, projectId } = req.body;
    
    if (!templateId || !platform || !connectionId || !projectId) {
      return res.status(400).json({
        message: 'templateId, platform, connectionId, and projectId are required'
      });
    }

    // Validate template ID
    if (!['standard', 'executive', 'detailed'].includes(templateId)) {
      return res.status(400).json({
        message: `Invalid template ID: ${templateId}`
      });
    }

    // Get auth token for platform integrations service
    const authToken = getAuthToken(req);
    const platformDataService = new PlatformDataService(authToken);
    
    // Create config for data fetching
    const reportConfig: ReportGenerationConfig = {
      platform,
      connectionId,
      projectId,
      templateId,
      configuration: {}
    };

    try {
      // Fetch project data for preview
      const projectData = await platformDataService.fetchProjectData(reportConfig);
      
      // Calculate analytics for preview
      const analytics = DataAnalyticsService.calculateAnalytics(projectData);
      const templateMetrics = DataAnalyticsService.getTemplateMetrics(projectData);
      
      // Get template-specific metrics
      const selectedTemplateMetrics = templateMetrics[templateId as keyof typeof templateMetrics];
      
      return res.json({
        templateId,
        projectData: {
          name: projectData.name,
          platform: projectData.platform,
          taskCount: projectData.tasks?.length || 0,
          teamSize: projectData.team?.length || 0,
          metricsCount: projectData.metrics?.length || 0,
          completionRate: analytics.completionRate
        },
        templateMetrics: selectedTemplateMetrics,
        analytics: {
          completionRate: analytics.completionRate,
          teamEfficiency: analytics.teamEfficiency,
          qualityScore: analytics.qualityScore,
          riskLevel: analytics.riskLevel,
          estimatedCompletion: analytics.estimatedCompletion
        },
        preview: {
          slideCount: selectedTemplateMetrics.slideCount,
          estimatedTime: selectedTemplateMetrics.estimatedGenTime,
          keyFeatures: selectedTemplateMetrics.features,
          dataAvailability: {
            hasTaskData: (projectData.tasks?.length || 0) > 0,
            hasTeamData: (projectData.team?.length || 0) > 0,
            hasMetricsData: (projectData.metrics?.length || 0) > 0,
            hasSprintData: (projectData.sprints?.length || 0) > 0
          }
        }
      });

    } catch (dataError) {
      logger.warn('Failed to fetch project data for template preview', dataError);
      return res.status(500).json({
        message: 'Failed to fetch project data for preview',
        error: dataError instanceof Error ? dataError.message : 'Unknown error'
      });
    }

  } catch (error) {
    logger.error('Error previewing template:', error);
    return res.status(500).json({ 
      message: 'Server error previewing template',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
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
      progress: report.progress || 0,
      template: report.template,
      error: report.error || null,
      createdAt: report.createdAt,
      completedAt: report.completedAt
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

// Get all reports with template information
export async function getAllReports(req: Request, res: Response) {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    
    // Add template metadata to each report
    const reportsWithTemplateInfo = reports.map(report => ({
      ...report.toObject(),
      templateInfo: TemplateReportGenerator.getTemplateMetadata()[report.template] || null
    }));
    
    return res.json(reportsWithTemplateInfo);
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
        status: report.status,
        progress: report.progress || 0
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
    const templateName = report.template ? `_${report.template}` : '';
    const downloadFileName = `${report.title.replace(/[^a-zA-Z0-9]/g, '_')}${templateName}_report.pptx`;
    
    // Set the appropriate headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
    
    // Create a read stream from the file and pipe it to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    logger.info(`Template report ${reportId} downloaded`, {
      template: report.template,
      fileName: downloadFileName
    });
  } catch (error) {
    logger.error('Error downloading report:', error);
    return res.status(500).json({ message: 'Server error downloading report' });
  }
}

// Health check endpoint for template system
export async function getTemplateSystemHealth(req: Request, res: Response) {
  try {
    const templateMetadata = TemplateReportGenerator.getTemplateMetadata();
    const templateCount = Object.keys(templateMetadata).length;
    
    return res.json({
      status: 'healthy',
      templatesAvailable: templateCount,
      templates: Object.keys(templateMetadata),
      features: [
        'Template-based report generation',
        'Real-time data analytics',
        'Progress tracking',
        'Template recommendations',
        'Feature comparison'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Template system health check failed:', error);
    return res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}