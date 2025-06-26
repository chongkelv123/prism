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
      const firstProject = projectData[0];
      logger.info(`Project data details:`, {
        platform: firstProject?.platform,
        name: firstProject?.name,
        tasks: firstProject?.tasks?.length || 0,
        metrics: firstProject?.metrics?.length || 0,
        team: firstProject?.team?.length || 0,
        fallbackData: firstProject?.fallbackData
      });

      // Generate PowerPoint using template system
      let filePath: string;

      // Use enhanced generators with template support
      if (report.platform === 'jira') {
        const jiraGenerator = new EnhancedJiraReportGenerator();
        filePath = await jiraGenerator.generate(
          projectData[0],
          report.configuration,
          async (progress) => {
            report.progress = 30 + (progress * 0.6);
            await report.save();
          }
        );
      } else if (report.platform === 'monday') {
        const mondayGenerator = new EnhancedMondayReportGenerator();
        filePath = await mondayGenerator.generate(
          projectData[0],
          report.configuration,
          async (progress) => {
            report.progress = 30 + (progress * 0.6);
            await report.save();
          }
        );
      } else if (report.platform === 'trofos') {
        const trofosGenerator = new TrofosReportGenerator();
        filePath = await trofosGenerator.generate(
          projectData[0],
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
        realData: !projectData[0]?.fallbackData
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
      const recommendations = TemplateRecommendationService.getRecommendations(projectData[0]);

      // Get template metadata
      const templateMetadata = TemplateReportGenerator.getTemplateMetadata();

      // Calculate analytics for preview
      const analytics = DataAnalyticsService.calculateAnalytics(projectData[0]);
      const templateMetrics = DataAnalyticsService.getTemplateMetrics(projectData[0]);

      return res.json({
        recommendations,
        templateMetadata,
        templateMetrics,
        projectSummary: {
          name: projectData[0]?.name,
          platform: projectData[0]?.platform,
          taskCount: projectData[0]?.tasks?.length || 0,
          teamSize: projectData[0]?.team?.length || 0,
          metricsCount: projectData[0]?.metrics?.length || 0,
          sprintCount: projectData[0]?.sprints?.length || 0,
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
      const analytics = DataAnalyticsService.calculateAnalytics(projectData[0]);
      const templateMetrics = DataAnalyticsService.getTemplateMetrics(projectData[0]);

      // Get template-specific metrics
      const selectedTemplateMetrics = templateMetrics[templateId as keyof typeof templateMetrics];

      return res.json({
        templateId,
        projectData: {
          name: projectData[0]?.name,
          platform: projectData[0]?.platform,
          taskCount: projectData[0]?.tasks?.length || 0,
          teamSize: projectData[0]?.team?.length || 0,
          metricsCount: projectData[0]?.metrics?.length || 0,
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
            hasTaskData: (projectData[0]?.tasks?.length || 0) > 0,
            hasTeamData: (projectData[0]?.team?.length || 0) > 0,
            hasMetricsData: (projectData[0]?.metrics?.length || 0) > 0,
            hasSprintData: (projectData[0]?.sprints?.length || 0) > 0
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

// Download a generated report - COMPLETE FIXED VERSION
export async function downloadReport(req: Request, res: Response) {
  try {
    const reportId = req.params.id;
    const report = await Report.findById(reportId);

    // Debug logging
    logger.info('=== DOWNLOAD DEBUG START ===');
    logger.info('Report ID:', reportId);
    logger.info('Report found:', !!report);
    if (report) {
      logger.info('Report status:', report.status);
      logger.info('Report filePath stored in DB:', report.filePath);
      logger.info('Report title:', report.title);
      logger.info('Report template:', report.template);
    }
    logger.info('=== DOWNLOAD DEBUG END ===');

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

    // FIXED: Proper file path construction and fallback search
    let filePath: string;
    const storageDir = path.join(__dirname, '../../storage');

    if (report.filePath) {
      // Construct full path from stored filename
      filePath = path.join(storageDir, report.filePath);

      // If exact file doesn't exist, search for similar files
      if (!fs.existsSync(filePath)) {
        logger.warn(`Exact file not found: ${report.filePath}, searching for alternatives`);

        try {
          const files = fs.readdirSync(storageDir);
          // Look for files with similar pattern (same project name)
          const matchingFile = files.find(file =>
            file.includes('standard-report-JIRA-Demo-Project') &&
            file.endsWith('.pptx')
          );

          if (matchingFile) {
            filePath = path.join(storageDir, matchingFile);
            logger.info(`Using alternative file: ${matchingFile}`);
          }
        } catch (dirError) {
          logger.error('Error searching storage directory:', dirError);
        }
      }
    } else {
      // Fallback: search for any recent file
      try {
        const files = fs.readdirSync(storageDir)
          .filter(file => file.endsWith('.pptx'))
          .map(file => ({
            name: file,
            path: path.join(storageDir, file),
            stats: fs.statSync(path.join(storageDir, file))
          }))
          .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());

        if (files.length > 0) {
          filePath = files[0].path;
          logger.info(`Using most recent file: ${files[0].name}`);
        } else {
          return res.status(404).json({ message: 'No report files found' });
        }
      } catch (dirError) {
        return res.status(500).json({ message: 'Error accessing storage directory' });
      }
    }

    // Add final existence check
    logger.info('Final file path check:', {
      constructedPath: filePath,
      fileExists: fs.existsSync(filePath)
    });

    // Check if file exists after all attempts
    if (!fs.existsSync(filePath)) {
      logger.error(`Report file not found after all attempts: ${filePath}`);
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

    // Handle stream errors
    fileStream.on('error', (streamError) => {
      logger.error('Error streaming file:', streamError);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error streaming report file' });
      }
    });

    fileStream.pipe(res);

    logger.info(`Template report ${reportId} downloaded`, {
      template: report.template,
      fileName: downloadFileName,
      actualFilePath: filePath
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