// backend/services/platform-integrations-service/src/factories/PlatformConnectionFactory.ts
// PLATFORM CONNECTION FACTORY - Routes to appropriate handler based on platform

import logger from '../utils/logger';
import { IConnection } from '../models/Connection';
import { ProjectData, ConnectionService } from '../services/ConnectionService';
import { TrofosConnectionHandler } from '../handlers/TrofosConnectionHandler';

export interface PlatformConnectionResult {
  success: boolean;
  data?: ProjectData[];
  error?: string;
  handler: 'legacy' | 'trofos';
  metadata?: any;
}

export interface PlatformTestResult {
  success: boolean;
  message: string;
  handler: 'legacy' | 'trofos';
  details?: any;
}

export class PlatformConnectionFactory {
  private readonly connectionService: ConnectionService;
  private readonly trofosHandler: TrofosConnectionHandler;

  constructor() {
    this.connectionService = new ConnectionService();
    this.trofosHandler = new TrofosConnectionHandler();
    
    logger.info('PlatformConnectionFactory initialized', {
      supportedPlatforms: ['jira', 'monday', 'trofos'],
      handlers: {
        legacy: ['jira', 'monday'],
        trofos: ['trofos']
      }
    });
  }

  async getProjectData(
    userId: string,
    connectionId: string,
    projectId?: string
  ): Promise<PlatformConnectionResult> {
    try {
      logger.info('Platform factory routing project data request', {
        userId,
        connectionId,
        projectId
      });

      const connection = await this.connectionService.getConnection(userId, connectionId);
      if (!connection) {
        return {
          success: false,
          error: 'Connection not found',
          handler: 'legacy'
        };
      }

      if (connection.platform === 'trofos') {
        logger.info('Routing to TROFOS handler', { connectionId });
        return await this.handleTrofosRequest(connection, projectId);
      } else {
        logger.info('Routing to legacy handler', { 
          connectionId, 
          platform: connection.platform 
        });
        return await this.handleLegacyRequest(userId, connectionId, projectId);
      }

    } catch (error) {
      logger.error('Platform factory error', {
        userId,
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Platform routing failed',
        handler: 'legacy'
      };
    }
  }

  async testConnection(userId: string, connectionId: string): Promise<PlatformTestResult> {
    try {
      logger.info('Platform factory routing connection test', {
        userId,
        connectionId
      });

      const connection = await this.connectionService.getConnection(userId, connectionId);
      if (!connection) {
        return {
          success: false,
          message: 'Connection not found',
          handler: 'legacy'
        };
      }

      if (connection.platform === 'trofos') {
        logger.info('Testing TROFOS connection', { connectionId });
        const result = await this.trofosHandler.testConnection(connection);
        return {
          success: result.success,
          message: result.message,
          handler: 'trofos',
          details: result.details
        };
      } else {
        logger.info('Testing legacy connection', { 
          connectionId, 
          platform: connection.platform 
        });
        const result = await this.connectionService.testConnection(userId, connectionId);
        return {
          success: result.success,
          message: result.message,
          handler: 'legacy',
          details: result.details
        };
      }

    } catch (error) {
      logger.error('Platform factory test error', {
        userId,
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
        handler: 'legacy'
      };
    }
  }

  async validatePlatformConfig(platform: string, config: any): Promise<{
    valid: boolean;
    message: string;
    details?: any;
  }> {
    try {
      if (platform === 'trofos') {
        logger.info('Validating TROFOS configuration');
        return await this.trofosHandler.validateConfig(config);
      } else {
        logger.info('Validating legacy platform configuration', { platform });
        
        // Use existing ConnectionService validation logic
        // This is a simplified approach - in practice, you might want to extract
        // the validation logic from ConnectionService to a shared validator
        if (platform === 'jira') {
          if (!config.domain || !config.email || !config.apiToken) {
            return {
              valid: false,
              message: 'Missing required Jira fields: domain, email, apiToken'
            };
          }
        } else if (platform === 'monday') {
          if (!config.apiToken) {
            return {
              valid: false,
              message: 'Missing required Monday.com field: apiToken'
            };
          }
        }

        return {
          valid: true,
          message: `${platform} configuration is valid`
        };
      }

    } catch (error) {
      return {
        valid: false,
        message: error instanceof Error ? error.message : 'Configuration validation failed'
      };
    }
  }

  getSupportedPlatforms(): string[] {
    return ['jira', 'monday', 'trofos'];
  }

  getPlatformInfo(platform: string): {
    handler: 'legacy' | 'trofos';
    capabilities: string[];
    apiInfo?: any;
  } {
    if (platform === 'trofos') {
      return {
        handler: 'trofos',
        capabilities: this.trofosHandler.getSupportedOperations(),
        apiInfo: this.trofosHandler.getApiInfo()
      };
    } else {
      return {
        handler: 'legacy',
        capabilities: [
          'testConnection',
          'fetchProjects',
          'syncConnection',
          'validateConfig'
        ]
      };
    }
  }

  async healthCheck(userId: string, connectionId: string): Promise<{
    healthy: boolean;
    handler: 'legacy' | 'trofos';
    components?: Record<string, boolean>;
    message: string;
  }> {
    try {
      const connection = await this.connectionService.getConnection(userId, connectionId);
      if (!connection) {
        return {
          healthy: false,
          handler: 'legacy',
          message: 'Connection not found'
        };
      }

      if (connection.platform === 'trofos') {
        const result = await this.trofosHandler.healthCheck(connection);
        return {
          healthy: result.healthy,
          handler: 'trofos',
          components: result.components,
          message: result.message
        };
      } else {
        // For legacy platforms, do a simple connection test
        const testResult = await this.connectionService.testConnection(userId, connectionId);
        return {
          healthy: testResult.success,
          handler: 'legacy',
          message: testResult.success ? 'Legacy connection is healthy' : testResult.message
        };
      }

    } catch (error) {
      return {
        healthy: false,
        handler: 'legacy',
        message: error instanceof Error ? error.message : 'Health check failed'
      };
    }
  }

  private async handleTrofosRequest(
    connection: IConnection,
    projectId?: string
  ): Promise<PlatformConnectionResult> {
    try {
      const result = await this.trofosHandler.getProjectData(connection, projectId);
      
      return {
        success: result.success,
        data: result.data,
        error: result.error,
        handler: 'trofos',
        metadata: {
          ...result.metadata,
          architecture: 'SOLID',
          strategy: 'TrofosStrategy'
        }
      };

    } catch (error) {
      logger.error('TROFOS handler error', {
        connectionId: connection.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'TROFOS handler failed',
        handler: 'trofos'
      };
    }
  }

  private async handleLegacyRequest(
    userId: string,
    connectionId: string,
    projectId?: string
  ): Promise<PlatformConnectionResult> {
    try {
      const data = await this.connectionService.getProjectData(userId, connectionId, projectId);
      
      return {
        success: true,
        data: data,
        handler: 'legacy',
        metadata: {
          dataSource: 'ConnectionService',
          architecture: 'Legacy'
        }
      };

    } catch (error) {
      logger.error('Legacy handler error', {
        userId,
        connectionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Legacy handler failed',
        handler: 'legacy'
      };
    }
  }
}