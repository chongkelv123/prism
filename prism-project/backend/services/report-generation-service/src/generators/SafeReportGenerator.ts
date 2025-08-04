import PptxGenJS from 'pptxgenjs';
import logger from '../utils/logger';
import { ProjectData } from '../services/PlatformDataService';
import { DataAnalyticsService, AnalyticsMetrics } from '../services/DataAnalyticsService';

/**
 * SafeReportGenerator - Abstract base class providing null safety for all report generators
 * 
 * SOLID Principles Applied:
 * - Single Responsibility: Handles data sanitization and safe PptxGenJS operations
 * - Open/Closed: Open for extension (inheritance), closed for modification
 * - Liskov Substitution: All derived generators can be used interchangeably
 * - Interface Segregation: Focused interface for report generation
 * - Dependency Inversion: Depends on ProjectData abstraction
 */
export abstract class SafeReportGenerator {
  protected analytics: AnalyticsMetrics;

  constructor() {
    logger.info(`${this.constructor.name} initialized with null safety framework`);
  }

  // =====================================================================
  // DATA SANITIZATION METHODS - Single source of truth for all generators
  // =====================================================================

  /**
   * Enhanced project data sanitization with deep null safety
   * Prevents all PptxGenJS crashes by ensuring valid data structures
   */
  protected sanitizeProjectData(projectData: ProjectData): ProjectData {
    try {
      if (!projectData || typeof projectData !== 'object') {
        logger.error('❌ Invalid project data received, creating default project');
        return this.createDefaultProject();
      }

      const sanitized = {
        ...projectData,
        
        // 🔧 CRITICAL: Ensure all arrays are initialized and valid
        tasks: this.sanitizeTasks(projectData.tasks),
        team: this.sanitizeTeam(projectData.team),
        metrics: this.sanitizeMetrics(projectData.metrics),
        sprints: this.sanitizeSprints(projectData.sprints),
        
        // 🔧 CRITICAL: Ensure platform-specific data exists
        platformSpecific: projectData.platformSpecific || {},
        
        // 🔧 CRITICAL: Ensure basic fields exist
        id: projectData.id || 'unknown-project',
        name: projectData.name || 'Unnamed Project',
        platform: projectData.platform || 'unknown',
        description: projectData.description || 'No description available',
        status: projectData.status || 'unknown'
      };

      logger.info('🔧 FIXED: Enhanced project data sanitization', {
        generator: this.constructor.name,
        originalTaskCount: Array.isArray(projectData.tasks) ? projectData.tasks.length : 'invalid',
        sanitizedTaskCount: sanitized.tasks.length,
        originalTeamCount: Array.isArray(projectData.team) ? projectData.team.length : 'invalid',
        sanitizedTeamCount: sanitized.team.length,
        hasMetrics: sanitized.metrics.length > 0,
        hasSprints: sanitized.sprints.length > 0
      });

      return sanitized;
    } catch (error) {
      logger.error('❌ Critical error in sanitizeProjectData:', error);
      return this.createDefaultProject();
    }
  }

  /**
   * Sanitize tasks array to prevent table/chart creation crashes
   */
  protected sanitizeTasks(tasks: any): any[] {
    if (!Array.isArray(tasks)) {
      logger.warn(`⚠️ Tasks data is not an array (${typeof tasks}), creating empty array`);
      return [];
    }

    const sanitized = tasks
      .filter((task, index) => {
        if (!task || typeof task !== 'object') {
          logger.debug(`Filtering out invalid task at index ${index}: ${typeof task}`);
          return false;
        }
        return true;
      })
      .map((task, index) => ({
        id: task.id || `task-${index}`,
        title: task.title || task.name || `Task ${index + 1}`,
        description: task.description || '',
        status: task.status || 'Unknown',
        assignee: task.assignee || 'Unassigned',
        priority: task.priority || 'Medium',
        type: task.type || 'Task',
        created: task.created || new Date().toISOString(),
        updated: task.updated || new Date().toISOString(),
        storyPoints: Number(task.storyPoints) || 0,
        sprintId: task.sprintId || null,
        labels: Array.isArray(task.labels) ? task.labels : [],
        timeEstimate: task.timeEstimate || null
      }));

    logger.debug(`📋 Sanitized ${sanitized.length} tasks from ${tasks.length} raw items`);
    return sanitized;
  }

  /**
   * Sanitize team array to prevent team performance slides from crashing
   */
  protected sanitizeTeam(team: any): any[] {
    if (!Array.isArray(team)) {
      logger.warn(`⚠️ Team data is not an array (${typeof team}), creating empty array`);
      return [];
    }

    const sanitized = team
      .filter((member, index) => {
        if (!member || typeof member !== 'object') {
          logger.debug(`Filtering out invalid team member at index ${index}: ${typeof member}`);
          return false;
        }
        return true;
      })
      .map((member, index) => ({
        id: member.id || `member-${index}`,
        name: member.name || `Team Member ${index + 1}`,
        role: member.role || 'Team Member',
        email: member.email || null,
        isActive: member.isActive !== false, // Default to true unless explicitly false
        skills: Array.isArray(member.skills) ? member.skills : [],
        department: member.department || null
      }));

    logger.debug(`👥 Sanitized ${sanitized.length} team members from ${team.length} raw items`);
    return sanitized;
  }

  /**
   * Sanitize metrics array to prevent dashboard crashes
   */
  protected sanitizeMetrics(metrics: any): any[] {
    if (!Array.isArray(metrics)) {
      logger.warn(`⚠️ Metrics data is not an array (${typeof metrics}), creating empty array`);
      return [];
    }

    const sanitized = metrics
      .filter((metric, index) => {
        if (!metric || typeof metric !== 'object') {
          logger.debug(`Filtering out invalid metric at index ${index}: ${typeof metric}`);
          return false;
        }
        return true;
      })
      .map((metric, index) => ({
        name: metric.name || `Metric ${index + 1}`,
        value: metric.value !== undefined ? metric.value : 0,
        type: metric.type || 'number',
        description: metric.description || '',
        category: metric.category || 'general'
      }));

    logger.debug(`📊 Sanitized ${sanitized.length} metrics from ${metrics.length} raw items`);
    return sanitized;
  }

  /**
   * Sanitize sprints array to prevent timeline crashes
   */
  protected sanitizeSprints(sprints: any): any[] {
    if (!Array.isArray(sprints)) {
      logger.warn(`⚠️ Sprints data is not an array (${typeof sprints}), creating empty array`);
      return [];
    }

    const sanitized = sprints
      .filter((sprint, index) => {
        if (!sprint || typeof sprint !== 'object') {
          logger.debug(`Filtering out invalid sprint at index ${index}: ${typeof sprint}`);
          return false;
        }
        return true;
      })
      .map((sprint, index) => ({
        name: sprint.name || `Sprint ${index + 1}`,
        startDate: sprint.startDate || '',
        endDate: sprint.endDate || '',
        completed: sprint.completed || 'false',
        velocity: Number(sprint.velocity) || 0,
        plannedPoints: Number(sprint.plannedPoints) || 0,
        completedPoints: Number(sprint.completedPoints) || 0,
        status: sprint.status || 'unknown'
      }));

    logger.debug(`🏃 Sanitized ${sanitized.length} sprints from ${sprints.length} raw items`);
    return sanitized;
  }

  /**
   * Create default project for emergency fallback scenarios
   */
  protected createDefaultProject(): ProjectData {
    logger.warn('⚠️ Creating default project due to invalid data');
    return {
      id: 'default-project',
      name: 'Default Project',
      platform: 'unknown',
      description: 'Default project created due to invalid input data',
      status: 'unknown',
      tasks: [],
      team: [],
      metrics: [],
      sprints: [],
      platformSpecific: {},
      fallbackData: true
    } as ProjectData;
  }

  // =====================================================================
  // SAFE PPTXGENJS OPERATIONS - Prevents all table/chart crashes
  // =====================================================================

  /**
   * Safe table creation that prevents PptxGenJS crashes
   * Replaces all slide.addTable() calls
   */
  protected safeAddTable(slide: any, tableData: any[][], options: any = {}): void {
    try {
      // 🔧 CRITICAL: Validate table data structure
      if (!Array.isArray(tableData)) {
        logger.error(`❌ Table data is not an array in ${this.constructor.name}, skipping table creation`);
        this.addErrorMessage(slide, 'Table data unavailable');
        return;
      }

      if (tableData.length === 0) {
        logger.warn(`⚠️ Table data is empty in ${this.constructor.name}, adding placeholder message`);
        this.addErrorMessage(slide, 'No data available for table');
        return;
      }

      // Sanitize table data to prevent crashes
      const sanitizedTableData = tableData.map((row, rowIndex) => {
        if (!Array.isArray(row)) {
          logger.warn(`⚠️ Table row ${rowIndex} is not an array, converting: ${typeof row}`);
          return [{ text: String(row) || 'N/A', options: { fontSize: 12, color: '6B7280' } }];
        }
        
        return row.map((cell) => {
          if (cell === null || cell === undefined) {
            return { text: 'N/A', options: { fontSize: 12, color: '6B7280' } };
          }
          
          if (typeof cell === 'object' && cell.text !== undefined) {
            return {
              text: String(cell.text) || 'N/A',
              options: cell.options || { fontSize: 12 }
            };
          }
          
          return {
            text: String(cell) || 'N/A',
            options: { fontSize: 12 }
          };
        });
      });

      // 🔧 CRITICAL: Ensure minimum table structure for PptxGenJS
      if (sanitizedTableData.length === 0) {
        sanitizedTableData.push([
          { text: 'No Data Available', options: { fontSize: 12, color: '6B7280', align: 'center' } }
        ]);
      }

      // Safe table creation with error boundary
      slide.addTable(sanitizedTableData, {
        x: options.x || 0.5,
        y: options.y || 1.5,
        w: options.w || '90%',
        h: options.h || 4,
        fontSize: options.fontSize || 12,
        border: options.border || { pt: 1, color: 'CCCCCC' },
        fill: options.fill || { color: 'F9FAFB' },
        ...options
      });

      logger.debug('✅ Table created successfully', {
        generator: this.constructor.name,
        rows: sanitizedTableData.length,
        columns: sanitizedTableData[0]?.length || 0
      });

    } catch (error) {
      logger.error(`❌ Failed to create table in ${this.constructor.name}:`, error);
      this.addErrorMessage(slide, 'Error creating data table');
    }
  }

  /**
   * Safe chart creation that prevents PptxGenJS crashes
   * Replaces all slide.addChart() calls
   */
  protected safeAddChart(slide: any, chartType: string, chartData: any[], options: any = {}): void {
    try {
      // 🔧 CRITICAL: Validate chart data structure
      if (!Array.isArray(chartData)) {
        logger.error(`❌ Chart data is not an array in ${this.constructor.name}, skipping chart creation`);
        this.addErrorMessage(slide, 'Chart data unavailable');
        return;
      }

      if (chartData.length === 0) {
        logger.warn(`⚠️ Chart data is empty in ${this.constructor.name}, adding placeholder message`);
        this.addErrorMessage(slide, 'No data available for chart');
        return;
      }

      // Sanitize chart data for PptxGenJS
      const sanitizedChartData = chartData.map((dataPoint, index) => {
        if (!dataPoint || typeof dataPoint !== 'object') {
          return { name: `Item ${index + 1}`, value: 0 };
        }

        return {
          name: String(dataPoint.name || dataPoint.label || `Item ${index + 1}`),
          value: Number(dataPoint.value || dataPoint.count || 0) || 0
        };
      });

      // Ensure we have meaningful data
      const totalValue = sanitizedChartData.reduce((sum, item) => sum + item.value, 0);
      if (totalValue === 0) {
        this.addErrorMessage(slide, 'No meaningful data for chart visualization');
        return;
      }

      // Safe chart creation
      slide.addChart(chartType, sanitizedChartData, {
        x: options.x || 0.5,
        y: options.y || 1.5,
        w: options.w || 6,
        h: options.h || 4,
        showTitle: options.showTitle !== false,
        title: options.title || 'Data Visualization',
        showLegend: options.showLegend !== false,
        ...options
      });

      logger.debug('✅ Chart created successfully', {
        generator: this.constructor.name,
        type: chartType,
        dataPoints: sanitizedChartData.length,
        totalValue
      });

    } catch (error) {
      logger.error(`❌ Failed to create chart in ${this.constructor.name}:`, error);
      this.addErrorMessage(slide, 'Error creating data visualization');
    }
  }

  /**
   * Add error message to slide when data operations fail
   */
  protected addErrorMessage(slide: any, message: string): void {
    try {
      slide.addText(message, {
        x: '10%',
        y: '45%',
        w: '80%',
        h: '10%',
        fontSize: 16,
        color: '6B7280',
        align: 'center',
        italic: true
      });
    } catch (error) {
      logger.error(`❌ Failed to add error message to slide in ${this.constructor.name}:`, error);
    }
  }

  // =====================================================================
  // ENHANCED HELPER METHODS - Commonly used across all generators
  // =====================================================================

  /**
   * Extract real team members with safe fallback
   * Replaces direct team array access
   */
  protected extractRealTeamMembers(projectData: ProjectData): any[] {
    try {
      const sanitizedTeam = this.sanitizeTeam(projectData.team);
      
      if (sanitizedTeam.length === 0) {
        logger.warn(`⚠️ No team members found in ${this.constructor.name}, creating placeholder team`);
        return [{
          id: 'placeholder-member',
          name: 'Team Member',
          role: 'Project Contributor',
          email: null,
          isActive: true,
          skills: [],
          department: null
        }];
      }

      return sanitizedTeam;
    } catch (error) {
      logger.error(`❌ Failed to extract team members in ${this.constructor.name}:`, error);
      return [{
        id: 'error-member',
        name: 'Unknown Team Member',
        role: 'Team Contributor',
        email: null,
        isActive: true,
        skills: [],
        department: null
      }];
    }
  }

  /**
   * Calculate status distribution with safe fallback
   * Used for creating status charts and tables
   */
  protected calculateStatusDistribution(projectData: ProjectData): any[] {
    try {
      const sanitizedTasks = this.sanitizeTasks(projectData.tasks);
      
      if (sanitizedTasks.length === 0) {
        logger.warn(`⚠️ No tasks found for status distribution in ${this.constructor.name}`);
        return [{
          status: 'No Data',
          count: 0,
          percentage: 0,
          color: '6B7280'
        }];
      }

      const statusCounts: { [key: string]: number } = {};
      sanitizedTasks.forEach(task => {
        const status = task.status || 'Unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const totalTasks = sanitizedTasks.length;
      return Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: Math.round((count / totalTasks) * 100),
        color: this.getStatusColor(status)
      }));

    } catch (error) {
      logger.error(`❌ Failed to calculate status distribution in ${this.constructor.name}:`, error);
      return [{
        status: 'Error',
        count: 0,
        percentage: 0,
        color: 'EF4444'
      }];
    }
  }

  /**
   * Get consistent status colors across all generators
   */
  protected getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'done': '10B981',
      'completed': '10B981',
      'finished': '10B981',
      'closed': '10B981',
      'resolved': '10B981',
      
      'in progress': '3B82F6',
      'in_progress': '3B82F6',
      'active': '3B82F6',
      'working': '3B82F6',
      'development': '3B82F6',
      
      'todo': '6B7280',
      'to do': '6B7280',
      'pending': '6B7280',
      'new': '6B7280',
      'backlog': '6B7280',
      
      'blocked': 'EF4444',
      'error': 'EF4444',
      'cancelled': 'EF4444',
      'rejected': 'EF4444',
      
      'review': 'F59E0B',
      'in review': 'F59E0B',
      'testing': 'F59E0B'
    };

    return colorMap[status.toLowerCase()] || '6B7280';
  }

  /**
   * Get consistent platform themes across all generators
   */
  protected getPlatformTheme(platform: string): { primary: string; secondary: string; accent: string } {
    const themes = {
      jira: { primary: '0052CC', secondary: '4C9AFF', accent: 'F4F5F7' },
      monday: { primary: 'FF3D71', secondary: 'FFADAD', accent: 'F8F9FA' },
      trofos: { primary: '6366F1', secondary: '818CF8', accent: 'F8FAFC' }
    };

    return themes[platform.toLowerCase()] || themes.trofos;
  }

  // =====================================================================
  // ABSTRACT METHOD - Each generator must implement this
  // =====================================================================

  /**
   * Template Method Pattern: Each generator implements its specific generation logic
   * Base class provides all the safe infrastructure methods
   */
  abstract generate(
    projectData: ProjectData, 
    config: any, 
    progressCallback?: (progress: number) => Promise<void>
  ): Promise<string>;
}