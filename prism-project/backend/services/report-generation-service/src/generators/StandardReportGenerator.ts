// backend/services/report-generation-service/src/generators/StandardReportGenerator.ts
// Enhanced Standard Report Template (8-12 slides) - Windows Compatible (No Unicode/Symbols)
// ENHANCED: Uses real platform data instead of mock data - FIXED for PptxGenJS compatibility

import PptxGenJS from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { ProjectData } from '../services/PlatformDataService';
import { DataAnalyticsService, AnalyticsMetrics } from '../services/DataAnalyticsService';

export interface StandardReportConfig {
  title?: string;
  includeMetrics?: boolean;
  includeTasks?: boolean;
  includeTimeline?: boolean;
  includeResources?: boolean;
  [key: string]: any;
}

interface PlatformStatusMapping {
  [key: string]: {
    category: 'todo' | 'progress' | 'done' | 'blocked';
    displayName: string;
    color: string;
  };
}

export class StandardReportGenerator {
  private readonly STORAGE_DIR: string;
  private analytics: AnalyticsMetrics;
  private platformStatusMap: PlatformStatusMapping;

  constructor() {
    this.STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../../storage');
    
    // Ensure storage directory exists
    if (!fs.existsSync(this.STORAGE_DIR)) {
      fs.mkdirSync(this.STORAGE_DIR, { recursive: true });
    }

    // Initialize platform-specific status mappings
    this.initializePlatformMappings();
  }

  /**
   * Initialize platform-specific status mappings
   */
  private initializePlatformMappings(): void {
    this.platformStatusMap = {
      // Jira Status Mappings
      'to do': { category: 'todo', displayName: 'To Do', color: '6B7280' },
      'todo': { category: 'todo', displayName: 'To Do', color: '6B7280' },
      'open': { category: 'todo', displayName: 'Open', color: '6B7280' },
      'new': { category: 'todo', displayName: 'New', color: '6B7280' },
      'created': { category: 'todo', displayName: 'Created', color: '6B7280' },
      'backlog': { category: 'todo', displayName: 'Backlog', color: '6B7280' },
      
      'in progress': { category: 'progress', displayName: 'In Progress', color: '3B82F6' },
      'progress': { category: 'progress', displayName: 'In Progress', color: '3B82F6' },
      'in review': { category: 'progress', displayName: 'In Review', color: '3B82F6' },
      'review': { category: 'progress', displayName: 'In Review', color: '3B82F6' },
      'testing': { category: 'progress', displayName: 'Testing', color: '3B82F6' },
      'development': { category: 'progress', displayName: 'Development', color: '3B82F6' },
      
      'done': { category: 'done', displayName: 'Done', color: '10B981' },
      'completed': { category: 'done', displayName: 'Completed', color: '10B981' },
      'closed': { category: 'done', displayName: 'Closed', color: '10B981' },
      'resolved': { category: 'done', displayName: 'Resolved', color: '10B981' },
      'finished': { category: 'done', displayName: 'Finished', color: '10B981' },
      
      'blocked': { category: 'blocked', displayName: 'Blocked', color: 'EF4444' },
      'stuck': { category: 'blocked', displayName: 'Stuck', color: 'EF4444' },
      'on hold': { category: 'blocked', displayName: 'On Hold', color: 'EF4444' },
      'waiting': { category: 'blocked', displayName: 'Waiting', color: 'EF4444' },
      
      // Monday.com Status Mappings
      'working on it': { category: 'progress', displayName: 'Working On It', color: 'FDBA13' },
      'waiting for review': { category: 'progress', displayName: 'Waiting for Review', color: '3B82F6' },
      
      // Default fallback
      'unknown': { category: 'todo', displayName: 'Unknown', color: '9CA3AF' }
    };
  }

  /**
   * Get platform theme colors
   */
  private getPlatformTheme(platform: string): { primary: string; secondary: string; accent: string } {
    switch (platform.toLowerCase()) {
      case 'jira':
        return { primary: '2684FF', secondary: '0052CC', accent: 'E3F2FD' };
      case 'monday':
      case 'monday.com':
        return { primary: 'FF3366', secondary: 'D91A46', accent: 'FFEBEE' };
      case 'trofos':
        return { primary: '6366F1', secondary: '4F46E5', accent: 'EEF2FF' };
      default:
        return { primary: '374151', secondary: '1F2937', accent: 'F9FAFB' };
    }
  }

  /**
   * Normalize status to standard category
   */
  private normalizeStatus(status: string): { category: string; displayName: string; color: string } {
    const normalizedStatus = status.toLowerCase().trim();
    const mapping = this.platformStatusMap[normalizedStatus];
    
    if (mapping) {
      return mapping;
    }
    
    // Fallback logic for unmapped statuses
    if (normalizedStatus.includes('done') || normalizedStatus.includes('complete') || normalizedStatus.includes('close')) {
      return { category: 'done', displayName: status, color: '10B981' };
    } else if (normalizedStatus.includes('progress') || normalizedStatus.includes('develop') || normalizedStatus.includes('work')) {
      return { category: 'progress', displayName: status, color: '3B82F6' };
    } else if (normalizedStatus.includes('block') || normalizedStatus.includes('stuck') || normalizedStatus.includes('wait')) {
      return { category: 'blocked', displayName: status, color: 'EF4444' };
    } else {
      return { category: 'todo', displayName: status, color: '6B7280' };
    }
  }

  /**
   * Extract real team members from project data
   */
  private extractRealTeamMembers(projectData: ProjectData): Array<{ name: string; role: string; taskCount: number; utilization: number }> {
    const tasks = projectData.tasks || [];
    const team = projectData.team || [];
    
    // Get unique assignees from tasks
    const assigneeMap = new Map<string, number>();
    tasks.forEach(task => {
      if (task.assignee && task.assignee !== 'Unassigned' && !task.assignee.startsWith('User')) {
        const count = assigneeMap.get(task.assignee) || 0;
        assigneeMap.set(task.assignee, count + 1);
      }
    });

    // Create team member objects with real data
    const teamMembers: Array<{ name: string; role: string; taskCount: number; utilization: number }> = [];
    
    // Add team members from team array
    team.forEach(member => {
      if (member.name && !member.name.startsWith('User')) {
        const taskCount = assigneeMap.get(member.name) || 0;
        teamMembers.push({
          name: member.name,
          role: member.role || 'Team Member',
          taskCount,
          utilization: Math.min(100, taskCount * 15) // Rough utilization calculation
        });
      }
    });

    // Add assignees not in team array
    assigneeMap.forEach((taskCount, assigneeName) => {
      if (!teamMembers.find(tm => tm.name === assigneeName)) {
        teamMembers.push({
          name: assigneeName,
          role: 'Team Member',
          taskCount,
          utilization: Math.min(100, taskCount * 15)
        });
      }
    });

    return teamMembers.sort((a, b) => b.taskCount - a.taskCount);
  }

  /**
   * Calculate real status distribution
   */
  private calculateStatusDistribution(projectData: ProjectData): Array<{ status: string; count: number; percentage: number; color: string }> {
    const tasks = projectData.tasks || [];
    if (tasks.length === 0) return [];

    const statusMap = new Map<string, { count: number; color: string }>();
    
    tasks.forEach(task => {
      const normalized = this.normalizeStatus(task.status);
      const existing = statusMap.get(normalized.category);
      statusMap.set(normalized.category, {
        count: (existing?.count || 0) + 1,
        color: normalized.color
      });
    });

    const distribution = Array.from(statusMap.entries()).map(([status, data]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count: data.count,
      percentage: Math.round((data.count / tasks.length) * 100),
      color: data.color
    }));

    return distribution.sort((a, b) => b.count - a.count);
  }

  /**
   * Generate Standard Report PowerPoint (8-12 slides)
   */
  async generate(
    projectData: ProjectData, 
    config: StandardReportConfig, 
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<string> {
    try {
      logger.info('Generating Enhanced Standard Report', {
        platform: projectData.platform,
        projectName: projectData.name,
        taskCount: projectData.tasks?.length || 0,
        teamSize: projectData.team?.length || 0,
        usingFallback: projectData.fallbackData || false
      });

      // Calculate enhanced analytics
      this.analytics = DataAnalyticsService.calculateAnalytics(projectData);

      // Initialize PowerPoint
      const pptx = new PptxGenJS();
      
      // Configure presentation
      pptx.layout = 'LAYOUT_16x9';
      pptx.author = 'PRISM Report System';
      pptx.company = 'Project Management Analytics';
      pptx.subject = `Standard Report - ${projectData.name}`;
      pptx.title = config.title || `${projectData.name} - Standard Report`;

      const theme = this.getPlatformTheme(projectData.platform);

      // Generate slides
      await this.createTitleSlide(pptx, projectData, config, theme);
      await progressCallback?.(10);

      await this.createProjectOverviewSlide(pptx, projectData, theme);
      await progressCallback?.(20);

      if (config.includeMetrics !== false) {
        await this.createMetricsDashboardSlide(pptx, projectData, theme);
        await progressCallback?.(30);
      }

      if (config.includeTasks !== false) {
        await this.createTaskAnalysisSlide(pptx, projectData, theme);
        await progressCallback?.(40);
      }

      if (config.includeResources !== false) {
        await this.createTeamPerformanceSlide(pptx, projectData, theme);
        await progressCallback?.(50);
      }

      if (config.includeTimeline !== false) {
        await this.createTimelineAnalysisSlide(pptx, projectData, theme);
        await progressCallback?.(60);
      }

      await this.createRiskAssessmentSlide(pptx, projectData, theme);
      await progressCallback?.(70);

      await this.createProgressSummarySlide(pptx, projectData, theme);
      await progressCallback?.(80);

      await this.createNextStepsSlide(pptx, projectData, theme);
      await progressCallback?.(90);

      // Save file
      const filename = `standard-report-${projectData.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.pptx`;
      const filepath = path.join(this.STORAGE_DIR, filename);
      
      await pptx.writeFile({ fileName: filepath });
      await progressCallback?.(100);

      logger.info('Standard Report generated successfully', {
        filename,
        platform: projectData.platform
      });

      return filename;

    } catch (error) {
      logger.error('Error generating Standard Report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate Standard Report: ${errorMessage}`);
    }
  }

  /**
   * Create enhanced title slide with platform branding
   */
  private async createTitleSlide(
    pptx: PptxGenJS, 
    projectData: ProjectData, 
    config: StandardReportConfig,
    theme: { primary: string; secondary: string; accent: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    // Background with platform theme
    slide.background = { color: theme.accent };

    // Main title
    slide.addText(config.title || `${projectData.name} Standard Report`, {
      x: '10%',
      y: '25%',
      w: '80%',
      h: '15%',
      fontSize: 32,
      color: theme.primary,
      bold: true,
      align: 'center'
    });

    // Subtitle with platform and real data indicators
    const subtitle = `${projectData.platform.toUpperCase()} Platform Report | ${projectData.tasks?.length || 0} Tasks | ${this.extractRealTeamMembers(projectData).length} Team Members`;
    slide.addText(subtitle, {
      x: '10%',
      y: '42%',
      w: '80%',
      h: '8%',
      fontSize: 16,
      color: theme.secondary,
      align: 'center'
    });

    // Data source indicator
    const dataSource = projectData.fallbackData ? 
      'Report generated using demonstration data' : 
      `Live data from ${projectData.platform} - Generated ${new Date().toLocaleDateString()}`;
    
    slide.addText(dataSource, {
      x: '10%',
      y: '55%',
      w: '80%',
      h: '6%',
      fontSize: 12,
      color: '6B7280',
      align: 'center'
    });

    // Key metrics preview
    slide.addText(`Completion Rate: ${this.analytics.completionRate}% | Team Efficiency: ${this.analytics.teamEfficiency}% | Quality Score: ${this.analytics.qualityScore}%`, {
      x: '10%',
      y: '70%',
      w: '80%',
      h: '8%',
      fontSize: 14,
      color: theme.primary,
      bold: true,
      align: 'center'
    });
  }

  /**
   * Create enhanced project overview with real data
   */
  private async createProjectOverviewSlide(
    pptx: PptxGenJS, 
    projectData: ProjectData,
    theme: { primary: string; secondary: string; accent: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    // Slide title
    slide.addText('PROJECT OVERVIEW', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      color: theme.primary,
      bold: true
    });

    // Real project information
    const realTeamMembers = this.extractRealTeamMembers(projectData);
    const statusDistribution = this.calculateStatusDistribution(projectData);
    const completedTasks = statusDistribution.find(s => s.status === 'Done')?.count || 0;
    const totalTasks = projectData.tasks?.length || 0;

    // Project summary with real data
    const summaryText = [
      `Platform: ${projectData.platform.toUpperCase()}`,
      `Total Tasks: ${totalTasks}`,
      `Completed Tasks: ${completedTasks}`,
      `Team Size: ${realTeamMembers.length}`,
      `Completion Rate: ${this.analytics.completionRate}%`,
      `Project Health: ${this.getProjectHealth()}`
    ].join('\n');

    slide.addText(summaryText, {
      x: 0.5,
      y: 1.5,
      w: 4.5,
      h: 3,
      fontSize: 14,
      color: '374151',
      bullet: { type: 'bullet' }
    });

    // Status distribution chart with real data
    if (statusDistribution.length > 0) {
      const chartData = statusDistribution.map(item => ({
        name: item.status,
        value: item.count,
        labels: [`${item.status}: ${item.count} (${item.percentage}%)`]
      }));

      slide.addChart(pptx.ChartType.pie, chartData, {
        x: 5.5,
        y: 1.5,
        w: 4,
        h: 3,
        showLegend: true,
        legendPos: 'r',
        title: 'Task Status Distribution'
      });
    }

    // Real team composition
    if (realTeamMembers.length > 0) {
      const topMembers = realTeamMembers.slice(0, 5);
      const teamText = topMembers.map(member => 
        `${member.name} (${member.role}): ${member.taskCount} tasks`
      ).join('\n');

      slide.addText('KEY TEAM MEMBERS', {
        x: 0.5,
        y: 5,
        w: '90%',
        h: 0.5,
        fontSize: 16,
        color: theme.primary,
        bold: true
      });

      slide.addText(teamText, {
        x: 0.5,
        y: 5.5,
        w: '90%',
        h: 1.5,
        fontSize: 12,
        color: '374151',
        bullet: { type: 'bullet' }
      });
    }
  }

  /**
   * Create enhanced metrics dashboard with real calculations
   */
  private async createMetricsDashboardSlide(
    pptx: PptxGenJS, 
    projectData: ProjectData,
    theme: { primary: string; secondary: string; accent: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    slide.addText('METRICS DASHBOARD', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      color: theme.primary,
      bold: true
    });

    // Real metrics from platform data
    const realMetrics = [
      {
        name: 'Completion Rate',
        value: `${this.analytics.completionRate}%`,
        trend: this.analytics.velocityTrend,
        color: this.analytics.completionRate >= 70 ? '10B981' : this.analytics.completionRate >= 50 ? 'F59E0B' : 'EF4444'
      },
      {
        name: 'Team Efficiency',
        value: `${this.analytics.teamEfficiency}%`,
        trend: 'stable',
        color: this.analytics.teamEfficiency >= 75 ? '10B981' : this.analytics.teamEfficiency >= 60 ? 'F59E0B' : 'EF4444'
      },
      {
        name: 'Quality Score',
        value: `${this.analytics.qualityScore}%`,
        trend: 'increasing',
        color: this.analytics.qualityScore >= 80 ? '10B981' : this.analytics.qualityScore >= 65 ? 'F59E0B' : 'EF4444'
      },
      {
        name: 'Risk Level',
        value: this.analytics.riskLevel.toUpperCase(),
        trend: 'stable',
        color: this.analytics.riskLevel === 'low' ? '10B981' : this.analytics.riskLevel === 'medium' ? 'F59E0B' : 'EF4444'
      }
    ];

    // Create metric cards
    realMetrics.forEach((metric, index) => {
      const x = 0.5 + (index % 2) * 4.7;
      const y = 1.5 + Math.floor(index / 2) * 1.8;

      // Metric value
      slide.addText(metric.value, {
        x,
        y,
        w: 4,
        h: 0.8,
        fontSize: 28,
        color: metric.color,
        bold: true,
        align: 'center'
      });

      // Metric name
      slide.addText(metric.name, {
        x,
        y: y + 0.8,
        w: 4,
        h: 0.5,
        fontSize: 14,
        color: '374151',
        align: 'center'
      });

      // Trend indicator
      slide.addText(`Trend: ${metric.trend}`, {
        x,
        y: y + 1.3,
        w: 4,
        h: 0.3,
        fontSize: 10,
        color: '6B7280',
        align: 'center'
      });
    });

    // Additional platform-specific metrics
    const platformMetrics = projectData.metrics || [];
    if (platformMetrics.length > 0) {
      slide.addText('PLATFORM METRICS', {
        x: 0.5,
        y: 5.5,
        w: '90%',
        h: 0.5,
        fontSize: 16,
        color: theme.primary,
        bold: true
      });

      const metricText = platformMetrics.slice(0, 6).map(metric => 
        `${metric.name}: ${metric.value}`
      ).join(' | ');

      slide.addText(metricText, {
        x: 0.5,
        y: 6,
        w: '90%',
        h: 1,
        fontSize: 12,
        color: '374151'
      });
    }
  }

  /**
   * Create enhanced task analysis with real task data
   */
  private async createTaskAnalysisSlide(
    pptx: PptxGenJS, 
    projectData: ProjectData,
    theme: { primary: string; secondary: string; accent: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    slide.addText('TASK ANALYSIS', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      color: theme.primary,
      bold: true
    });

    const tasks = projectData.tasks || [];
    const statusDistribution = this.calculateStatusDistribution(projectData);

    // Real task breakdown
    slide.addText('TASK BREAKDOWN BY STATUS', {
      x: 0.5,
      y: 1.5,
      w: 4.5,
      h: 0.5,
      fontSize: 16,
      color: '374151',
      bold: true
    });

    // Status breakdown with real data
    if (statusDistribution.length > 0) {
      const statusText = statusDistribution.map(item => 
        `${item.status}: ${item.count} tasks (${item.percentage}%)`
      ).join('\n');

      slide.addText(statusText, {
        x: 0.5,
        y: 2,
        w: 4.5,
        h: 2.5,
        fontSize: 12,
        color: '374151',
        bullet: { type: 'bullet' }
      });
    }

    // Recent task activity
    if (tasks.length > 0) {
      slide.addText('RECENT TASK ACTIVITY', {
        x: 5.5,
        y: 1.5,
        w: 4,
        h: 0.5,
        fontSize: 16,
        color: '374151',
        bold: true
      });

      // Get recently updated tasks
      const recentTasks = tasks
        .filter(task => task.updated)
        .sort((a, b) => new Date(b.updated!).getTime() - new Date(a.updated!).getTime())
        .slice(0, 5);

      if (recentTasks.length > 0) {
        const recentText = recentTasks.map(task => {
          const updatedDate = new Date(task.updated!).toLocaleDateString();
          return `${task.name} (${task.status}) - ${updatedDate}`;
        }).join('\n');

        slide.addText(recentText, {
          x: 5.5,
          y: 2,
          w: 4,
          h: 2.5,
          fontSize: 10,
          color: '374151',
          bullet: { type: 'bullet' }
        });
      }
    }

    // Task assignment analysis
    const assignmentAnalysis = this.analyzeTaskAssignments(projectData);
    slide.addText('ASSIGNMENT ANALYSIS', {
      x: 0.5,
      y: 5,
      w: '90%',
      h: 0.5,
      fontSize: 16,
      color: '374151',
      bold: true
    });

    slide.addText(assignmentAnalysis, {
      x: 0.5,
      y: 5.5,
      w: '90%',
      h: 1.5,
      fontSize: 12,
      color: '374151'
    });
  }

  /**
   * Create enhanced team performance slide with real team data
   */
  private async createTeamPerformanceSlide(
    pptx: PptxGenJS, 
    projectData: ProjectData,
    theme: { primary: string; secondary: string; accent: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    slide.addText('TEAM PERFORMANCE', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      color: theme.primary,
      bold: true
    });

    const realTeamMembers = this.extractRealTeamMembers(projectData);

    if (realTeamMembers.length > 0) {
      // Team performance table with real data - correct PptxGenJS format
      const tableData: any[][] = [
        [
          { text: 'Team Member', options: { bold: true } },
          { text: 'Role', options: { bold: true } },
          { text: 'Tasks', options: { bold: true } },
          { text: 'Utilization', options: { bold: true } },
          { text: 'Performance', options: { bold: true } }
        ]
      ];

      realTeamMembers.forEach(member => {
        const performance = this.calculateMemberPerformance(member, projectData);
        tableData.push([
          { text: member.name },
          { text: member.role },
          { text: member.taskCount.toString() },
          { text: `${member.utilization}%` },
          { text: performance }
        ]);
      });

      slide.addTable(tableData, {
        x: 0.5,
        y: 1.5,
        w: 9,
        colW: [2.5, 2, 1.2, 1.5, 1.8],
        border: { pt: 1, color: 'E5E7EB' },
        fill: { color: 'F9FAFB' }
      });

      // Team insights
      slide.addText('TEAM INSIGHTS', {
        x: 0.5,
        y: 5,
        w: '90%',
        h: 0.5,
        fontSize: 16,
        color: '374151',
        bold: true
      });

      const insights = this.generateTeamInsights(realTeamMembers, projectData);
      slide.addText(insights, {
        x: 0.5,
        y: 5.5,
        w: '90%',
        h: 1.5,
        fontSize: 12,
        color: '374151'
      });
    } else {
      // No team data available
      slide.addText('No team member data available from platform', {
        x: 0.5,
        y: 3,
        w: '90%',
        h: 1,
        fontSize: 16,
        color: '6B7280',
        align: 'center'
      });
    }
  }

  /**
   * Create timeline analysis slide
   */
  private async createTimelineAnalysisSlide(
    pptx: PptxGenJS, 
    projectData: ProjectData,
    theme: { primary: string; secondary: string; accent: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    slide.addText('TIMELINE ANALYSIS', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      color: theme.primary,
      bold: true
    });

    const sprints = projectData.sprints || [];
    
    if (sprints.length > 0) {
      // Sprint performance table with real data - correct PptxGenJS format
      const sprintTableData: any[][] = [
        [
          { text: 'Sprint', options: { bold: true } },
          { text: 'Start Date', options: { bold: true } },
          { text: 'End Date', options: { bold: true } },
          { text: 'Completion', options: { bold: true } },
          { text: 'Status', options: { bold: true } }
        ]
      ];

      sprints.forEach(sprint => {
        const completion = parseFloat(sprint.completed.replace('%', '')) || 0;
        const status = completion >= 90 ? 'Excellent' : completion >= 70 ? 'Good' : completion >= 50 ? 'Fair' : 'Behind';

        sprintTableData.push([
          { text: sprint.name },
          { text: new Date(sprint.startDate).toLocaleDateString() },
          { text: new Date(sprint.endDate).toLocaleDateString() },
          { text: sprint.completed },
          { text: status }
        ]);
      });

      slide.addTable(sprintTableData, {
        x: 0.5,
        y: 1.5,
        w: 9,
        colW: [2, 1.8, 1.8, 1.5, 1.9],
        border: { pt: 1, color: 'E5E7EB' },
        fill: { color: 'F9FAFB' }
      });

      // Timeline insights
      slide.addText('TIMELINE INSIGHTS', {
        x: 0.5,
        y: 4.5,
        w: '90%',
        h: 0.5,
        fontSize: 16,
        color: '374151',
        bold: true
      });

      const timelineInsights = this.generateTimelineInsights(sprints);
      slide.addText(timelineInsights, {
        x: 0.5,
        y: 5,
        w: '90%',
        h: 2,
        fontSize: 12,
        color: '374151'
      });
    } else {
      // Use task-based timeline analysis
      const taskTimeline = this.analyzeTaskTimeline(projectData);
      slide.addText(taskTimeline, {
        x: 0.5,
        y: 2,
        w: '90%',
        h: 4,
        fontSize: 12,
        color: '374151'
      });
    }
  }

  /**
   * Create risk assessment slide
   */
  private async createRiskAssessmentSlide(
    pptx: PptxGenJS, 
    projectData: ProjectData,
    theme: { primary: string; secondary: string; accent: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    slide.addText('RISK ASSESSMENT', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      color: theme.primary,
      bold: true
    });

    // Risk level indicator
    const riskColor = this.analytics.riskLevel === 'low' ? '10B981' : 
                     this.analytics.riskLevel === 'medium' ? 'F59E0B' : 'EF4444';

    slide.addText(`OVERALL RISK LEVEL: ${this.analytics.riskLevel.toUpperCase()}`, {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 0.8,
      fontSize: 20,
      color: riskColor,
      bold: true,
      align: 'center'
    });

    // Risk factors with real data
    const riskFactors = [
      `Blocked Items: ${this.analytics.blockedItemsCount} tasks requiring attention`,
      `Overdue Tasks: ${this.analytics.overdueTasks} tasks past expected completion`,
      `Timeline Adherence: ${this.analytics.timelineAdherence}% on schedule`,
      `Team Utilization: ${this.getTeamUtilizationRisk(projectData)}`,
      `Quality Concerns: ${this.getQualityRiskFactors()}`
    ];

    slide.addText('RISK FACTORS', {
      x: 0.5,
      y: 2.8,
      w: '90%',
      h: 0.5,
      fontSize: 16,
      color: '374151',
      bold: true
    });

    slide.addText(riskFactors.join('\n'), {
      x: 0.5,
      y: 3.3,
      w: '90%',
      h: 2.5,
      fontSize: 12,
      color: '374151',
      bullet: { type: 'bullet' }
    });

    // Mitigation recommendations
    slide.addText('RECOMMENDED ACTIONS', {
      x: 0.5,
      y: 6,
      w: '90%',
      h: 0.5,
      fontSize: 16,
      color: '374151',
      bold: true
    });

    const recommendations = this.generateRiskMitigationActions();
    slide.addText(recommendations, {
      x: 0.5,
      y: 6.5,
      w: '90%',
      h: 1,
      fontSize: 12,
      color: '374151'
    });
  }

  /**
   * Create progress summary slide
   */
  private async createProgressSummarySlide(
    pptx: PptxGenJS, 
    projectData: ProjectData,
    theme: { primary: string; secondary: string; accent: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    slide.addText('PROGRESS SUMMARY', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      color: theme.primary,
      bold: true
    });

    // Key achievements with real data
    const achievements = this.generateKeyAchievements(projectData);
    slide.addText('KEY ACHIEVEMENTS', {
      x: 0.5,
      y: 1.5,
      w: 4.5,
      h: 0.5,
      fontSize: 16,
      color: '374151',
      bold: true
    });

    slide.addText(achievements, {
      x: 0.5,
      y: 2,
      w: 4.5,
      h: 2.5,
      fontSize: 12,
      color: '374151',
      bullet: { type: 'bullet' }
    });

    // Current challenges
    const challenges = this.generateCurrentChallenges(projectData);
    slide.addText('CURRENT CHALLENGES', {
      x: 5.5,
      y: 1.5,
      w: 4,
      h: 0.5,
      fontSize: 16,
      color: 'EF4444',
      bold: true
    });

    slide.addText(challenges, {
      x: 5.5,
      y: 2,
      w: 4,
      h: 2.5,
      fontSize: 12,
      color: '374151',
      bullet: { type: 'bullet' }
    });

    // Progress metrics summary
    slide.addText('PROGRESS METRICS', {
      x: 0.5,
      y: 5,
      w: '90%',
      h: 0.5,
      fontSize: 16,
      color: '374151',
      bold: true
    });

    const progressMetrics = [
      `Overall Completion: ${this.analytics.completionRate}%`,
      `Team Performance: ${this.analytics.teamEfficiency}%`,
      `Quality Standard: ${this.analytics.qualityScore}%`,
      `Velocity Trend: ${this.analytics.velocityTrend}`,
      `Collaboration Score: ${this.analytics.collaborationScore}%`
    ].join(' | ');

    slide.addText(progressMetrics, {
      x: 0.5,
      y: 5.5,
      w: '90%',
      h: 1.5,
      fontSize: 12,
      color: '374151'
    });
  }

  /**
   * Create next steps slide
   */
  private async createNextStepsSlide(
    pptx: PptxGenJS, 
    projectData: ProjectData,
    theme: { primary: string; secondary: string; accent: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    slide.addText('NEXT STEPS & RECOMMENDATIONS', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      color: theme.primary,
      bold: true
    });

    // Immediate actions
    const immediateActions = this.generateImmediateActions(projectData);
    slide.addText('IMMEDIATE ACTIONS (Next 1-2 weeks)', {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 0.5,
      fontSize: 16,
      color: 'EF4444',
      bold: true
    });

    slide.addText(immediateActions, {
      x: 0.5,
      y: 2,
      w: '90%',
      h: 1.5,
      fontSize: 12,
      color: '374151',
      bullet: { type: 'bullet' }
    });

    // Medium-term actions
    const mediumTermActions = this.generateMediumTermActions(projectData);
    slide.addText('MEDIUM-TERM ACTIONS (Next 2-4 weeks)', {
      x: 0.5,
      y: 3.8,
      w: '90%',
      h: 0.5,
      fontSize: 16,
      color: 'F59E0B',
      bold: true
    });

    slide.addText(mediumTermActions, {
      x: 0.5,
      y: 4.3,
      w: '90%',
      h: 1.5,
      fontSize: 12,
      color: '374151',
      bullet: { type: 'bullet' }
    });

    // Strategic recommendations
    const strategicRecommendations = this.generateStrategicRecommendations(projectData);
    slide.addText('STRATEGIC RECOMMENDATIONS', {
      x: 0.5,
      y: 6,
      w: '90%',
      h: 0.5,
      fontSize: 16,
      color: theme.primary,
      bold: true
    });

    slide.addText(strategicRecommendations, {
      x: 0.5,
      y: 6.5,
      w: '90%',
      h: 1,
      fontSize: 12,
      color: '374151'
    });
  }

  // Helper methods for data analysis and insights

  private getProjectHealth(): string {
    const score = (this.analytics.completionRate + this.analytics.teamEfficiency + this.analytics.qualityScore) / 3;
    return score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Fair' : 'Needs Attention';
  }

  private analyzeTaskAssignments(projectData: ProjectData): string {
    const tasks = projectData.tasks || [];
    const assignedTasks = tasks.filter(task => task.assignee && task.assignee !== 'Unassigned').length;
    const unassignedTasks = tasks.length - assignedTasks;
    const assignmentRate = tasks.length > 0 ? Math.round((assignedTasks / tasks.length) * 100) : 0;

    return `Assignment Rate: ${assignmentRate}% | Assigned: ${assignedTasks} tasks | Unassigned: ${unassignedTasks} tasks | ${assignmentRate >= 80 ? 'Good assignment coverage' : 'Consider assigning more tasks to team members'}`;
  }

  private calculateMemberPerformance(member: { name: string; role: string; taskCount: number; utilization: number }, projectData: ProjectData): string {
    const tasks = projectData.tasks || [];
    const memberTasks = tasks.filter(task => task.assignee === member.name);
    const completedTasks = memberTasks.filter(task => ['done', 'completed', 'closed'].includes(task.status.toLowerCase())).length;
    const completionRate = memberTasks.length > 0 ? Math.round((completedTasks / memberTasks.length) * 100) : 0;

    return completionRate >= 80 ? 'High' : completionRate >= 60 ? 'Medium' : 'Low';
  }

  private generateTeamInsights(teamMembers: Array<{ name: string; role: string; taskCount: number; utilization: number }>, projectData: ProjectData): string {
    const insights = [];
    
    const highPerformers = teamMembers.filter(m => m.utilization >= 80).length;
    const underutilized = teamMembers.filter(m => m.utilization < 40).length;
    
    if (highPerformers > 0) {
      insights.push(`${highPerformers} team members showing high productivity`);
    }
    
    if (underutilized > 0) {
      insights.push(`${underutilized} team members may be underutilized`);
    }
    
    const topPerformer = teamMembers[0];
    if (topPerformer) {
      insights.push(`Top contributor: ${topPerformer.name} with ${topPerformer.taskCount} tasks`);
    }

    return insights.join('. ') || 'Team performance analysis in progress.';
  }

  private generateTimelineInsights(sprints: Array<{ name: string; startDate: string; endDate: string; completed: string }>): string {
    const insights = [];
    const completionRates = sprints.map(s => parseFloat(s.completed.replace('%', '')) || 0);
    const avgCompletion = Math.round(completionRates.reduce((a, b) => a + b, 0) / completionRates.length);
    
    insights.push(`Average sprint completion: ${avgCompletion}%`);
    
    const improving = completionRates.length >= 2 && completionRates[completionRates.length - 1] > completionRates[completionRates.length - 2];
    insights.push(`Velocity trend: ${improving ? 'Improving' : 'Stable'}`);
    
    const lowPerformingSprints = completionRates.filter(rate => rate < 70).length;
    if (lowPerformingSprints > 0) {
      insights.push(`${lowPerformingSprints} sprints below 70% completion`);
    }

    return insights.join('. ');
  }

  private analyzeTaskTimeline(projectData: ProjectData): string {
    const tasks = projectData.tasks || [];
    const completedTasks = tasks.filter(task => ['done', 'completed', 'closed'].includes(task.status.toLowerCase())).length;
    const inProgressTasks = tasks.filter(task => ['in progress', 'progress', 'working on it'].includes(task.status.toLowerCase())).length;
    const blockedTasks = tasks.filter(task => ['blocked', 'stuck', 'on hold'].includes(task.status.toLowerCase())).length;

    const analysis = [
      'TASK TIMELINE ANALYSIS',
      '',
      `Total Tasks: ${tasks.length}`,
      `Completed: ${completedTasks} (${Math.round((completedTasks / tasks.length) * 100)}%)`,
      `In Progress: ${inProgressTasks} (${Math.round((inProgressTasks / tasks.length) * 100)}%)`,
      `Blocked: ${blockedTasks} (${Math.round((blockedTasks / tasks.length) * 100)}%)`,
      '',
      'Recent activity shows ' + (this.analytics.velocityTrend === 'increasing' ? 'accelerating' : this.analytics.velocityTrend === 'decreasing' ? 'declining' : 'stable') + ' progress.',
      'Timeline adherence: ' + this.analytics.timelineAdherence + '%'
    ];

    return analysis.join('\n');
  }

  private getTeamUtilizationRisk(projectData: ProjectData): string {
    const teamMembers = this.extractRealTeamMembers(projectData);
    const overutilized = teamMembers.filter(m => m.utilization > 90).length;
    const underutilized = teamMembers.filter(m => m.utilization < 30).length;

    if (overutilized > 0 && underutilized > 0) {
      return 'Unbalanced workload distribution';
    } else if (overutilized > 0) {
      return 'Some team members overutilized';
    } else if (underutilized > 0) {
      return 'Some team members underutilized';
    } else {
      return 'Balanced team utilization';
    }
  }

  private getQualityRiskFactors(): string {
    return this.analytics.qualityScore < 70 ? 'Quality metrics below standards' : 'Quality metrics within acceptable range';
  }

  private generateRiskMitigationActions(): string {
    const actions = [];
    
    if (this.analytics.blockedItemsCount > 0) {
      actions.push('Address blocked items immediately');
    }
    
    if (this.analytics.timelineAdherence < 80) {
      actions.push('Review and adjust project timeline');
    }
    
    if (this.analytics.qualityScore < 70) {
      actions.push('Implement quality improvement measures');
    }
    
    if (this.analytics.teamEfficiency < 70) {
      actions.push('Optimize team workflow and processes');
    }

    return actions.length > 0 ? actions.join(', ') : 'Continue current risk management practices';
  }

  private generateKeyAchievements(projectData: ProjectData): string {
    const achievements = [];
    
    if (this.analytics.completionRate >= 70) {
      achievements.push(`Strong completion rate of ${this.analytics.completionRate}%`);
    }
    
    if (this.analytics.qualityScore >= 80) {
      achievements.push(`High quality standards maintained (${this.analytics.qualityScore}%)`);
    }
    
    if (this.analytics.teamEfficiency >= 75) {
      achievements.push(`Excellent team efficiency (${this.analytics.teamEfficiency}%)`);
    }
    
    const completedTasks = projectData.tasks?.filter(task => 
      ['done', 'completed', 'closed'].includes(task.status.toLowerCase())
    ).length || 0;
    
    if (completedTasks > 0) {
      achievements.push(`${completedTasks} tasks successfully completed`);
    }

    return achievements.length > 0 ? achievements.join('\n') : 'Project showing steady progress across all metrics';
  }

  private generateCurrentChallenges(projectData: ProjectData): string {
    const challenges = [];
    
    if (this.analytics.blockedItemsCount > 0) {
      challenges.push(`${this.analytics.blockedItemsCount} tasks currently blocked`);
    }
    
    if (this.analytics.riskLevel === 'high') {
      challenges.push('High risk level requiring immediate attention');
    }
    
    if (this.analytics.timelineAdherence < 70) {
      challenges.push('Timeline adherence below target');
    }
    
    if (this.analytics.teamEfficiency < 60) {
      challenges.push('Team efficiency needs improvement');
    }

    return challenges.length > 0 ? challenges.join('\n') : 'No major challenges identified';
  }

  private generateImmediateActions(projectData: ProjectData): string {
    const actions = [];
    
    if (this.analytics.blockedItemsCount > 0) {
      actions.push('Unblock pending tasks and resolve dependencies');
    }
    
    if (this.analytics.overdueTasks > 0) {
      actions.push('Address overdue tasks and update timelines');
    }
    
    const unassignedTasks = projectData.tasks?.filter(task => !task.assignee || task.assignee === 'Unassigned').length || 0;
    if (unassignedTasks > 0) {
      actions.push(`Assign ${unassignedTasks} unassigned tasks to team members`);
    }

    return actions.length > 0 ? actions.join('\n') : 'Continue with current sprint activities';
  }

  private generateMediumTermActions(projectData: ProjectData): string {
    const actions = [];
    
    if (this.analytics.qualityScore < 80) {
      actions.push('Implement quality improvement processes');
    }
    
    if (this.analytics.teamEfficiency < 75) {
      actions.push('Review and optimize team workflows');
    }
    
    if (this.analytics.collaborationScore < 70) {
      actions.push('Enhance team collaboration and communication');
    }

    return actions.length > 0 ? actions.join('\n') : 'Focus on process optimization and team development';
  }

  private generateStrategicRecommendations(projectData: ProjectData): string {
    const recommendations = [];
    
    if (this.analytics.velocityTrend === 'decreasing') {
      recommendations.push('Investigate factors causing velocity decline');
    }
    
    if (projectData.platform === 'jira' && this.analytics.completionRate > 85) {
      recommendations.push('Consider implementing advanced Jira automation');
    }
    
    if (projectData.platform === 'monday' && this.analytics.teamEfficiency > 80) {
      recommendations.push('Leverage Monday.com advanced analytics for insights');
    }

    return recommendations.length > 0 ? recommendations.join('. ') : 'Maintain current strategic direction with continuous improvement focus.';
  }
}