// backend/services/platform-integrations-service/src/strategies/trofos/TrofosConnectionManager.ts
// TROFOS CONNECTION MANAGER - SOLID Implementation
// Handles TROFOS server connection, authentication, and validation

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import logger from '../../utils/logger';
import {
  ITrofosConnectionManager,
  TrofosConnectionConfig,
  TrofosConnectionTestResult
} from '../../interfaces/ITrofosStrategy';

/**
 * SOLID PRINCIPLE: Single Responsibility Principle (SRP)
 * This class has ONE responsibility: managing connections to TROFOS servers
 */
export class TrofosConnectionManager implements ITrofosConnectionManager {
  private static readonly DEFAULT_TIMEOUT = 10000;
  private static readonly DEFAULT_RETRY_ATTEMPTS = 3;
  private static readonly TROFOS_API_VERSION = 'v1';

  constructor() {
    logger.info('TrofosConnectionManager initialized');
  }

  /**
   * Test connection to TROFOS server
   * SOLID PRINCIPLE: Open/Closed Principle (OCP) - This method is open for extension but closed for modification
   */
  async testConnection(config: TrofosConnectionConfig): Promise<TrofosConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Testing TROFOS connection', {
        serverUrl: config.serverUrl,
        hasApiKey: !!config.apiKey,
        projectId: config.projectId
      });

      // Validate configuration first
      const configValid = await this.validateConfig(config);
      if (!configValid) {
        return {
          success: false,
          message: 'Invalid TROFOS configuration provided',
          responseTime: Date.now() - startTime
        };
      }

      // Create HTTP client with TROFOS-specific configuration
      const client = this.createHttpClient(config);

      // Test basic connectivity and authentication
      const authResult = await this.testAuthentication(client, config);
      if (!authResult.success) {
        return {
          success: false,
          message: authResult.message,
          responseTime: Date.now() - startTime
        };
      }

      // Get server information
      const serverInfo = await this.getServerInfo(config);

      // Test project access if projectId provided
      let availableProjects: Array<{ id: string; name: string }> = [];
      if (config.projectId) {
        const projectTestResult = await this.testProjectAccess(client, config);
        if (projectTestResult.success && projectTestResult.projects) {
          availableProjects = projectTestResult.projects;
        }
      } else {
        // Get list of available projects
        const projectsResult = await this.getAvailableProjects(client, config);
        if (projectsResult.success && projectsResult.projects) {
          availableProjects = projectsResult.projects;
        }
      }

      const responseTime = Date.now() - startTime;

      logger.info('TROFOS connection test successful', {
        serverUrl: config.serverUrl,
        responseTime,
        projectsFound: availableProjects.length,
        serverVersion: serverInfo?.version
      });

      return {
        success: true,
        message: `Successfully connected to TROFOS server. Found ${availableProjects.length} accessible project(s).`,
        serverVersion: serverInfo?.version,
        availableProjects,
        responseTime,
        details: {
          serverInfo,
          apiVersion: TrofosConnectionManager.TROFOS_API_VERSION,
          connectionTime: responseTime
        }
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      logger.error('TROFOS connection test failed', {
        serverUrl: config.serverUrl,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      });

      return {
        success: false,
        message: this.getErrorMessage(error),
        responseTime
      };
    }
  }

  /**
   * Validate API configuration
   * SOLID PRINCIPLE: Single Responsibility - Only validates configuration
   */
  async validateConfig(config: TrofosConnectionConfig): Promise<boolean> {
    try {
      // Required fields validation
      if (!config.serverUrl || typeof config.serverUrl !== 'string') {
        logger.warn('TROFOS config validation failed: missing or invalid serverUrl');
        return false;
      }

      if (!config.apiKey || typeof config.apiKey !== 'string') {
        logger.warn('TROFOS config validation failed: missing or invalid apiKey');
        return false;
      }

      // URL format validation
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(config.serverUrl)) {
        logger.warn('TROFOS config validation failed: invalid URL format', {
          serverUrl: config.serverUrl
        });
        return false;
      }

      // API key format validation (basic check)
      if (config.apiKey.length < 10) {
        logger.warn('TROFOS config validation failed: API key too short');
        return false;
      }

      // Optional fields validation
      if (config.timeout && (typeof config.timeout !== 'number' || config.timeout < 1000)) {
        logger.warn('TROFOS config validation failed: invalid timeout value');
        return false;
      }

      if (config.retryAttempts && (typeof config.retryAttempts !== 'number' || config.retryAttempts < 0)) {
        logger.warn('TROFOS config validation failed: invalid retryAttempts value');
        return false;
      }

      logger.info('TROFOS configuration validated successfully');
      return true;

    } catch (error) {
      logger.error('TROFOS config validation error', error);
      return false;
    }
  }

  /**
   * Get server information
   * SOLID PRINCIPLE: Single Responsibility - Only retrieves server info
   */
  async getServerInfo(config: TrofosConnectionConfig): Promise<any> {
    try {
      const client = this.createHttpClient(config);
      
      // Try to get server info from common endpoints
      const possibleEndpoints = [
        '/api/info',
        '/api/version',
        '/api/external/info',
        '/api/external/version'
      ];

      for (const endpoint of possibleEndpoints) {
        try {
          const response = await client.get(endpoint);
          if (response.status === 200 && response.data) {
            logger.info('TROFOS server info retrieved', {
              endpoint,
              version: response.data.version,
              name: response.data.name
            });
            return response.data;
          }
        } catch (endpointError) {
          // Continue to next endpoint
          logger.debug(`TROFOS endpoint ${endpoint} not available`);
        }
      }

      // Fallback: return basic info
      return {
        name: 'TROFOS Server',
        version: 'Unknown',
        apiVersion: TrofosConnectionManager.TROFOS_API_VERSION
      };

    } catch (error) {
      logger.warn('Could not retrieve TROFOS server info', error);
      return null;
    }
  }

  /**
   * Create HTTP client configured for TROFOS
   * SOLID PRINCIPLE: Single Responsibility - Only creates HTTP client
   */
  private createHttpClient(config: TrofosConnectionConfig): AxiosInstance {
    const timeout = config.timeout || TrofosConnectionManager.DEFAULT_TIMEOUT;
    
    return axios.create({
      baseURL: config.serverUrl.replace(/\/$/, ''), // Remove trailing slash
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': config.apiKey, // TROFOS uses x-api-key header
        'User-Agent': 'PRISM-TROFOS-Integration/1.0'
      },
      validateStatus: (status) => status < 500 // Don't throw on 4xx errors
    });
  }

  /**
   * Test authentication with TROFOS server
   */
  private async testAuthentication(
    client: AxiosInstance, 
    config: TrofosConnectionConfig
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Try the working POST endpoint for project list as auth test
      const response = await client.post('/api/external/v1/project/list', {
        option: 'all',
        pageIndex: 0,
        pageSize: 1 // Just test with minimal data
      });
      
      if (response.status === 200) {
        logger.info('TROFOS authentication successful via project list');
        return {
          success: true,
          message: 'Authentication successful'
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: 'Authentication failed: Invalid API key'
        };
      } else if (response.status === 403) {
        return {
          success: false,
          message: 'Authentication failed: Access forbidden'
        };
      } else {
        return {
          success: false,
          message: `Authentication test failed: HTTP ${response.status}`
        };
      }

    } catch (error) {
      logger.error('TROFOS authentication test error', error);
      
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          return {
            success: false,
            message: 'Authentication failed: Invalid API key'
          };
        } else if (error.response?.status === 403) {
          return {
            success: false,
            message: 'Authentication failed: Access forbidden'
          };
        } else if (error.code === 'ECONNREFUSED') {
          return {
            success: false,
            message: 'Connection refused: Unable to reach TROFOS server'
          };
        } else if (error.code === 'ETIMEDOUT') {
          return {
            success: false,
            message: 'Connection timeout: TROFOS server did not respond'
          };
        }
      }

      return {
        success: false,
        message: 'Authentication test failed: Network error'
      };
    }
  }

  /**
   * Test access to specific project
   */
  private async testProjectAccess(
    client: AxiosInstance,
    config: TrofosConnectionConfig
  ): Promise<{ success: boolean; projects?: Array<{ id: string; name: string }> }> {
    try {
      if (!config.projectId) {
        return { success: false };
      }

      const response = await client.get(`/api/external/v1/project/${config.projectId}`);
      
      if (response.status === 200 && response.data) {
        const project = response.data;
        return {
          success: true,
          projects: [{
            id: String(project.id || config.projectId),
            name: project.pname || project.name || `Project ${config.projectId}`
          }]
        };
      }

      return { success: false };

    } catch (error) {
      logger.warn('TROFOS project access test failed', {
        projectId: config.projectId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { success: false };
    }
  }

  /**
   * Get list of available projects
   */
  private async getAvailableProjects(
    client: AxiosInstance,
    config: TrofosConnectionConfig
  ): Promise<{ success: boolean; projects?: Array<{ id: string; name: string }> }> {
    try {
      // Use the working POST endpoint for project list
      const response = await client.post('/api/external/v1/project/list', {
        option: 'all',
        pageIndex: 0,
        pageSize: 20
      });
      
      if (response.status === 200 && response.data && Array.isArray(response.data.data)) {
        const projects = response.data.data.map((project: any) => ({
          id: String(project.id || project.projectId || `project-${Math.random()}`),
          name: project.pname || project.name || project.title || `Unnamed Project`
        }));

        logger.info('TROFOS available projects retrieved via POST', {
          count: projects.length,
          totalCount: response.data.totalCount
        });

        return {
          success: true,
          projects
        };
      }

      return { success: false };

    } catch (error) {
      logger.warn('TROFOS available projects retrieval failed', error);
      return { success: false };
    }
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNREFUSED') {
        return 'Unable to connect to TROFOS server. Please check the server URL and ensure the server is running.';
      } else if (error.code === 'ETIMEDOUT') {
        return 'Connection timeout. The TROFOS server did not respond within the expected time.';
      } else if (error.code === 'ENOTFOUND') {
        return 'Server not found. Please check the TROFOS server URL.';
      } else if (error.response?.status === 401) {
        return 'Authentication failed. Please check your API key.';
      } else if (error.response?.status === 403) {
        return 'Access forbidden. Your API key may not have sufficient permissions.';
      } else if (error.response?.status === 404) {
        return 'TROFOS API endpoint not found. Please verify the server URL and API version.';
      } else if (error.response?.status >= 500) {
        return 'TROFOS server error. Please try again later or contact your administrator.';
      }
    }

    return error instanceof Error ? error.message : 'Unknown connection error occurred.';
  }
}