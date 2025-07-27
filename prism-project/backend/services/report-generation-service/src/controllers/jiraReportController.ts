// backend/services/report-generation-service/src/controllers/jiraReportController.ts
// JIRA-SPECIFIC REPORT ENDPOINTS - Uses Real Jira Data from Connection: 686093672bb729e4dfaf6fa2
// Windows Compatible (No Unicode/Symbols)

import { Request, Response } from 'express';
import logger from '../utils/logger';
import { Report } from '../models/Report';
import { PlatformDataService, ReportGenerationConfig } from '../services/PlatformDataService';
import { EnhancedJiraReportGenerator } from '../generators/EnhancedJiraReportGenerator';
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
 * Generate Jira Standard Report with Professional Visualization
 * POST /api/reports/generate-jira-standard
 */
export async function generateJiraStandardReport(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        message: 'User authentication required'
      });
    }

    // ✅ FIX: Extract projectId from request body
    const { connectionId, projectId, reportTitle } = req.body;

    // Validate required fields
    if (!connectionId) {
      return res.status(400).json({
        message: 'Connection ID is required',
        example: {
          connectionId: '686093672bb729e4dfaf6fa2',
          projectId: 'PRISM', // Or LEARNJIRA, TCP, etc.
          reportTitle: 'Project Analysis Report'
        }
      });
    }

    logger.info('Generating Jira Standard Report with real data', {
      connectionId,
      projectId: projectId || 'PRISM', // Show what projectId we're using
      reportTitle: reportTitle || 'Jira Standard Report',
      endpoint: 'POST /api/reports/generate-jira-standard'
    });

    // Create report entry
    const report = new Report({
      userId: userId,
      title: reportTitle || 'Jira Standard Report',
      status: 'queued',
      platform: 'jira',
      template: 'standard',
      configuration: {
        connectionId,
        projectId: projectId || 'PRISM', // ✅ FIX: Use dynamic projectId
        templateId: 'standard',
        title: reportTitle,
        includeMetrics: true,
        includeTasks: true,
        includeTeamAnalysis: true,
        includeRiskAssessment: true,
        includePriorityBreakdown: true
      },
      projectInfo: {
        projectId: projectId || 'PRISM',
        projectName: '', // Will be populated when data is fetched
        platform: 'jira'
      }
    });

    await report.save();

    // Get auth token for platform integrations
    const authToken = getAuthToken(req);

    // Start async processing with real Jira data
    processJiraReport(report.id, 'standard', authToken);

    return res.status(201).json({
      id: report.id,
      title: report.title,
      status: report.status,
      template: 'standard',
      platform: 'jira',
      createdAt: report.createdAt,
      message: 'Jira Standard Report generation started with real platform data',
      estimatedSlides: '5-7 professional slides',
      features: [
        'Project Health Dashboard',
        'Task Status Analysis (Real Jira Data)',
        'Team Workload Distribution',
        'Priority & Risk Assessment',
        'Actionable Recommendations'
      ]
    });

  } catch (error) {
    logger.error('Error generating Jira Standard Report:', error);
    return res.status(500).json({
      message: 'Server error during Jira Standard Report generation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Generate Jira Executive Summary with KPI Dashboard  
 * POST /api/reports/generate-jira-executive
 */
export async function generateJiraExecutiveReport(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        message: 'User authentication required'
      });
    }

    // ✅ FIX: Extract projectId from request body
    const { connectionId, projectId, reportTitle } = req.body;

    // Validate required fields
    if (!connectionId) {
      return res.status(400).json({
        message: 'Connection ID is required'
      });
    }

    logger.info('Generating Jira Executive Report with real data', {
      connectionId,
      projectId: projectId || 'PRISM', // Show what projectId we're using
      reportTitle: reportTitle || 'Jira Executive Summary',
      endpoint: 'POST /api/reports/generate-jira-executive'
    });

    // Create report entry
    const report = new Report({
      userId: userId,
      title: reportTitle || 'Jira Executive Summary',
      status: 'queued',
      platform: 'jira',
      template: 'executive',
      configuration: {
        connectionId,
        projectId: projectId || 'PRISM', // ✅ FIX: Use dynamic projectId
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

    // Start async processing with real Jira data
    processJiraReport(report.id, 'executive', authToken);

    return res.status(201).json({
      id: report.id,
      title: report.title,
      status: report.status,
      template: 'executive',
      platform: 'jira',
      createdAt: report.createdAt,
      message: 'Jira Executive Report generation started with real platform data'
    });

  } catch (error) {
    logger.error('Error generating Jira Executive Report:', error);
    return res.status(500).json({
      message: 'Server error during Jira Executive Report generation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Generate Jira Detailed Analysis with Comprehensive Charts
 * POST /api/reports/generate-jira-detailed  
 */
export async function generateJiraDetailedReport(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        message: 'User authentication required'
      });
    }

    // ✅ FIX: Extract projectId from request body
    const { connectionId, projectId, reportTitle } = req.body;

    // Validate required fields
    if (!connectionId) {
      return res.status(400).json({
        message: 'Connection ID is required'
      });
    }

    logger.info('Generating Jira Detailed Report with real data', {
      connectionId,
      projectId: projectId || 'PRISM', // Show what projectId we're using
      reportTitle: reportTitle || 'Jira Detailed Analysis',
      endpoint: 'POST /api/reports/generate-jira-detailed'
    });

    // Create report entry
    const report = new Report({
      userId: userId,
      title: reportTitle || 'Jira Detailed Analysis',
      status: 'queued',
      platform: 'jira',
      template: 'detailed',
      configuration: {
        connectionId,
        projectId: projectId || 'PRISM', // ✅ FIX: Use dynamic projectId
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

    // Start async processing with real Jira data
    processJiraReport(report.id, 'detailed', authToken);

    return res.status(201).json({
      id: report.id,
      title: report.title,
      status: report.status,
      template: 'detailed',
      platform: 'jira',
      createdAt: report.createdAt,
      message: 'Jira Detailed Report generation started with real platform data'
    });

  } catch (error) {
    logger.error('Error generating Jira Detailed Report:', error);
    return res.status(500).json({
      message: 'Server error during Jira Detailed Report generation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Process Jira report generation with real platform data
 */
async function processJiraReport(
  reportId: string,
  templateId: 'standard' | 'executive' | 'detailed',
  authToken?: string
) {
  try {
    const report = await Report.findById(reportId);
    if (!report) {
      logger.error(`Jira report not found: ${reportId}`);
      return;
    }

    // Update status to processing
    report.status = 'processing';
    report.progress = 0;
    await report.save();

    logger.info(`Starting Jira ${templateId} report processing`, {
      reportId,
      connectionId: report.configuration.connectionId,
      templateId
    });

    // Initialize platform data service with auth token
    const platformDataService = new PlatformDataService(authToken);

    // 🔧 FIX: Use projectId from report configuration, not hardcoded 'PRISM'
    const projectId = report.configuration.projectId || 'PRISM';

    // 🔍 DEBUG: Log what projectId we're actually using
    console.log('🎯 DEBUG - Report Processing:', {
      reportId,
      configuredProjectId: report.configuration.projectId,
      configuredProject: report.configuration.projectId,
      finalProjectId: projectId,
      fullConfiguration: report.configuration
    });

    // Create report configuration for real Jira data fetch
    const reportConfig: ReportGenerationConfig = {
      platform: 'jira',
      connectionId: report.configuration.connectionId,
      projectId: projectId, // 🔧 FIX: Use dynamic projectId instead of hardcoded 'PRISM'
      templateId,
      configuration: report.configuration
    };

    // Update progress
    report.progress = 10;
    await report.save();

    // Fetch REAL Jira project data
    logger.info('Fetching real Jira data from platform integrations', {
      connectionId: reportConfig.connectionId,
      projectId: reportConfig.projectId // 🔍 This should now show the correct projectId
    });

    // ADD BEFORE platformDataService.fetchProjectData call:
    console.log('\n📡 About to call Platform Data Service with:');
    let connectionId: any;
    let configuration: any;
    const reportConfig1 = {
      platform: 'jira',
      connectionId,
      projectId,
      templateId,
      configuration
    };
    console.log('   Config:', JSON.stringify(reportConfig1, null, 2));

    const projectData = await platformDataService.fetchProjectData(reportConfig);

    if (!projectData || projectData.length === 0) {
      throw new Error('No project data returned from Jira platform');
    }

    const jiraProject = projectData[0];

    // ADD AFTER fetchProjectData call:
    console.log('\n📥 Platform Data Service Response:');
    console.log('   - Project ID:', jiraProject.id);
    console.log('   - Project Name:', jiraProject.name);
    console.log('   - Task Count:', jiraProject.tasks?.length || 0);
    console.log('   - Is Fallback:', jiraProject.fallbackData);
    console.log('   - Sample Tasks:', jiraProject.tasks?.slice(0, 2).map(t => ({
      id: t.id, name: t.name, assignee: t.assignee
    })));

    // Log real data confirmation
    logger.info('Real Jira data fetched successfully', {
      platform: jiraProject.platform,
      projectName: jiraProject.name,
      projectId: jiraProject.id, // 🔍 This should now show the correct project
      taskCount: Array.isArray(jiraProject.tasks) ? jiraProject.tasks.length : 0,
      teamSize: Array.isArray(jiraProject.team) ? jiraProject.team.length : 0,
      isRealData: !jiraProject.fallbackData,
      dataSource: jiraProject.fallbackData ? 'DEMO/FALLBACK' : 'REAL JIRA API',
      sampleTasks: Array.isArray(jiraProject.tasks) ?
        jiraProject.tasks.slice(0, 3).map(task => ({
          id: task.id,
          name: task.name,
          status: task.status,
          assignee: task.assignee
        })) : []
    });

    // Update progress
    report.progress = 30;
    await report.save();

    // Generate report based on template
    let filename: string;
    let templateGenerator: any;

    // Generate report using EnhancedJiraReportGenerator
    templateGenerator = new EnhancedJiraReportGenerator();

    const reportConfig2 = {
      templateId,
      title: `${jiraProject.name} - ${templateId.charAt(0).toUpperCase() + templateId.slice(1)} Analysis`,
      includeTeamAnalysis: templateId !== 'executive',
      includeRiskAssessment: true,
      includePriorityBreakdown: true
    };

    filename = await templateGenerator.generate(jiraProject, reportConfig2);
    // Update progress
    report.progress = 80;
    await report.save();

    // Calculate analytics for report completion
    const analytics = {
      totalTasks: Array.isArray(jiraProject.tasks) ? jiraProject.tasks.length : 0,
      urgentTasks: Array.isArray(jiraProject.tasks) ?
        jiraProject.tasks.filter(task =>
          task.priority === 'High' || task.priority === 'Urgent' || task.priority === 'Critical'
        ).length : 0,
      riskLevel: Array.isArray(jiraProject.tasks) && jiraProject.tasks.length > 20 ? 'CRITICAL' : 'MEDIUM'
    };

    // Complete the report
    report.status = 'completed';
    report.progress = 100;
    report.filePath = filename;
    report.completedAt = new Date();
    await report.save();

    logger.info('Enhanced Jira Report generated successfully', {
      template: templateId,
      filename,
      dataSource: jiraProject.fallbackData ? 'DEMO/FALLBACK' : 'REAL JIRA API',
      analysisResults: {
        totalTasks: analytics.totalTasks,
        urgentTasks: analytics.urgentTasks,
        riskLevel: analytics.riskLevel
      }
    });

    logger.info('Jira report generation completed successfully', {
      reportId,
      templateId,
      filename,
      taskCount: Array.isArray(jiraProject.tasks) ? jiraProject.tasks.length : 0,
      dataSource: jiraProject.fallbackData ? 'DEMO/FALLBACK' : 'REAL JIRA'
    });

  } catch (error) {
    logger.error('Error processing Jira report:', error);

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
 * Validate Jira connection and data availability
 * GET /api/reports/validate-jira-connection/:connectionId
 */
export async function validateJiraConnection(req: Request, res: Response) {
  try {
    const { connectionId } = req.params;
    const { projectId } = req.query; // ✅ FIX: Get projectId from query params
    const authToken = getAuthToken(req);

    logger.info('Validating Jira connection for report generation', {
      connectionId,
      projectId: projectId || 'PRISM'
    });

    const platformDataService = new PlatformDataService(authToken);

    const reportConfig: ReportGenerationConfig = {
      platform: 'jira',
      connectionId,
      projectId: (projectId as string) || 'PRISM', // ✅ FIX: Use dynamic projectId
      templateId: 'standard'
    };

    // Test data fetch
    const projectData = await platformDataService.fetchProjectData(reportConfig);

    if (!projectData || projectData.length === 0) {
      return res.status(404).json({
        valid: false,
        message: 'No project data available for this Jira connection',
        connectionId,
        projectId: reportConfig.projectId
      });
    }

    const jiraProject = projectData[0];

    return res.json({
      valid: true,
      connectionId,
      projectId: reportConfig.projectId,
      projectData: {
        name: jiraProject.name,
        platform: jiraProject.platform,
        taskCount: Array.isArray(jiraProject.tasks) ? jiraProject.tasks.length : 0,
        teamSize: Array.isArray(jiraProject.team) ? jiraProject.team.length : 0,
        isRealData: !jiraProject.fallbackData,
        dataQuality: jiraProject.fallbackData ? 'DEMO/FALLBACK' : 'LIVE JIRA DATA'
      }
    });

  } catch (error) {
    logger.error('Error validating Jira connection:', error);
    return res.status(500).json({
      valid: false,
      message: 'Error validating Jira connection',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get Jira project preview for report generation
 * GET /api/reports/jira-project-preview/:connectionId
 */
export async function getJiraProjectPreview(req: Request, res: Response) {
  try {
    const { connectionId } = req.params;
    const { projectId } = req.query; // ✅ FIX: Get projectId from query params
    const authToken = getAuthToken(req);

    logger.info('Getting Jira project preview', {
      connectionId,
      projectId: projectId || 'PRISM'
    });

    const platformDataService = new PlatformDataService(authToken);

    const reportConfig: ReportGenerationConfig = {
      platform: 'jira',
      connectionId,
      projectId: (projectId as string) || 'PRISM', // ✅ FIX: Use dynamic projectId
      templateId: 'standard'
    };

    const projectData = await platformDataService.fetchProjectData(reportConfig);

    if (!projectData || projectData.length === 0) {
      return res.status(404).json({
        message: 'No Jira project data found for this connection',
        connectionId,
        projectId: reportConfig.projectId
      });
    }

    const jiraProject = projectData[0];
    const tasks = Array.isArray(jiraProject.tasks) ? jiraProject.tasks : [];

    // Calculate analytics for the specific project
    const urgentTasks = tasks.filter(task =>
      task.priority === 'High' || task.priority === 'Urgent' || task.priority === 'Critical'
    ).length;

    const completedTasks = tasks.filter(task =>
      task.status === 'Done' || task.status === 'Completed' || task.status === 'Resolved'
    ).length;

    const topAssigneeWorkload = tasks.length > 0 ?
      Math.round((tasks.filter(task => task.assignee === tasks[0]?.assignee).length / tasks.length) * 100) : 0;

    return res.json({
      connectionId,
      projectId: reportConfig.projectId,
      projectName: jiraProject.name,
      projectData: jiraProject,
      analytics: {
        totalTasks: tasks.length,
        completedTasks,
        completionRate: tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0,
        urgentTasks,
        unassignedTasks: tasks.filter(task => !task.assignee || task.assignee === 'Unassigned').length,
        topAssignee: tasks[0]?.assignee || 'None',
        topAssigneeWorkload,
        recommendedTemplate:
          tasks.length < 10 ? 'executive' :
            tasks.length > 50 ? 'detailed' : 'standard',
        urgencyLevel: urgentTasks > 10 ? 'HIGH' : urgentTasks > 5 ? 'MEDIUM' : 'LOW',
        capacityRisk: topAssigneeWorkload > 70 ? 'CRITICAL' :
          topAssigneeWorkload > 50 ? 'HIGH' : 'LOW'
      }
    });

  } catch (error) {
    logger.error('Error getting Jira project preview:', error);
    return res.status(500).json({
      message: 'Error getting Jira project preview',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}