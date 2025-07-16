// backend/services/platform-integrations-service/src/handlers/TrofosConnectionHandler.ts
// TROFOS CONNECTION HANDLER - Integrates TROFOS strategy with existing system

import logger from '../utils/logger';
import { IConnection } from '../models/Connection';
import { ProjectData } from '../services/ConnectionService';
import { TrofosStrategy } from '../strategies/trofos/TrofosStrategy';
import {
  ITrofosStrategy,
  TrofosConnectionConfig,
  StandardizedTrofosProject
} from '../interfaces/ITrofosStrategy';

export interface TrofosConnectionHandlerResult {
  success: boolean;
  data?: ProjectData[];
  error?: string;
  metadata?: {
    fetchTime: number;
    projectsCount: number;
    dataSource: 'TROFOS_API';
  };
}

export interface TrofosTestResult {
  success: boolean;
  message: string;
  details?: any;
  availableProjects?: Array<{ id: string; name: string }>;
}

export class TrofosConnectionHandler {
  private readonly trofosStrategy: ITrofosStrategy;

  constructor() {
    this.trofosStrategy = new TrofosStrategy();
    logger.info('TrofosConnectionHandler initialized with SOLID architecture');
  }

  async testConnection(connection: IConnection): Promise<TrofosTestResult> {
    try {
      logger.info('Testing TROFOS connection via handler', {
        connectionId: connection.id,
        connectionName: connection.name
      });

      const config = this.extractTrofosConfig(connection);
      const result = await this.trofosStrategy.testConnection(config);

      return {
        success: result.success,
        message: result.message,
        details: {
          serverVersion: result.serverVersion,
          responseTime: result.responseTime,
          strategy: this.trofosStrategy.getPlatform(),
          version: this.trofosStrategy.getVersion()
        },
        availableProjects: result.availableProjects
      };

    } catch (error) {
      logger.error('TROFOS connection test failed in handler', {
        connectionId: connection.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  async getProjectData(
    connection: IConnection,
    projectId?: string
  ): Promise<TrofosConnectionHandlerResult> {
    const startTime = Date.now();

    try {
      logger.info('Fetching TROFOS project data via handler', {
        connectionId: connection.id,
        connectionName: connection.name,
        requestedProjectId: projectId
      });

      const config = this.extractTrofosConfig(connection);
      const result = await this.trofosStrategy.getProjectData(config, projectId);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Failed to fetch TROFOS project data',
          metadata: {
            fetchTime: Date.now() - startTime,
            projectsCount: 0,
            dataSource: 'TROFOS_API'
          }
        };
      }

      const standardizedProjects = result.data || [];
      const convertedProjects = standardizedProjects.map(project =>
        this.convertToProjectData(project)
      );

      logger.info('TROFOS project data converted successfully', {
        connectionId: connection.id,
        projectsConverted: convertedProjects.length,
        totalTasks: convertedProjects.reduce((sum, p) => sum + p.tasks.length, 0),
        fetchTime: Date.now() - startTime
      });

      return {
        success: true,
        data: convertedProjects,
        metadata: {
          fetchTime: Date.now() - startTime,
          projectsCount: convertedProjects.length,
          dataSource: 'TROFOS_API'
        }
      };

    } catch (error) {
      logger.error('Failed to get TROFOS project data in handler', {
        connectionId: connection.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch project data',
        metadata: {
          fetchTime: Date.now() - startTime,
          projectsCount: 0,
          dataSource: 'TROFOS_API'
        }
      };
    }
  }

  async validateConfig(config: any): Promise<{ valid: boolean; message: string; details?: any }> {
    try {
      if (!config.serverUrl) {
        return {
          valid: false,
          message: 'TROFOS server URL is required'
        };
      }

      if (!config.apiKey) {
        return {
          valid: false,
          message: 'TROFOS API key is required'
        };
      }

      const trofosConfig: TrofosConnectionConfig = {
        serverUrl: config.serverUrl,
        apiKey: config.apiKey,
        projectId: config.projectId,
        timeout: config.timeout || 10000,
        retryAttempts: config.retryAttempts || 3
      };

      const validation = this.trofosStrategy.validateConfiguration(trofosConfig);

      return {
        valid: validation.valid,
        message: validation.valid ? 'TROFOS configuration is valid' : validation.errors.join('; '),
        details: validation.errors.length > 0 ? { errors: validation.errors } : undefined
      };

    } catch (error) {
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Configuration validation failed'
      };
    }
  }

  async healthCheck(connection: IConnection): Promise<{
    healthy: boolean;
    components: Record<string, boolean>;
    message: string;
  }> {
    try {
      const config = this.extractTrofosConfig(connection);
      return await this.trofosStrategy.healthCheck(config);
    } catch (error) {
      return {
        healthy: false,
        components: {},
        message: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  getSupportedOperations(): string[] {
    return this.trofosStrategy.getSupportedOperations();
  }

  getApiInfo(): { version: string; baseUrl: string; authMethod: string } {
    return this.trofosStrategy.getApiInfo();
  }

  private extractTrofosConfig(connection: IConnection): TrofosConnectionConfig {
    const config = connection.config || {};

    return {
      serverUrl: config.serverUrl || '',
      apiKey: config.apiKey || '',
      projectId: config.projectId,
      timeout: config.timeout || 10000,
      retryAttempts: config.retryAttempts || 3
    };
  }

  private convertToProjectData(trofosProject: StandardizedTrofosProject): ProjectData {
    return {
      id: trofosProject.id,
      name: trofosProject.name,
      platform: 'trofos',
      description: trofosProject.description || '',
      status: trofosProject.status,
      tasks: trofosProject.tasks.map(task => ({
        id: task.id,        
        title: task.title,
        status: task.status,
        assignee: task.assignee ? {
          id: `trofos-${task.assignee.replace(/\s+/g, '-')}`,
          name: task.assignee,
          role: 'Team Member',
        } : undefined,
        priority: task.priority,
        dueDate: task.updated ? new Date(task.updated) : undefined,
        tags: task.labels || []        
      })),
      team: trofosProject.team.map(member => ({
        id: member.id,
        name: member.name,
        role: member.role,
        email: member.email,
        taskCount: member.taskCount,
        department: this.mapRoleToDepartment(member.role)
      })),
      metrics: trofosProject.metrics.map(metric => ({
        name: metric.name,
        value: metric.value,
        type: metric.type,
        category: metric.category
      })),
      sprints: trofosProject.sprints?.map(sprint => ({
        name: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        completed: sprint.status === 'Completed' ? '100%' :
          sprint.status === 'Active' ? '50%' : '0%',
        velocity: sprint.velocity,
        plannedPoints: sprint.plannedPoints,
        completedPoints: sprint.completedPoints
      })),
      platformSpecific: {
        trofos: {
          projectKey: trofosProject.platformSpecific.trofos.projectId,  // ← Use projectKey                    
        }
      },
      lastUpdated: trofosProject.lastUpdated,
      dataQuality: trofosProject.dataQuality
    };
  }

  private mapRoleToDepartment(role: string): string {
    if (!role) return 'Development';

    const r = role.toLowerCase();
    if (r.includes('manager') || r.includes('lead')) return 'Management';
    if (r.includes('developer') || r.includes('engineer')) return 'Development';
    if (r.includes('designer')) return 'Design';
    if (r.includes('qa') || r.includes('test')) return 'Quality Assurance';
    if (r.includes('analyst')) return 'Analysis';
    if (r.includes('product')) return 'Product';

    return 'Development';
  }
}