// backend/services/platform-integrations-service/src/strategies/trofos/TrofosStrategy.ts
// MAIN TROFOS STRATEGY - Orchestrates all TROFOS operations

import logger from '../../utils/logger';
import {
  ITrofosStrategy,
  ITrofosConnectionManager,
  ITrofosDataFetcher,
  ITrofosDataTransformer,
  TrofosConnectionConfig,
  TrofosConnectionTestResult,
  TrofosDataFetchResult
} from '../../interfaces/ITrofosStrategy';
import { TrofosConnectionManager } from './TrofosConnectionManager';
import { TrofosDataFetcher } from './TrofosDataFetcher';
import { TrofosDataTransformer } from './TrofosDataTransformer';

export class TrofosStrategy implements ITrofosStrategy {
  public readonly connectionManager: ITrofosConnectionManager;
  public readonly dataFetcher: ITrofosDataFetcher;
  public readonly dataTransformer: ITrofosDataTransformer;

  private static readonly STRATEGY_VERSION = '1.0.0';

  constructor() {
    this.connectionManager = new TrofosConnectionManager();
    this.dataFetcher = new TrofosDataFetcher();
    this.dataTransformer = new TrofosDataTransformer();

    logger.info('TrofosStrategy initialized', {
      version: TrofosStrategy.STRATEGY_VERSION,
      components: ['ConnectionManager', 'DataFetcher', 'DataTransformer']
    });
  }

  async testConnection(config: TrofosConnectionConfig): Promise<TrofosConnectionTestResult> {
    try {
      logger.info('Testing TROFOS connection via strategy', {
        serverUrl: config.serverUrl,
        hasApiKey: !!config.apiKey,
        projectId: config.projectId
      });

      const result = await this.connectionManager.testConnection(config);

      logger.info('TROFOS connection test completed', {
        success: result.success,
        responseTime: result.responseTime,
        projectsFound: result.availableProjects?.length || 0
      });

      return result;

    } catch (error) {
      logger.error('TROFOS connection test failed in strategy', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        responseTime: 0
      };
    }
  }

  async getProjectData(config: TrofosConnectionConfig, projectId?: string): Promise<TrofosDataFetchResult> {
    const startTime = Date.now();

    try {
      logger.info('Fetching TROFOS project data via strategy', {
        serverUrl: config.serverUrl,
        projectId: projectId || config.projectId || 'all',
        hasApiKey: !!config.apiKey
      });

      // Step 1: Validate configuration
      const configValid = await this.connectionManager.validateConfig(config);
      if (!configValid) {
        return {
          success: false,
          error: 'Invalid TROFOS configuration',
          fetchTime: Date.now() - startTime
        };
      }

      // Step 2: Fetch projects
      let projects;
      if (projectId || config.projectId) {
        const targetProjectId = projectId || config.projectId!;
        const project = await this.dataFetcher.fetchProject(config, targetProjectId);
        projects = [project];
      } else {
        projects = await this.dataFetcher.fetchProjects(config);
      }

      if (projects.length === 0) {
        return {
          success: false,
          error: 'No TROFOS projects found or accessible',
          fetchTime: Date.now() - startTime
        };
      }

      // Step 3: Fetch additional data for each project
      const standardizedProjects = await Promise.all(
        projects.map(async (project) => {
          logger.debug('Processing TROFOS project data', {
            projectId: project.id,
            projectName: project.name
          });

          // Fetch related data in parallel
          const [backlogItems, sprints, resources] = await Promise.all([
            this.dataFetcher.fetchBacklogItems(config, project.id).catch(error => {
              logger.warn('Failed to fetch TROFOS backlog items', {
                projectId: project.id,
                error: error.message
              });
              return [];
            }),
            this.dataFetcher.fetchSprints(config, project.id).catch(error => {
              logger.warn('Failed to fetch TROFOS sprints', {
                projectId: project.id,
                error: error.message
              });
              return [];
            }),
            this.dataFetcher.fetchTeamResources(config, project.id).catch(error => {
              logger.warn('Failed to fetch TROFOS team resources', {
                projectId: project.id,
                error: error.message
              });
              return [];
            })
          ]);

          // Step 4: Transform to standardized format
          return this.dataTransformer.transformProject(project, backlogItems, sprints, resources);
        })
      );

      const fetchTime = Date.now() - startTime;

      logger.info('TROFOS project data fetched successfully', {
        projectsProcessed: standardizedProjects.length,
        totalTasks: standardizedProjects.reduce((sum, p) => sum + p.tasks.length, 0),
        totalTeamMembers: standardizedProjects.reduce((sum, p) => sum + p.team.length, 0),
        fetchTime
      });

      return {
        success: true,
        data: standardizedProjects,
        cached: false,
        fetchTime
      };

    } catch (error) {
      const fetchTime = Date.now() - startTime;
      
      logger.error('Failed to fetch TROFOS project data', {
        error: error instanceof Error ? error.message : 'Unknown error',
        fetchTime
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch project data',
        fetchTime
      };
    }
  }

  getPlatform(): 'trofos' {
    return 'trofos';
  }

  getVersion(): string {
    return TrofosStrategy.STRATEGY_VERSION;
  }

  /**
   * Validate that TROFOS configuration is complete
   */
  validateConfiguration(config: TrofosConnectionConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.serverUrl) {
      errors.push('Server URL is required');
    } else if (!config.serverUrl.startsWith('http')) {
      errors.push('Server URL must start with http:// or https://');
    }

    if (!config.apiKey) {
      errors.push('API key is required');
    } else if (config.apiKey.length < 10) {
      errors.push('API key appears to be too short');
    }

    if (config.timeout && config.timeout < 1000) {
      errors.push('Timeout must be at least 1000ms');
    }

    if (config.retryAttempts && (config.retryAttempts < 0 || config.retryAttempts > 10)) {
      errors.push('Retry attempts must be between 0 and 10');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get supported TROFOS operations
   */
  getSupportedOperations(): string[] {
    return [
      'testConnection',
      'fetchProjects',
      'fetchProject',
      'fetchBacklogItems',
      'fetchSprints',
      'fetchTeamResources',
      'transformData'
    ];
  }

  /**
   * Get TROFOS API information
   */
  getApiInfo(): { version: string; baseUrl: string; authMethod: string } {
    return {
      version: 'v1',
      baseUrl: '/api/external',
      authMethod: 'x-api-key header'
    };
  }

  /**
   * Health check for TROFOS strategy components
   */
  async healthCheck(config: TrofosConnectionConfig): Promise<{
    healthy: boolean;
    components: Record<string, boolean>;
    message: string;
  }> {
    const componentHealth = {
      connectionManager: false,
      dataFetcher: false,
      dataTransformer: false,
      apiConnection: false
    };

    try {
      // Test connection manager
      try {
        componentHealth.connectionManager = await this.connectionManager.validateConfig(config);
      } catch (error) {
        logger.debug('Connection manager health check failed', error);
      }

      // Test data fetcher (if config is valid)
      if (componentHealth.connectionManager) {
        try {
          await this.dataFetcher.fetchProjects(config);
          componentHealth.dataFetcher = true;
        } catch (error) {
          logger.debug('Data fetcher health check failed', error);
        }
      }

      // Test data transformer
      try {
        // Create minimal test data
        const testProject = {
          id: 'test',
          name: 'Test Project',
          description: '',
          status: 'active',
          backlog_count: 0,
          sprint_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        this.dataTransformer.transformProject(testProject, [], [], []);
        componentHealth.dataTransformer = true;
      } catch (error) {
        logger.debug('Data transformer health check failed', error);
      }

      // Test API connection
      if (componentHealth.connectionManager) {
        try {
          const testResult = await this.connectionManager.testConnection(config);
          componentHealth.apiConnection = testResult.success;
        } catch (error) {
          logger.debug('API connection health check failed', error);
        }
      }

      const healthyComponents = Object.values(componentHealth).filter(Boolean).length;
      const totalComponents = Object.keys(componentHealth).length;
      const healthy = healthyComponents === totalComponents;

      return {
        healthy,
        components: componentHealth,
        message: healthy 
          ? 'All TROFOS strategy components are healthy'
          : `${healthyComponents}/${totalComponents} components are healthy`
      };

    } catch (error) {
      return {
        healthy: false,
        components: componentHealth,
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}