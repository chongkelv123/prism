// backend/services/report-generation-service/src/generators/MondayReportGenerator.ts
// Windows Compatible (No Unicode/Symbols) - COMPLETE AND FIXED

import PptxGenJS from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';
import { ProjectData } from '../services/PlatformDataService';

export interface MondayReportConfig {
  title?: string;
  includeMetrics?: boolean;
  includeTasks?: boolean;
  includeTimeline?: boolean;
  includeResources?: boolean;
  [key: string]: any;
}

export class MondayReportGenerator {
  private readonly STORAGE_DIR: string;

  constructor() {
    this.STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../../storage');
    
    // Ensure storage directory exists
    if (!fs.existsSync(this.STORAGE_DIR)) {
      fs.mkdirSync(this.STORAGE_DIR, { recursive: true });
    }
  }

  /**
   * Generate Monday.com PowerPoint report
   */
  async generate(
    projectData: ProjectData, 
    config: MondayReportConfig, 
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<string> {
    try {
      logger.info('Starting Monday.com report generation', {
        projectId: projectData.id,
        projectName: projectData.name,
        config
      });

      if (progressCallback) await progressCallback(10);

      // Create PowerPoint presentation
      const pptx = new PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';
      pptx.title = config.title || `${projectData.name} - Monday.com Report`;

      // Slide 1: Title slide
      await this.createTitleSlide(pptx, projectData, config);
      if (progressCallback) await progressCallback(20);

      // Slide 2: Board overview
      await this.createOverviewSlide(pptx, projectData);
      if (progressCallback) await progressCallback(35);

      // Slide 3: Metrics (if enabled)
      if (config.includeMetrics !== false && projectData.metrics?.length) {
        await this.createMetricsSlide(pptx, projectData);
        if (progressCallback) await progressCallback(50);
      }

      // Slide 4: Items/Tasks (if enabled)
      if (config.includeTasks !== false && projectData.tasks?.length) {
        await this.createItemsSlide(pptx, projectData);
        if (progressCallback) await progressCallback(65);
      }

      // Slide 5: Board groups (if available)
      if (projectData.groups?.length) {
        await this.createGroupsSlide(pptx, projectData);
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
      const fileName = `monday_${reportId}_${projectData.name.replace(/[^a-zA-Z0-9]/g, '_')}.pptx`;
      const filePath = path.join(this.STORAGE_DIR, fileName);

      await pptx.writeFile({ fileName: filePath });
      if (progressCallback) await progressCallback(100);

      logger.info('Monday.com report generated successfully', {
        fileName,
        filePath,
        projectName: projectData.name
      });

      return filePath;

    } catch (error) {
      logger.error('Error generating Monday.com report:', error);
      throw new Error(`Failed to generate Monday.com report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create title slide
   */
  private async createTitleSlide(pptx: PptxGenJS, projectData: ProjectData, config: MondayReportConfig): Promise<void> {
    const slide = pptx.addSlide();
    slide.background = { color: 'FF5100' }; // Monday.com orange

    // Main title
    slide.addText(config.title || `${projectData.name} Board Report`, {
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
    slide.addText('Monday.com Board Analysis', {
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

    // Board ID
    slide.addText(`Board ID: ${projectData.id}`, {
      x: 0.5,
      y: 4.5,
      w: '90%',
      h: 0.5,
      align: 'center',
      color: 'FFFFFF',
      fontSize: 16
    });
  }

  /**
   * Create board overview slide
   */
  private async createOverviewSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Board Overview', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: 'FF5100',
      bold: true
    });

    // Board information
    const boardInfo = [
      `Board: ${projectData.name}`,
      `Board ID: ${projectData.id}`,
      `Status: ${projectData.boardState || projectData.status || 'Active'}`,
      `Total Items: ${projectData.itemsCount || projectData.tasks?.length || 0}`,
      `Groups: ${projectData.groups?.length || 'Unknown'}`,
      `Last Updated: ${projectData.lastUpdated ? new Date(projectData.lastUpdated).toLocaleDateString() : 'Unknown'}`
    ];

    slide.addText(boardInfo.join('\n'), {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 2.5,
      fontSize: 18,
      color: '000000',
      bullet: { type: 'bullet' }
    });

    // Description
    if (projectData.description) {
      slide.addText('Description:', {
        x: 0.5,
        y: 4.2,
        w: '90%',
        h: 0.5,
        fontSize: 20,
        color: 'FF5100',
        bold: true
      });

      slide.addText(projectData.description, {
        x: 0.5,
        y: 4.7,
        w: '90%',
        h: 1.2,
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
    slide.addText('Board Metrics', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: 'FF5100',
      bold: true
    });

    // Create metrics table - Fixed TypeScript issues
    const tableData: any[] = [
      [
        { text: 'Metric', options: { bold: true, fontSize: 18, fill: { color: 'FF5100' }, color: 'FFFFFF' } },
        { text: 'Value', options: { bold: true, fontSize: 18, fill: { color: 'FF5100' }, color: 'FFFFFF' } }
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
      border: { pt: 1, color: 'FF5100' }
    });

    // Add visual metrics if available
    if (projectData.itemsCount) {
      slide.addText(`Total Board Items: ${projectData.itemsCount}`, {
        x: 1,
        y: 4.5,
        w: 8,
        h: 0.5,
        fontSize: 20,
        color: 'FF5100',
        bold: true,
        align: 'center'
      });
    }
  }

  /**
   * Create items slide
   */
  private async createItemsSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Board Items Overview', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: 'FF5100',
      bold: true
    });

    // Group items by status
    const statusGroups: Record<string, any[]> = {};
    projectData.tasks?.forEach(item => {
      const status = item.status || 'No Status';
      if (!statusGroups[status]) {
        statusGroups[status] = [];
      }
      statusGroups[status].push(item);
    });

    // Create status summary
    const statusSummary: string[] = [];
    Object.entries(statusGroups).forEach(([status, items]) => {
      statusSummary.push(`${status}: ${items.length} items`);
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

    // Recent items table (top 10) - Fixed TypeScript issues
    const recentItems = projectData.tasks?.slice(0, 10) || [];
    if (recentItems.length > 0) {
      const tableData: any[] = [
        [
          { text: 'Item', options: { bold: true, fontSize: 14, fill: { color: 'FF5100' }, color: 'FFFFFF' } },
          { text: 'Status', options: { bold: true, fontSize: 14, fill: { color: 'FF5100' }, color: 'FFFFFF' } },
          { text: 'Assignee', options: { bold: true, fontSize: 14, fill: { color: 'FF5100' }, color: 'FFFFFF' } }
        ]
      ];

      recentItems.forEach(item => {
        tableData.push([
          { text: item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name, options: { bold: false, fontSize: 12, fill: { color: 'FFFFFF' }, color: '000000' } },
          { text: item.status || 'No Status', options: { bold: false, fontSize: 12, fill: { color: 'FFFFFF' }, color: '000000' } },
          { text: item.assignee || 'Unassigned', options: { bold: false, fontSize: 12, fill: { color: 'FFFFFF' }, color: '000000' } }
        ]);
      });

      slide.addTable(tableData, {
        x: 5,
        y: 1.5,
        w: 4.5,
        colW: [2.5, 1, 1],
        border: { pt: 1, color: 'FF5100' }
      });
    }
  }

  /**
   * Create groups slide
   */
  private async createGroupsSlide(pptx: PptxGenJS, projectData: ProjectData): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Board Groups', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: 'FF5100',
      bold: true
    });

    // Create groups table - Fixed TypeScript issues
    const tableData: any[] = [
      [
        { text: 'Group', options: { bold: true, fontSize: 16, fill: { color: 'FF5100' }, color: 'FFFFFF' } },
        { text: 'Items Count', options: { bold: true, fontSize: 16, fill: { color: 'FF5100' }, color: 'FFFFFF' } },
        { text: 'Status', options: { bold: true, fontSize: 16, fill: { color: 'FF5100' }, color: 'FFFFFF' } }
      ]
    ];

    // Add groups data with consistent structure
    projectData.groups?.forEach(group => {
      tableData.push([
        { text: group.title || 'Unnamed Group', options: { bold: false, fontSize: 14, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: String(group.itemsCount || 0), options: { bold: false, fontSize: 14, fill: { color: 'FFFFFF' }, color: '000000' } },
        { text: group.status || 'Active', options: { bold: false, fontSize: 14, fill: { color: 'FFFFFF' }, color: '000000' } }
      ]);
    });

    slide.addTable(tableData, {
      x: 1,
      y: 1.5,
      w: 8,
      colW: [4, 2, 2],
      border: { pt: 1, color: 'FF5100' }
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
      color: 'FF5100',
      bold: true
    });

    // Create team table - Fixed TypeScript issues
    const tableData: any[] = [
      [
        { text: 'Name', options: { bold: true, fontSize: 18, fill: { color: 'FF5100' }, color: 'FFFFFF' } },
        { text: 'Role', options: { bold: true, fontSize: 18, fill: { color: 'FF5100' }, color: 'FFFFFF' } },
        { text: 'Email', options: { bold: true, fontSize: 18, fill: { color: 'FF5100' }, color: 'FFFFFF' } }
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
      border: { pt: 1, color: 'FF5100' }
    });
  }

  /**
   * Create summary slide
   */
  private async createSummarySlide(pptx: PptxGenJS, projectData: ProjectData, config: MondayReportConfig): Promise<void> {
    const slide = pptx.addSlide();

    // Title
    slide.addText('Board Summary', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: 'FF5100',
      bold: true
    });

    // Key insights
    slide.addText('Key Insights:', {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 0.5,
      fontSize: 24,
      color: 'FF5100',
      bold: true
    });

    const insights = [
      `Board ${projectData.name} contains ${projectData.itemsCount || projectData.tasks?.length || 0} items`,
      `Current board state: ${projectData.boardState || projectData.status || 'Active'}`,
      `Number of groups: ${projectData.groups?.length || 'Unknown'}`,
      `Team members: ${projectData.team?.length || 'Unknown'}`
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
      color: 'FF5100',
      bold: true
    });

    const nextSteps = [
      'Review item progress and update statuses',
      'Ensure proper task assignment across team members',
      'Monitor group performance and adjust workflows',
      'Schedule regular board reviews with stakeholders'
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