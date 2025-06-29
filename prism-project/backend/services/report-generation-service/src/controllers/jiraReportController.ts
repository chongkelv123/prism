// backend/services/report-generation-service/src/controllers/jiraReportController.ts
// JIRA-SPECIFIC REPORT ENDPOINTS - Uses Real Jira Data from Connection: 686093672bb729e4dfaf6fa2
// Windows Compatible (No Unicode/Symbols)

import { Request, Response } from 'express';
import logger from '../utils/logger';
import { Report } from '../models/Report';
import { PlatformDataService, ReportGenerationConfig } from '../services/PlatformDataService';
import { EnhancedJiraReportGenerator } from '../generators/EnhancedJiraReportGenerator';

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
    const { connectionId, reportTitle } = req.body;

    // Validate required fields
    if (!connectionId) {
      return res.status(400).json({
        message: 'Connection ID is required',
        example: {
          connectionId: '686093672bb729e4dfaf6fa2',
          reportTitle: 'PRISM Standard Report'
        }
      });
    }

    logger.info('Generating Jira Standard Report with real data', {
      connectionId,
      reportTitle: reportTitle || 'Jira Standard Report',
      endpoint: 'POST /api/reports/generate-jira-standard'
    });

    // Create report entry
    const report = new Report({
      title: reportTitle || 'Jira Standard Report',
      status: 'queued',
      platform: 'jira',
      template: 'standard',
      configuration: {
        connectionId,
        projectId: 'PRISM', // Default to PRISM project
        templateId: 'standard',
        title: reportTitle,
        includeTeamAnalysis: true,
        includeRiskAssessment: true,
        includePriorityBreakdown: true
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
    const { connectionId, reportTitle } = req.body;

    if (!connectionId) {
      return res.status(400).json({
        message: 'Connection ID is required',
        example: {
          connectionId: '686093672bb729e4dfaf6fa2',
          reportTitle: 'PRISM Executive Summary'
        }
      });
    }

    logger.info('Generating Jira Executive Report with real data', {
      connectionId,
      reportTitle: reportTitle || 'Jira Executive Summary',
      endpoint: 'POST /api/reports/generate-jira-executive'
    });

    const report = new Report({
      title: reportTitle || 'Jira Executive Summary',
      status: 'queued',
      platform: 'jira',
      template: 'executive',
      configuration: {
        connectionId,
        projectId: 'PRISM',
        templateId: 'executive',
        title: reportTitle,
        focusOnKPIs: true,
        includeCriticalAlerts: true,
        includeStrategicRecommendations: true
      }
    });

    await report.save();

    const authToken = getAuthToken(req);
    processJiraReport(report.id, 'executive', authToken);

    return res.status(201).json({
      id: report.id,
      title: report.title,
      status: report.status,
      template: 'executive',
      platform: 'jira',
      createdAt: report.createdAt,
      message: 'Jira Executive Summary generation started with real platform data',
      estimatedSlides: '4-5 executive-focused slides',
      features: [
        'Executive KPI Dashboard',
        'Critical Alerts & Risk Summary',
        'Strategic Progress Overview', 
        'Key Decision Points',
        'High-Level Recommendations'
      ]
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
    const { connectionId, reportTitle } = req.body;

    if (!connectionId) {
      return res.status(400).json({
        message: 'Connection ID is required',
        example: {
          connectionId: '686093672bb729e4dfaf6fa2',
          reportTitle: 'PRISM Detailed Analysis'
        }
      });
    }

    logger.info('Generating Jira Detailed Report with real data', {
      connectionId,
      reportTitle: reportTitle || 'Jira Detailed Analysis',
      endpoint: 'POST /api/reports/generate-jira-detailed'
    });

    const report = new Report({
      title: reportTitle || 'Jira Detailed Analysis',
      status: 'queued',
      platform: 'jira',
      template: 'detailed',
      configuration: {
        connectionId,
        projectId: 'PRISM',
        templateId: 'detailed',
        title: reportTitle,
        includeDeepAnalysis: true,
        includeBenchmarking: true,
        includePredictiveAnalytics: true,
        includeImplementationRoadmap: true
      }
    });

    await report.save();

    const authToken = getAuthToken(req);
    processJiraReport(report.id, 'detailed', authToken);

    return res.status(201).json({
      id: report.id,
      title: report.title,
      status: report.status,
      template: 'detailed',
      platform: 'jira',
      createdAt: report.createdAt,
      message: 'Jira Detailed Analysis generation started with real platform data',
      estimatedSlides: '8-10 comprehensive slides',
      features: [
        'Complete Project Health Analysis',
        'Detailed Team Performance Metrics',
        'Priority & Risk Deep-Dive',
        'Predictive Analytics',
        'Bottleneck Identification',
        'Implementation Roadmap',
        'Benchmarking Analysis',
        'Comprehensive Recommendations'
      ]
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

    // Create report configuration for real Jira data fetch
    const reportConfig: ReportGenerationConfig = {
      platform: 'jira',
      connectionId: report.configuration.connectionId,
      projectId: report.configuration.projectId || 'PRISM',
      templateId,
      configuration: report.configuration
    };

    // Update progress
    report.progress = 10;
    await report.save();

    // Fetch REAL Jira project data
    logger.info('Fetching real Jira data from platform integrations', {
      connectionId: reportConfig.connectionId,
      projectId: reportConfig.projectId
    });

    const projectData = await platformDataService.fetchProjectData(reportConfig);

    if (!projectData || projectData.length === 0) {
      throw new Error('No project data returned from Jira platform');
    }

    const jiraProject = projectData[0];

    // Log real data confirmation
    logger.info('Real Jira data fetched successfully', {
      platform: jiraProject.platform,
      projectName: jiraProject.name,
      taskCount: Array.isArray(jiraProject.tasks) ? jiraProject.tasks.length : 0,
      teamSize: Array.isArray(jiraProject.team) ? jiraProject.team.length : 0,
      isRealData: !jiraProject.fallbackData,
      dataSource: jiraProject.fallbackData ? 'DEMO/FALLBACK' : 'REAL JIRA API',
      sampleTasks: Array.isArray(jiraProject.tasks) ? 
        jiraProject.tasks.slice(0, 3).map(t => ({ id: t.id, name: t.name, status: t.status, assignee: t.assignee })) : 
        'No tasks'
    });

    // Update progress
    report.progress = 30;
    await report.save();

    // Initialize enhanced Jira report generator
    const jiraGenerator = new EnhancedJiraReportGenerator();

    // Generate PowerPoint with real Jira data
    const filename = await jiraGenerator.generate(
      jiraProject,
      {
        templateId,
        title: report.title,
        includeTeamAnalysis: true,
        includeRiskAssessment: true,
        includePriorityBreakdown: true
      },
      async (progress) => {
        report.progress = 30 + (progress * 0.6);
        await report.save();
      }
    );

    // Complete the report
    report.status = 'completed';
    report.progress = 100;
    report.filePath = filename;
    report.completedAt = new Date();
    await report.save();

    logger.info('Jira report generation completed successfully', {
      reportId,
      templateId,
      filename,
      dataSource: jiraProject.fallbackData ? 'DEMO' : 'REAL JIRA',
      taskCount: Array.isArray(jiraProject.tasks) ? jiraProject.tasks.length : 0
    });

  } catch (error) {
    logger.error('Error processing Jira report:', error);

    // Update report status to failed
    try {
      const report = await Report.findById(reportId);
      if (report) {
        report.status = 'failed';
        report.error = error instanceof Error ? error.message : 'Unknown error';
        await report.save();
      }
    } catch (updateError) {
      logger.error('Error updating failed report status:', updateError);
    }
  }
}

/**
 * Validate Jira connection and data availability
 * GET /api/reports/validate-jira-connection/:connectionId
 */
export async function validateJiraConnection(req: Request, res: Response) {
  try {
    const { connectionId } = req.params;
    const authToken = getAuthToken(req);

    logger.info('Validating Jira connection for report generation', { connectionId });

    const platformDataService = new PlatformDataService(authToken);
    
    const reportConfig: ReportGenerationConfig = {
      platform: 'jira',
      connectionId,
      projectId: 'PRISM',
      templateId: 'standard'
    };

    // Test data fetch
    const projectData = await platformDataService.fetchProjectData(reportConfig);
    
    if (!projectData || projectData.length === 0) {
      return res.status(404).json({
        valid: false,
        message: 'No project data available for this Jira connection',
        connectionId
      });
    }

    const jiraProject = projectData[0];

    return res.json({
      valid: true,
      connectionId,
      projectData: {
        name: jiraProject.name,
        platform: jiraProject.platform,
        taskCount: Array.isArray(jiraProject.tasks) ? jiraProject.tasks.length : 0,
        teamSize: Array.isArray(jiraProject.team) ? jiraProject.team.length : 0,
        isRealData: !jiraProject.fallbackData,
        dataQuality: jiraProject.fallbackData ? 'DEMO/FALLBACK' : 'LIVE JIRA DATA'
      },
      capabilities: {
        canGenerateStandard: true,
        canGenerateExecutive: true,
        canGenerateDetailed: true,
        hasTaskData: Array.isArray(jiraProject.tasks) && jiraProject.tasks.length > 0,
        hasTeamData: Array.isArray(jiraProject.team) && jiraProject.team.length > 0,
        hasMetrics: Array.isArray(jiraProject.metrics) && jiraProject.metrics.length > 0
      },
      sampleData: {
        tasks: Array.isArray(jiraProject.tasks) ? 
          jiraProject.tasks.slice(0, 3).map(task => ({
            id: task.id,
            name: task.name,
            status: task.status,
            assignee: task.assignee,
            priority: task.priority
          })) : [],
        team: Array.isArray(jiraProject.team) ? 
          jiraProject.team.slice(0, 3).map(member => ({
            name: member.name,
            role: member.role,
            taskCount: member.taskCount
          })) : []
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
    const authToken = getAuthToken(req);

    logger.info('Getting Jira project preview', { connectionId });

    const platformDataService = new PlatformDataService(authToken);
    
    const reportConfig: ReportGenerationConfig = {
      platform: 'jira',
      connectionId,
      projectId: 'PRISM',
      templateId: 'standard'
    };

    const projectData = await platformDataService.fetchProjectData(reportConfig);
    
    if (!projectData || projectData.length === 0) {
      return res.status(404).json({
        message: 'No Jira project data found for this connection',
        connectionId
      });
    }

    const jiraProject = projectData[0];
    const tasks = Array.isArray(jiraProject.tasks) ? jiraProject.tasks : [];

    // Calculate preview analytics
    const statusCounts = new Map<string, number>();
    const priorityCounts = new Map<string, number>();
    const assigneeCounts = new Map<string, number>();

    tasks.forEach(task => {
      // Status analysis
      const status = task.status || 'Unknown';
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);

      // Priority analysis
      const priority = task.priority || 'None';
      priorityCounts.set(priority, (priorityCounts.get(priority) || 0) + 1);

      // Assignee analysis
      const assignee = task.assignee || 'Unassigned';
      assigneeCounts.set(assignee, (assigneeCounts.get(assignee) || 0) + 1);
    });

    // Calculate completion rate
    const doneTasks = statusCounts.get('Done') || 0;
    const completionRate = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

    // Calculate urgent tasks
    const urgentTasks = (priorityCounts.get('High') || 0) + (priorityCounts.get('Highest') || 0);

    // Calculate unassigned tasks
    const unassignedTasks = assigneeCounts.get('Unassigned') || 0;

    // Find top assignee workload
    const topAssignee = Array.from(assigneeCounts.entries())
      .filter(([name]) => name !== 'Unassigned')
      .sort(([,a], [,b]) => b - a)[0];
    
    const topAssigneeWorkload = topAssignee ? 
      Math.round((topAssignee[1] / tasks.length) * 100) : 0;

    return res.json({
      connectionId,
      project: {
        name: jiraProject.name,
        platform: jiraProject.platform,
        isRealData: !jiraProject.fallbackData,
        dataSource: jiraProject.fallbackData ? 'DEMO/FALLBACK' : 'LIVE JIRA DATA',
        lastUpdated: jiraProject.lastUpdated
      },
      analytics: {
        totalTasks: tasks.length,
        completionRate,
        urgentTasks,
        unassignedTasks,
        topAssigneeWorkload,
        topAssignee: topAssignee ? topAssignee[0] : 'None'
      },
      distribution: {
        status: Array.from(statusCounts.entries()).map(([status, count]) => ({
          status,
          count,
          percentage: Math.round((count / tasks.length) * 100)
        })),
        priority: Array.from(priorityCounts.entries()).map(([priority, count]) => ({
          priority,
          count,
          percentage: Math.round((count / tasks.length) * 100)
        })),
        assignee: Array.from(assigneeCounts.entries()).map(([assignee, count]) => ({
          assignee,
          count,
          percentage: Math.round((count / tasks.length) * 100)
        }))
      },
      recommendations: {
        templateSuggestion: urgentTasks > 10 || topAssigneeWorkload > 70 ? 'executive' : 
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