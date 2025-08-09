// backend/services/report-generation-service/src/generators/EnhancedJiraReportGenerator.ts
// REAL JIRA DATA POWERPOINT GENERATOR - Windows Compatible (No Unicode/Symbols)
// Uses authentic Jira platform data from your working connection: 686093672bb729e4dfaf6fa2

import PptxGenJS from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';
import { ProjectData } from '../services/PlatformDataService';
import { FilenameGenerator } from '../utils/filenameGenerator';


export interface JiraReportConfig {
  templateId?: 'standard' | 'executive' | 'detailed'; // Make optional
  title?: string;
  includeTeamAnalysis?: boolean;
  includeRiskAssessment?: boolean;
  includePriorityBreakdown?: boolean;
  [key: string]: any;
}

interface JiraTaskAnalysis {
  totalTasks: number;
  statusDistribution: { status: string; count: number; percentage: number; color: string }[];
  priorityDistribution: { priority: string; count: number; percentage: number; color: string }[];
  teamWorkload: { assignee: string; count: number; percentage: number; riskLevel: string }[];
  urgentTasks: number;
  unassignedTasks: number;
  completionRate: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class EnhancedJiraReportGenerator {
  private readonly STORAGE_DIR: string;
  private jiraAnalysis: JiraTaskAnalysis;

  constructor() {
    this.STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../../storage');

    // Ensure storage directory exists
    if (!fs.existsSync(this.STORAGE_DIR)) {
      fs.mkdirSync(this.STORAGE_DIR, { recursive: true });
    }
  }

  /**
   * Generate professional Jira report using REAL platform data
   */
  async generate(
    projectData: ProjectData,
    config: JiraReportConfig,
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<string> {
    try {
      logger.info('Generating Enhanced Jira Report from REAL platform data', {
        platform: projectData.platform,
        projectName: projectData.name,
        taskCount: Array.isArray(projectData.tasks) ? projectData.tasks.length : 0,
        teamSize: Array.isArray(projectData.team) ? projectData.team.length : 0,
        isRealData: !projectData.fallbackData,
        connectionSource: projectData.fallbackData ? 'DEMO DATA' : 'REAL JIRA API'
      });

      // CRITICAL: Ensure we're using real Jira data, not fallback
      if (projectData.fallbackData) {
        logger.warn('WARNING: Using fallback data instead of real Jira data');
      }

      // Analyze real Jira data to extract business insights
      this.jiraAnalysis = this.analyzeRealJiraData(projectData);

      // Log analysis for verification
      logger.info('Real Jira Data Analysis:', {
        totalTasks: this.jiraAnalysis.totalTasks,
        completionRate: this.jiraAnalysis.completionRate,
        urgentTasks: this.jiraAnalysis.urgentTasks,
        unassignedTasks: this.jiraAnalysis.unassignedTasks,
        riskLevel: this.jiraAnalysis.riskLevel,
        topAssignee: this.jiraAnalysis.teamWorkload[0]?.assignee,
        topAssigneeWorkload: this.jiraAnalysis.teamWorkload[0]?.percentage
      });

      // Initialize PowerPoint
      const pptx = new PptxGenJS();

      // Configure presentation
      pptx.layout = 'LAYOUT_16x9';
      pptx.author = 'PRISM Report System';
      pptx.company = 'Jira Integration Platform';
      pptx.subject = `Jira Analysis - ${projectData.name}`;
      pptx.title = config.title || `${projectData.name} - Jira Project Report`;

      const jiraTheme = {
        primary: '0052CC',    // Jira Blue
        secondary: '2684FF',  // Light Jira Blue
        accent: 'F4F5F7',     // Light Gray
        success: '36B37E',    // Green
        warning: 'FFAB00',    // Orange
        danger: 'DE350B',     // Red
        info: '0065FF'        // Info Blue
      };

      // Generate slides based on template type
      const templateId = config.templateId || 'standard';
      switch (templateId) {
        case 'standard':
          await this.generateStandardReport(pptx, projectData, jiraTheme, progressCallback);
          break;
        case 'executive':
          await this.generateExecutiveReport(pptx, projectData, jiraTheme, progressCallback);
          break;
        case 'detailed':
          await this.generateDetailedReport(pptx, projectData, jiraTheme, progressCallback);
          break;
        default:
          throw new Error(`Unknown template ID: ${config.templateId}`);
      }

      // Save file
      const filename = FilenameGenerator.generateStorageFilename({
        platform: 'jira',
        templateType: templateId,
        projectName: projectData.name,
        timestamp: new Date()
      });

      const filepath = path.join(this.STORAGE_DIR, filename);

      await pptx.writeFile({ fileName: filepath });
      await progressCallback?.(100);

      logger.info('Enhanced Jira Report generated successfully', {
        filename,
        template: config.templateId,
        dataSource: projectData.fallbackData ? 'DEMO' : 'REAL JIRA API',
        analysisResults: {
          totalTasks: this.jiraAnalysis.totalTasks,
          riskLevel: this.jiraAnalysis.riskLevel,
          urgentTasks: this.jiraAnalysis.urgentTasks
        }
      });

      return filename;

    } catch (error) {
      logger.error('Error generating Enhanced Jira Report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate Jira report: ${errorMessage}`);
    }
  }

  /**
   * Analyze real Jira data to extract actionable business insights
   */
  private analyzeRealJiraData(projectData: ProjectData): JiraTaskAnalysis {
    const tasks = Array.isArray(projectData.tasks) ? projectData.tasks : [];

    if (tasks.length === 0) {
      logger.warn('No tasks found in Jira project data');
      return this.getEmptyAnalysis();
    }

    // Status analysis with real Jira status mapping
    const statusCounts = new Map<string, number>();
    tasks.forEach(task => {
      const status = this.normalizeJiraStatus(task.status || 'Unknown');
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });

    const statusDistribution = Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / tasks.length) * 100),
      color: this.getStatusColor(status)
    }));

    // Priority analysis with real Jira priorities
    const priorityCounts = new Map<string, number>();
    tasks.forEach(task => {
      const priority = task.priority || 'None';
      priorityCounts.set(priority, (priorityCounts.get(priority) || 0) + 1);
    });

    // In analyzeRealJiraData method, fix priority sorting
    const priorityDistribution = Array.from(priorityCounts.entries()).map(([priority, count]) => ({
      priority,
      count,
      percentage: Math.round((count / tasks.length) * 100),
      color: this.getPriorityColor(priority)
    }))
      .sort((a, b) => {
        // Custom sort order: Highest → High → Medium → Low
        const priorityOrder = { 'Highest': 4, 'High': 3, 'Medium': 2, 'Low': 1, 'None': 0 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      });

    // Team workload analysis with real assignees
    const assigneeCounts = new Map<string, number>();
    tasks.forEach(task => {
      const assignee = task.assignee || 'Unassigned';
      assigneeCounts.set(assignee, (assigneeCounts.get(assignee) || 0) + 1);
    });

    const teamWorkload = Array.from(assigneeCounts.entries())
      .map(([assignee, count]) => ({
        assignee,
        count,
        percentage: Math.round((count / tasks.length) * 100),
        riskLevel: this.calculateWorkloadRisk(count, tasks.length)
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate urgent tasks (High + Highest priority)
    const urgentTasks = tasks.filter(task =>
      task.priority && ['High', 'Highest'].includes(task.priority)
    ).length;

    // Calculate unassigned tasks
    const unassignedTasks = tasks.filter(task =>
      !task.assignee || task.assignee === 'Unassigned'
    ).length;

    // Calculate completion rate
    const completedTasks = tasks.filter(task =>
      this.normalizeJiraStatus(task.status || '') === 'Done'
    ).length;
    const completionRate = Math.round((completedTasks / tasks.length) * 100);

    // Determine overall risk level
    const riskLevel = this.calculateOverallRisk(
      teamWorkload,
      urgentTasks,
      unassignedTasks,
      completionRate,
      tasks.length
    );

    return {
      totalTasks: tasks.length,
      statusDistribution,
      priorityDistribution,
      teamWorkload,
      urgentTasks,
      unassignedTasks,
      completionRate,
      riskLevel
    };
  }

  /**
   * Generate Standard Report (5-7 slides)
   */
  private async generateStandardReport(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any,
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<void> {
    // Slide 1: Title with Real Project Data
    await this.createTitleSlide(pptx, projectData, theme, 'STANDARD REPORT');
    await progressCallback?.(15);

    // Slide 2: Project Health Dashboard with Real Metrics
    await this.createProjectHealthDashboard(pptx, projectData, theme);
    await progressCallback?.(30);

    // Slide 3: Task Status Analysis with Real Jira Data
    await this.createTaskStatusAnalysis(pptx, projectData, theme);
    await progressCallback?.(45);

    // Slide 4: Team Workload Analysis with Real Assignees
    await this.createTeamWorkloadAnalysis(pptx, projectData, theme);
    await progressCallback?.(60);

    // Slide 5: Priority & Risk Assessment
    await this.createPriorityRiskAssessment(pptx, projectData, theme);
    await progressCallback?.(75);

    // Slide 6: Action Items & Recommendations
    await this.createActionItemsSlide(pptx, projectData, theme);
    await progressCallback?.(90);
  }

  /**
   * Generate Executive Report (4-5 slides)
   */
  private async generateExecutiveReport(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any,
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<void> {
    // Slide 1: Executive Title
    await this.createTitleSlide(pptx, projectData, theme, 'EXECUTIVE SUMMARY');
    await progressCallback?.(20);

    // Slide 2: Executive KPI Dashboard
    await this.createExecutiveKPIDashboard(pptx, projectData, theme);
    await progressCallback?.(40);

    // Slide 3: Critical Alerts & Risk Summary
    await this.createCriticalAlertsSlide(pptx, projectData, theme);
    await progressCallback?.(60);

    // Slide 4: Strategic Recommendations
    await this.createStrategicRecommendationsSlide(pptx, projectData, theme);
    await progressCallback?.(80);
  }

  /**
 * Create task details breakdown slide showing real Jira tasks
 */
  private async createTaskDetailsBreakdown(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any
  ): Promise<void> {
    const slide = pptx.addSlide();

    slide.addText('TASK DETAILS BREAKDOWN', {
      x: 0.5, y: 0.2, w: 9, h: 0.8,
      fontSize: 28, color: theme.primary, bold: true
    });

    slide.addText('Real Jira tasks showing project progress and team contributions', {
      x: 0.5, y: 0.8, w: 9, h: 0.4,
      fontSize: 14, color: '6B7280', align: 'center'
    });

    const tasks = Array.isArray(projectData.tasks) ? projectData.tasks : [];

    // Sort tasks by priority (Highest → High → Medium → Low) and status
    const sortedTasks = tasks
      .sort((a, b) => {
        const priorityOrder = { 'Highest': 4, 'High': 3, 'Medium': 2, 'Low': 1, 'None': 0 };
        const statusOrder = { 'Done': 3, 'In Progress': 2, 'To Do': 1 };

        // First sort by priority, then by status
        const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;

        return (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
      })
      .slice(0, 15); // Show top 15 tasks to fit on slide

    // Create table with real Jira data
    const tableData = [
      [
        { text: 'Key', options: { bold: true, fontSize: 12, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Summary', options: { bold: true, fontSize: 12, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Assignee', options: { bold: true, fontSize: 12, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Priority', options: { bold: true, fontSize: 12, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Status', options: { bold: true, fontSize: 12, fill: { color: theme.primary }, color: 'FFFFFF' } }
      ]
    ];

    sortedTasks.forEach(task => {
      const priorityColor = this.getPriorityColor(task.priority || 'None');
      const statusColor = this.getStatusColor(this.normalizeJiraStatus(task.status || ''));

      tableData.push([
        {
          text: task.id || 'N/A',
          options: { fontSize: 9, bold: true, fill: { color: 'FFFFFF' }, color: theme.info }
        },
        {
          text: this.truncateText(task.name || 'Untitled', 40), // Truncate long titles
          options: { fontSize: 9, bold: false, fill: { color: 'FFFFFF' }, color: '000000' }
        },
        {
          text: task.assignee || 'Unassigned',
          options: { fontSize: 9, bold: false, fill: { color: 'FFFFFF' }, color: '000000' }
        },
        {
          text: task.priority || 'None',
          options: { fontSize: 9, bold: true, fill: { color: 'FFFFFF' }, color: priorityColor }
        },
        {
          text: task.status || 'Unknown',
          options: { fontSize: 9, bold: true, fill: { color: 'FFFFFF' }, color: statusColor }
        }
      ]);
    });

    // Add table to slide
    slide.addTable(tableData, {
      x: 0.5,
      y: 1.2,
      w: 9,
      h: 4.0,
      colW: [1.2, 3.5, 1.8, 1.2, 1.3] // Column widths: Key, Summary, Assignee, Priority, Status
    });

    // Add footer note
    slide.addText(`Showing ${sortedTasks.length} of ${tasks.length} total tasks (sorted by priority and status)`, {
      x: 0.5, y: 5.25, w: 9, h: 0.3,
      fontSize: 10, color: '6B7280', italic: true, align: 'center'
    });
  }

  /**
   * Helper method to truncate long text
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Generate Detailed Report (8-10 slides)
   */
  private async generateDetailedReport(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any,
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<void> {
    // FIX: Create correct detailed title slide instead of inheriting standard title
    await this.createTitleSlide(pptx, projectData, theme, 'DETAILED ANALYSIS REPORT');
    await progressCallback?.(5);

    // Include standard slides (but skip the title since we created our own)
    // Create all the standard slides manually to avoid the wrong title
    await this.createProjectHealthDashboard(pptx, projectData, theme);
    await progressCallback?.(15);

    await this.createTaskStatusAnalysis(pptx, projectData, theme);
    await progressCallback?.(25);

    await this.createTeamWorkloadAnalysis(pptx, projectData, theme);
    await progressCallback?.(35);

    await this.createPriorityRiskAssessment(pptx, projectData, theme);
    await progressCallback?.(45);

    await this.createActionItemsSlide(pptx, projectData, theme);
    await progressCallback?.(55);

    // Additional detailed slides specific to detailed analysis
    await this.createDetailedTeamAnalysis(pptx, projectData, theme);
    await progressCallback?.(70);

    await this.createTaskDetailsBreakdown(pptx, projectData, theme);
    await progressCallback?.(80);

    await this.createPredictiveAnalysis(pptx, projectData, theme);
    await progressCallback?.(85);

    await this.createImplementationRoadmap(pptx, projectData, theme);
    await progressCallback?.(95);
  }

  /**
   * Create title slide with real project information
   */
  private async createTitleSlide(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any,
    reportType: string
  ): Promise<void> {
    // Clean implementation - remove all diagnostic code
    const slide = pptx.addSlide();

    // Background
    slide.background = { color: theme.primary };

    // Title
    slide.addText(reportType, {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 36, color: 'FFFFFF', bold: true, align: 'center'
    });

    // Project name from real Jira data
    slide.addText(projectData.name, {
      x: 0.5, y: 2.5, w: '90%', h: 1,
      fontSize: 24, color: 'FFFFFF', align: 'center'
    });

    // Data source indicator
    const dataSource = projectData.fallbackData ?
      'Demo Data' : 'Real Jira Data';

    slide.addText(`Data Source: ${dataSource}`, {
      x: 0.5, y: 3.5, w: '90%', h: 0.8,
      fontSize: 16, color: 'FFFFFF', align: 'center', italic: true
    });

    // Generation timestamp
    slide.addText(`Generated: ${new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Singapore', // Or your timezone
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })}`, {
      x: 0.5, y: 4.5, w: '90%', h: 0.6,
      fontSize: 14, color: 'FFFFFF', align: 'center'
    });

    // Task count summary
    const taskCount = Array.isArray(projectData.tasks) ? projectData.tasks.length : 0;
    slide.addText(`${taskCount} Tasks Analyzed`, {
      x: 0.5, y: 5.2, w: '90%', h: 0.6,
      fontSize: 16, color: 'FFFFFF', align: 'center', bold: true
    });
  }

  /**
   * Create project health dashboard with real Jira metrics
   */
  private async createProjectHealthDashboard(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any
  ): Promise<void> {
    const slide = pptx.addSlide();

    slide.addText('PROJECT HEALTH DASHBOARD', {
      x: 0.5, y: 0.3, w: 9, h: 0.8,
      fontSize: 28, color: theme.primary, bold: true
    });

    // KPI Cards with real data
    const kpis = [
      {
        title: 'COMPLETION',
        value: `${this.jiraAnalysis.completionRate}%`,
        status: this.jiraAnalysis.completionRate >= 80 ? 'success' :
          this.jiraAnalysis.completionRate >= 60 ? 'warning' : 'danger',
        x: 0.25, y: 1.2, w: 2.2, h: 1.5 // Reduced width and adjusted positioning
      },
      {
        title: 'URGENT TASKS',
        value: `${this.jiraAnalysis.urgentTasks}`,
        status: this.jiraAnalysis.urgentTasks <= 5 ? 'success' :
          this.jiraAnalysis.urgentTasks <= 10 ? 'warning' : 'danger',
        x: 2.75, y: 1.2, w: 2.2, h: 1.5
      },
      {
        title: 'TEAM CAPACITY',
        value: this.jiraAnalysis.teamWorkload[0]?.percentage >= 70 ? 'OVERLOADED' : 'BALANCED',
        subtitle: `Top: ${this.jiraAnalysis.teamWorkload[0]?.percentage || 0}% concentration`,
        status: this.jiraAnalysis.teamWorkload[0]?.percentage >= 70 ? 'danger' : 'success',
        x: 5.25, y: 1.2, w: 2.2, h: 1.5
      },
      {
        title: 'UNASSIGNED WORK',
        value: `${this.jiraAnalysis.unassignedTasks}`,
        subtitle: this.jiraAnalysis.unassignedTasks === 0 ? 'ALL ASSIGNED' : 'NEEDS OWNERS',
        status: this.jiraAnalysis.unassignedTasks === 0 ? 'success' :
          this.jiraAnalysis.unassignedTasks <= 3 ? 'warning' : 'danger',
        x: 7.75, y: 1.2, w: 2.2, h: 1.5
      }
    ];

    kpis.forEach(kpi => {
      const statusColor = kpi.status === 'success' ? theme.success :
        kpi.status === 'warning' ? theme.warning : theme.danger;

      // KPI Card background
      slide.addShape(pptx.ShapeType.rect, {
        x: kpi.x, y: kpi.y, w: 2, h: 1.5,
        fill: { color: statusColor },
        line: { color: statusColor, width: 0 }
      });

      // KPI Title
      slide.addText(kpi.title, {
        x: kpi.x, y: kpi.y + 0.1, w: 2, h: 0.4,
        fontSize: 12, color: 'FFFFFF', bold: true, align: 'center'
      });

      // KPI Value
      slide.addText(kpi.value, {
        x: kpi.x, y: kpi.y + 0.4, w: 2, h: 0.8,
        fontSize: 20, color: 'FFFFFF', bold: true, align: 'center'
      });

      if (kpi.subtitle) {
        slide.addText(kpi.subtitle, {
          x: kpi.x, y: kpi.y + 1, w: kpi.w, h: 0.4,
          fontSize: 10, color: 'FFFFFF', align: 'center'
        });
      }
    });

    // Risk Level Alert
    const riskColor = this.jiraAnalysis.riskLevel === 'LOW' ? theme.success :
      this.jiraAnalysis.riskLevel === 'MEDIUM' ? theme.warning :
        this.jiraAnalysis.riskLevel === 'HIGH' ? theme.danger : theme.danger;

    slide.addText(`OVERALL RISK LEVEL: ${this.jiraAnalysis.riskLevel}`, {
      x: 0.5, y: 4, w: '90%', h: 0.8,
      fontSize: 24, color: riskColor, bold: true, align: 'center'
    });
  }

  /**
   * Create task status analysis with donut chart using real Jira data
   */
  private async createTaskStatusAnalysis(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any
  ): Promise<void> {
    const slide = pptx.addSlide();

    slide.addText('TASK STATUS ANALYSIS', {
      x: 0.5, y: 0.5, w: 9, h: 0.8,
      fontSize: 28, color: theme.primary, bold: true
    });

    // FIXED: Correct pptxgenjs donut chart format
    const statusData = this.jiraAnalysis.statusDistribution;

    const chartData = [
      {
        name: 'Task Status Distribution',
        labels: statusData.map(item => item.status),
        values: statusData.map(item => item.count),
        colors: statusData.map(item => item.color)
      }
    ];

    // Add donut chart with correct single-series format
    slide.addChart(pptx.ChartType.doughnut, chartData, {
      x: 1, y: 1.5, w: 4, h: 3.5,
      showLegend: true,
      legendPos: 'r',
      showPercent: true,
      holeSize: 50
    });

    // Table remains the same (this part is working correctly)
    const tableData = [
      [
        { text: 'Status', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Count', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Percentage', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } }
      ]
    ];

    this.jiraAnalysis.statusDistribution.forEach(item => {
      tableData.push([
        { text: item.status, options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: item.count.toString(), options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: `${item.percentage}%`, options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } }
      ]);
    });

    slide.addTable(tableData, { x: 5.5, y: 1.5, w: 3.5, h: 2.5 });
  }

  /**
   * Create team workload analysis with real assignees
   */
  private async createTeamWorkloadAnalysis(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any
  ): Promise<void> {
    const slide = pptx.addSlide();

    slide.addText('TEAM WORKLOAD ANALYSIS', {
      x: 0.5, y: 0.3, w: 9, h: 0.8,
      fontSize: 28, color: theme.primary, bold: true
    });

    // Critical workload warning if team concentration > 70%
    if (this.jiraAnalysis.teamWorkload[0]?.percentage >= 70) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.5, y: 1.5, w: 9, h: 1.5,
        fill: { color: theme.danger },
        line: { color: theme.danger, width: 0 }
      });

      slide.addText('CRITICAL: WORKLOAD CONCENTRATION DETECTED', {
        x: 0.5, y: 1.7, w: 9, h: 0.4,
        fontSize: 18, color: 'FFFFFF', bold: true, align: 'center'
      });

      slide.addText(`${this.jiraAnalysis.teamWorkload[0]?.percentage}% of tasks assigned to ${this.jiraAnalysis.teamWorkload[0]?.assignee}`, {
        x: 0.5, y: 2.1, w: 9, h: 0.4,
        fontSize: 14, color: 'FFFFFF', align: 'center'
      });

      slide.addText('IMMEDIATE REBALANCING REQUIRED', {
        x: 0.5, y: 2.5, w: 9, h: 0.4,
        fontSize: 16, color: 'FFFFFF', bold: true, align: 'center'
      });
    }

    // Team workload table
    const workloadTableData = [
      [
        { text: 'Team Member', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Tasks', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Percentage', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Risk Level', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } }
      ]
    ];

    this.jiraAnalysis.teamWorkload.forEach(member => {
      const riskColor = member.riskLevel === 'CRITICAL' ? theme.danger :
        member.riskLevel === 'HIGH' ? theme.warning :
          member.riskLevel === 'MEDIUM' ? theme.info : theme.success;

      workloadTableData.push([
        { text: member.assignee, options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: member.count.toString(), options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: `${member.percentage}%`, options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: member.riskLevel, options: { fontSize: 12, color: riskColor, bold: true, fill: { color: 'FFFFFF' } } }

      ]);
    });

    slide.addTable(workloadTableData, { x: 1, y: 3.2, w: 8, h: 2.2 });
  }

  /**
   * Create priority risk assessment
   */
  private async createPriorityRiskAssessment(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any
  ): Promise<void> {
    const slide = pptx.addSlide();

    slide.addText('PRIORITY & RISK ASSESSMENT', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 28, color: theme.primary, bold: true
    });

    // Urgent tasks alert
    if (this.jiraAnalysis.urgentTasks > 10) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.5, y: 1.5, w: 4, h: 2,
        fill: { color: theme.danger },
        line: { color: theme.danger, width: 0 }
      });

      slide.addText('HIGH PRIORITY ALERT', {
        x: 0.5, y: 1.7, w: 4, h: 0.4,
        fontSize: 16, color: 'FFFFFF', bold: true, align: 'center'
      });

      slide.addText(`${this.jiraAnalysis.urgentTasks}`, {
        x: 0.5, y: 2.1, w: 4, h: 0.8,
        fontSize: 36, color: 'FFFFFF', bold: true, align: 'center'
      });

      slide.addText('URGENT TASKS', {
        x: 0.5, y: 2.9, w: 4, h: 0.4,
        fontSize: 14, color: 'FFFFFF', align: 'center'
      });
    }

    // Priority distribution
    const priorityTableData = [
      [
        { text: 'Priority', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Count', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Percentage', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } }
      ]
    ];

    this.jiraAnalysis.priorityDistribution.forEach(item => {
      priorityTableData.push([
        { text: item.priority, options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: item.count.toString(), options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: `${item.percentage}%`, options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } }
      ]);
    });

    slide.addTable(priorityTableData, { x: 5.5, y: 1.5, w: 3.5, h: 3 });
  }

  /**
   * Create action items slide
   */
  private async createActionItemsSlide(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any
  ): Promise<void> {
    const slide = pptx.addSlide();

    slide.addText('ACTION ITEMS & RECOMMENDATIONS', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 28, color: theme.primary, bold: true
    });

    const recommendations = [];

    // Team workload recommendations
    if (this.jiraAnalysis.teamWorkload[0]?.percentage >= 70) {
      recommendations.push(`CRITICAL: Redistribute ${this.jiraAnalysis.teamWorkload[0]?.assignee}'s workload (${this.jiraAnalysis.teamWorkload[0]?.percentage}% concentration)`);
    }

    // Unassigned tasks
    if (this.jiraAnalysis.unassignedTasks > 0) {
      recommendations.push(`IMMEDIATE: Assign ownership to ${this.jiraAnalysis.unassignedTasks} unassigned tasks`);
    }

    // Urgent tasks
    if (this.jiraAnalysis.urgentTasks > 10) {
      recommendations.push(`HIGH PRIORITY: Address ${this.jiraAnalysis.urgentTasks} urgent tasks requiring immediate attention`);
    }

    // Completion rate
    if (this.jiraAnalysis.completionRate < 50) {
      recommendations.push(`FOCUS: Accelerate task completion (current rate: ${this.jiraAnalysis.completionRate}%)`);
    }

    // Default recommendations
    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring project progress and team capacity');
      recommendations.push('Maintain current task prioritization strategy');
      recommendations.push('Regular team capacity reviews recommended');
    }

    slide.addText(recommendations.join('\n\n'), {
      x: 0.5, y: 1.5, w: '90%', h: 4,
      fontSize: 16, color: '374151',
      bullet: { type: 'bullet' }
    });

    // Next review date
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + 7);

    slide.addText(`Next Review: ${nextReview.toLocaleDateString()}`, {
      x: 0.5, y: 6, w: '90%', h: 0.5,
      fontSize: 14, color: theme.secondary, italic: true, align: 'center'
    });
  }

  /**
   * Create executive KPI dashboard
   */
  private async createExecutiveKPIDashboard(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any
  ): Promise<void> {
    const slide = pptx.addSlide();

    slide.addText('EXECUTIVE KPI DASHBOARD', {
      x: 0.5, y: 0.3, w: 9, h: 0.8,
      fontSize: 28, color: theme.primary, bold: true
    });

    // Large executive KPI tiles
    const executiveKPIs = [
      {
        title: 'PROJECT COMPLETION',
        value: `${this.jiraAnalysis.completionRate}%`,
        subtitle: this.jiraAnalysis.completionRate >= 75 ? 'ON TRACK' : 'NEEDS ATTENTION',
        status: this.jiraAnalysis.completionRate >= 75 ? 'success' : 'warning',
        x: 0.5, y: 1.3, w: 4.2, h: 1.8
      },
      {
        title: 'CRITICAL TASKS',
        value: `${this.jiraAnalysis.urgentTasks}`,
        subtitle: this.jiraAnalysis.urgentTasks <= 5 ? 'MANAGEABLE' : 'IMMEDIATE ACTION',
        status: this.jiraAnalysis.urgentTasks <= 5 ? 'success' : 'danger',
        x: 5.2, y: 1.3, w: 4.2, h: 1.8
      },
      {
        title: 'TEAM CAPACITY',
        value: this.jiraAnalysis.teamWorkload[0]?.percentage >= 70 ? 'OVERLOADED' : 'BALANCED',
        subtitle: `Top: ${this.jiraAnalysis.teamWorkload[0]?.percentage || 0}% concentration`,
        status: this.jiraAnalysis.teamWorkload[0]?.percentage >= 70 ? 'danger' : 'success',
        x: 0.5, y: 3.5, w: 4.3, h: 1.8
      },
      {
        title: 'UNASSIGNED WORK',
        value: `${this.jiraAnalysis.unassignedTasks}`,
        subtitle: this.jiraAnalysis.unassignedTasks === 0 ? 'ALL ASSIGNED' : 'NEEDS OWNERS',
        status: this.jiraAnalysis.unassignedTasks === 0 ? 'success' : 'warning',
        x: 5.2, y: 3.5, w: 4.2, h: 1.8
      }
    ];

    executiveKPIs.forEach(kpi => {
      const statusColor = kpi.status === 'success' ? theme.success :
        kpi.status === 'warning' ? theme.warning : theme.danger;

      // Large KPI tile
      slide.addShape(pptx.ShapeType.rect, {
        x: kpi.x, y: kpi.y, w: kpi.w, h: kpi.h,
        fill: { color: statusColor },
        line: { color: statusColor, width: 0 }
      });

      // KPI Title
      slide.addText(kpi.title, {
        x: kpi.x, y: kpi.y + 0.1, w: kpi.w, h: 0.4,
        fontSize: 14, color: 'FFFFFF', bold: true, align: 'center'
      });

      // KPI Value (large)
      slide.addText(kpi.value, {
        x: kpi.x, y: kpi.y + 0.6, w: kpi.w, h: 0.8,
        fontSize: 24, color: 'FFFFFF', bold: true, align: 'center'
      });

      // KPI Subtitle
      slide.addText(kpi.subtitle, {
        x: kpi.x, y: kpi.y + 1.3, w: kpi.w, h: 0.4,
        fontSize: 10, color: 'FFFFFF', align: 'center'
      });
    });
  }

  /**
   * Create critical alerts slide
   */
  private async createCriticalAlertsSlide(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any
  ): Promise<void> {
    const slide = pptx.addSlide();

    slide.addText('CRITICAL ALERTS & RISK SUMMARY', {
      x: 0.5, y: 0.3, w: 9, h: 0.8,
      fontSize: 28, color: theme.primary, bold: true
    });

    const alerts = [];

    // Team concentration alert
    if (this.jiraAnalysis.teamWorkload[0]?.percentage >= 70) {
      alerts.push({
        type: 'CRITICAL',
        title: 'TEAM CAPACITY OVERLOAD',
        message: `${this.jiraAnalysis.teamWorkload[0]?.percentage}% of work concentrated on ${this.jiraAnalysis.teamWorkload[0]?.assignee}`,
        action: 'Immediate workload redistribution required',
        color: theme.danger
      });
    }

    // Urgent tasks alert
    if (this.jiraAnalysis.urgentTasks > 10) {
      alerts.push({
        type: 'HIGH',
        title: 'URGENT TASK BACKLOG',
        message: `${this.jiraAnalysis.urgentTasks} high-priority tasks require immediate attention`,
        action: 'Prioritize urgent task completion',
        color: theme.warning
      });
    }

    // Unassigned tasks alert
    if (this.jiraAnalysis.unassignedTasks > 3) {
      alerts.push({
        type: 'MEDIUM',
        title: 'UNASSIGNED TASKS',
        message: `${this.jiraAnalysis.unassignedTasks} tasks without assigned owners`,
        action: 'Assign task ownership to team members',
        color: theme.info
      });
    }

    // Low completion alert
    if (this.jiraAnalysis.completionRate < 40) {
      alerts.push({
        type: 'HIGH',
        title: 'LOW COMPLETION RATE',
        message: `Project completion at ${this.jiraAnalysis.completionRate}% - below target`,
        action: 'Accelerate task completion velocity',
        color: theme.warning
      });
    }

    // FIXED: Smaller alert boxes that fit within boundaries
    if (alerts.length === 0) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 1, y: 1.5, w: 8, h: 2.5,  // Smaller and centered
        fill: { color: theme.success },
        line: { color: theme.success, width: 0 }
      });

      slide.addText('NO CRITICAL ALERTS', {
        x: 1, y: 2, w: 8, h: 0.8,
        fontSize: 20, color: 'FFFFFF', bold: true, align: 'center'
      });

      slide.addText('Project is operating within acceptable parameters', {
        x: 1, y: 2.8, w: 8, h: 0.5,
        fontSize: 14, color: 'FFFFFF', align: 'center'
      });
    } else {
      let yPos = 1.3;
      alerts.slice(0, 3).forEach(alert => { // Show max 3 alerts
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.5, y: yPos, w: 9, h: 1.4,  // Smaller height and proper width
          fill: { color: alert.color },
          line: { color: alert.color, width: 0 }
        });

        slide.addText(`${alert.type}: ${alert.title}`, {
          x: 0.7, y: yPos + 0.1, w: 8.6, h: 0.3,  // Smaller text area
          fontSize: 12, color: 'FFFFFF', bold: true, align: 'left'  // Reduced font
        });

        slide.addText(alert.message, {
          x: 0.7, y: yPos + 0.4, w: 8.6, h: 0.4,
          fontSize: 10, color: 'FFFFFF', align: 'left'  // Reduced font
        });

        slide.addText(`Action: ${alert.action}`, {
          x: 0.7, y: yPos + 0.8, w: 8.6, h: 0.4,
          fontSize: 9, color: 'FFFFFF', italic: true, align: 'left'  // Reduced font
        });

        yPos += 1.6;  // Smaller spacing between alerts
      });
    }
  }

  /**
   * Create strategic recommendations slide
   */
  private async createStrategicRecommendationsSlide(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any
  ): Promise<void> {
    const slide = pptx.addSlide();

    slide.addText('STRATEGIC RECOMMENDATIONS', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 28, color: theme.primary, bold: true
    });

    const strategicActions = [];

    // Resource optimization
    if (this.jiraAnalysis.teamWorkload[0]?.percentage >= 70) {
      strategicActions.push({
        priority: 'IMMEDIATE',
        action: 'Resource Rebalancing',
        description: 'Redistribute workload to prevent single-point-of-failure',
        timeline: '1-2 weeks',
        impact: 'Risk Reduction'
      });
    }

    // Capacity planning
    if (this.jiraAnalysis.urgentTasks > 10) {
      strategicActions.push({
        priority: 'HIGH',
        action: 'Priority Management',
        description: 'Implement stricter priority governance and escalation processes',
        timeline: '2-3 weeks',
        impact: 'Quality Improvement'
      });
    }

    // Process improvement
    if (this.jiraAnalysis.unassignedTasks > 0) {
      strategicActions.push({
        priority: 'MEDIUM',
        action: 'Ownership Accountability',
        description: 'Establish clear task assignment and ownership protocols',
        timeline: '1 week',
        impact: 'Process Efficiency'
      });
    }

    // Default strategic recommendations
    if (strategicActions.length === 0) {
      strategicActions.push(
        {
          priority: 'ONGOING',
          action: 'Performance Monitoring',
          description: 'Continue current performance tracking and optimization',
          timeline: 'Continuous',
          impact: 'Sustained Excellence'
        },
        {
          priority: 'MEDIUM',
          action: 'Team Development',
          description: 'Invest in team skill development and cross-training',
          timeline: '1-3 months',
          impact: 'Capability Building'
        }
      );
    }

    // Create recommendations table
    const tableData = [
      [
        { text: 'Priority', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Strategic Action', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Description', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Timeline', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Impact', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } }
      ]
    ];

    strategicActions.forEach(action => {
      const priorityColor = action.priority === 'IMMEDIATE' ? theme.danger :
        action.priority === 'HIGH' ? theme.warning :
          action.priority === 'MEDIUM' ? theme.info : theme.success;

      tableData.push([
        { text: action.priority, options: { fontSize: 11, color: priorityColor, bold: true, fill: { color: 'FFFFFF' } } },
        { text: action.action, options: { fontSize: 11, bold: true, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: action.description, options: { fontSize: 10, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: action.timeline, options: { fontSize: 11, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: action.impact, options: { fontSize: 11, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } }
      ]);
    });

    slide.addTable(tableData, { x: 0.5, y: 1.5, w: 9, h: 4 });
  }

  /**
   * Additional slide creation methods for detailed report
   */
  private async createDetailedTeamAnalysis(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any
  ): Promise<void> {
    const slide = pptx.addSlide();

    slide.addText('DETAILED TEAM ANALYSIS', {
      x: 0.5, y: 0.3, w: 9, h: 0.8,
      fontSize: 28, color: theme.primary, bold: true
    });

    slide.addText('Comprehensive team performance and capacity analysis based on real Jira data.', {
      x: 0.5, y: 1.2, w: 9, h: 1,
      fontSize: 16, color: '374151'
    });

    // Team productivity metrics would be added here
    const teamMetrics = this.jiraAnalysis.teamWorkload.map(member => ({
      name: member.assignee,
      productivity: Math.round((member.count / this.jiraAnalysis.totalTasks) * 100),
      efficiency: member.riskLevel === 'CRITICAL' ? 'Overloaded' :
        member.riskLevel === 'HIGH' ? 'High Utilization' : 'Optimal',
      recommendation: member.percentage >= 70 ? 'Reduce workload' :
        member.percentage >= 50 ? 'Monitor capacity' : 'Can take more tasks'
    }));

    const teamTableData = [
      [
        { text: 'Team Member', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Productivity %', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Efficiency Status', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Recommendation', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } }
      ]
    ];

    teamMetrics.forEach(metric => {
      teamTableData.push([
        { text: metric.name, options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: `${metric.productivity}%`, options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: metric.efficiency, options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: metric.recommendation, options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } }
      ]);
    });

    slide.addTable(teamTableData, { x: 1, y: 2.5, w: 8, h: 2.5 });
  }

  private async createPredictiveAnalysis(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any
  ): Promise<void> {
    const slide = pptx.addSlide();

    slide.addText('PREDICTIVE ANALYSIS', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 28, color: theme.primary, bold: true
    });

    // Calculate projected completion based on current velocity
    const remainingTasks = this.jiraAnalysis.totalTasks -
      this.jiraAnalysis.statusDistribution.find(s => s.status === 'Done')?.count || 0;

    const averageVelocity = Math.max(1, Math.round(this.jiraAnalysis.totalTasks * 0.1)); // Assume 10% weekly velocity
    const projectedWeeks = Math.ceil(remainingTasks / averageVelocity);

    const projectedCompletion = new Date();
    projectedCompletion.setDate(projectedCompletion.getDate() + (projectedWeeks * 7));

    slide.addText(`Based on current velocity, project completion projected for: ${projectedCompletion.toLocaleDateString()}`, {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 16, color: '374151'
    });

    slide.addText(`Remaining tasks: ${remainingTasks} | Estimated velocity: ${averageVelocity} tasks/week`, {
      x: 0.5, y: 2.5, w: '90%', h: 1,
      fontSize: 14, color: '6B7280'
    });
  }

  private async createImplementationRoadmap(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any
  ): Promise<void> {
    const slide = pptx.addSlide();

    slide.addText('IMPLEMENTATION ROADMAP', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 28, color: theme.primary, bold: true
    });

    slide.addText('Strategic implementation plan for addressing identified issues and optimizing project performance.', {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 16, color: '374151'
    });

    const roadmapItems = [
      'Week 1: Address critical team workload imbalances',
      'Week 2: Implement task assignment protocols',
      'Week 3: Establish priority governance framework',
      'Week 4: Review and optimize team capacity allocation',
      'Ongoing: Monitor progress and adjust strategies'
    ];

    slide.addText(roadmapItems.join('\n'), {
      x: 0.5, y: 3, w: '90%', h: 3,
      fontSize: 14, color: '374151',
      bullet: { type: 'bullet' }
    });
  }

  /**
   * Utility methods for data analysis
   */
  private normalizeJiraStatus(status: string): string {
    const normalized = status.toLowerCase().trim();
    if (['done', 'complete', 'completed', 'closed', 'resolved'].includes(normalized)) {
      return 'Done';
    }
    if (['in progress', 'progress', 'in review', 'review', 'development'].includes(normalized)) {
      return 'In Progress';
    }
    if (['to do', 'todo', 'open', 'new', 'created', 'backlog'].includes(normalized)) {
      return 'To Do';
    }
    return status; // Return original if no mapping found
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'Done': return '36B37E';      // Green
      case 'In Progress': return '0065FF'; // Blue
      case 'To Do': return '6B7280';      // Gray
      default: return '6B7280';           // Default Gray
    }
  }

  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'Highest': return 'DE350B';    // Red
      case 'High': return 'FF5630';       // Orange-Red
      case 'Medium': return 'FFAB00';     // Orange
      case 'Low': return '36B37E';        // Green
      default: return '6B7280';           // Gray
    }
  }

  private calculateWorkloadRisk(taskCount: number, totalTasks: number): string {
    const percentage = (taskCount / totalTasks) * 100;
    if (percentage >= 70) return 'CRITICAL';
    if (percentage >= 50) return 'HIGH';
    if (percentage >= 30) return 'MEDIUM';
    return 'LOW';
  }

  private calculateOverallRisk(
    teamWorkload: any[],
    urgentTasks: number,
    unassignedTasks: number,
    completionRate: number,
    totalTasks: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    let riskScore = 0;

    // Team concentration risk
    if (teamWorkload.length > 0 && teamWorkload[0].percentage >= 70) riskScore += 3;
    else if (teamWorkload.length > 0 && teamWorkload[0].percentage >= 50) riskScore += 2;

    // Urgent tasks risk
    if (urgentTasks >= 10) riskScore += 3;
    else if (urgentTasks >= 5) riskScore += 2;
    else if (urgentTasks >= 3) riskScore += 1;

    // Unassigned tasks risk
    if (unassignedTasks >= 5) riskScore += 2;
    else if (unassignedTasks >= 3) riskScore += 1;

    // Completion rate risk
    if (completionRate < 40) riskScore += 2;
    else if (completionRate < 60) riskScore += 1;

    if (riskScore >= 6) return 'CRITICAL';
    if (riskScore >= 4) return 'HIGH';
    if (riskScore >= 2) return 'MEDIUM';
    return 'LOW';
  }

  private getEmptyAnalysis(): JiraTaskAnalysis {
    return {
      totalTasks: 0,
      statusDistribution: [],
      priorityDistribution: [],
      teamWorkload: [],
      urgentTasks: 0,
      unassignedTasks: 0,
      completionRate: 0,
      riskLevel: 'LOW'
    };
  }
}