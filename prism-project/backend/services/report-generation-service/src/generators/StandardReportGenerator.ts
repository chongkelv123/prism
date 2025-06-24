// backend/services/report-generation-service/src/generators/StandardReportGenerator.ts
// Standard Report Template (8-12 slides) - Windows Compatible (No Unicode/Symbols)

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

export class StandardReportGenerator {
  private readonly STORAGE_DIR: string;
  private analytics: AnalyticsMetrics;

  constructor() {
    this.STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../../storage');
    
    // Ensure storage directory exists
    if (!fs.existsSync(this.STORAGE_DIR)) {
      fs.mkdirSync(this.STORAGE_DIR, { recursive: true });
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
      logger.info('Generating Standard Report', {
        platform: projectData.platform,
        projectName: projectData.name
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

      // Generate slides
      await this.createTitleSlide(pptx, projectData, config);
      await progressCallback?.(10);

      await this.createProjectOverviewSlide(pptx, projectData);
      await progressCallback?.(20);

      if (config.includeMetrics !== false) {
        await this.createMetricsDashboardSlide(pptx, projectData);
        await progressCallback?.(30);
      }

      if (config.includeTasks !== false) {
        await this.createTaskAnalysisSlide(pptx, projectData);
        await progressCallback?.(40);
      }

      if (config.includeResources !== false) {
        await this.createTeamPerformanceSlide(pptx, projectData);
        await progressCallback?.(50);
      }

      if (config.includeTimeline !== false) {
        await this.createTimelineAnalysisSlide(pptx, projectData);
        await progressCallback?.(60);
      }

      await this.createRiskAssessmentSlide(pptx, projectData);
      await progressCallback?.(70);

      await this.createProgressSummarySlide(pptx, projectData);
      await progressCallback?.(80);

      await this.createNextStepsSlide(pptx, projectData);
      await progressCallback?.(90);

      // Add additional slides based on data availability
      if (projectData.sprints && projectData.sprints.length > 0) {
        await this.createSprintAnalysisSlide(pptx, projectData);
      }

      // Save file
      const reportId = uuidv4();
      const fileName = `${reportId}_standard_report.pptx`;
      const filePath = path.join(this.STORAGE_DIR, fileName);

      await pptx.writeFile({ fileName: filePath });
      await progressCallback?.(100);

      logger.info(`Standard Report generated: ${fileName}`);
      return filePath;

    } catch (error) {
      logger.error('Error generating Standard Report:', error);
      throw new Error('Failed to generate Standard Report');
    }
  }

  /**
   * Create title slide
   */
  private async createTitleSlide(pptx: PptxGenJS, projectData: ProjectData, config: StandardReportConfig): Promise<void> {
    const slide = pptx.addSlide();

    // Background color based on platform
    const bgColor = projectData.platform === 'jira' ? '2684FF' : 
                   projectData.platform === 'monday' ? 'FF5100' : '6366F1';

    slide.background = { color: bgColor };

    // Title
    slide.addText(config.title || `${projectData.name} - Standard Report`, {
      x: 1,
      y: 2,
      w: 8,
      h: 1.5,
      fontSize: 44,
      color: 'FFFFFF',
      bold: true,
      align: 'center'
    });

    // Subtitle
    slide.addText(`Project Management Report - ${projectData.platform.toUpperCase()}`, {
      x: 1,
      y: 3.8,
      w: 8,
      h: 0.8,
      fontSize: 24,
      color: 'E6E6E6',
      align: 'center'
    });

    // Date and status
    slide.addText(`Generated: ${new Date().toLocaleDateString()} | Status: ${projectData.status.toUpperCase()}`, {
      x: 1,
      y: 5,
      w: 8,
      h: 0.5,
      fontSize: 16,
      color: 'CCCCCC',
      align: 'center'
    });
  }

  /**
   * Create project overview slide
   */
  private async createProjectOverviewSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Project Overview', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: '2D3748',
      bold: true
    });

    // Key project information
    const projectInfo = [
      `Project Name: ${projectData.name}`,
      `Platform: ${projectData.platform.toUpperCase()}`,
      `Status: ${projectData.status}`,
      `Total Tasks: ${projectData.tasks?.length || 0}`,
      `Team Members: ${projectData.team?.length || 0}`,
      `Last Updated: ${projectData.lastUpdated ? new Date(projectData.lastUpdated).toLocaleDateString() : 'Unknown'}`
    ];

    slide.addText(projectInfo.join('\n'), {
      x: 0.5,
      y: 1.5,
      w: 4.5,
      h: 3,
      fontSize: 18,
      color: '2D3748',
      bullet: { type: 'bullet' }
    });

    // Key metrics box
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 5.5,
      y: 1.5,
      w: 4,
      h: 3,
      fill: { color: 'F7FAFC' },
      line: { color: 'E2E8F0', width: 1 }
    });

    slide.addText('Key Metrics', {
      x: 5.8,
      y: 1.8,
      w: 3.4,
      h: 0.5,
      fontSize: 20,
      color: '2D3748',
      bold: true
    });

    const keyMetrics = [
      `Completion Rate: ${this.analytics.completionRate}%`,
      `Team Efficiency: ${this.analytics.teamEfficiency}%`,
      `Quality Score: ${this.analytics.qualityScore}%`,
      `Risk Level: ${this.analytics.riskLevel.toUpperCase()}`
    ];

    slide.addText(keyMetrics.join('\n'), {
      x: 5.8,
      y: 2.4,
      w: 3.4,
      h: 1.8,
      fontSize: 16,
      color: '4A5568',
      bullet: { type: 'bullet' }
    });

    // Description
    if (projectData.description) {
      slide.addText('Project Description:', {
        x: 0.5,
        y: 4.8,
        w: '90%',
        h: 0.5,
        fontSize: 20,
        color: '2D3748',
        bold: true
      });

      slide.addText(projectData.description, {
        x: 0.5,
        y: 5.3,
        w: '90%',
        h: 1,
        fontSize: 16,
        color: '4A5568'
      });
    }
  }

  /**
   * Create metrics dashboard slide
   */
  private async createMetricsDashboardSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Key Metrics Dashboard', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: '2D3748',
      bold: true
    });

    // Create metrics cards
    const metrics = [
      { title: 'Completion Rate', value: `${this.analytics.completionRate}%`, color: '48BB78' },
      { title: 'Team Efficiency', value: `${this.analytics.teamEfficiency}%`, color: '4299E1' },
      { title: 'Quality Score', value: `${this.analytics.qualityScore}%`, color: '9F7AEA' },
      { title: 'Timeline Adherence', value: `${this.analytics.timelineAdherence}%`, color: 'ED8936' }
    ];

    metrics.forEach((metric, index) => {
      const x = 0.5 + (index % 2) * 4.75;
      const y = 1.5 + Math.floor(index / 2) * 1.8;

      // Card background
      slide.addShape(pptx.ShapeType.roundRect, {
        x,
        y,
        w: 4,
        h: 1.5,
        fill: { color: 'FFFFFF' },
        line: { color: 'E2E8F0', width: 2 }
      });

      // Metric title
      slide.addText(metric.title, {
        x: x + 0.3,
        y: y + 0.2,
        w: 3.4,
        h: 0.4,
        fontSize: 16,
        color: '4A5568',
        bold: true
      });

      // Metric value
      slide.addText(metric.value, {
        x: x + 0.3,
        y: y + 0.7,
        w: 3.4,
        h: 0.6,
        fontSize: 32,
        color: metric.color,
        bold: true
      });
    });

    // Status distribution chart
    slide.addText('Task Status Distribution', {
      x: 0.5,
      y: 5.2,
      w: '90%',
      h: 0.5,
      fontSize: 20,
      color: '2D3748',
      bold: true
    });

    // Create simple status chart
    const statusData = this.analytics.statusDistribution.slice(0, 4);
    statusData.forEach((status, index) => {
      const x = 1 + index * 2;
      const barHeight = status.percentage / 100 * 1.5;

      // Bar
      slide.addShape(pptx.ShapeType.rect, {
        x,
        y: 6.8 - barHeight,
        w: 1.5,
        h: barHeight,
        fill: { color: ['4299E1', '48BB78', 'ED8936', 'E53E3E'][index] }
      });

      // Status label
      slide.addText(status.status, {
        x: x - 0.2,
        y: 6.9,
        w: 1.9,
        h: 0.3,
        fontSize: 12,
        color: '2D3748',
        align: 'center'
      });

      // Percentage
      slide.addText(`${status.percentage}%`, {
        x: x - 0.2,
        y: 6.8 - barHeight - 0.4,
        w: 1.9,
        h: 0.3,
        fontSize: 12,
        color: '2D3748',
        align: 'center',
        bold: true
      });
    });
  }

  /**
   * Create task analysis slide
   */
  private async createTaskAnalysisSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Task Analysis', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: '2D3748',
      bold: true
    });

    // Task summary
    const tasks = projectData.tasks || [];
    const completedTasks = tasks.filter(task => 
      ['done', 'completed', 'closed', 'resolved'].includes(task.status.toLowerCase())
    ).length;
    const inProgressTasks = tasks.filter(task => 
      ['in progress', 'working on it', 'doing'].includes(task.status.toLowerCase())
    ).length;
    const blockedTasks = tasks.filter(task => 
      ['blocked', 'stuck', 'on hold'].includes(task.status.toLowerCase())
    ).length;

    const taskSummary = [
      `Total Tasks: ${tasks.length}`,
      `Completed: ${completedTasks} (${Math.round((completedTasks / tasks.length) * 100)}%)`,
      `In Progress: ${inProgressTasks} (${Math.round((inProgressTasks / tasks.length) * 100)}%)`,
      `Blocked: ${blockedTasks} (${Math.round((blockedTasks / tasks.length) * 100)}%)`,
      `Velocity Trend: ${this.analytics.velocityTrend.toUpperCase()}`
    ];

    slide.addText(taskSummary.join('\n'), {
      x: 0.5,
      y: 1.5,
      w: 4.5,
      h: 2.5,
      fontSize: 18,
      color: '2D3748',
      bullet: { type: 'bullet' }
    });

    // Recent tasks table
    slide.addText('Recent Task Activity', {
      x: 5.5,
      y: 1.5,
      w: 4,
      h: 0.5,
      fontSize: 20,
      color: '2D3748',
      bold: true
    });

    // Create tasks table
    const tableData: any[] = [
      [
        { text: 'Task', options: { bold: true, fontSize: 14, fill: { color: '4A5568' }, color: 'FFFFFF' } },
        { text: 'Status', options: { bold: true, fontSize: 14, fill: { color: '4A5568' }, color: 'FFFFFF' } },
        { text: 'Assignee', options: { bold: true, fontSize: 14, fill: { color: '4A5568' }, color: 'FFFFFF' } }
      ]
    ];

    // Add recent tasks (last 5)
    const recentTasks = tasks.slice(0, 5);
    recentTasks.forEach(task => {
      tableData.push([
        { text: task.name.length > 25 ? task.name.substring(0, 25) + '...' : task.name, options: { fontSize: 12, color: '2D3748' } },
        { text: task.status, options: { fontSize: 12, color: '2D3748' } },
        { text: task.assignee || 'Unassigned', options: { fontSize: 12, color: '2D3748' } }
      ]);
    });

    slide.addTable(tableData, {
      x: 5.5,
      y: 2.1,
      w: 4,
      colW: [2, 1, 1],
      border: { pt: 1, color: 'E2E8F0' }
    });

    // Critical insights
    slide.addText('Critical Insights', {
      x: 0.5,
      y: 4.5,
      w: '90%',
      h: 0.5,
      fontSize: 20,
      color: '2D3748',
      bold: true
    });

    const insights = [
      `${this.analytics.blockedItemsCount} tasks are currently blocked`,
      `${this.analytics.overdueTasks} tasks may be overdue`,
      `Team velocity is ${this.analytics.velocityTrend}`,
      `Estimated completion: ${this.analytics.estimatedCompletion}`
    ];

    slide.addText(insights.join('\n'), {
      x: 0.5,
      y: 5.1,
      w: '90%',
      h: 2,
      fontSize: 16,
      color: '4A5568',
      bullet: { type: 'bullet' }
    });
  }

  /**
   * Create team performance slide
   */
  private async createTeamPerformanceSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Team Performance', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: '2D3748',
      bold: true
    });

    // Team overview
    const team = projectData.team || [];
    const teamOverview = [
      `Team Size: ${team.length} members`,
      `Collaboration Score: ${this.analytics.collaborationScore}%`,
      `Average Tasks per Member: ${Math.round((projectData.tasks?.length || 0) / Math.max(team.length, 1))}`
    ];

    slide.addText(teamOverview.join('\n'), {
      x: 0.5,
      y: 1.5,
      w: 4.5,
      h: 1.5,
      fontSize: 18,
      color: '2D3748',
      bullet: { type: 'bullet' }
    });

    // Workload distribution
    slide.addText('Workload Distribution', {
      x: 5.5,
      y: 1.5,
      w: 4,
      h: 0.5,
      fontSize: 20,
      color: '2D3748',
      bold: true
    });

    // Team members table
    const teamTableData: any[] = [
      [
        { text: 'Member', options: { bold: true, fontSize: 14, fill: { color: '4A5568' }, color: 'FFFFFF' } },
        { text: 'Tasks', options: { bold: true, fontSize: 14, fill: { color: '4A5568' }, color: 'FFFFFF' } },
        { text: 'Utilization', options: { bold: true, fontSize: 14, fill: { color: '4A5568' }, color: 'FFFFFF' } }
      ]
    ];

    this.analytics.workloadDistribution.forEach(member => {
      teamTableData.push([
        { text: member.member, options: { fontSize: 12, color: '2D3748' } },
        { text: member.taskCount.toString(), options: { fontSize: 12, color: '2D3748' } },
        { text: `${member.utilization}%`, options: { fontSize: 12, color: member.utilization > 100 ? 'E53E3E' : '2D3748' } }
      ]);
    });

    slide.addTable(teamTableData, {
      x: 5.5,
      y: 2.1,
      w: 4,
      colW: [2, 1, 1],
      border: { pt: 1, color: 'E2E8F0' }
    });

    // Team insights
    slide.addText('Team Insights', {
      x: 0.5,
      y: 3.5,
      w: '90%',
      h: 0.5,
      fontSize: 20,
      color: '2D3748',
      bold: true
    });

    const overutilized = this.analytics.workloadDistribution.filter(m => m.utilization > 120);
    const underutilized = this.analytics.workloadDistribution.filter(m => m.utilization < 60);

    const teamInsights = [
      `Overall team efficiency: ${this.analytics.teamEfficiency}%`,
      overutilized.length > 0 ? `${overutilized.length} members may be overutilized` : 'Good workload balance',
      underutilized.length > 0 ? `${underutilized.length} members have capacity for more work` : 'Team fully engaged',
      `Collaboration score indicates ${this.analytics.collaborationScore > 75 ? 'strong' : 'moderate'} teamwork`
    ];

    slide.addText(teamInsights.join('\n'), {
      x: 0.5,
      y: 4.1,
      w: '90%',
      h: 2.5,
      fontSize: 16,
      color: '4A5568',
      bullet: { type: 'bullet' }
    });
  }

  /**
   * Create timeline analysis slide
   */
  private async createTimelineAnalysisSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Timeline Analysis', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: '2D3748',
      bold: true
    });

    // Timeline metrics
    const timelineMetrics = [
      `Timeline Adherence: ${this.analytics.timelineAdherence}%`,
      `Estimated Completion: ${this.analytics.estimatedCompletion}`,
      `Velocity Trend: ${this.analytics.velocityTrend.toUpperCase()}`,
      `Critical Path Items: ${this.analytics.criticalPath.length}`
    ];

    slide.addText(timelineMetrics.join('\n'), {
      x: 0.5,
      y: 1.5,
      w: 4.5,
      h: 2,
      fontSize: 18,
      color: '2D3748',
      bullet: { type: 'bullet' }
    });

    // Sprint information (if available)
    if (projectData.sprints && projectData.sprints.length > 0) {
      slide.addText('Sprint Progress', {
        x: 5.5,
        y: 1.5,
        w: 4,
        h: 0.5,
        fontSize: 20,
        color: '2D3748',
        bold: true
      });

      const sprintTableData: any[] = [
        [
          { text: 'Sprint', options: { bold: true, fontSize: 14, fill: { color: '4A5568' }, color: 'FFFFFF' } },
          { text: 'Progress', options: { bold: true, fontSize: 14, fill: { color: '4A5568' }, color: 'FFFFFF' } }
        ]
      ];

      projectData.sprints.slice(0, 4).forEach(sprint => {
        sprintTableData.push([
          { text: sprint.name, options: { fontSize: 12, color: '2D3748' } },
          { text: sprint.completed, options: { fontSize: 12, color: '2D3748' } }
        ]);
      });

      slide.addTable(sprintTableData, {
        x: 5.5,
        y: 2.1,
        w: 4,
        colW: [2.5, 1.5],
        border: { pt: 1, color: 'E2E8F0' }
      });
    }

    // Critical path
    slide.addText('Critical Path', {
      x: 0.5,
      y: 4,
      w: '90%',
      h: 0.5,
      fontSize: 20,
      color: '2D3748',
      bold: true
    });

    if (this.analytics.criticalPath.length > 0) {
      slide.addText(this.analytics.criticalPath.join('\n'), {
        x: 0.5,
        y: 4.6,
        w: '90%',
        h: 2,
        fontSize: 16,
        color: '4A5568',
        bullet: { type: 'bullet' }
      });
    } else {
      slide.addText('No critical path items identified', {
        x: 0.5,
        y: 4.6,
        w: '90%',
        h: 0.5,
        fontSize: 16,
        color: '4A5568',
        italic: true
      });
    }
  }

  /**
   * Create risk assessment slide
   */
  private async createRiskAssessmentSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Risk Assessment', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: '2D3748',
      bold: true
    });

    // Risk level indicator
    const riskColor = this.analytics.riskLevel === 'high' ? 'E53E3E' : 
                     this.analytics.riskLevel === 'medium' ? 'ED8936' : '48BB78';

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.5,
      y: 1.5,
      w: 4.5,
      h: 1.5,
      fill: { color: riskColor },
      line: { color: riskColor, width: 0 }
    });

    slide.addText(`RISK LEVEL: ${this.analytics.riskLevel.toUpperCase()}`, {
      x: 0.8,
      y: 2,
      w: 3.9,
      h: 0.6,
      fontSize: 24,
      color: 'FFFFFF',
      bold: true,
      align: 'center'
    });

    // Risk factors
    slide.addText('Risk Factors', {
      x: 5.5,
      y: 1.5,
      w: 4,
      h: 0.5,
      fontSize: 20,
      color: '2D3748',
      bold: true
    });

    const riskFactors = [
      `Blocked Tasks: ${this.analytics.blockedItemsCount}`,
      `Overdue Items: ${this.analytics.overdueTasks}`,
      `Timeline Adherence: ${this.analytics.timelineAdherence}%`,
      `Quality Score: ${this.analytics.qualityScore}%`
    ];

    slide.addText(riskFactors.join('\n'), {
      x: 5.5,
      y: 2.1,
      w: 4,
      h: 2,
      fontSize: 16,
      color: '4A5568',
      bullet: { type: 'bullet' }
    });

    // Mitigation recommendations
    slide.addText('Recommended Actions', {
      x: 0.5,
      y: 3.5,
      w: '90%',
      h: 0.5,
      fontSize: 20,
      color: '2D3748',
      bold: true
    });

    slide.addText(this.analytics.recommendedActions.join('\n'), {
      x: 0.5,
      y: 4.1,
      w: '90%',
      h: 2.5,
      fontSize: 16,
      color: '4A5568',
      bullet: { type: 'bullet' }
    });
  }

  /**
   * Create progress summary slide
   */
  private async createProgressSummarySlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Progress Summary', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: '2D3748',
      bold: true
    });

    // Progress overview
    const progressItems = [
      `Project completion rate: ${this.analytics.completionRate}%`,
      `Team efficiency score: ${this.analytics.teamEfficiency}%`,
      `Quality assessment: ${this.analytics.qualityScore}% (${this.analytics.qualityScore > 80 ? 'Excellent' : this.analytics.qualityScore > 60 ? 'Good' : 'Needs Improvement'})`,
      `Risk level: ${this.analytics.riskLevel} (${this.analytics.riskLevel === 'low' ? 'On track' : this.analytics.riskLevel === 'medium' ? 'Monitor closely' : 'Immediate attention required'})`,
      `Timeline status: ${this.analytics.timelineAdherence}% adherence`
    ];

    slide.addText(progressItems.join('\n'), {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 3,
      fontSize: 18,
      color: '2D3748',
      bullet: { type: 'bullet' }
    });

    // Key achievements
    slide.addText('Key Achievements', {
      x: 0.5,
      y: 4.8,
      w: '90%',
      h: 0.5,
      fontSize: 20,
      color: '2D3748',
      bold: true
    });

    const achievements = [
      `${Math.floor((projectData.tasks?.length || 0) * (this.analytics.completionRate / 100))} tasks completed`,
      `${this.analytics.workloadDistribution.filter(m => m.utilization > 80).length} team members actively engaged`,
      `${this.analytics.velocityTrend === 'increasing' ? 'Improving' : this.analytics.velocityTrend === 'stable' ? 'Consistent' : 'Declining'} team velocity`,
      `${this.analytics.collaborationScore > 75 ? 'Strong' : 'Moderate'} team collaboration`
    ];

    slide.addText(achievements.join('\n'), {
      x: 0.5,
      y: 5.4,
      w: '90%',
      h: 1.5,
      fontSize: 16,
      color: '4A5568',
      bullet: { type: 'bullet' }
    });
  }

  /**
   * Create next steps slide
   */
  private async createNextStepsSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Next Steps & Recommendations', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: '2D3748',
      bold: true
    });

    // Immediate actions
    slide.addText('Immediate Actions (Next 1-2 weeks)', {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 0.5,
      fontSize: 20,
      color: '2D3748',
      bold: true
    });

    const immediateActions = this.analytics.recommendedActions.slice(0, 3);
    slide.addText(immediateActions.join('\n'), {
      x: 0.5,
      y: 2.1,
      w: '90%',
      h: 1.5,
      fontSize: 16,
      color: '4A5568',
      bullet: { type: 'bullet' }
    });

    // Medium-term goals
    slide.addText('Medium-term Goals (Next month)', {
      x: 0.5,
      y: 4,
      w: '90%',
      h: 0.5,
      fontSize: 20,
      color: '2D3748',
      bold: true
    });

    const mediumTermGoals = [
      `Target completion rate: ${Math.min(this.analytics.completionRate + 20, 100)}%`,
      `Improve team efficiency to ${Math.min(this.analytics.teamEfficiency + 15, 100)}%`,
      `Reduce risk level from ${this.analytics.riskLevel} to ${this.analytics.riskLevel === 'high' ? 'medium' : 'low'}`,
      'Enhance team collaboration and communication'
    ];

    slide.addText(mediumTermGoals.join('\n'), {
      x: 0.5,
      y: 4.6,
      w: '90%',
      h: 2,
      fontSize: 16,
      color: '4A5568',
      bullet: { type: 'bullet' }
    });

    // Contact information
    slide.addText('Report Generated by PRISM Analytics | For questions, contact your project administrator', {
      x: 0.5,
      y: 6.8,
      w: '90%',
      h: 0.3,
      fontSize: 12,
      color: '718096',
      align: 'center',
      italic: true
    });
  }

  /**
   * Create sprint analysis slide (if sprints data available)
   */
  private async createSprintAnalysisSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Sprint Analysis', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: '2D3748',
      bold: true
    });

    const sprints = projectData.sprints || [];

    // Sprint performance
    slide.addText('Sprint Performance', {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 0.5,
      fontSize: 20,
      color: '2D3748',
      bold: true
    });

    const sprintTableData: any[] = [
      [
        { text: 'Sprint', options: { bold: true, fontSize: 14, fill: { color: '4A5568' }, color: 'FFFFFF' } },
        { text: 'Start Date', options: { bold: true, fontSize: 14, fill: { color: '4A5568' }, color: 'FFFFFF' } },
        { text: 'End Date', options: { bold: true, fontSize: 14, fill: { color: '4A5568' }, color: 'FFFFFF' } },
        { text: 'Completion', options: { bold: true, fontSize: 14, fill: { color: '4A5568' }, color: 'FFFFFF' } }
      ]
    ];

    sprints.forEach(sprint => {
      sprintTableData.push([
        { text: sprint.name, options: { fontSize: 12, color: '2D3748' } },
        { text: new Date(sprint.startDate).toLocaleDateString(), options: { fontSize: 12, color: '2D3748' } },
        { text: new Date(sprint.endDate).toLocaleDateString(), options: { fontSize: 12, color: '2D3748' } },
        { text: sprint.completed, options: { fontSize: 12, color: '2D3748' } }
      ]);
    });

    slide.addTable(sprintTableData, {
      x: 0.5,
      y: 2.1,
      w: 9,
      colW: [2.5, 2, 2, 2],
      border: { pt: 1, color: 'E2E8F0' }
    });

    // Sprint insights
    const avgCompletion = sprints.reduce((sum, sprint) => {
      return sum + (parseFloat(sprint.completed.replace('%', '')) || 0);
    }, 0) / sprints.length;

    const sprintInsights = [
      `Total sprints: ${sprints.length}`,
      `Average completion rate: ${Math.round(avgCompletion)}%`,
      `Sprint velocity trend: ${this.analytics.velocityTrend}`,
      `Most recent sprint: ${sprints[sprints.length - 1]?.completed || 'N/A'} complete`
    ];

    slide.addText('Sprint Insights', {
      x: 0.5,
      y: 5,
      w: '90%',
      h: 0.5,
      fontSize: 20,
      color: '2D3748',
      bold: true
    });

    slide.addText(sprintInsights.join('\n'), {
      x: 0.5,
      y: 5.6,
      w: '90%',
      h: 1.5,
      fontSize: 16,
      color: '4A5568',
      bullet: { type: 'bullet' }
    });
  }
}