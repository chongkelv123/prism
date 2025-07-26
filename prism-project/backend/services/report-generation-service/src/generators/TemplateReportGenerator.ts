// backend/services/report-generation-service/src/generators/TemplateReportGenerator.ts
// Template Integration Layer - Windows Compatible (No Unicode/Symbols)
// CLEANED VERSION - Removed conflicting EnhancedJiraReportGenerator class

import logger from '../utils/logger';
import { ProjectData } from '../services/PlatformDataService';
import { StandardReportGenerator } from './StandardReportGenerator';
import { ExecutiveSummaryGenerator } from './ExecutiveSummaryGenerator';
import { DetailedAnalysisGenerator } from './DetailedAnalysisGenerator';

export interface TemplateReportConfig {
  templateId: 'standard' | 'executive' | 'detailed';
  title?: string;
  includeMetrics?: boolean;
  includeTasks?: boolean;
  includeTimeline?: boolean;
  includeResources?: boolean;
  [key: string]: any;
}

export class TemplateReportGenerator {
  private standardGenerator: StandardReportGenerator;
  private executiveGenerator: ExecutiveSummaryGenerator;
  private detailedGenerator: DetailedAnalysisGenerator;

  constructor() {
    this.standardGenerator = new StandardReportGenerator();
    this.executiveGenerator = new ExecutiveSummaryGenerator();
    this.detailedGenerator = new DetailedAnalysisGenerator();
  }

  /**
   * Generate report based on selected template
   */
  async generate(
    projectData: ProjectData,
    config: TemplateReportConfig,
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<string> {
    try {
      logger.info('Generating template-based report', {
        templateId: config.templateId,
        platform: projectData.platform,
        projectName: projectData.name
      });

      // Route to appropriate template generator
      switch (config.templateId) {
        case 'standard':
          return await this.standardGenerator.generate(projectData, config, progressCallback);
        
        case 'executive':
          return await this.executiveGenerator.generate(projectData, config, progressCallback);
        
        case 'detailed':
          return await this.detailedGenerator.generate(projectData, config, progressCallback);
        
        default:
          throw new Error(`Unknown template ID: ${config.templateId}`);
      }

    } catch (error) {
      logger.error('Error generating template-based report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate ${config.templateId} template report: ${errorMessage}`);
    }
  }

  /**
   * Get template metadata for UI
   */
  static getTemplateMetadata(): Record<string, any> {
    return {
      standard: {
        id: 'standard',
        name: 'Standard Report',
        description: 'Comprehensive project overview with balanced detail',
        estimatedSlides: '8-12',
        estimatedTime: '45 minutes',
        complexity: 'Intermediate',
        targetAudience: ['Project Managers', 'Team Leads', 'Stakeholders'],
        features: [
          'Project Overview',
          'Key Metrics Dashboard', 
          'Task Analysis',
          'Team Performance',
          'Timeline Analysis',
          'Risk Assessment',
          'Progress Summary',
          'Next Steps'
        ]
      },
      executive: {
        id: 'executive',
        name: 'Executive Summary',
        description: 'High-level strategic overview for senior management',
        estimatedSlides: '5-7',
        estimatedTime: '30 minutes',
        complexity: 'Basic',
        targetAudience: ['C-Level Executives', 'Senior Management', 'Board Members'],
        features: [
          'Executive Summary',
          'Project Health Dashboard',
          'Strategic Progress',
          'Resource Overview',
          'Risk Summary',
          'Key Decisions Required'
        ]
      },
      detailed: {
        id: 'detailed',
        name: 'Detailed Analysis',
        description: 'Comprehensive analytical report with deep insights',
        estimatedSlides: '15-20',
        estimatedTime: '90 minutes',
        complexity: 'Advanced',
        targetAudience: ['Technical Leads', 'Data Analysts', 'Process Managers'],
        features: [
          'Comprehensive Data Analysis',
          'Performance Trend Analysis',
          'Quality Metrics Deep-dive',
          'Team Analytics',
          'Bottleneck Analysis',
          'Predictive Insights',
          'Benchmarking',
          'Detailed Recommendations'
        ]
      }
    };
  }

  /**
   * Validate template configuration
   */
  static validateTemplateConfig(config: TemplateReportConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!config.templateId) {
      errors.push('Template ID is required');
    }

    // Validate template ID
    if (config.templateId && !['standard', 'executive', 'detailed'].includes(config.templateId)) {
      errors.push(`Invalid template ID: ${config.templateId}`);
    }

    // Validate title length
    if (config.title && config.title.length > 100) {
      errors.push('Title must be 100 characters or less');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get template scoring for auto-selection
   */
  static getTemplateScores(projectData: ProjectData): Record<string, number> {
    const taskCount = Array.isArray(projectData.tasks) ? projectData.tasks.length : 0;
    const teamSize = Array.isArray(projectData.team) ? projectData.team.length : 0;
    const metricsCount = Array.isArray(projectData.metrics) ? projectData.metrics.length : 0;
    const sprintCount = Array.isArray(projectData.sprints) ? projectData.sprints.length : 0;

    const scores: Record<string, number> = {};

    // Standard template scoring (balanced approach)
    scores.standard = Math.min(100,
      (taskCount >= 10 ? 25 : taskCount * 2.5) +
      (teamSize >= 3 ? 25 : teamSize * 8) +
      (metricsCount >= 3 ? 25 : metricsCount * 8) +
      (sprintCount >= 2 ? 25 : sprintCount * 12)
    );

    // Executive template scoring (favors high-level overview)
    scores.executive = Math.min(100,
      (taskCount <= 30 ? 30 : Math.max(0, 30 - (taskCount - 20) * 2)) +
      (teamSize <= 5 ? 25 : Math.max(0, 25 - (teamSize - 5) * 3)) +
      (metricsCount >= 2 ? 25 : metricsCount * 12) +
      20 // Base score for executive reporting
    );

    // Detailed template scoring (favors complex projects with rich data)
    scores.detailed = Math.min(100,
      (taskCount >= 20 ? 30 : taskCount * 1.5) +
      (teamSize >= 5 ? 25 : teamSize * 5) +
      (metricsCount >= 5 ? 25 : metricsCount * 5) +
      (sprintCount >= 3 ? 20 : sprintCount * 6)
    );

    return scores;
  }
}

// Keep only Monday and TROFOS generators that use the template system
export class EnhancedMondayReportGenerator {
  private templateGenerator: TemplateReportGenerator;

  constructor() {
    this.templateGenerator = new TemplateReportGenerator();
  }

  /**
   * Generate Monday.com report using template system
   */
  async generate(
    projectData: ProjectData,
    config: any,
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<string> {
    try {
      // Ensure we're working with Monday.com data
      if (projectData.platform !== 'monday') {
        logger.warn('Non-Monday.com data provided to MondayReportGenerator');
      }

      // Determine template to use
      const templateId = config.templateId || 'standard';
      
      // Create template configuration
      const templateConfig: TemplateReportConfig = {
        templateId,
        title: config.title || `${projectData.name} - Monday.com Report`,
        includeMetrics: config.includeMetrics !== false,
        includeTasks: config.includeTasks !== false,
        includeTimeline: config.includeTimeline !== false,
        includeResources: config.includeResources !== false,
        ...config
      };

      // Validate configuration
      const validation = TemplateReportGenerator.validateTemplateConfig(templateConfig);
      if (!validation.valid) {
        throw new Error(`Invalid template configuration: ${validation.errors.join(', ')}`);
      }

      logger.info('Generating Monday.com report with template', {
        templateId,
        projectId: projectData.id,
        itemCount: projectData.tasks?.length || 0
      });

      // Generate report using template system
      return await this.templateGenerator.generate(projectData, templateConfig, progressCallback);

    } catch (error) {
      logger.error('Error generating Monday.com template report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate Monday.com report: ${errorMessage}`);
    }
  }
}

export class TrofosReportGenerator {
  private templateGenerator: TemplateReportGenerator;

  constructor() {
    this.templateGenerator = new TemplateReportGenerator();
  }

  /**
   * Generate TROFOS report using template system
   */
  async generate(
    projectData: ProjectData,
    config: any,
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<string> {
    try {
      // Ensure we're working with TROFOS data
      if (projectData.platform !== 'trofos') {
        logger.warn('Non-TROFOS data provided to TrofosReportGenerator');
      }

      // Determine template to use
      const templateId = config.templateId || 'standard';
      
      // Create template configuration
      const templateConfig: TemplateReportConfig = {
        templateId,
        title: config.title || `${projectData.name} - TROFOS Report`,
        includeMetrics: config.includeMetrics !== false,
        includeTasks: config.includeTasks !== false,
        includeTimeline: config.includeTimeline !== false,
        includeResources: config.includeResources !== false,
        ...config
      };

      // Validate configuration
      const validation = TemplateReportGenerator.validateTemplateConfig(templateConfig);
      if (!validation.valid) {
        throw new Error(`Invalid template configuration: ${validation.errors.join(', ')}`);
      }

      logger.info('Generating TROFOS report with template', {
        templateId,
        projectId: projectData.id,
        backlogItemCount: projectData.tasks?.length || 0
      });

      // Generate report using template system
      return await this.templateGenerator.generate(projectData, templateConfig, progressCallback);

    } catch (error) {
      logger.error('Error generating TROFOS template report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate TROFOS report: ${errorMessage}`);
    }
  }
}

// Template recommendation service
export class TemplateRecommendationService {
  /**
   * Recommend best template based on project characteristics
   */
  static recommendTemplate(projectData: ProjectData): {
    recommended: 'standard' | 'executive' | 'detailed';
    scores: Record<string, number>;
    reasoning: string;
  } {
    const scores = TemplateReportGenerator.getTemplateScores(projectData);
    
    // Find highest scoring template
    const recommended = Object.entries(scores).reduce((a, b) => 
      scores[a[0]] > scores[b[0]] ? a : b
    )[0] as 'standard' | 'executive' | 'detailed';

    // Generate reasoning
    const taskCount = Array.isArray(projectData.tasks) ? projectData.tasks.length : 0;
    const teamSize = Array.isArray(projectData.team) ? projectData.team.length : 0;
    
    let reasoning = '';
    switch (recommended) {
      case 'executive':
        reasoning = `Executive template recommended for high-level overview. Project has ${taskCount} tasks with ${teamSize} team members - ideal for stakeholder presentations.`;
        break;
      case 'detailed':
        reasoning = `Detailed template recommended for comprehensive analysis. Project complexity (${taskCount} tasks, ${teamSize} team members) warrants deep-dive reporting.`;
        break;
      default:
        reasoning = `Standard template recommended for balanced reporting. Project scale (${taskCount} tasks, ${teamSize} team members) fits well with comprehensive overview.`;
    }

    return {
      recommended,
      scores,
      reasoning
    };
  }
}