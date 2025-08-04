// backend/services/report-generation-service/src/generators/SafeReportGenerator.ts
// SAFE REPORT GENERATOR BASE CLASS - DRY-compliant null safety for all generators
// Prevents PptxGenJS crashes with comprehensive data sanitization

import PptxGenJS from 'pptxgenjs';
import { ProjectData } from '../services/PlatformDataService';

export interface TeamMember {
  name: string;
  role: string;
  taskCount: number;
  utilization: number;
}

export interface SafeTableData {
  headers: string[];
  rows: Array<Array<{ text: string; options?: any }>>;
}

export interface SafeChartData {
  labels: string[];
  data: number[];
  colors?: string[];
}

export abstract class SafeReportGenerator {
  /**
   * CORE: Sanitize project data to ensure proper array structure
   * Eliminates PptxGenJS "Cannot read properties of undefined (reading 'length')" errors
   */
  protected sanitizeProjectData(projectData: ProjectData): ProjectData {
    return {
      ...projectData,
      tasks: Array.isArray(projectData.tasks) ? projectData.tasks : [],
      team: Array.isArray(projectData.team) ? projectData.team : [],
      metrics: Array.isArray(projectData.metrics) ? projectData.metrics : [],
      sprints: Array.isArray(projectData.sprints) ? projectData.sprints : []
    };
  }

  /**
   * CORE: Extract real team members with proper null safety
   * Filters out null/undefined entries and ensures proper data structure
   */
  protected extractRealTeamMembers(projectData: ProjectData): TeamMember[] {
    const sanitizedData = this.sanitizeProjectData(projectData);
    
    if (!Array.isArray(sanitizedData.team) || sanitizedData.team.length === 0) {
      return [];
    }

    return sanitizedData.team
      .filter(member => member && typeof member === 'object' && member.name)
      .map(member => ({
        name: String(member.name || 'Unassigned'),
        role: String(member.role || 'Team Member'),
        taskCount: Number((member as any).taskCount) || 0,
        utilization: Number((member as any).utilization) || 0
      }));
  }

  /**
   * SAFE: Add table to slide with null safety checks
   * Prevents crashes when data arrays are empty or malformed
   */
  protected safeAddTable(
    slide: any, 
    tableData: SafeTableData, 
    options: any = {}
  ): boolean {
    try {
      if (!tableData || !Array.isArray(tableData.headers) || tableData.headers.length === 0) {
        console.warn('SafeReportGenerator: Invalid table headers, skipping table');
        return false;
      }

      if (!Array.isArray(tableData.rows)) {
        console.warn('SafeReportGenerator: Invalid table rows, skipping table');
        return false;
      }

      // Build PptxGenJS table format
      const pptxTableData = [
        // Headers row
        tableData.headers.map(header => ({
          text: String(header || ''),
          options: { bold: true, fontSize: 14, fill: { color: '4F46E5' }, color: 'FFFFFF' }
        })),
        // Data rows
        ...tableData.rows.map(row => 
          Array.isArray(row) ? row.map(cell => ({
            text: String(cell?.text || ''),
            options: cell?.options || { fontSize: 12 }
          })) : []
        )
      ];

      // Only add table if we have data beyond headers
      if (pptxTableData.length > 1 && pptxTableData[1].length > 0) {
        slide.addTable(pptxTableData, {
          x: 0.5,
          y: 1.5,
          w: 9,
          border: { pt: 1, color: 'E5E7EB' },
          fill: { color: 'F9FAFB' },
          ...options
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('SafeReportGenerator: Table creation error:', error);
      return false;
    }
  }

  /**
   * SAFE: Add chart to slide with null safety checks
   * Prevents crashes when chart data is empty or malformed
   */
  protected safeAddChart(
    slide: any, 
    chartData: SafeChartData, 
    chartType: 'pie' | 'bar' | 'line' = 'pie',
    options: any = {}
  ): boolean {
    try {
      if (!chartData || !Array.isArray(chartData.labels) || chartData.labels.length === 0) {
        console.warn('SafeReportGenerator: Invalid chart labels, skipping chart');
        return false;
      }

      if (!Array.isArray(chartData.data) || chartData.data.length === 0) {
        console.warn('SafeReportGenerator: Invalid chart data, skipping chart');
        return false;
      }

      if (chartData.labels.length !== chartData.data.length) {
        console.warn('SafeReportGenerator: Chart labels/data length mismatch, skipping chart');
        return false;
      }

      // Build PptxGenJS chart data format
      const pptxChartData = chartData.labels.map((label, index) => ({
        name: String(label || `Item ${index + 1}`),
        labels: [String(label || `Item ${index + 1}`)],
        values: [Number(chartData.data[index]) || 0]
      }));

      const chartOptions = {
        x: 1,
        y: 2,
        w: 8,
        h: 4,
        showLegend: true,
        legendPos: 'r',
        ...options
      };

      // Use correct PptxGenJS chart type constants
      const chartTypeMap = {
        pie: 'pie',
        bar: 'bar',
        line: 'line'
      };

      slide.addChart(chartTypeMap[chartType], pptxChartData, chartOptions);
      return true;

    } catch (error) {
      console.error('SafeReportGenerator: Chart creation error:', error);
      return false;
    }
  }

  /**
   * SAFE: Calculate completion rate with null safety
   * Handles edge cases where task arrays might be empty or malformed
   */
  protected safeCalculateCompletionRate(projectData: ProjectData): number {
    const sanitizedData = this.sanitizeProjectData(projectData);
    
    if (!Array.isArray(sanitizedData.tasks) || sanitizedData.tasks.length === 0) {
      return 0;
    }

    const completedTasks = sanitizedData.tasks.filter(task => {
      if (!task || typeof task !== 'object') return false;
      const status = String(task.status || '').toLowerCase();
      return status.includes('done') || status.includes('complete') || 
             status.includes('closed') || status.includes('resolved');
    });

    return Math.round((completedTasks.length / sanitizedData.tasks.length) * 100);
  }

  /**
   * SAFE: Get platform theme colors with fallbacks
   * Ensures consistent theming across all generators
   */
  protected getPlatformTheme(platform: string): { primary: string; secondary: string; accent: string } {
    const themes = {
      jira: { primary: '0052CC', secondary: '253858', accent: 'F4F5F7' },
      monday: { primary: 'FF3D71', secondary: '323338', accent: 'F5F6F8' },
      trofos: { primary: '7C3AED', secondary: '4C1D95', accent: 'F3F4F6' }
    };

    return themes[platform?.toLowerCase()] || themes.jira;
  }

  /**
   * SAFE: Format date with null safety
   */
  protected safeFormatDate(date: any): string {
    try {
      if (!date) return 'No date';
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      return dateObj.toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  }

  /**
   * SAFE: Add text with fallback for empty content
   */
  protected safeAddText(
    slide: any,
    text: string,
    options: any,
    fallbackText: string = 'No data available'
  ): void {
    const content = text && text.trim() ? text : fallbackText;
    slide.addText(content, options);
  }

  /**
   * ABSTRACT: Generate method that must be implemented by subclasses
   */
  abstract generate(
    projectData: ProjectData,
    config: any,
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<string>;
}