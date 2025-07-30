// backend/services/report-generation-service/src/controllers/trofosReportController.ts
// TROFOS-SPECIFIC REPORT ENDPOINTS - Uses Real TROFOS Data

import { Request, Response } from 'express';
import logger from '../utils/logger';
import { Report } from '../models/Report';
import { PlatformDataService, ReportGenerationConfig } from '../services/PlatformDataService';
import { EnhancedTrofosReportGenerator } from '../generators/EnhancedTrofosReportGenerator';
import axios from 'axios';
import { DataAnalyticsService } from '../services/DataAnalyticsService';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email?: string;
  };
}

// Get JWT token from request headers
function getAuthToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return undefined;
}

/**
 * Generate TROFOS Standard Report with Professional Visualization
 * POST /api/reports/generate-trofos-standard
 */
export async function generateTrofosStandardReport(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        message: 'User authentication required'
      });
    }

    // Extract projectId from request body (fix the hardcoded issue from start)
    const { connectionId, projectId, reportTitle } = req.body;

    // Validate required fields
    if (!connectionId) {
      return res.status(400).json({
        message: 'Connection ID is required',
        example: {
          connectionId: 'trofos-connection-id',
          projectId: 'project-123',
          reportTitle: 'Project Analysis Report'
        }
      });
    }

    logger.info('Generating TROFOS Standard Report with real data', {
      connectionId,
      projectId: projectId || 'default-project',
      reportTitle: reportTitle || 'TROFOS Standard Report',
      endpoint: 'POST /api/reports/generate-trofos-standard'
    });

    // Create report entry
    const report = new Report({
      userId: userId,
      title: reportTitle || 'TROFOS Standard Report',
      status: 'queued',
      platform: 'trofos',
      template: 'standard',
      configuration: {
        connectionId,
        projectId: projectId,
        templateId: 'standard',
        title: reportTitle,
        includeMetrics: true,
        includeTasks: true,
        includeTeamAnalysis: true,
        includeSprintAnalysis: true,
        includeBacklogBreakdown: true
      },
      projectInfo: {
        projectId: projectId,
        projectName: '', // Will be populated when data is fetched
        platform: 'trofos'
      }
    });

    await report.save();

    // Get auth token for platform integrations
    const authToken = getAuthToken(req);

    // Start async processing with real TROFOS data
    processTrofosReport(report.id, 'standard', authToken);

    return res.status(201).json({
      id: report.id,
      title: report.title,
      status: report.status,
      template: 'standard',
      platform: 'trofos',
      createdAt: report.createdAt,
      message: 'TROFOS Standard Report generation started with real platform data',
      estimatedSlides: '5-7 professional slides',
      features: [
        'Project Health Dashboard',
        'Backlog Status Analysis (Real TROFOS Data)',
        'Team Resource Distribution',
        'Sprint Progress & Velocity',
        'Actionable Recommendations'
      ]
    });

  } catch (error) {
    logger.error('Error generating TROFOS Standard Report:', error);
    return res.status(500).json({
      message: 'Server error during TROFOS Standard Report generation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Generate TROFOS Executive Summary with KPI Dashboard  
 * POST /api/reports/generate-trofos-executive
 */
export async function generateTrofosExecutiveReport(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        message: 'User authentication required'
      });
    }

    // Extract projectId from request body
    const { connectionId, projectId, reportTitle } = req.body;

    // Validate required fields
    if (!connectionId) {
      return res.status(400).json({
        message: 'Connection ID is required'
      });
    }

    logger.info('Generating TROFOS Executive Report with real data', {
      connectionId,
      projectId: projectId || 'default-project',
      reportTitle: reportTitle || 'TROFOS Executive Summary',
      endpoint: 'POST /api/reports/generate-trofos-executive'
    });

    // Create report entry
    const report = new Report({
      userId: userId,
      title: reportTitle || 'TROFOS Executive Summary',
      status: 'queued',
      platform: 'trofos',
      template: 'executive',
      configuration: {
        connectionId,
        projectId: projectId,
        templateId: 'executive',
        title: reportTitle,
        includeExecutiveSummary: true,
        includeHighLevelMetrics: true,
        includeKeyDecisions: true,
        includeStrategicRecommendations: true
      }
    });

    await report.save();

    // Get auth token for platform integrations
    const authToken = getAuthToken(req);

    // Start async processing with real TROFOS data
    processTrofosReport(report.id, 'executive', authToken);

    return res.status(201).json({
      id: report.id,
      title: report.title,
      status: report.status,
      template: 'executive',
      platform: 'trofos',
      createdAt: report.createdAt,
      message: 'TROFOS Executive Report generation started with real platform data',
      estimatedSlides: '4-5 executive slides',
      features: [
        'Executive Summary Dashboard',
        'High-Level Project Metrics',
        'Resource Allocation Overview',
        'Strategic Recommendations'
      ]
    });

  } catch (error) {
    logger.error('Error generating TROFOS Executive Report:', error);
    return res.status(500).json({
      message: 'Server error during TROFOS Executive Report generation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Generate TROFOS Detailed Analysis with Comprehensive Charts
 * POST /api/reports/generate-trofos-detailed  
 */
export async function generateTrofosDetailedReport(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        message: 'User authentication required'
      });
    }

    // Extract projectId from request body
    const { connectionId, projectId, reportTitle } = req.body;

    // Validate required fields
    if (!connectionId) {
      return res.status(400).json({
        message: 'Connection ID is required'
      });
    }

    logger.info('Generating TROFOS Detailed Report with real data', {
      connectionId,
      projectId: projectId || 'default-project',
      reportTitle: reportTitle || 'TROFOS Detailed Analysis',
      endpoint: 'POST /api/reports/generate-trofos-detailed'
    });

    // Create report entry
    const report = new Report({
      userId: userId,
      title: reportTitle || 'TROFOS Detailed Analysis',
      status: 'queued',
      platform: 'trofos',
      template: 'detailed',
      configuration: {
        connectionId,
        projectId: projectId,
        templateId: 'detailed',
        title: reportTitle,
        includeDeepAnalysis: true,
        includeBenchmarking: true,
        includePredictiveAnalytics: true,
        includeImplementationRoadmap: true
      }
    });

    await report.save();

    // Get auth token for platform integrations
    const authToken = getAuthToken(req);

    // Start async processing with real TROFOS data
    processTrofosReport(report.id, 'detailed', authToken);

    return res.status(201).json({
      id: report.id,
      title: report.title,
      status: report.status,
      template: 'detailed',
      platform: 'trofos',
      createdAt: report.createdAt,
      message: 'TROFOS Detailed Report generation started with real platform data',
      estimatedSlides: '8-10 detailed slides',
      features: [
        'Comprehensive Project Analysis',
        'Sprint Velocity Tracking',
        'Resource Utilization Charts',
        'Predictive Analytics',
        'Implementation Roadmap'
      ]
    });

  } catch (error) {
    logger.error('Error generating TROFOS Detailed Report:', error);
    return res.status(500).json({
      message: 'Server error during TROFOS Detailed Report generation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Process TROFOS report generation with real platform data
 */
async function processTrofosReport(
  reportId: string,
  templateId: 'standard' | 'executive' | 'detailed',
  authToken?: string
) {
  try {
    logger.info('Starting TROFOS report processing', {
      reportId,
      templateId,
      hasAuthToken: !!authToken
    });

    // Get report from database
    const report = await Report.findById(reportId);
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    // Update progress
    report.status = 'processing';
    report.progress = 10;
    await report.save();

    // Fetch TROFOS project data
    const platformDataService = new PlatformDataService(authToken);
    const reportConfig: ReportGenerationConfig = {
      platform: 'trofos',
      connectionId: report.configuration.connectionId,
      projectId: report.configuration.projectId,
      templateId: templateId
    };

    logger.info('Fetching TROFOS project data', {
      connectionId: reportConfig.connectionId,
      projectId: reportConfig.projectId
    });

    const projectData = await platformDataService.fetchProjectData(reportConfig);

    if (!projectData || projectData.length === 0) {
      throw new Error('No TROFOS project data available');
    }

    const trofosProject = projectData[0];

    // Update progress
    report.progress = 30;
    await report.save();

    // Update project info
    report.projectInfo = {
      projectId: trofosProject.id,
      projectName: trofosProject.name,
      platform: 'trofos'
    };
    await report.save();

    // Generate PowerPoint using EnhancedTrofosReportGenerator
    const generator = new EnhancedTrofosReportGenerator();

    // Update progress
    report.progress = 50;
    await report.save();

    logger.info('Generating TROFOS PowerPoint with real data', {
      projectName: trofosProject.name,
      backlogCount: Array.isArray(trofosProject.tasks) ? trofosProject.tasks.length : 0,
      teamSize: Array.isArray(trofosProject.team) ? trofosProject.team.length : 0,
      isRealData: !trofosProject.fallbackData
    });

    const filename = await generator.generate(
      trofosProject,
      report.configuration,
      async (progress) => {
        report.progress = Math.min(50 + (progress * 0.4), 90);
        await report.save();
      }
    );

    // Generate analytics
    const analytics = {
      totalTasks: Array.isArray(trofosProject.tasks) ? trofosProject.tasks.length : 0,
      urgentTasks: Array.isArray(trofosProject.tasks) ?
        trofosProject.tasks.filter(task =>
          task.priority === 'High' || task.priority === 'Urgent' || task.priority === 'Critical'
        ).length : 0,
      riskLevel: Array.isArray(trofosProject.tasks) && trofosProject.tasks.length > 20 ? 'CRITICAL' : 'MEDIUM'
    };

    // Complete the report
    report.status = 'completed';
    report.progress = 100;
    report.filePath = filename;
    report.completedAt = new Date();
    await report.save();

    logger.info('Enhanced TROFOS Report generated successfully', {
      template: templateId,
      filename,
      dataSource: trofosProject.fallbackData ? 'DEMO/FALLBACK' : 'REAL TROFOS API',
      analysisResults: {
        totalTasks: analytics.totalTasks,
        urgentTasks: analytics.urgentTasks,
        riskLevel: analytics.riskLevel
      }
    });

    logger.info('TROFOS report generation completed successfully', {
      reportId,
      templateId,
      filename,
      taskCount: Array.isArray(trofosProject.tasks) ? trofosProject.tasks.length : 0,
      dataSource: trofosProject.fallbackData ? 'DEMO/FALLBACK' : 'REAL TROFOS'
    });

  } catch (error) {
    logger.error('Error processing TROFOS report:', error);

    // Update report status to failed
    try {
      const report = await Report.findById(reportId);
      if (report) {
        report.status = 'failed';
        report.progress = 0;
        await report.save();
      }
    } catch (updateError) {
      logger.error('Error updating failed report status:', updateError);
    }

    throw error;
  }
}

/**
 * Validate TROFOS connection and data availability
 * GET /api/reports/validate-trofos-connection/:connectionId
 */
export async function validateTrofosConnection(req: Request, res: Response) {
  try {
    const { connectionId } = req.params;
    const { projectId: queryProjectId } = req.query;
    const authToken = getAuthToken(req);

    logger.info('Validating TROFOS connection for report generation', {
      connectionId,
      queryProjectId: queryProjectId || 'not-provided'
    });

    const platformDataService = new PlatformDataService(authToken);

    // FIXED: Pass "127" as default projectId so Platform Integrations can use it
    // Platform Integrations will use its saved config projectId if available
    const reportConfig: ReportGenerationConfig = {
      platform: 'trofos',
      connectionId,
      projectId: queryProjectId as string || "127", // FIXED: Default to "127"
      templateId: 'standard'
    };

    logger.info('Calling platform data service with config', {
      connectionId: reportConfig.connectionId,
      projectId: reportConfig.projectId,
      note: 'Platform Integrations will use saved config projectId if available'
    });

    // Test data fetch
    const projectData = await platformDataService.fetchProjectData(reportConfig);

    if (!projectData || projectData.length === 0) {
      return res.status(404).json({
        valid: false,
        message: 'No project data available for this TROFOS connection',
        connectionId,
        projectId: reportConfig.projectId
      });
    }

    const trofosProject = projectData[0];

    return res.json({
      valid: true,
      connectionId,
      projectId: reportConfig.projectId,
      projectData: {
        name: trofosProject.name,
        platform: trofosProject.platform,
        taskCount: Array.isArray(trofosProject.tasks) ? trofosProject.tasks.length : 0,
        teamSize: Array.isArray(trofosProject.team) ? trofosProject.team.length : 0,
        isRealData: !trofosProject.fallbackData,
        dataQuality: trofosProject.fallbackData ? 'DEMO/FALLBACK' : 'LIVE TROFOS DATA'
      }
    });

  } catch (error) {
    logger.error('Error validating TROFOS connection:', error);
    return res.status(500).json({
      valid: false,
      message: 'Error validating TROFOS connection',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get TROFOS project preview and analytics
 * GET /api/reports/trofos-project-preview/:connectionId
 */
export async function getTrofosProjectPreview(req: Request, res: Response) {
  try {
    const { connectionId } = req.params;
    const { projectId: queryProjectId } = req.query;
    const authToken = getAuthToken(req);

    logger.info('Getting TROFOS project preview', {
      connectionId,
      queryProjectId: queryProjectId || 'not-provided'
    });

    const platformDataService = new PlatformDataService(authToken);

    // FIXED: Pass "127" as default projectId so Platform Integrations can use it
    const reportConfig: ReportGenerationConfig = {
      platform: 'trofos',
      connectionId,
      projectId: queryProjectId as string || "127", // FIXED: Default to "127"
      templateId: 'standard'
    };

    logger.info('Calling platform data service for preview with config', {
      connectionId: reportConfig.connectionId,
      projectId: reportConfig.projectId,
      note: 'Platform Integrations will use saved config projectId if available'
    });

    const projectData = await platformDataService.fetchProjectData(reportConfig);

    if (!projectData || projectData.length === 0) {
      return res.status(404).json({
        message: 'No TROFOS project data found',
        connectionId,
        projectId: reportConfig.projectId
      });
    }

    const trofosProject = projectData[0];
    const tasks = Array.isArray(trofosProject.tasks) ? trofosProject.tasks : [];
    const team = Array.isArray(trofosProject.team) ? trofosProject.team : [];

    // Calculate analytics
    const completedTasks = tasks.filter(task =>
      task.status === 'Done' || task.status === 'Completed' || task.status === 'Closed'
    ).length;

    const urgentTasks = tasks.filter(task =>
      task.priority === 'High' || task.priority === 'Urgent' || task.priority === 'Critical'
    ).length;

    const topAssigneeWorkload = tasks.length > 0 ?
      Math.max(...team.map(member =>
        tasks.filter(task => task.assignee === member.name).length
      )) / tasks.length * 100 : 0;

    return res.json({
      connectionId,
      projectId: reportConfig.projectId,
      projectName: trofosProject.name,
      platform: 'trofos',
      dataSource: trofosProject.fallbackData ? 'DEMO/FALLBACK' : 'LIVE TROFOS DATA',
      analytics: {
        totalTasks: tasks.length,
        completedTasks,
        completionRate: tasks.length > 0 ?
          Math.round((completedTasks / tasks.length) * 100) : 0,
        urgentTasks,
        unassignedTasks: tasks.filter(task => !task.assignee || task.assignee === 'Unassigned').length,
        topAssignee: tasks[0]?.assignee || 'None',
        topAssigneeWorkload,
        recommendedTemplate:
          tasks.length < 10 ? 'executive' :
            tasks.length > 50 ? 'detailed' : 'standard',
        urgencyLevel: urgentTasks > 5 ? 'HIGH' : urgentTasks > 2 ? 'MEDIUM' : 'LOW',
        capacityRisk: topAssigneeWorkload > 60 ? 'HIGH' :
          topAssigneeWorkload > 40 ? 'MEDIUM' : 'LOW'
      }
    });

  } catch (error) {
    logger.error('Error getting TROFOS project preview:', error);
    return res.status(500).json({
      message: 'Error getting TROFOS project preview',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}