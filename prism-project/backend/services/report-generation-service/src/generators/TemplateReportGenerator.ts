// backend/services/report-generation-service/src/generators/TemplateReportGenerator.ts
// Template Integration Layer - Windows Compatible (No Unicode/Symbols)

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

    // Validate boolean flags
    const booleanFields = ['includeMetrics', 'includeTasks', 'includeTimeline', 'includeResources'];
    booleanFields.forEach(field => {
      if (config[field] !== undefined && typeof config[field] !== 'boolean') {
        errors.push(`${field} must be a boolean value`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get recommended template based on project data
   */
  static getRecommendedTemplate(projectData: ProjectData): string {
    const taskCount = projectData.tasks?.length || 0;
    const teamSize = projectData.team?.length || 0;
    const metricsCount = projectData.metrics?.length || 0;
    const hasRichData = taskCount > 10 && teamSize > 3 && metricsCount > 5;

    // Recommendation logic based on data richness and complexity
    if (hasRichData && taskCount > 50) {
      return 'detailed'; // Rich data warrants detailed analysis
    } else if (teamSize <= 2 || taskCount <= 10) {
      return 'executive'; // Small projects suit executive summary
    } else {
      return 'standard'; // Default to standard for most cases
    }
  }

  /**
   * Calculate template suitability scores
   */
  static calculateTemplateSuitability(projectData: ProjectData): Record<string, number> {
    const taskCount = projectData.tasks?.length || 0;
    const teamSize = projectData.team?.length || 0;
    const metricsCount = projectData.metrics?.length || 0;
    const sprintCount = projectData.sprints?.length || 0;

    // Calculate scores (0-100) for each template
    const scores = {
      standard: 0,
      executive: 0,
      detailed: 0
    };

    // Standard template scoring
    scores.standard = Math.min(100, 
      (taskCount >= 5 ? 25 : taskCount * 5) +
      (teamSize >= 3 ? 25 : teamSize * 8) +
      (metricsCount >= 3 ? 25 : metricsCount * 8) +
      (sprintCount >= 1 ? 25 : 0)
    );

    // Executive template scoring (favors simpler projects or high-level overview needs)
    scores.executive = Math.min(100,
      (taskCount <= 20 ? 30 : Math.max(0, 30 - (taskCount - 20) * 2)) +
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

// Updated JiraReportGenerator.ts integration
export class EnhancedJiraReportGenerator {
  private templateGenerator: TemplateReportGenerator;

  constructor() {
    this.templateGenerator = new TemplateReportGenerator();
  }

  /**
   * Generate Jira report using template system
   */
  async generate(
    projectData: ProjectData,
    config: any,
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<string> {
    try {
      // Ensure we're working with Jira data
      if (projectData.platform !== 'jira') {
        logger.warn('Non-Jira data provided to JiraReportGenerator');
      }

      // Determine template to use
      const templateId = config.templateId || 'standard';
      
      // Create template configuration
      const templateConfig: TemplateReportConfig = {
        templateId,
        title: config.title || `${projectData.name} - Jira Report`,
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

      logger.info('Generating Jira report with template', {
        templateId,
        projectId: projectData.id,
        issueCount: projectData.tasks?.length || 0
      });

      // Generate report using template system
      return await this.templateGenerator.generate(projectData, templateConfig, progressCallback);

    } catch (error) {
      logger.error('Error generating Jira template report:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate Jira report: ${errorMessage}`);
    }
  }
}

// Updated MondayReportGenerator.ts integration
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

// TROFOS Report Generator for completeness
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

// Template Recommendation Service
export class TemplateRecommendationService {
  /**
   * Get template recommendations with reasoning
   */
  static getRecommendations(projectData: ProjectData): {
    recommended: string;
    alternatives: string[];
    reasoning: string;
    suitabilityScores: Record<string, number>;
  } {
    const scores = TemplateReportGenerator.calculateTemplateSuitability(projectData);
    const sortedTemplates = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)
      .map(([template]) => template);

    const recommended = sortedTemplates[0];
    const alternatives = sortedTemplates.slice(1);

    let reasoning = '';
    const taskCount = projectData.tasks?.length || 0;
    const teamSize = projectData.team?.length || 0;
    const metricsCount = projectData.metrics?.length || 0;

    switch (recommended) {
      case 'detailed':
        reasoning = `Recommended for your project due to rich data availability (${taskCount} tasks, ${teamSize} team members, ${metricsCount} metrics). The detailed analysis template will provide comprehensive insights and advanced analytics.`;
        break;
      case 'executive':
        reasoning = `Recommended for streamlined reporting. With ${taskCount} tasks and ${teamSize} team members, an executive summary provides the right level of detail for stakeholder communication without overwhelming complexity.`;
        break;
      case 'standard':
      default:
        reasoning = `Recommended as a balanced approach for your project scope (${taskCount} tasks, ${teamSize} team members). The standard template provides comprehensive coverage while remaining accessible to all stakeholders.`;
        break;
    }

    return {
      recommended,
      alternatives,
      reasoning,
      suitabilityScores: scores
    };
  }

  /**
   * Get template feature comparison
   */
  static getFeatureComparison(): Record<string, any> {
    return {
      features: [
        { name: 'Project Overview', standard: true, executive: true, detailed: true },
        { name: 'Key Metrics', standard: true, executive: true, detailed: true },
        { name: 'Task Analysis', standard: true, executive: false, detailed: true },
        { name: 'Team Performance', standard: true, executive: false, detailed: true },
        { name: 'Timeline Analysis', standard: true, executive: false, detailed: true },
        { name: 'Risk Assessment', standard: true, executive: true, detailed: true },
        { name: 'Quality Metrics', standard: false, executive: false, detailed: true },
        { name: 'Predictive Insights', standard: false, executive: false, detailed: true },
        { name: 'Benchmarking', standard: false, executive: false, detailed: true },
        { name: 'Statistical Analysis', standard: false, executive: false, detailed: true }
      ],
      complexity: {
        standard: 'Moderate complexity with balanced detail',
        executive: 'Low complexity focused on high-level insights',
        detailed: 'High complexity with comprehensive analytics'
      },
      timeToGenerate: {
        standard: '45 minutes',
        executive: '30 minutes', 
        detailed: '90 minutes'
      },
      bestFor: {
        standard: 'Regular project reporting and stakeholder updates',
        executive: 'Board meetings and senior leadership presentations',
        detailed: 'Technical reviews and process improvement initiatives'
      }
    };
  }
}