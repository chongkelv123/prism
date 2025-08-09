// backend/services/report-generation-service/src/generators/EnhancedTrofosReportGenerator.ts

import PptxGenJS from 'pptxgenjs';
import fs, { stat } from 'fs';
import path from 'path';
import logger from '../utils/logger';
import { ProjectData } from '../services/PlatformDataService';
import { FilenameGenerator } from '../utils/filenameGenerator';
import { SafeReportGenerator } from './SafeReportGenerator';

export interface TrofosReportConfig {
  templateId?: 'standard' | 'executive' | 'detailed';
  title?: string;
  includeTeamAnalysis?: boolean;
  includeRiskAssessment?: boolean;
  includePriorityBreakdown?: boolean;
  [key: string]: any;
}

interface TrofosTaskAnalysis {
  totalTasks: number;
  statusDistribution: { status: string; count: number; percentage: number; color: string }[];
  priorityDistribution: { priority: string; count: number; percentage: number; color: string }[];
  teamWorkload: { assignee: string; count: number; percentage: number; riskLevel: string }[];
  urgentTasks: number;
  unassignedTasks: number;
  completionRate: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export class EnhancedTrofosReportGenerator extends SafeReportGenerator {
  private readonly STORAGE_DIR: string;
  private trofosAnalysis: TrofosTaskAnalysis;

  constructor() {
    super();
    this.STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../../storage');

    if (!fs.existsSync(this.STORAGE_DIR)) {
      fs.mkdirSync(this.STORAGE_DIR, { recursive: true });
    }
  }

  async generate(
    projectData: ProjectData,
    config: TrofosReportConfig,
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<string> {
    try {
      logger.info('Generating Enhanced TROFOS Report from REAL platform data', {
        platform: projectData.platform,
        projectName: projectData.name,
        taskCount: Array.isArray(projectData.tasks) ? projectData.tasks.length : 0,
        teamSize: Array.isArray(projectData.team) ? projectData.team.length : 0,
        isRealData: !projectData.fallbackData,
        connectionSource: projectData.fallbackData ? 'DEMO DATA' : 'REAL TROFOS API'
      });

      if (projectData.fallbackData) {
        logger.warn('WARNING: Using fallback data instead of real TROFOS data');
      }

      // Analyze real TROFOS data
      this.trofosAnalysis = this.analyzeRealTrofosData(projectData);

      logger.info('Real TROFOS Data Analysis:', {
        totalTasks: this.trofosAnalysis.totalTasks,
        completionRate: this.trofosAnalysis.completionRate,
        urgentTasks: this.trofosAnalysis.urgentTasks,
        unassignedTasks: this.trofosAnalysis.unassignedTasks,
        riskLevel: this.trofosAnalysis.riskLevel,
        topAssignee: this.trofosAnalysis.teamWorkload[0]?.assignee,
        topAssigneeWorkload: this.trofosAnalysis.teamWorkload[0]?.percentage
      });

      const pptx = new PptxGenJS();

      pptx.layout = 'LAYOUT_16x9';
      pptx.author = 'PRISM Report System';
      pptx.company = 'TROFOS Integration Platform';
      pptx.subject = `TROFOS Analysis - ${projectData.name}`;
      pptx.title = config.title || `${projectData.name} - TROFOS Project Report`;

      const trofosTheme = {
        primary: '7C3AED',    // TROFOS Purple
        secondary: '9F7AEA',  // Light Purple
        accent: 'F5F3FF',     // Very Light Purple
        success: '36B37E',    // Green
        warning: 'FFAB00',    // Orange
        danger: 'DE350B',     // Red
        info: '0065FF'        // Info Blue
      };

      const templateId = config.templateId || 'standard';
      switch (templateId) {
        case 'standard':
          await this.generateStandardReport(pptx, projectData, trofosTheme, progressCallback);
          break;
        case 'executive':
          await this.generateExecutiveReport(pptx, projectData, trofosTheme, progressCallback);
          break;
        case 'detailed':
          await this.generateDetailedReport(pptx, projectData, trofosTheme, progressCallback);
          break;
        default:
          throw new Error(`Unknown template ID: ${config.templateId}`);
      }

      const filename = FilenameGenerator.generateStorageFilename({
        platform: 'trofos',
        templateType: templateId,
        projectName: projectData.name,
        timestamp: new Date()
      });

      const filepath = path.join(this.STORAGE_DIR, filename);
      await pptx.writeFile({ fileName: filepath });
      await progressCallback?.(100);

      logger.info('Enhanced TROFOS PowerPoint generated successfully', {
        filename,
        template: config.templateId,
        dataSource: projectData.fallbackData ? 'DEMO' : 'REAL TROFOS API',
        analysisResults: {
          totalTasks: this.trofosAnalysis.totalTasks,
          riskLevel: this.trofosAnalysis.riskLevel,
          urgentTasks: this.trofosAnalysis.urgentTasks
        }
      });

      return filename;

    } catch (error) {
      logger.error('Error generating Enhanced TROFOS Report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate TROFOS report: ${errorMessage}`);
    }
  }

  private analyzeRealTrofosData(projectData: ProjectData): TrofosTaskAnalysis {
    const tasks = Array.isArray(projectData.tasks) ? projectData.tasks : [];

    if (tasks.length === 0) {
      logger.warn('No tasks found in TROFOS project data');
      return this.getEmptyAnalysis();
    }

    // Status analysis
    const statusCounts = new Map<string, number>();
    tasks.forEach(task => {
      const status = this.normalizeTrofosStatus(task.status || 'Unknown');
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    });

    const statusDistribution = Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: Math.round((count / tasks.length) * 100),
      color: this.getStatusColor(status)
    }));

    // Priority analysis
    const priorityCounts = new Map<string, number>();
    tasks.forEach(task => {
      const priority = task.priority || 'None';
      priorityCounts.set(priority, (priorityCounts.get(priority) || 0) + 1);
    });

    const priorityDistribution = Array.from(priorityCounts.entries()).map(([priority, count]) => ({
      priority,
      count,
      percentage: Math.round((count / tasks.length) * 100),
      color: this.getPriorityColor(priority)
    }))
      .sort((a, b) => {
        const priorityOrder = { 'Highest': 4, 'High': 3, 'Medium': 2, 'Low': 1, 'None': 0 };
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      });

    // Team workload analysis
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

    const urgentTasks = tasks.filter(task =>
      task.priority && ['High', 'Highest'].includes(task.priority)
    ).length;

    const unassignedTasks = tasks.filter(task =>
      !task.assignee || task.assignee === 'Unassigned'
    ).length;

    const completedTasks = tasks.filter(task =>
      this.normalizeTrofosStatus(task.status || '') === 'Done'
    ).length;
    const completionRate = Math.round((completedTasks / tasks.length) * 100);

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

  // STANDARD REPORT (5-7 slides)
  private async generateStandardReport(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any,
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<void> {
    await this.createTitleSlide(pptx, projectData, theme, 'STANDARD REPORT');
    await progressCallback?.(15);

    await this.createProjectHealthDashboard(pptx, projectData, theme);
    await progressCallback?.(30);

    await this.createTaskStatusAnalysis(pptx, projectData, theme);
    await progressCallback?.(45);

    await this.createTeamWorkloadAnalysis(pptx, projectData, theme);
    await progressCallback?.(60);

    await this.createPriorityRiskAssessment(pptx, projectData, theme);
    await progressCallback?.(75);

    await this.createActionItemsSlide(pptx, projectData, theme);
    await progressCallback?.(90);
  }

  // EXECUTIVE REPORT (4-5 slides)
  private async generateExecutiveReport(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any,
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<void> {
    await this.createTitleSlide(pptx, projectData, theme, 'EXECUTIVE SUMMARY');
    await progressCallback?.(20);

    await this.createExecutiveKPIDashboard(pptx, projectData, theme);
    await progressCallback?.(40);

    await this.createCriticalAlertsSlide(pptx, projectData, theme);
    await progressCallback?.(60);

    await this.createStrategicRecommendationsSlide(pptx, projectData, theme);
    await progressCallback?.(80);
  }

  // DETAILED REPORT (8-10 slides)
  private async generateDetailedReport(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any,
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<void> {
    await this.createTitleSlide(pptx, projectData, theme, 'DETAILED ANALYSIS REPORT');
    await progressCallback?.(5);

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

    await this.createDetailedTeamAnalysis(pptx, projectData, theme);
    await progressCallback?.(70);

    await this.createTaskDetailsBreakdown(pptx, projectData, theme);
    await progressCallback?.(80);

    await this.createPredictiveAnalysis(pptx, projectData, theme);
    await progressCallback?.(85);

    await this.createImplementationRoadmap(pptx, projectData, theme);
    await progressCallback?.(95);
  }

  private async createTitleSlide(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any,
    reportType: string
  ): Promise<void> {
    const slide = pptx.addSlide();
    slide.background = { color: theme.primary };

    slide.addText(reportType, {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 36, color: 'FFFFFF', bold: true, align: 'center'
    });

    slide.addText(projectData.name, {
      x: 0.5, y: 2.5, w: '90%', h: 1,
      fontSize: 24, color: 'FFFFFF', align: 'center'
    });

    const dataSource = projectData.fallbackData ? 'Demo Data' : 'Real TROFOS Data';
    slide.addText(`Data Source: ${dataSource}`, {
      x: 0.5, y: 3.5, w: '90%', h: 0.8,
      fontSize: 16, color: 'FFFFFF', align: 'center', italic: true
    });

    slide.addText(`Generated: ${new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Singapore',
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

    const taskCount = Array.isArray(projectData.tasks) ? projectData.tasks.length : 0;
    slide.addText(`${taskCount} Tasks Analyzed`, {
      x: 0.5, y: 5.2, w: '90%', h: 0.6,
      fontSize: 16, color: 'FFFFFF', align: 'center', bold: true
    });
  }

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

    const kpis = [
      {
        title: 'COMPLETION',
        value: `${this.trofosAnalysis.completionRate}%`,
        status: this.trofosAnalysis.completionRate >= 80 ? 'success' :
          this.trofosAnalysis.completionRate >= 60 ? 'warning' : 'danger',
        x: 0.25, y: 1.2, w: 2.2, h: 1.5
      },
      {
        title: 'URGENT TASKS',
        value: `${this.trofosAnalysis.urgentTasks}`,
        status: this.trofosAnalysis.urgentTasks <= 5 ? 'success' :
          this.trofosAnalysis.urgentTasks <= 10 ? 'warning' : 'danger',
        x: 2.75, y: 1.2, w: 2.2, h: 1.5
      },
      {
        title: 'TEAM BALANCE',
        value: this.trofosAnalysis.teamWorkload[0]?.percentage >= 70 ? 'OVERLOADED' : 'BALANCED',
        subtitle: `Top: ${this.trofosAnalysis.teamWorkload[0]?.percentage || 0}% concentration`,
        status: this.trofosAnalysis.teamWorkload[0]?.percentage >= 70 ? 'danger' : 'success',
        x: 5.25, y: 1.2, w: 2.2, h: 1.5
      },
      {
        title: 'UNASSIGNED WORK',
        value: `${this.trofosAnalysis.unassignedTasks}`,
        subtitle: this.trofosAnalysis.unassignedTasks === 0 ? 'ALL ASSIGNED' : 'NEEDS OWNERS',
        status: this.trofosAnalysis.unassignedTasks === 0 ? 'success' :
          this.trofosAnalysis.unassignedTasks <= 3 ? 'warning' : 'danger',
        x: 7.75, y: 1.2, w: 2.2, h: 1.5
      }
    ];

    kpis.forEach(kpi => {
      const statusColor = kpi.status === 'success' ? theme.success :
        kpi.status === 'warning' ? theme.warning : theme.danger;

      slide.addShape(pptx.ShapeType.rect, {
        x: kpi.x, y: kpi.y, w: kpi.w, h: kpi.h,
        fill: { color: statusColor }
      });

      slide.addText(kpi.title, {
        x: kpi.x, y: kpi.y + 0.1, w: kpi.w, h: 0.4,
        fontSize: 12, color: 'FFFFFF', bold: true, align: 'center'
      });

      slide.addText(kpi.value, {
        x: kpi.x, y: kpi.y + 0.4, w: kpi.w, h: 0.8,
        fontSize: 20, color: 'FFFFFF', bold: true, align: 'center'
      });

      if (kpi.subtitle) {
        slide.addText(kpi.subtitle, {
          x: kpi.x, y: kpi.y + 1, w: kpi.w, h: 0.4,
          fontSize: 10, color: 'FFFFFF', align: 'center'
        });
      }
    });

    const riskColor = this.trofosAnalysis.riskLevel === 'LOW' ? theme.success :
      this.trofosAnalysis.riskLevel === 'MEDIUM' ? theme.warning :
        this.trofosAnalysis.riskLevel === 'HIGH' ? theme.danger : theme.danger;

    slide.addText(`OVERALL RISK LEVEL: ${this.trofosAnalysis.riskLevel}`, {
      x: 0.5, y: 4, w: '90%', h: 0.8,
      fontSize: 24, color: riskColor, bold: true, align: 'center'
    });
  }

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

    // Use exact same chart format as Jira
    const statusData = this.trofosAnalysis.statusDistribution;

    const chartData = [
      {
        name: 'Task Status Distribution',
        labels: statusData.map(item => item.status),
        values: statusData.map(item => item.count),
        colors: statusData.map(item => item.color)
      }
    ];

    slide.addChart(pptx.ChartType.doughnut, chartData, {
      x: 1, y: 1.5, w: 4, h: 3.5,
      showLegend: true,
      legendPos: 'r',
      showPercent: true,
      holeSize: 50
    });

    const tableData = [
      [
        { text: 'Status', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Count', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Percentage', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } }
      ]
    ];

    this.trofosAnalysis.statusDistribution.forEach(item => {
      tableData.push([
        { text: item.status, options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: item.count.toString(), options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: `${item.percentage}%`, options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } }
      ]);
    });

    slide.addTable(tableData, { x: 5.5, y: 1.5, w: 3.5, h: 2.5 });
  }

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
    if (this.trofosAnalysis.teamWorkload[0]?.percentage >= 70) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.5, y: 1.1, w: 9, h: 1.4,
        fill: { color: theme.danger },
        line: { color: theme.danger, width: 0 }
      });

      slide.addText('CRITICAL: WORKLOAD CONCENTRATION DETECTED', {
        x: 0.5, y: 1.3, w: 9, h: 0.4,
        fontSize: 18, color: 'FFFFFF', bold: true, align: 'center'
      });

      slide.addText(`${this.trofosAnalysis.teamWorkload[0]?.percentage}% of tasks assigned to ${this.trofosAnalysis.teamWorkload[0]?.assignee}`, {
        x: 0.5, y: 1.7, w: 9, h: 0.4,
        fontSize: 14, color: 'FFFFFF', align: 'center'
      });

      slide.addText('IMMEDIATE REBALANCING REQUIRED', {
        x: 0.5, y: 2.0, w: 9, h: 0.4,
        fontSize: 16, color: 'FFFFFF', bold: true, align: 'center'
      });
    }

    const teamData = this.trofosAnalysis.teamWorkload.slice(0, 8);
    const chartData = [
      {
        name: 'Team Workload Distribution',
        labels: teamData.map(item => item.assignee),
        values: teamData.map(item => item.count)
      }
    ];

    slide.addChart(pptx.ChartType.bar, chartData, {
      x: 0.5, y: 2.6, w: 9, h: 3.0,
      showLegend: false,
      showTitle: false
    });
  }

  private async createPriorityRiskAssessment(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any
  ): Promise<void> {
    const slide = pptx.addSlide();

    slide.addText('PRIORITY & RISK ASSESSMENT', {
      x: 0.5, y: 0.3, w: 9, h: 0.8,
      fontSize: 28, color: theme.primary, bold: true
    });

    const priorityData = this.trofosAnalysis.priorityDistribution;
    const chartData = [
      {
        name: 'Priority Distribution',
        labels: priorityData.map(item => item.priority),
        values: priorityData.map(item => item.count),
        colors: priorityData.map(item => item.color)
      }
    ];

    slide.addChart(pptx.ChartType.bar, chartData, {
      x: 0.5, y: 1.5, w: 5, h: 3.5,
      showLegend: false,
      showTitle: false
    });

    const insights = [
      `${this.trofosAnalysis.urgentTasks} high-priority tasks require immediate attention`,
      `${this.trofosAnalysis.unassignedTasks} tasks lack assigned owners`,
      `Team risk level assessed as: ${this.trofosAnalysis.riskLevel}`,
      `Completion rate stands at ${this.trofosAnalysis.completionRate}%`
    ];

    insights.forEach((insight, index) => {
      slide.addText(`• ${insight}`, {
        x: 6, y: 1.8 + (index * 0.4), w: 3.5, h: 0.3,
        fontSize: 12, color: '374151'
      });
    });
  }

  private async createActionItemsSlide(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any
  ): Promise<void> {
    const slide = pptx.addSlide();

    slide.addText('ACTION ITEMS & RECOMMENDATIONS', {
      x: 0.5, y: 0.3, w: 9, h: 0.8,
      fontSize: 28, color: theme.primary, bold: true
    });

    const actions = [];

    if (this.trofosAnalysis.unassignedTasks > 0) {
      actions.push({
        priority: 'HIGH',
        action: 'Assign Task Owners',
        description: `${this.trofosAnalysis.unassignedTasks} tasks need assigned owners`,
        timeline: '1 week',
        impact: 'Clear Accountability'
      });
    }

    if (this.trofosAnalysis.teamWorkload[0]?.percentage >= 70) {
      actions.push({
        priority: 'CRITICAL',
        action: 'Rebalance Workload',
        description: 'Address workload concentration',
        timeline: 'Immediate',
        impact: 'Risk Mitigation'
      });
    }

    if (this.trofosAnalysis.urgentTasks > 10) {
      actions.push({
        priority: 'HIGH',
        action: 'Priority Review',
        description: 'Review and adjust task priorities',
        timeline: '2 weeks',
        impact: 'Focus Improvement'
      });
    }

    if (actions.length === 0) {
      actions.push({
        priority: 'LOW',
        action: 'Monitor Progress',
        description: 'Continue current approach',
        timeline: 'Ongoing',
        impact: 'Maintain Stability'
      });
    }

    const tableData = [
      [
        { text: 'Priority', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Action', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Description', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Timeline', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Impact', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } }
      ]
    ];

    actions.forEach(action => {
      const priorityColor = action.priority === 'CRITICAL' ? theme.danger :
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

  private async createExecutiveKPIDashboard(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any
  ): Promise<void> {
    const slide = pptx.addSlide();

    slide.addText('EXECUTIVE KPI DASHBOARD', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 28, color: theme.primary, bold: true
    });

    const executiveKPIs = [
      {
        title: 'PROJECT COMPLETION',
        value: `${this.trofosAnalysis.completionRate}%`,
        subtitle: this.trofosAnalysis.completionRate >= 80 ? 'ON TRACK' : 'NEEDS ATTENTION',
        status: this.trofosAnalysis.completionRate >= 80 ? 'success' : 'warning',
        x: 0.5, y: 1.5, w: 4.3, h: 1.8
      },
      {
        title: 'URGENT BACKLOG',
        value: `${this.trofosAnalysis.urgentTasks}`,
        subtitle: this.trofosAnalysis.urgentTasks <= 10 ? 'MANAGEABLE' : 'HIGH RISK',
        status: this.trofosAnalysis.urgentTasks <= 10 ? 'success' : 'danger',
        x: 5.2, y: 1.5, w: 4.2, h: 1.8
      },
      {
        title: 'TEAM CAPACITY',
        value: this.trofosAnalysis.teamWorkload[0]?.percentage >= 70 ? 'OVERLOADED' : 'BALANCED',
        subtitle: `Top: ${this.trofosAnalysis.teamWorkload[0]?.percentage || 0}% concentration`,
        status: this.trofosAnalysis.teamWorkload[0]?.percentage >= 70 ? 'danger' : 'success',
        x: 0.5, y: 3.5, w: 4.3, h: 1.8
      },
      {
        title: 'UNASSIGNED WORK',
        value: `${this.trofosAnalysis.unassignedTasks}`,
        subtitle: this.trofosAnalysis.unassignedTasks === 0 ? 'ALL ASSIGNED' : 'NEEDS OWNERS',
        status: this.trofosAnalysis.unassignedTasks === 0 ? 'success' : 'warning',
        x: 5.2, y: 3.5, w: 4.2, h: 1.8
      }
    ];

    executiveKPIs.forEach(kpi => {
      const statusColor = kpi.status === 'success' ? theme.success :
        kpi.status === 'warning' ? theme.warning : theme.danger;

      slide.addShape(pptx.ShapeType.rect, {
        x: kpi.x, y: kpi.y, w: kpi.w, h: kpi.h,
        fill: { color: statusColor },
        line: { color: statusColor, width: 0 }
      });

      slide.addText(kpi.title, {
        x: kpi.x, y: kpi.y + 0.1, w: kpi.w, h: 0.4,
        fontSize: 14, color: 'FFFFFF', bold: true, align: 'center'
      });

      slide.addText(kpi.value, {
        x: kpi.x, y: kpi.y + 0.6, w: kpi.w, h: 0.8,
        fontSize: 24, color: 'FFFFFF', bold: true, align: 'center'
      });

      slide.addText(kpi.subtitle, {
        x: kpi.x, y: kpi.y + 1.3, w: kpi.w, h: 0.4,
        fontSize: 10, color: 'FFFFFF', align: 'center'
      });
    });
  }

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

    if (this.trofosAnalysis.teamWorkload[0]?.percentage >= 70) {
      alerts.push({
        type: 'CRITICAL',
        title: 'TEAM CAPACITY OVERLOAD',
        message: `${this.trofosAnalysis.teamWorkload[0]?.percentage}% of work concentrated on ${this.trofosAnalysis.teamWorkload[0]?.assignee}`,
        action: 'Immediate workload redistribution required',
        color: theme.danger
      });
    }

    if (this.trofosAnalysis.urgentTasks > 10) {
      alerts.push({
        type: 'HIGH',
        title: 'URGENT TASK BACKLOG',
        message: `${this.trofosAnalysis.urgentTasks} high-priority tasks pending`,
        action: 'Review priority assignments and resource allocation',
        color: theme.warning
      });
    }

    if (this.trofosAnalysis.unassignedTasks > 5) {
      alerts.push({
        type: 'MEDIUM',
        title: 'UNASSIGNED TASKS',
        message: `${this.trofosAnalysis.unassignedTasks} tasks without owners`,
        action: 'Assign clear ownership and accountability',
        color: theme.info
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        type: 'INFO',
        title: 'PROJECT STATUS',
        message: 'No critical issues detected',
        action: 'Continue monitoring project health',
        color: theme.success
      });
    }

    let yPos = 1.5;
    alerts.forEach(alert => {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.5, y: yPos, w: 9, h: 1.4,
        fill: { color: alert.color },
        line: { color: alert.color, width: 0 }
      });

      slide.addText(`${alert.type}: ${alert.title}`, {
        x: 0.7, y: yPos + 0.1, w: 8.6, h: 0.3,
        fontSize: 12, color: 'FFFFFF', bold: true, align: 'left'
      });

      slide.addText(alert.message, {
        x: 0.7, y: yPos + 0.4, w: 8.6, h: 0.4,
        fontSize: 10, color: 'FFFFFF', align: 'left'
      });

      slide.addText(`Action: ${alert.action}`, {
        x: 0.7, y: yPos + 0.8, w: 8.6, h: 0.4,
        fontSize: 9, color: 'FFFFFF', italic: true, align: 'left'
      });

      yPos += 1.6;
    });
  }

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

    if (this.trofosAnalysis.teamWorkload[0]?.percentage >= 70) {
      strategicActions.push({
        priority: 'IMMEDIATE',
        action: 'Resource Rebalancing',
        description: 'Redistribute workload to prevent single-point-of-failure',
        timeline: '1-2 weeks',
        impact: 'Risk Reduction'
      });
    }

    if (this.trofosAnalysis.urgentTasks > 10) {
      strategicActions.push({
        priority: 'HIGH',
        action: 'Priority Management',
        description: 'Implement stricter priority governance',
        timeline: '2-3 weeks',
        impact: 'Focus Improvement'
      });
    }

    if (this.trofosAnalysis.completionRate < 80) {
      strategicActions.push({
        priority: 'MEDIUM',
        action: 'Process Optimization',
        description: 'Review delivery processes and remove blockers',
        timeline: '3-4 weeks',
        impact: 'Velocity Increase'
      });
    }

    if (strategicActions.length === 0) {
      strategicActions.push({
        priority: 'LOW',
        action: 'Continuous Improvement',
        description: 'Maintain current performance standards',
        timeline: 'Ongoing',
        impact: 'Sustained Excellence'
      });
    }

    const tableData = [
      [
        { text: 'Priority', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Strategic Action', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Description', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Timeline', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Expected Impact', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } }
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

    slide.addText('Comprehensive team performance and capacity analysis based on real TROFOS data.', {
      x: 0.5, y: 1.2, w: 9, h: 1,
      fontSize: 16, color: '374151'
    });

    const teamMetrics = this.trofosAnalysis.teamWorkload.map(member => ({
      name: member.assignee,
      productivity: Math.round((member.count / this.trofosAnalysis.totalTasks) * 100),
      efficiency: member.riskLevel === 'CRITICAL' ? 'Overloaded' :
        member.riskLevel === 'HIGH' ? 'High Utilization' : 'Optimal',
      recommendation: member.percentage >= 70 ? 'Reduce workload' :
        member.percentage >= 50 ? 'Monitor closely' : 'Increase capacity'
    }));

    const tableData = [
      [
        { text: 'Team Member', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Task Load %', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Efficiency', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Recommendation', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } }
      ]
    ];

    teamMetrics.forEach(metric => {
      const efficiencyColor = metric.efficiency === 'Overloaded' ? theme.danger :
        metric.efficiency === 'High Utilization' ? theme.warning : theme.success;

      tableData.push([
        { text: metric.name, options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: `${metric.productivity}%`, options: { fontSize: 12, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: metric.efficiency, options: { fontSize: 12, color: efficiencyColor, bold: true, fill: { color: 'FFFFFF' } } },
        { text: metric.recommendation, options: { fontSize: 11, bold: false, fill: { color: 'FFFFFF' }, color: '000000' } }
      ]);
    });

    slide.addTable(tableData, { x: 0.5, y: 2.5, w: 9, h: 3 });
  }

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

    slide.addText('Real TROFOS tasks showing project progress and team contributions', {
      x: 0.5, y: 0.8, w: 9, h: 0.4,
      fontSize: 14, color: '6B7280', align: 'center'
    });

    const tasks = Array.isArray(projectData.tasks) ? projectData.tasks : [];
    const sortedTasks = tasks
      .sort((a, b) => {
        const priorityOrder = { 'Highest': 4, 'High': 3, 'Medium': 2, 'Low': 1, 'None': 0 };
        const statusOrder = { 'Done': 3, 'In Progress': 2, 'To Do': 1 };

        // First sort by priority, then by status
        const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        if (priorityDiff !== 0) return priorityDiff;

        return (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
      })
      .slice(0, 15);

    const tableData = [
      [
        { text: 'ID', options: { bold: true, fontSize: 12, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Summary', options: { bold: true, fontSize: 12, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Assignee', options: { bold: true, fontSize: 12, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Priority', options: { bold: true, fontSize: 12, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Status', options: { bold: true, fontSize: 12, fill: { color: theme.primary }, color: 'FFFFFF' } }
      ]
    ];

    console.log('🔍 POWERPOINT GENERATOR DEBUG - Task objects received:');
    console.log('   - Tasks array length:', sortedTasks.length);
    console.log('   - First 3 task objects:', JSON.stringify(sortedTasks.slice(0, 3), null, 2));

    sortedTasks.forEach((task, index) => {
      /* console.log(`🔍 TASK ACCESS TEST ${index}:`, {
        id: task.id,
        directAccess: task.name,
        bracketAccess: task['title'],
        stringified: JSON.stringify(task),
        descriptors: Object.getOwnPropertyDescriptors(task)
      });

      // Try both access methods
      const titleFromDirect = task.name;
      const titleFromBracket = task['title'];
      const titleFromStringify = JSON.parse(JSON.stringify(task)).title;

      console.log('Title access methods:', { titleFromDirect, titleFromBracket, titleFromStringify }); */

      /* console.log('🔍 STATUS DEBUG:', {
        id: task.id,
        directStatus: task.status,
        bracketStatus: task['status'],
        normalizedDirect: this.normalizeTrofosStatus(task.status || 'Unknown'),
        normalizedBracket: this.normalizeTrofosStatus(task['status'] || 'Unknown')
      }); */

      const priorityColor = this.getPriorityColor(task.priority || 'None');
      const statusColor = this.getStatusColor(task.status || 'Unknown');

      tableData.push([
        {
          text: task.id || 'N/A',
          options: { fontSize: 9, bold: false, fill: { color: 'FFFFFF' }, color: '000000' }
        },
        {
          text: this.truncateText(task['title'] || 'Unnamed Task', 40),
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
          text: this.normalizeTrofosStatus(task['status'] || 'Unknown'),
          options: { fontSize: 9, bold: true, fill: { color: 'FFFFFF' }, color: statusColor }
        }
      ]);
    });

    slide.addTable(tableData, {
      x: 0.5,
      y: 1.2,
      w: 9,
      h: 4.0,
      colW: [1.2, 3.5, 1.8, 1.2, 1.3]
    });

    slide.addText(`Showing ${sortedTasks.length} of ${tasks.length} total tasks (sorted by priority and status)`, {
      x: 0.5, y: 5.25, w: 9, h: 0.3,
      fontSize: 10, color: '6B7280', italic: true, align: 'center'
    });
  }

  private async createPredictiveAnalysis(
    pptx: PptxGenJS,
    projectData: ProjectData,
    theme: any
  ): Promise<void> {
    const slide = pptx.addSlide();

    slide.addText('PREDICTIVE ANALYSIS', {
      x: 0.5, y: 0.3, w: 9, h: 0.8,
      fontSize: 28, color: theme.primary, bold: true
    });    

    // Calculate projected completion based on current velocity
    const remainingTasks = this.trofosAnalysis.totalTasks -
      this.trofosAnalysis.statusDistribution.find(s => s.status === 'Done')?.count || 0;

    const averageVelocity = Math.max(1, Math.round(this.trofosAnalysis.totalTasks * 0.1)); // Assume 10% weekly velocity
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

    slide.addText('Strategic implementation plan based on current project analysis', {
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

  // Helper methods
  private normalizeTrofosStatus(status: string): string {
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
    return status;
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'Done': return '36B37E';
      case 'In Progress': return '0065FF';
      case 'To Do': return '6B7280';
      default: return '6B7280';
    }
  }

  private getPriorityColor(priority: string): string {
    switch (priority) {
      case 'Highest': return 'DE350B';
      case 'High': return 'FF5630';
      case 'Medium': return 'FFAB00';
      case 'Low': return '36B37E';
      default: return '6B7280';
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

    if (teamWorkload[0]?.percentage >= 70) riskScore += 3;
    if (urgentTasks > totalTasks * 0.3) riskScore += 2;
    if (unassignedTasks > totalTasks * 0.2) riskScore += 2;
    if (completionRate < 60) riskScore += 2;

    if (riskScore >= 5) return 'CRITICAL';
    if (riskScore >= 3) return 'HIGH';
    if (riskScore >= 1) return 'MEDIUM';
    return 'LOW';
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private getEmptyAnalysis(): TrofosTaskAnalysis {
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