// backend/services/report-generation-service/src/generators/JiraReportGenerator.ts
// Windows Compatible (No Unicode/Symbols) - FIXED TypeScript Issues

import PptxGenJS from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { ProjectData } from '../services/PlatformDataService';

export interface JiraReportConfig {
  title?: string;
  includeMetrics?: boolean;
  includeTasks?: boolean;
  includeTimeline?: boolean;
  includeResources?: boolean;
  [key: string]: any;
}

export class JiraReportGenerator {
  private readonly STORAGE_DIR: string;

  constructor() {
    this.STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../../storage');
    
    // Ensure storage directory exists
    if (!fs.existsSync(this.STORAGE_DIR)) {
      fs.mkdirSync(this.STORAGE_DIR, { recursive: true });
    }
  }

  /**
   * Generate Jira PowerPoint report
   */
  async generate(
    projectData: ProjectData, 
    config: JiraReportConfig, 
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<string> {
    try {
      logger.info('Starting Jira report generation', {
        projectId: projectData.id,
        projectName: projectData.name,
        config
      });

      if (progressCallback) await progressCallback(10);

      // Create PowerPoint presentation
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';
      pptx.title = config.title || `${projectData.name} - Jira Report`;

      // Slide 1: Title slide
      await this.createTitleSlide(pptx, projectData, config);
      if (progressCallback) await progressCallback(20);

      // Slide 2: Project overview
      await this.createOverviewSlide(pptx, projectData);
      if (progressCallback) await progressCallback(35);

      // Slide 3: Metrics (if enabled)
      if (config.includeMetrics !== false && projectData.metrics?.length) {
        await this.createMetricsSlide(pptx, projectData);
        if (progressCallback) await progressCallback(50);
      }

      // Slide 4: Issues/Tasks (if enabled)
      if (config.includeTasks !== false && projectData.tasks?.length) {
        await this.createTasksSlide(pptx, projectData);
        if (progressCallback) await progressCallback(65);
      }

      // Slide 5: Sprint information (if available)
      if (projectData.sprints?.length) {
        await this.createSprintsSlide(pptx, projectData);
        if (progressCallback) await progressCallback(80);
      }

      // Slide 6: Team information (if enabled)
      if (config.includeResources !== false && projectData.team?.length) {
        await this.createTeamSlide(pptx, projectData);
        if (progressCallback) await progressCallback(90);
      }

      // Slide 7: Summary slide
      await this.createSummarySlide(pptx, projectData, config);
      if (progressCallback) await progressCallback(95);

      // Save the presentation
      const reportId = uuidv4();
      const fileName = `jira_${reportId}_${projectData.name.replace(/[^a-zA-Z0-9]/g, '_')}.pptx`;
      const filePath = path.join(this.STORAGE_DIR, fileName);

      await pptx.writeFile({ fileName: filePath });
      if (progressCallback) await progressCallback(100);

      logger.info('Jira report generated successfully', {
        fileName,
        filePath,
        projectName: projectData.name
      });

      return filePath;

    } catch (error) {
      logger.error('Error generating Jira report:', error);
      throw new Error(`Failed to generate Jira report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create title slide
   */
  private async createTitleSlide(pptx: PptxGenJS, projectData: ProjectData, config: JiraReportConfig): Promise<void> {
    const slide = pptx.addSlide();
    slide.background = { color: '2684FF' }; // Jira blue

    // Main title
    slide.addText(config.title || `${projectData.name} Project Report`, {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 1.5,
      align: 'center',
      color: 'FFFFFF',
      fontSize: 44,
      bold: true
    });

    // Subtitle
    slide.addText('Jira Project Analysis', {
      x: 0.5,
      y: 3,
      w: '90%',
      h: 0.8,
      align: 'center',
      color: 'FFFFFF',
      fontSize: 24
    });

    // Date
    slide.addText(`Generated on: ${new Date().toLocaleDateString()}`, {
      x: 0.5,
      y: 4,
      w: '90%',
      h: 0.5,
      align: 'center',
      color: 'FFFFFF',
      fontSize: 16
    });

    // Project key
    if (projectData.projectKey) {
      slide.addText(`Project Key: ${projectData.projectKey}`, {
        x: 0.5,
        y: 4.5,
        w: '90%',
        h: 0.5,
        align: 'center',
        color: 'FFFFFF',
        fontSize: 16
      });
    }
  }

  /**
   * Create project overview slide
   */
  private async createOverviewSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Project Overview', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: '2684FF',
      bold: true
    });

    // Project information
    const projectInfo = [
      `Project: ${projectData.name}`,
      `Project Key: ${projectData.projectKey || projectData.id}`,
      `Status: ${projectData.status || 'Active'}`,
      `Total Issues: ${projectData.tasks?.length || 0}`,
      `Last Updated: ${projectData.lastUpdated ? new Date(projectData.lastUpdated).toLocaleDateString() : 'Unknown'}`
    ];

    slide.addText(projectInfo.join('\n'), {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 2,
      fontSize: 18,
      color: '000000',
      bullet: { type: 'bullet' }
    });

    // Description
    if (projectData.description) {
      slide.addText('Description:', {
        x: 0.5,
        y: 3.8,
        w: '90%',
        h: 0.5,
        fontSize: 20,
        color: '2684FF',
        bold: true
      });

      slide.addText(projectData.description, {
        x: 0.5,
        y: 4.3,
        w: '90%',
        h: 1.5,
        fontSize: 16,
        color: '000000'
      });
    }
  }

  /**
   * Create metrics slide
   */
  private async createMetricsSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Project Metrics', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: '2684FF',
      bold: true
    });

    // Create metrics table - Fixed TypeScript issues
    const tableData: any[] = [
      [
        { text: 'Metric', options: { bold: true, fontSize: 18, fill: { color: '2684FF' }, color: 'FFFFFF' } },
        { text: 'Value', options: { bold: true, fontSize: 18, fill: { color: '2684FF' }, color: 'FFFFFF' } }
      ]
    ];

    // Add metrics data with consistent structure
    projectData.metrics?.forEach(metric => {
      tableData.push([
        { text: metric.name, options: { bold: false, fontSize: 16, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: String(metric.value), options: { bold: false, fontSize: 16, fill: { color: 'FFFFFF' }, color: '000000' } }
      ]);
    });

    slide.addTable(tableData, {
      x: 1,
      y: 1.5,
      w: 8,
      colW: [4, 4],
      border: { pt: 1, color: '2684FF' }
    });
  }

  /**
   * Create tasks/issues slide
   */
  private async createTasksSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Issues Overview', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: '2684FF',
      bold: true
    });

    // Group tasks by status
    const statusGroups: Record<string, any[]> = {};
    projectData.tasks?.forEach(task => {
      const status = task.status || 'Unknown';
      if (!statusGroups[status]) {
        statusGroups[status] = [];
      }
      statusGroups[status].push(task);
    });

    // Create status summary
    const statusSummary: string[] = [];
    Object.entries(statusGroups).forEach(([status, tasks]) => {
      statusSummary.push(`${status}: ${tasks.length} issues`);
    });

    slide.addText(statusSummary.join('\n'), {
      x: 0.5,
      y: 1.5,
      w: '45%',
      h: 3,
      fontSize: 18,
      color: '000000',
      bullet: { type: 'bullet' }
    });

    // Recent issues table (top 10) - Fixed TypeScript issues
    const recentIssues = projectData.tasks?.slice(0, 10) || [];
    if (recentIssues.length > 0) {
      const tableData: any[] = [
        [
          { text: 'Issue', options: { bold: true, fontSize: 14, fill: { color: '2684FF' }, color: 'FFFFFF' } },
          { text: 'Status', options: { bold: true, fontSize: 14, fill: { color: '2684FF' }, color: 'FFFFFF' } },
          { text: 'Assignee', options: { bold: true, fontSize: 14, fill: { color: '2684FF' }, color: 'FFFFFF' } }
        ]
      ];

      recentIssues.forEach(task => {
        tableData.push([
          { text: task.name.length > 30 ? task.name.substring(0, 30) + '...' : task.name, options: { bold: false, fontSize: 12, fill: { color: 'FFFFFF' }, color: '000000' } },
          { text: task.status || 'Unknown', options: { bold: false, fontSize: 12, fill: { color: 'FFFFFF' }, color: '000000' } },
          { text: task.assignee || 'Unassigned', options: { bold: false, fontSize: 12, fill: { color: 'FFFFFF' }, color: '000000' } }
        ]);
      });

      slide.addTable(tableData, {
        x: 5,
        y: 1.5,
        w: 4.5,
        colW: [2.5, 1, 1],
        border: { pt: 1, color: '2684FF' }
      });
    }
  }

  /**
   * Create sprints slide
   */
  private async createSprintsSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Sprint Information', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: '2684FF',
      bold: true
    });

    // Create sprints table - Fixed TypeScript issues
    const tableData: any[] = [
      [
        { text: 'Sprint', options: { bold: true, fontSize: 16, fill: { color: '2684FF' }, color: 'FFFFFF' } },
        { text: 'Start Date', options: { bold: true, fontSize: 16, fill: { color: '2684FF' }, color: 'FFFFFF' } },
        { text: 'End Date', options: { bold: true, fontSize: 16, fill: { color: '2684FF' }, color: 'FFFFFF' } },
        { text: 'Status', options: { bold: true, fontSize: 16, fill: { color: '2684FF' }, color: 'FFFFFF' } }
      ]
    ];

    // Add sprint data with consistent structure
    projectData.sprints?.forEach(sprint => {
      tableData.push([
        { text: sprint.name, options: { bold: false, fontSize: 14, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: new Date(sprint.startDate).toLocaleDateString(), options: { bold: false, fontSize: 14, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: new Date(sprint.endDate).toLocaleDateString(), options: { bold: false, fontSize: 14, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: sprint.completed || 'In Progress', options: { bold: false, fontSize: 14, fill: { color: 'FFFFFF' }, color: '000000' } }
      ]);
    });

    slide.addTable(tableData, {
      x: 0.5,
      y: 1.5,
      w: 9,
      colW: [3, 2, 2, 2],
      border: { pt: 1, color: '2684FF' }
    });
  }

  /**
   * Create team slide
   */
  private async createTeamSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Team Members', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: '2684FF',
      bold: true
    });

    // Create team table - Fixed TypeScript issues
    const tableData: any[] = [
      [
        { text: 'Name', options: { bold: true, fontSize: 18, fill: { color: '2684FF' }, color: 'FFFFFF' } },
        { text: 'Role', options: { bold: true, fontSize: 18, fill: { color: '2684FF' }, color: 'FFFFFF' } },
        { text: 'Email', options: { bold: true, fontSize: 18, fill: { color: '2684FF' }, color: 'FFFFFF' } }
      ]
    ];

    // Add team data with consistent structure
    projectData.team?.forEach(member => {
      tableData.push([
        { text: member.name, options: { bold: false, fontSize: 16, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: member.role || 'Team Member', options: { bold: false, fontSize: 16, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: member.email || 'N/A', options: { bold: false, fontSize: 16, fill: { color: 'FFFFFF' }, color: '000000' } }
      ]);
    });

    slide.addTable(tableData, {
      x: 1,
      y: 1.5,
      w: 8,
      colW: [3, 2.5, 2.5],
      border: { pt: 1, color: '2684FF' }
    });
  }

  /**
   * Create summary slide
   */
  private async createSummarySlide(pptx: PptxGenJS, projectData: ProjectData, config: JiraReportConfig): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Project Summary', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: '2684FF',
      bold: true
    });

    // Key insights
    slide.addText('Key Insights:', {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 0.5,
      fontSize: 24,
      color: '2684FF',
      bold: true
    });

    const insights = [
      `Project ${projectData.name} has ${projectData.tasks?.length || 0} total issues`,
      `Current status: ${projectData.status || 'Active'}`,
      `Team size: ${projectData.team?.length || 'Unknown'} members`,
      `Project key: ${projectData.projectKey || projectData.id}`
    ];

    slide.addText(insights.join('\n'), {
      x: 0.5,
      y: 2,
      w: '90%',
      h: 2,
      fontSize: 18,
      color: '000000',
      bullet: { type: 'bullet' }
    });

    // Next steps
    slide.addText('Recommended Actions:', {
      x: 0.5,
      y: 4.2,
      w: '90%',
      h: 0.5,
      fontSize: 24,
      color: '2684FF',
      bold: true
    });

    const nextSteps = [
      'Continue monitoring issue progress and resolution',
      'Review sprint performance and adjust planning',
      'Ensure proper issue assignment and tracking',
      'Update stakeholders on project status regularly'
    ];

    slide.addText(nextSteps.join('\n'), {
      x: 0.5,
      y: 4.7,
      w: '90%',
      h: 1.5,
      fontSize: 18,
      color: '000000',
      bullet: { type: 'bullet' }
    });
  }
}