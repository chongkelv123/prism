// backend/services/platform-integrations-service/src/services/ConnectionService.ts
// FIXED VERSION - Updated Monday.com validation to use "apiToken" instead of "apiKey"

import { Connection, IConnection } from '../models/Connection';
import logger from '../utils/logger';

export interface ConnectionCreateData {
  name: string;
  platform: 'monday' | 'jira';
  config: Record<string, any>;
  metadata?: {
    selectedProjects?: string[];
    defaultTemplate?: string;
    reportPreferences?: {
      includeCharts?: boolean;
      includeTeamInfo?: boolean;
      dateRange?: number;
    };
  };
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: any;
}

export interface ConnectionSyncResult {
  success: boolean;
  message: string;
  projectCount?: number;
  lastSync?: Date;
  error?: string;
}

// Type definitions for API responses
interface JiraUserResponse {
  displayName: string;
  accountId: string;
}

interface MondayApiResponse {
  data?: {
    me?: any;
    boards?: any[];
  };
  errors?: Array<{ message: string }>;
}

export class ConnectionService {
  
  /**
   * Create a new connection with proper validation and testing
   */
  async createConnection(userId: string, connectionData: ConnectionCreateData): Promise<IConnection> {
    logger.info(`Creating connection for user ${userId}:`, connectionData.name);
    
    try {
      // Validate platform configuration first
      const isValid = await this.validateConnectionConfig(connectionData.platform, connectionData.config);
      
      if (!isValid) {
        logger.error('Connection validation failed:', {
          platform: connectionData.platform,
          configKeys: Object.keys(connectionData.config),
          requiredForMondaycom: ['apiToken', 'boardId']
        });
        throw new Error('Invalid connection configuration');
      }
      
      const connection = new Connection({
        userId,
        name: connectionData.name,
        platform: connectionData.platform,
        config: connectionData.config,
        status: 'disconnected', // Start as disconnected, will be tested
        projectCount: 0,
        metadata: connectionData.metadata || {}
      });

      const savedConnection = await connection.save();
      logger.info(`✅ Connection created with ID: ${savedConnection.id}`);
      
      // Test connection after creation
      try {
        const testResult = await this.testConnection(userId, savedConnection.id);
        
        if (testResult.success) {
          // Update status to connected and sync project count
          await this.syncConnection(userId, savedConnection.id);
          logger.info(`✅ Connection tested and synced successfully: ${savedConnection.name}`);
        } else {
          logger.warn(`⚠️  Connection test failed for ${savedConnection.name}: ${testResult.message}`);
        }
      } catch (testError: any) {
        logger.error('Connection test failed during creation:', testError);
        savedConnection.status = 'error';
        savedConnection.lastSyncError = 'Initial connection test failed';
        await savedConnection.save();
      }
      
      // Return the updated connection
      const finalConnection = await Connection.findById(savedConnection.id);
      return finalConnection!;
      
    } catch (error) {
      logger.error('Failed to create connection:', error);
      throw error;
    }
  }

  /**
   * Get all connections for a user
   */
  async getConnections(userId: string): Promise<IConnection[]> {
    try {
      logger.info(`Getting connections for user: ${userId}`);
      
      const connections = await Connection.find({ userId }).sort({ createdAt: -1 });
      
      logger.info(`Found ${connections.length} connections for user ${userId}`);
      return connections;
      
    } catch (error) {
      logger.error('Failed to get connections:', error);
      throw error;
    }
  }

  /**
   * Test a connection
   */
  async testConnection(userId: string, connectionId: string): Promise<ConnectionTestResult> {
    try {
      logger.info(`Testing connection ${connectionId} for user ${userId}`);
      
      const connection = await Connection.findOne({ _id: connectionId, userId });
      
      if (!connection) {
        throw new Error('Connection not found');
      }

      let testResult: ConnectionTestResult;
      
      switch (connection.platform) {
        case 'jira':
          testResult = await this.testJiraConnection(connection.config);
          break;
        case 'monday':
          testResult = await this.testMondayConnection(connection.config);
          break;
        default:
          testResult = {
            success: false,
            message: `Unsupported platform: ${connection.platform}`
          };
      }

      // Update connection status based on test result
      connection.status = testResult.success ? 'connected' : 'error';
      if (!testResult.success) {
        connection.lastSyncError = testResult.message;
      }
      await connection.save();

      logger.info(`Connection test result for ${connectionId}: ${testResult.success ? 'success' : 'failed'}`);
      return testResult;
      
    } catch (error) {
      logger.error('Connection test failed:', error);
      throw error;
    }
  }

  /**
   * Sync a connection to get latest project count
   */
  async syncConnection(userId: string, connectionId: string): Promise<ConnectionSyncResult> {
    try {
      logger.info(`Syncing connection ${connectionId} for user ${userId}`);
      
      const connection = await Connection.findOne({ _id: connectionId, userId });
      
      if (!connection) {
        throw new Error('Connection not found');
      }

      let syncResult: ConnectionSyncResult;
      
      switch (connection.platform) {
        case 'jira':
          syncResult = await this.syncJiraConnection(connection);
          break;
        case 'monday':
          syncResult = await this.syncMondayConnection(connection);
          break;
        default:
          syncResult = {
            success: false,
            message: `Unsupported platform: ${connection.platform}`
          };
      }

      // Update connection with sync results
      if (syncResult.success) {
        connection.projectCount = syncResult.projectCount || 0;
        connection.lastSync = syncResult.lastSync || new Date();
        connection.status = 'connected';
        connection.lastSyncError = undefined;
      } else {
        connection.lastSyncError = syncResult.message;
        connection.status = 'error';
      }
      
      await connection.save();
      logger.info(`Connection sync result for ${connectionId}: ${syncResult.success ? 'success' : 'failed'}`);
      
      return syncResult;
      
    } catch (error) {
      logger.error('Connection sync failed:', error);
      throw error;
    }
  }

  /**
   * Delete a connection
   */
  async deleteConnection(userId: string, connectionId: string): Promise<boolean> {
    try {
      logger.info(`Deleting connection ${connectionId} for user ${userId}`);
      
      const result = await Connection.deleteOne({ _id: connectionId, userId });
      
      if (result.deletedCount === 0) {
        throw new Error('Connection not found or access denied');
      }
      
      logger.info(`✅ Connection ${connectionId} deleted successfully`);
      return true;
      
    } catch (error) {
      logger.error('Failed to delete connection:', error);
      throw error;
    }
  }

  /**
   * Update connection metadata
   */
  async updateConnectionMetadata(userId: string, connectionId: string, metadata: any): Promise<boolean> {
    try {
      logger.info(`📝 Updating metadata for connection ${connectionId}`);
      
      const result = await Connection.updateOne(
        { _id: connectionId, userId },
        { $set: { metadata, updatedAt: new Date() } }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('Connection not found or not authorized');
      }
      
      logger.info(`✅ Connection metadata updated successfully`);
      return true;
      
    } catch (error) {
      logger.error('Failed to update connection metadata:', error);
      throw error;
    }
  }

  /**
   * Get project data from a connection
   */
  async getProjectData(userId: string, connectionId: string, projectId?: string): Promise<any> {
    try {
      logger.info(`📊 Getting project data for connection ${connectionId}`);
      
      const connection = await Connection.findOne({ _id: connectionId, userId });
      
      if (!connection) {
        throw new Error('Connection not found');
      }

      if (connection.status !== 'connected') {
        throw new Error('Connection is not active');
      }

      // Get project data based on platform
      let projectData: any;
      
      switch (connection.platform) {
        case 'jira':
          projectData = await this.getJiraProjectData(connection, projectId);
          break;
        case 'monday':
          projectData = await this.getMondayProjectData(connection, projectId);
          break;
        default:
          throw new Error(`Unsupported platform: ${connection.platform}`);
      }

      return projectData;
      
    } catch (error) {
      logger.error('Failed to get project data:', error);
      throw error;
    }
  }

  // ===== PRIVATE VALIDATION METHODS =====

  /**
   * Validate platform configuration
   * FIXED: Updated Monday.com validation to use "apiToken" instead of "apiKey"
   */
  private async validateConnectionConfig(platform: string, config: any): Promise<boolean> {
    if (!config || typeof config !== 'object') {
      logger.error('Invalid config: must be a non-null object');
      return false;
    }
    
    switch (platform) {
      case 'jira':
        const hasJiraFields = !!(config.domain && config.email && config.apiToken);
        if (!hasJiraFields) {
          logger.error('Jira validation failed - missing required fields:', {
            domain: !!config.domain,
            email: !!config.email, 
            apiToken: !!config.apiToken
          });
        }
        return hasJiraFields;
      case 'monday':
        // FIXED: Change from config.apiKey to config.apiToken
        const hasMondayFields = !!(config.apiToken && config.boardId);
        if (!hasMondayFields) {
          logger.error('Monday.com validation failed - missing required fields:', {
            apiToken: !!config.apiToken,
            boardId: !!config.boardId,
            receivedFields: Object.keys(config)
          });
        }
        return hasMondayFields;
      default:
        logger.error(`Unsupported platform: ${platform}`);
        return false;
    }
  }

  // ===== JIRA PLATFORM METHODS =====

  /**
   * Test Jira connection
   */
  private async testJiraConnection(config: any): Promise<ConnectionTestResult> {
    try {
      logger.info('Testing Jira connection...');
      
      const { domain, email, apiToken } = config;
      
      if (!domain || !email || !apiToken) {
        return {
          success: false,
          message: 'Missing required Jira configuration (domain, email, apiToken)'
        };
      }

      // Create auth header
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
      
      // Test API call to get current user
      const testUrl = `https://${domain}/rest/api/3/myself`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json() as JiraUserResponse;
        return {
          success: true,
          message: `Connected as ${userData.displayName}`,
          details: userData
        };
      } else {
        return {
          success: false,
          message: `Jira connection failed: ${response.status} ${response.statusText}`
        };
      }
      
    } catch (error: any) {
      logger.error('Jira connection test failed:', error);
      return {
        success: false,
        message: error?.message || 'Jira connection test failed'
      };
    }
  }

  /**
   * Sync Jira connection to get project count
   */
  private async syncJiraConnection(connection: IConnection): Promise<ConnectionSyncResult> {
    try {
      logger.info('Syncing Jira connection...');
      
      const { domain, email, apiToken } = connection.config;
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
      
      const response = await fetch(`https://${domain}/rest/api/3/project`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const projects = await response.json() as any[]; // Fix: Type as array
        return {
          success: true,
          message: 'Jira sync successful',
          projectCount: Array.isArray(projects) ? projects.length : 0, // Fix: Check if array
          lastSync: new Date()
        };
      } else {
        return {
          success: false,
          message: `Failed to sync Jira projects: ${response.status}`
        };
      }
      
    } catch (error: any) {
      logger.error('Jira sync failed:', error);
      return {
        success: false,
        message: error?.message || 'Jira sync failed'
      };
    }
  }

  /**
   * Get Jira project data
   */
  private async getJiraProjectData(connection: IConnection, projectId?: string): Promise<any> {
    try {
      const { domain, email, apiToken } = connection.config;
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
      
      let url: string;
      
      if (projectId) {
        // Get specific project
        url = `https://${domain}/rest/api/3/project/${projectId}`;
      } else {
        // Get all projects
        url = `https://${domain}/rest/api/3/project`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Failed to get Jira project data: ${response.status}`);
      }
      
    } catch (error) {
      logger.error('Failed to get Jira project data:', error);
      throw error;
    }
  }

  // ===== MONDAY.COM PLATFORM METHODS =====

  /**
   * Test Monday.com connection
   * FIXED: Updated to use "apiToken" instead of "apiKey"
   */
  private async testMondayConnection(config: any): Promise<ConnectionTestResult> {
    try {
      logger.info('Testing Monday.com connection...');
      
      const { apiToken } = config;  // FIXED: Use apiToken instead of apiKey
      
      if (!apiToken) {
        return {
          success: false,
          message: 'Missing required Monday.com configuration (apiToken)'
        };
      }

      const query = `query { me { name email } }`;
      
      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,  // FIXED: Use apiToken
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (response.ok) {
        const data = await response.json() as MondayApiResponse;
        
        if (data.errors) {
          return {
            success: false,
            message: `Monday.com API error: ${data.errors[0].message}`
          };
        }
        
        return {
          success: true,
          message: `Connected as ${data.data?.me?.name}`,
          details: data.data?.me
        };
      } else {
        return {
          success: false,
          message: `Monday.com connection failed: ${response.status} ${response.statusText}`
        };
      }
      
    } catch (error: any) {
      logger.error('Monday.com connection test failed:', error);
      return {
        success: false,
        message: error?.message || 'Monday.com connection test failed'
      };
    }
  }

  /**
   * Sync Monday.com connection to get board count
   * FIXED: Updated to use "apiToken" instead of "apiKey"
   */
  private async syncMondayConnection(connection: IConnection): Promise<ConnectionSyncResult> {
    try {
      logger.info('Syncing Monday.com connection...');
      
      const { apiToken } = connection.config;  // FIXED: Use apiToken instead of apiKey
      const query = `query { boards { name id } }`;
      
      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,  // FIXED: Use apiToken
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (response.ok) {
        const data = await response.json() as MondayApiResponse;
        
        if (data.errors) {
          return {
            success: false,
            message: `Monday.com sync error: ${data.errors[0].message}`
          };
        }
        
        return {
          success: true,
          message: 'Monday.com sync successful',
          projectCount: data.data?.boards?.length || 0,
          lastSync: new Date()
        };
      } else {
        return {
          success: false,
          message: `Failed to sync Monday.com boards: ${response.status}`
        };
      }
      
    } catch (error: any) {
      logger.error('Monday.com sync failed:', error);
      return {
        success: false,
        message: error?.message || 'Monday.com sync failed'
      };
    }
  }

  /**
   * Get Monday.com project data
   * FIXED: Updated to use "apiToken" instead of "apiKey"
   */
  private async getMondayProjectData(connection: IConnection, projectId?: string): Promise<any> {
    try {
      const { apiToken } = connection.config;  // FIXED: Use apiToken instead of apiKey
      
      let query: string;
      
      if (projectId) {
        // Get specific board
        query = `query { boards(ids: [${projectId}]) { name id items { name } } }`;
      } else {
        // Get all boards
        query = `query { boards { name id items { name } } }`;
      }
      
      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,  // FIXED: Use apiToken
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (response.ok) {
        const data = await response.json() as MondayApiResponse;
        
        if (data.errors) {
          throw new Error(`Monday.com API error: ${data.errors[0].message}`);
        }
        
        return data.data?.boards;
      } else {
        throw new Error(`Failed to get Monday.com data: ${response.status}`);
      }
      
    } catch (error) {
      logger.error('Failed to get Monday.com project data:', error);
      throw error;
    }
  }
}

export const connectionService = new ConnectionService();
export default connectionService;