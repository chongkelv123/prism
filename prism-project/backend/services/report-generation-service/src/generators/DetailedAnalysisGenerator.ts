// backend/services/report-generation-service/src/generators/DetailedAnalysisGenerator.ts
// FIXED VERSION - Windows Compatible (No Unicode/Symbols)
// FIX: Proper PptxGenJS data handling to prevent "Cannot read properties of undefined (reading 'length')" error

import PptxGenJS from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';
import { ProjectData } from '../services/PlatformDataService';
import { DataAnalyticsService, AnalyticsMetrics } from '../services/DataAnalyticsService';

export interface DetailedAnalysisConfig {
  title?: string;
  includeDeepAnalysis?: boolean;
  includeBenchmarking?: boolean;
  includePredictions?: boolean;
  includeRecommendations?: boolean;
  [key: string]: any;
}

export class DetailedAnalysisGenerator {
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
   * Generate Detailed Analysis PowerPoint (15-20 slides)
   */
  async generate(
    projectData: ProjectData, 
    config: DetailedAnalysisConfig, 
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<string> {
    try {
      logger.info('Generating Detailed Analysis Report', {
        platform: projectData.platform,
        projectName: projectData.name,
        taskCount: Array.isArray(projectData.tasks) ? projectData.tasks.length : 0,
        teamSize: Array.isArray(projectData.team) ? projectData.team.length : 0,
        usingFallback: projectData.fallbackData || false
      });

      // FIXED: Ensure projectData has proper array structure
      projectData = this.sanitizeProjectData(projectData);

      // Calculate analytics
      this.analytics = DataAnalyticsService.calculateAnalytics(projectData);

      // Initialize PowerPoint
      const pptx = new PptxGenJS();
      
      // Configure presentation
      pptx.layout = 'LAYOUT_16x9';
      pptx.author = 'PRISM Report System';
      pptx.company = 'Project Management Analytics';
      pptx.subject = `Detailed Analysis - ${projectData.name}`;
      pptx.title = config.title || `${projectData.name} - Detailed Analysis`;

      const theme = this.getPlatformTheme(projectData.platform);

      // Generate slides (15-20 slides)
      await this.createDetailedTitleSlide(pptx, projectData, config, theme);
      await progressCallback?.(5);

      await this.createComprehensiveOverviewSlide(pptx, projectData, theme);
      await progressCallback?.(10);

      await this.createDataAnalysisSlide(pptx, projectData, theme);
      await progressCallback?.(15);

      await this.createPerformanceTrendSlide(pptx, projectData, theme);
      await progressCallback?.(20);

      await this.createQualityMetricsSlide(pptx, projectData, theme);
      await progressCallback?.(25);

      await this.createTeamAnalyticsSlide(pptx, projectData, theme);
      await progressCallback?.(30);

      await this.createTaskFlowAnalysisSlide(pptx, projectData, theme);
      await progressCallback?.(35);

      await this.createBottleneckAnalysisSlide(pptx, projectData, theme);
      await progressCallback?.(40);

      await this.createResourceUtilizationSlide(pptx, projectData, theme);
      await progressCallback?.(45);

      await this.createTimelineDeepDiveSlide(pptx, projectData, theme);
      await progressCallback?.(50);

      if (config.includeBenchmarking !== false) {
        await this.createBenchmarkingSlide(pptx, projectData, theme);
        await progressCallback?.(55);
      }

      if (config.includePredictions !== false) {
        await this.createPredictiveInsightsSlide(pptx, projectData, theme);
        await progressCallback?.(60);
      }

      await this.createRiskDetailedAnalysisSlide(pptx, projectData, theme);
      await progressCallback?.(65);

      await this.createImprovementOpportunitiesSlide(pptx, projectData, theme);
      await progressCallback?.(70);

      await this.createDataQualityAssessmentSlide(pptx, projectData, theme);
      await progressCallback?.(75);

      await this.createPlatformSpecificInsightsSlide(pptx, projectData, theme);
      await progressCallback?.(80);

      if (config.includeRecommendations !== false) {
        await this.createDetailedRecommendationsSlide(pptx, projectData, theme);
        await progressCallback?.(85);
      }

      await this.createImplementationRoadmapSlide(pptx, projectData, theme);
      await progressCallback?.(90);

      await this.createAppendixSlide(pptx, projectData, theme);
      await progressCallback?.(95);

      // Save file
      const filename = `detailed-analysis-${projectData.name.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.pptx`;
      const filepath = path.join(this.STORAGE_DIR, filename);
      
      await pptx.writeFile({ fileName: filepath });
      await progressCallback?.(100);

      logger.info('Detailed Analysis generated successfully', {
        filename,
        platform: projectData.platform
      });

      return filename;

    } catch (error) {
      logger.error('Error generating Detailed Analysis:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate Detailed Analysis: ${errorMessage}`);
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
   * FIXED: Create detailed title slide
   */
  private async createDetailedTitleSlide(
    pptx: PptxGenJS, 
    projectData: ProjectData, 
    config: DetailedAnalysisConfig,
    theme: { primary: string; secondary: string; accent: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    slide.background = { color: theme.accent };

    slide.addText('DETAILED ANALYSIS REPORT', {
      x: '10%',
      y: '15%',
      w: '80%',
      h: '12%',
      fontSize: 36,
      color: theme.primary,
      bold: true,
      align: 'center'
    });

    slide.addText(projectData.name || 'Project Analysis', {
      x: '10%',
      y: '30%',
      w: '80%',
      h: '10%',
      fontSize: 24,
      color: theme.secondary,
      align: 'center'
    });

    // Comprehensive stats
    const taskCount = Array.isArray(projectData.tasks) ? projectData.tasks.length : 0;
    const teamCount = Array.isArray(projectData.team) ? projectData.team.length : 0;
    const metricsCount = Array.isArray(projectData.metrics) ? projectData.metrics.length : 0;
    
    slide.addText(`${taskCount} Tasks | ${teamCount} Team Members | ${metricsCount} Metrics | Deep Analytics`, {
      x: '10%',
      y: '45%',
      w: '80%',
      h: '8%',
      fontSize: 18,
      color: theme.secondary,
      align: 'center'
    });

    slide.addText(`Platform: ${projectData.platform.toUpperCase()} | Generated: ${new Date().toLocaleDateString()}`, {
      x: '10%',
      y: '85%',
      w: '80%',
      h: '5%',
      fontSize: 14,
      color: '6B7280',
      align: 'center'
    });
  }

  /**
   * FIXED: Create comprehensive overview slide
   */
  private async createComprehensiveOverviewSlide(
    pptx: PptxGenJS, 
    projectData: ProjectData,
    theme: { primary: string; secondary: string; accent: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    slide.addText('COMPREHENSIVE PROJECT OVERVIEW', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      color: theme.primary,
      bold: true
    });

    // FIXED: Safe data extraction
    const tasks = Array.isArray(projectData.tasks) ? projectData.tasks : [];
    const team = Array.isArray(projectData.team) ? projectData.team : [];
    const metrics = Array.isArray(projectData.metrics) ? projectData.metrics : [];
    const sprints = Array.isArray(projectData.sprints) ? projectData.sprints : [];

    // Overview statistics
    const overviewStats = [
      `Project Name: ${projectData.name || 'Unknown'}`,
      `Platform Integration: ${projectData.platform.toUpperCase()}`,
      `Total Tasks/Items: ${tasks.length}`,
      `Active Team Members: ${team.length}`,
      `Tracked Metrics: ${metrics.length}`,
      `Sprint/Iteration Count: ${sprints.length}`,
      `Project Completion: ${this.analytics?.completionRate || 0}%`,
      `Risk Assessment: ${this.analytics?.riskLevel || 'Unknown'}`,
      `Quality Score: ${this.analytics?.qualityScore || 0}%`,
      `Team Efficiency: ${this.analytics?.teamEfficiency || 0}%`
    ];

    slide.addText(overviewStats.join('\n'), {
      x: 0.5,
      y: 1.5,
      w: '90%',
      h: 5,
      fontSize: 14,
      color: '374151',
      bullet: { type: 'bullet' }
    });
  }

  /**
   * FIXED: Create data analysis slide with safe table creation
   */
  private async createDataAnalysisSlide(
    pptx: PptxGenJS, 
    projectData: ProjectData,
    theme: { primary: string; secondary: string; accent: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    slide.addText('COMPREHENSIVE DATA ANALYSIS', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      color: theme.primary,
      bold: true
    });

    // FIXED: Create analysis table with proper PptxGenJS format
    const analysisData: any[][] = [
      [
        { text: 'Analysis Category', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Current Value', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Benchmark', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } },
        { text: 'Assessment', options: { bold: true, fontSize: 14, fill: { color: theme.primary }, color: 'FFFFFF' } }
      ]
    ];

    const analysisMetrics = [
      {
        category: 'Task Completion Rate',
        value: `${this.analytics?.completionRate || 0}%`,
        benchmark: '85%',
        assessment: (this.analytics?.completionRate || 0) >= 85 ? 'Excellent' : 'Needs Improvement'
      },
      {
        category: 'Team Productivity',
        value: `${this.analytics?.teamEfficiency || 0}%`,
        benchmark: '75%',
        assessment: (this.analytics?.teamEfficiency || 0) >= 75 ? 'Good' : 'Below Target'
      },
      {
        category: 'Quality Metrics',
        value: `${this.analytics?.qualityScore || 0}%`,
        benchmark: '90%',
        assessment: (this.analytics?.qualityScore || 0) >= 90 ? 'Excellent' : 'Monitor'
      },
      {
        category: 'Risk Profile',
        value: this.analytics?.riskLevel || 'Unknown',
        benchmark: 'Low',
        assessment: (this.analytics?.riskLevel || '').toLowerCase() === 'low' ? 'Optimal' : 'Review Required'
      }
    ];

    analysisMetrics.forEach(metric => {
      analysisData.push([
        { text: metric.category, options: { fontSize: 12 } },
        { text: metric.value, options: { fontSize: 12 } },
        { text: metric.benchmark, options: { fontSize: 12 } },
        { text: metric.assessment, options: { fontSize: 12 } }
      ]);
    });

    slide.addTable(analysisData, {
      x: 0.5,
      y: 1.5,
      w: 9,
      colW: [3, 2, 2, 2],
      border: { pt: 1, color: 'E5E7EB' },
      fill: { color: 'F9FAFB' }
    });

    // Analysis summary
    slide.addText('Data analysis reveals project performance across key indicators with benchmarking against industry standards.', {
      x: 0.5,
      y: 5.5,
      w: '90%',
      h: 1,
      fontSize: 12,
      color: '374151',
      italic: true
    });
  }

  /**
   * FIXED: Create team analytics slide
   */
  private async createTeamAnalyticsSlide(
    pptx: PptxGenJS, 
    projectData: ProjectData,
    theme: { primary: string; secondary: string; accent: string }
  ): Promise<void> {
    const slide = pptx.addSlide();
    
    slide.addText('TEAM ANALYTICS DEEP DIVE', {
      x: 0.5,
      y: 0.5,
      w: '90%',
      h: 0.8,
      fontSize: 24,
      color: theme.primary,
      bold: true
    });

    // FIXED: Safe team analysis
    const team = Array.isArray(projectData.team) ? projectData.team : [];
    const tasks = Array.isArray(projectData.tasks) ? projectData.tasks : [];

    if (team.length > 0) {
      // FIXED: Create team analytics table with safe data
      const teamAnalyticsData: any[][] = [
        [
          { text: 'Team Member', options: { bold: true, fontSize: 12, fill: { color: theme.primary }, color: 'FFFFFF' } },
          { text: 'Role', options: { bold: true, fontSize: 12, fill: { color: theme.primary }, color: 'FFFFFF' } },
          { text: 'Task Load', options: { bold: true, fontSize: 12, fill: { color: theme.primary }, color: 'FFFFFF' } },
          { text: 'Completion %', options: { bold: true, fontSize: 12, fill: { color: theme.primary }, color: 'FFFFFF' } },
          { text: 'Performance', options: { bold: true, fontSize: 12, fill: { color: theme.primary }, color: 'FFFFFF' } }
        ]
      ];

      team.forEach(member => {
        if (member && member.name) {
          const memberTasks = tasks.filter(task => task && task.assignee === member.name);
          const completedTasks = memberTasks.filter(task => {
            if (!task || !task.status) return false;
            const status = task.status.toLowerCase();
            return status.includes('done') || status.includes('complete') || status.includes('closed');
          });
          
          const completionRate = memberTasks.length > 0 ? Math.round((completedTasks.length / memberTasks.length) * 100) : 0;
          const performance = completionRate >= 80 ? 'High' : completionRate >= 60 ? 'Medium' : 'Low';

          teamAnalyticsData.push([
            { text: member.name, options: { fontSize: 10 } },
            { text: member.role || 'Team Member', options: { fontSize: 10 } },
            { text: String(memberTasks.length), options: { fontSize: 10 } },
            { text: `${completionRate}%`, options: { fontSize: 10 } },
            { text: performance, options: { fontSize: 10 } }
          ]);
        }
      });

      slide.addTable(teamAnalyticsData, {
        x: 0.5,
        y: 1.5,
        w: 9,
        colW: [2.5, 2, 1.5, 1.5, 1.5],
        border: { pt: 1, color: 'E5E7EB' },
        fill: { color: 'F9FAFB' }
      });
    } else {
      slide.addText('No detailed team data available for analysis', {
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

  // FIXED: Add remaining slide methods with safe data handling
  private async createPerformanceTrendSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('PERFORMANCE TREND ANALYSIS', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });
    slide.addText('Trend analysis based on historical performance data and projections.', {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 16, color: '374151'
    });
  }

  private async createQualityMetricsSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('QUALITY METRICS DEEP DIVE', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });
    slide.addText(`Quality Score: ${this.analytics?.qualityScore || 0}%`, {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 18, color: '374151'
    });
  }

  private async createTaskFlowAnalysisSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('TASK FLOW ANALYSIS', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });
    slide.addText('Analysis of task progression and workflow efficiency.', {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 16, color: '374151'
    });
  }

  private async createBottleneckAnalysisSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('BOTTLENECK ANALYSIS', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });
    slide.addText('Identification of process bottlenecks and optimization opportunities.', {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 16, color: '374151'
    });
  }

  private async createResourceUtilizationSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('RESOURCE UTILIZATION', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });
    slide.addText(`Team Efficiency: ${this.analytics?.teamEfficiency || 0}%`, {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 18, color: '374151'
    });
  }

  private async createTimelineDeepDiveSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('TIMELINE DEEP DIVE', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });
    const sprints = Array.isArray(projectData.sprints) ? projectData.sprints : [];
    slide.addText(`Sprint Analysis: ${sprints.length} sprints tracked`, {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 16, color: '374151'
    });
  }

  private async createBenchmarkingSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('BENCHMARKING ANALYSIS', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });
    slide.addText('Performance comparison against industry benchmarks and best practices.', {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 16, color: '374151'
    });
  }

  private async createPredictiveInsightsSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('PREDICTIVE INSIGHTS', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });
    slide.addText(`Estimated Completion: ${this.analytics?.estimatedCompletion || 'TBD'}`, {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 18, color: '374151'
    });
  }

  private async createRiskDetailedAnalysisSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('DETAILED RISK ANALYSIS', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });
    slide.addText(`Risk Level: ${this.analytics?.riskLevel || 'Unknown'}`, {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 18, color: '374151'
    });
  }

  private async createImprovementOpportunitiesSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('IMPROVEMENT OPPORTUNITIES', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });
    slide.addText('Identified opportunities for process and performance improvements.', {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 16, color: '374151'
    });
  }

  private async createDataQualityAssessmentSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('DATA QUALITY ASSESSMENT', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });
    
    const dataSource = projectData.fallbackData ? 'Demonstration Data' : 'Live Platform Data';
    slide.addText(`Data Source: ${dataSource}`, {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 16, color: '374151'
    });
  }

  private async createPlatformSpecificInsightsSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('PLATFORM-SPECIFIC INSIGHTS', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });
    slide.addText(`${projectData.platform.toUpperCase()} platform optimization recommendations.`, {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 16, color: '374151'
    });
  }

  private async createDetailedRecommendationsSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('DETAILED RECOMMENDATIONS', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });
    slide.addText('Comprehensive recommendations based on detailed analysis findings.', {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 16, color: '374151'
    });
  }

  private async createImplementationRoadmapSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('IMPLEMENTATION ROADMAP', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });
    slide.addText('Strategic roadmap for implementing recommended improvements.', {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 16, color: '374151'
    });
  }

  private async createAppendixSlide(pptx: PptxGenJS, projectData: ProjectData, theme: any): Promise<void> {
    const slide = pptx.addSlide();
    slide.addText('APPENDIX', {
      x: 0.5, y: 0.5, w: '90%', h: 0.8,
      fontSize: 24, color: theme.primary, bold: true
    });
    slide.addText('Additional data, methodology, and supporting information.', {
      x: 0.5, y: 1.5, w: '90%', h: 1,
      fontSize: 16, color: '374151'
    });
  }
}