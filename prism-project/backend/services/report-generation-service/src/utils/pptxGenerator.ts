import PptxGenJS from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';

// Type definitions
export interface ReportData {
  title: string;
  platform: string;
  date: string;
  metrics?: { name: string; value: string }[];
  team?: { name: string; role: string }[];
  tasks?: { name: string; status: string; assignee?: string }[];
  sprints?: { name: string; startDate: string; endDate: string; completed: string }[];
  configuration: {
    includeMetrics?: boolean;
    includeTasks?: boolean;
    includeTimeline?: boolean;
    includeResources?: boolean;
  };
}

// Platform logo data (base64)
const platformLogos = {
  monday: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB4PSI2IiB5PSI2IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmY3Mjc1IiByeD0iMiIvPjxyZWN0IHg9IjE0IiB5PSI2IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDBkMGQ5IiByeD0iMiIvPjxyZWN0IHg9IjYiIHk9IjE0IiB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZjRiZTQ4IiByeD0iMiIvPjxyZWN0IHg9IjE0IiB5PSIxNCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iIzAwYjZkMCIgcng9IjIiLz48L3N2Zz4=',
  jira: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTEuNTcxIDEyLjU3Nkw4LjQ2OSA5LjQ3MkM3LjM2NSA4LjM2OCA3LjM2NSA2LjU3OSA4LjQ2OSA1LjQ3NUwxNC41MjcgMTEuNTMzQzE1LjYzMSAxMi42MzcgMTUuNjMxIDE0LjQyNSAxNC41MjcgMTUuNTNMOC40NjkgMjEuNTg4QzcuMzY1IDIwLjQ4NCA3LjM2NSAxOC42OTUgOC40NjkgMTcuNTkxTDExLjU3MSAxNC40ODcgMTEuNTcxIDEyLjU3NnoiIGZpbGw9IiMyNjg0RkYiLz48L3N2Zz4=',
  trofos: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptLTIgMTVsLTUtNSAxLjQxLTEuNDFMMTAgMTQuMTdsNy41OS03LjU5TDE5IDhsLTkgOXoiIGZpbGw9IiM1MWExZTQiLz48L3N2Zz4='
};

// Storage directory for generated files
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../../storage');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

/**
 * Generate a PowerPoint report based on provided data
 * @param data Report data to include in the PowerPoint
 * @returns Object containing file path and ID
 */
export async function generatePowerPointReport(data: ReportData): Promise<{ id: string, filePath: string }> {
  try {
    // Create a new PowerPoint presentation
    const pptx = new PptxGenJS();

    // Set presentation properties
    pptx.layout = 'LAYOUT_16x9';
    pptx.title = data.title;

    // Add title slide
    const slide1 = pptx.addSlide();
    slide1.background = { color: '0D47A1' };
    slide1.addText(data.title, {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 1.5,
      align: 'center',
      color: 'FFFFFF',
      fontSize: 44,
      bold: true
    });

    slide1.addText(`Generated on: ${data.date}`, {
      x: 0.5,
      y: 3.5,
      w: '90%',
      h: 0.5,
      align: 'center',
      color: 'FFFFFF',
      fontSize: 18
    });

    // Add logo based on platform
    if (platformLogos[data.platform]) {
      slide1.addImage({
        data: platformLogos[data.platform],
        x: 0.5,
        y: 0.5,
        w: 1,
        h: 1
      });
    }

    // Add metrics slide if configured
    if ((data.configuration.includeMetrics !== false) && data.metrics?.length) {
      const slide2 = pptx.addSlide();
      slide2.addText('Project Metrics', {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: 0.8,
        fontSize: 36,
        color: '0D47A1',
        bold: true
      });

      // Add metrics table
      const tableData = [
        [{
          text: 'Metric',
          options: {
            bold: true,
            fontSize: 18,
            fill: { color: '0D47A1' },
            color: 'FFFFFF'
          }
        },
        {
          text: 'Value',
          options: {
            bold: true,
            fontSize: 18,
            fill: { color: '0D47A1' },
            color: 'FFFFFF'
          }
        }],
        ...data.metrics.map(metric => [
          { text: metric.name, options: { fontSize: 16 } },
          { text: metric.value, options: { fontSize: 16 } }
        ])
      ];

      slide2.addTable(tableData, { x: 0.5, y: 1.5, w: 8, h: 2 });
    }

    // Add team slide - NOT conditional on configuration
    if (data.team?.length) {
      const slide3 = pptx.addSlide();
      slide3.addText('Team Members', {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: 0.8,
        fontSize: 36,
        color: '0D47A1',
        bold: true
      });

      // Add team table
      const teamData = [
        [{
          text: 'Name',
          options: {
            bold: true,
            fontSize: 18,
            fill: { color: '0D47A1' },
            color: 'FFFFFF'
          }
        },
        {
          text: 'Role',
          options: {
            bold: true,
            fontSize: 18,
            fill: { color: '0D47A1' },
            color: 'FFFFFF'
          }
        }],
        ...data.team.map(member => [
          { text: member.name, options: { fontSize: 16 } },
          { text: member.role, options: { fontSize: 16 } }
        ])
      ];

      slide3.addTable(teamData, { x: 0.5, y: 1.5, w: 8, h: 2 });
    }

    // Add tasks slide if configured
    if ((data.configuration.includeTasks !== false) && data.tasks?.length) {
      const slide4 = pptx.addSlide();
      slide4.addText('Tasks & Issues', {
        x: 0.5,
        y: 0.5,
        w: '90%',
        h: 0.8,
        fontSize: 36,
        color: '0D47A1',
        bold: true
      });

      // Add tasks table
      const tasksData = [
        [{
          text: 'Task',
          options: {
            bold: true,
            fontSize: 18,
            fill: { color: '0D47A1' },
            color: 'FFFFFF'
          }
        },
        {
          text: 'Status',
          options: {
            bold: true,
            fontSize: 18,
            fill: { color: '0D47A1' },
            color: 'FFFFFF'
          }
        },
        {
          text: 'Assignee',
          options: {
            bold: true,
            fontSize: 18,
            fill: { color: '0D47A1' },
            color: 'FFFFFF'
          }
        }],
        ...data.tasks.map(task => [
          { text: task.name, options: { fontSize: 16 } },
          { text: task.status, options: { fontSize: 16 } },
          { text: task.assignee || 'Unassigned', options: { fontSize: 16 } }
        ])
      ];

      slide4.addTable(tasksData, { x: 0.5, y: 1.5, w: 10, h: 3 });
    }

    // Add Summary slide 
    const summarySlide = pptx.addSlide();
    summarySlide.addText('Project Summary', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 36,
      color: '0D47A1',
      bold: true
    });

    // Add summary content
    summarySlide.addText('Key Highlights', {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 0.5,
      fontSize: 24,
      color: '0D47A1',
      bold: true
    });

    // Add bullet points
    const bulletPoints = [
      'Project is on track to meet deadlines',
      `${data.metrics?.[0]?.value || 'Multiple'} tasks completed this period`,
      'Team is collaborating effectively',
      'Key milestones have been achieved'
    ];

    summarySlide.addText(bulletPoints.join('\n'), {
      x: 0.5,
      y: 2.2,
      w: '90%',
      h: 2,
      fontSize: 18,
      color: '000000',
      bullet: { type: 'bullet' }
    });

    // Add next steps section
    summarySlide.addText('Next Steps', {
      x: 0.5,
      y: 4.5,
      w: '90%',
      h: 0.5,
      fontSize: 24,
      color: '0D47A1',
      bold: true
    });

    const nextSteps = [
      'Continue tracking progress against sprint goals',
      'Address any identified blockers promptly',
      'Prepare for upcoming milestone review',
      'Update stakeholders on current status'
    ];

    summarySlide.addText(nextSteps.join('\n'), {
      x: 0.5,
      y: 5.2,
      w: '90%',
      h: 2,
      fontSize: 18,
      color: '000000',
      bullet: { type: 'bullet' }
    });

    // Create a unique ID for the report
    const reportId = uuidv4();
    const fileName = `${reportId}_${data.title.replace(/\s+/g, '_')}.pptx`;
    const filePath = path.join(STORAGE_DIR, fileName);

    // Write file to storage directory
    await pptx.writeFile({ fileName: filePath });

    logger.info(`PowerPoint report generated: ${fileName}`);

    return { id: reportId, filePath };
  } catch (error) {
    logger.error('Error generating PowerPoint report:', error);
    throw new Error('Failed to generate PowerPoint report');
  }
}

/**
 * Get file path for a report by ID
 * @param reportId Report ID
 * @returns File path
 */
export function getReportFilePath(reportId: string): string | null {
  try {
    const files = fs.readdirSync(STORAGE_DIR);
    const reportFile = files.find(file => file.startsWith(reportId));

    if (!reportFile) {
      return null;
    }

    return path.join(STORAGE_DIR, reportFile);
  } catch (error) {
    logger.error('Error getting report file:', error);
    return null;
  }
}