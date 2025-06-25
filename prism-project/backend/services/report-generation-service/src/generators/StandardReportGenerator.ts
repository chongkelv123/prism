// backend/services/report-generation-service/src/generators/StandardReportGenerator.ts
// FIXED VERSION - Windows Compatible (No Unicode/Symbols)
// FIX: Proper PptxGenJS data handling to prevent "Cannot read properties of undefined (reading 'length')" error

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
      'complete': { category: 'done', displayName: 'Complete', color: '10B981' },
      'completed': { category: 'done', displayName: 'Completed', color: '10B981' },
      'closed': { category: 'done', displayName: 'Closed', color: '10B981' },
      'resolved': { category: 'done', displayName: 'Resolved', color: '10B981' },
      'finished': { category: 'done', displayName: 'Finished', color: '10B981' },
      
      'blocked': { category: 'blocked', displayName: 'Blocked', color: 'EF4444' },
      'impediment': { category: 'blocked', displayName: 'Impediment', color: 'EF4444' },
      'on hold': { category: 'blocked', displayName: 'On Hold', color: 'EF4444' },
      'pending': { category: 'blocked', displayName: 'Pending', color: 'EF4444' }
    };
  }

  /**
   * FIXED: Safe data extraction with proper array initialization
   */
  private extractRealTeamMembers(projectData: ProjectData): Array<{
    name: string;
    role: string;
    taskCount: number;
    utilization: number;
  }> {
    // FIXED: Ensure tasks and team arrays are never undefined
    const tasks = Array.isArray(projectData.tasks) ? projectData.tasks : [];
    const team = Array.isArray(projectData.team) ? projectData.team : [];

    const assigneeMap = new Map<string, number>();
    
    // Count tasks per assignee
    tasks.forEach(task => {
      if (task.assignee && task.assignee !== 'Unassigned') {
        assigneeMap.set(task.assignee, (assigneeMap.get(task.assignee) || 0) + 1);
      }
    });

    const teamMembers: Array<{
      name: string;
      role: string;
      taskCount: number;
      utilization: number;
    }> = [];

    // Process team members
    if (team.length > 0) {
      team.forEach(member => {
        if (member && member.name) {
          const taskCount = assigneeMap.get(member.name) || 0;
          teamMembers.push({
            name: member.name,
            role: member.role || 'Team Member',
            taskCount,
            utilization: Math.min(100, taskCount * 15)
          });
        }
      });
    }

    // Add assignees not in team array
    assigneeMap.forEach((taskCount, assigneeName) => {
      if (assigneeName && !teamMembers.find(tm => tm.name === assigneeName)) {
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
   * FIXED: Safe status distribution calculation
   */
  private calculateStatusDistribution(projectData: ProjectData): Array<{ 
    status: string; 
    count: number; 
    percentage: number; 
    color: string 
  }> {
    // FIXED: Ensure tasks array is never undefined
    const tasks = Array.isArray(projectData.tasks) ? projectData.tasks : [];
    if (tasks.length === 0) return [];

    const statusMap = new Map<string, { count: number; color: string }>();
    
    tasks.forEach(task => {
      if (task && task.status) {
        const normalized = this.normalizeStatus(task.status);
        const existing = statusMap.get(normalized.category);
        statusMap.set(normalized.category, {
          count: (existing?.count || 0) + 1,
          color: normalized.color
        });
      }
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
   * Normalize status to standard categories
   */
  private normalizeStatus(status: string): { category: string; displayName: string; color: string } {
    const normalized = status.toLowerCase().trim();
    const mapping = this.platformStatusMap[normalized];
    
    if (mapping) {
      return {
        category: mapping.category,
        displayName: mapping.displayName,
        color: mapping.color
      };
    }

    // Default mapping for unknown statuses
    return {
      category: 'todo',
      displayName: status,
      color: '6B7280'
    };
  }

  /**
   * Get platform-specific theme colors
   */
  private getPlatformTheme(platform: string): { primary: string; secondary: string; accent: string } {
    switch (platform.toLowerCase()) {
      case 'jira':
        return { primary: '0052CC', secondary: '2684FF', accent: 'F4F5F7' };
      case 'monday':
      case 'monday.com':
        return { primary: 'FF5100', secondary: 'FF7A00', accent: 'FFF4F1' };
      case 'trofos':
        return { primary: '6366F1', secondary: '8B5CF6', accent: 'F8F7FF' };
      default:
        return { primary: '374151', secondary: '6B7280', accent: 'F9FAFB' };
    }
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
        taskCount: Array.isArray(projectData.tasks) ? projectData.tasks.length : 0,
        teamSize: Array.isArray(projectData.team) ? projectData.team.length : 0,
        usingFallback: projectData.fallbackData || false
      });

      // FIXED: Ensure projectData has proper array structure
      projectData = this.sanitizeProjectData(projectData);

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
   * FIXED: Sanitize project data to ensure proper array structure
   */
  private sanitizeProjectData(projectData: ProjectData): ProjectData {
    return {
      ...projectData,
      tasks: Array.isArray(projectData.tasks) ? projectData.tasks : [],
      team: Array.isArray(projectData.team) ? projectData.team : [],
      metrics: Array.isArray(projectData.metrics) ? projectData.metrics : [],
      sprints: Array.isArray(projectData.sprints) ? projectData.sprints : []
    };
  }

  /**
   * FIXED: Create title slide with safe data handling
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
    const taskCount = Array.isArray(projectData.tasks) ? projectData.tasks.length : 0;
    const teamCount = this.extractRealTeamMembers(projectData).length;
    const subtitle = `${projectData.platform.toUpperCase()} Platform Report | ${taskCount} Tasks | ${teamCount} Team Members`;
    
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
      'Data Source: Demonstration Data' : 
      'Data Source: Live Platform Data';
    
    slide.addText(dataSource, {
      x: '10%',
      y: '52%',
      w: '80%',
      h: '5%',
      fontSize: 14,
      color: theme.secondary,
      align: 'center',
      italic: true
    });

    // Generation timestamp
    slide.addText(`Generated: ${new Date().toLocaleString()}`, {
      x: '10%',
      y: '85%',
      w: '80%',
      h: '5%',
      fontSize: 12,
      color: '6B7280',
      align: 'center'
    });
  }

  /**
   * FIXED: Create team performance slide with safe table creation
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
      // FIXED: Create table data with proper PptxGenJS format - ensure all arrays are initialized
      const tableData: any[][] = [
        [
          { text: 'Team Member', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
          { text: 'Role', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
          { text: 'Tasks', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
          { text: 'Utilization', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
          { text: 'Performance', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } }
        ]
      ];

      // FIXED: Safely add team member rows
      realTeamMembers.forEach(member => {
        if (member && member.name) {
          const performance = this.calculateMemberPerformance(member, projectData);
          tableData.push([
            { text: member.name || 'Unknown', options: { fontSize: 12 } },
            { text: member.role || 'Team Member', options: { fontSize: 12 } },
            { text: String(member.taskCount || 0), options: { fontSize: 12 } },
            { text: `${member.utilization || 0}%`, options: { fontSize: 12 } },
            { text: performance || 'N/A', options: { fontSize: 12 } }
          ]);
        }
      });

      // FIXED: Only add table if we have data beyond headers
      if (tableData.length > 1) {
        slide.addTable(tableData, {
          x: 0.5,
          y: 1.5,
          w: 9,
          colW: [2.5, 2, 1.2, 1.5, 1.8],
          border: { pt: 1, color: 'E5E7EB' },
          fill: { color: 'F9FAFB' }
        });
      }

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
   * FIXED: Safe member performance calculation
   */
  private calculateMemberPerformance(
    member: { name: string; role: string; taskCount: number; utilization: number }, 
    projectData: ProjectData
  ): string {
    try {
      if (!member || typeof member.taskCount !== 'number') {
        return 'N/A';
      }

      const tasks = Array.isArray(projectData.tasks) ? projectData.tasks : [];
      const memberTasks = tasks.filter(task => task && task.assignee === member.name);
      
      if (memberTasks.length === 0) {
        return 'No Tasks';
      }

      const completedTasks = memberTasks.filter(task => {
        const normalized = this.normalizeStatus(task.status || '');
        return normalized.category === 'done';
      });

      const completionRate = Math.round((completedTasks.length / memberTasks.length) * 100);

      if (completionRate >= 90) return 'Excellent';
      if (completionRate >= 70) return 'Good';
      if (completionRate >= 50) return 'Average';
      return 'Needs Improvement';
    } catch (error) {
      logger.warn('Error calculating member performance:', error);
      return 'N/A';
    }
  }

  /**
   * FIXED: Safe team insights generation
   */
  private generateTeamInsights(
    teamMembers: Array<{ name: string; role: string; taskCount: number; utilization: number }>, 
    projectData: ProjectData
  ): string {
    try {
      if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
        return 'No team insights available - insufficient team data.';
      }

      const insights: string[] = [];
      
      // Top performer
      const topPerformer = teamMembers.reduce((max, member) => 
        (member.taskCount > max.taskCount) ? member : max
      , teamMembers[0]);
      
      insights.push(`Top Contributor: ${topPerformer.name} (${topPerformer.taskCount} tasks)`);

      // Average utilization
      const avgUtilization = Math.round(
        teamMembers.reduce((sum, member) => sum + (member.utilization || 0), 0) / teamMembers.length
      );
      insights.push(`Average Team Utilization: ${avgUtilization}%`);

      // Workload distribution
      const maxTasks = Math.max(...teamMembers.map(m => m.taskCount));
      const minTasks = Math.min(...teamMembers.map(m => m.taskCount));
      if (maxTasks - minTasks > 5) {
        insights.push('Workload distribution could be more balanced across team members');
      } else {
        insights.push('Workload is well-distributed across the team');
      }

      return insights.join('. ') + '.';
    } catch (error) {
      logger.warn('Error generating team insights:', error);
      return 'Team insights unavailable due to data processing error.';
    }
  }

  // FIXED: Add other required slide methods with safe data handling
  private async createProjectOverviewSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('PROJECT OVERVIEW', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });
    
    const taskCount = Array.isArray(projectData.tasks) ? projectData.tasks.length : 0;
    const teamSize = Array.isArray(projectData.team) ? projectData.team.length : 0;
    
    slide.addText([
      `Project: ${projectData.name || 'Unknown Project'}`,
      `Platform: ${projectData.platform || 'Unknown'}`,
      `Total Tasks: ${taskCount}`,
      `Team Size: ${teamSize}`,
      `Status: ${projectData.fallbackData ? 'Demo Data' : 'Live Data'}`
    ].join('\n'), {
      x: 0.5, y: 1.5, w: '90%', h: 3,
      fontSize: 16, color: '374151'
    });
  }

  private async createMetricsDashboardSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('METRICS DASHBOARD', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });

    const metrics = Array.isArray(projectData.metrics) ? projectData.metrics : [];
    if (metrics.length > 0) {
      const metricsText = metrics.map(m => `${m.name}: ${m.value}`).join('\n');
      slide.addText(metricsText, {
        x: 0.5, y: 1.5, w: '90%', h: 4,
        fontSize: 14, color: '374151'
      });
    } else {
      slide.addText('No metrics data available', {
        x: 0.5, y: 3, w: '90%', h: 1,
        fontSize: 16, color: '6B7280', align: 'center'
      });
    }
  }

  private async createTaskAnalysisSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('TASK ANALYSIS', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });

    const statusDistribution = this.calculateStatusDistribution(projectData);
    if (statusDistribution.length > 0) {
      const statusText = statusDistribution.map(item => 
        `${item.status}: ${item.count} tasks (${item.percentage}%)`
      ).join('\n');
      
      slide.addText(statusText, {
        x: 0.5, y: 1.5, w: '90%', h: 3,
        fontSize: 14, color: '374151'
      });
    } else {
      slide.addText('No task data available', {
        x: 0.5, y: 3, w: '90%', h: 1,
        fontSize: 16, color: '6B7280', align: 'center'
      });
    }
  }

  private async createTimelineAnalysisSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('TIMELINE ANALYSIS', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });

    const sprints = Array.isArray(projectData.sprints) ? projectData.sprints : [];
    if (sprints.length > 0) {
      const sprintText = sprints.map(s => `${s.name}: ${s.startDate} - ${s.endDate}`).join('\n');
      slide.addText(sprintText, {
        x: 0.5, y: 1.5, w: '90%', h: 3,
        fontSize: 14, color: '374151'
      });
    } else {
      slide.addText('No timeline data available', {
        x: 0.5, y: 3, w: '90%', h: 1,
        fontSize: 16, color: '6B7280', align: 'center'
      });
    }
  }

  private async createRiskAssessmentSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('RISK ASSESSMENT', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });

    slide.addText(`Risk Level: ${this.analytics?.riskLevel || 'Unknown'}`, {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 16, color: '374151'
    });
  }

  private async createProgressSummarySlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('PROGRESS SUMMARY', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });

    slide.addText(`Completion Rate: ${this.analytics?.completionRate || 0}%`, {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 16, color: '374151'
    });
  }

  private async createNextStepsSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('NEXT STEPS', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });

    slide.addText('Continue monitoring project progress and team performance.', {
      x: 0.5, y: 1.5, w: '90%', h: 2,
      fontSize: 16, color: '374151'
    });
  }
}