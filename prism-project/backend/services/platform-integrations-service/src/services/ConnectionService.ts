// backend/services/platform-integrations-service/src/services/ConnectionService.ts - NO TROFOS VERSION
import { Connection, IConnection } from '../models/Connection';
import logger from '../utils/logger';

export interface ConnectionCreateData {
  name: string;
  platform: 'monday' | 'jira';  // Removed 'trofos'
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
   * Get all connections for a specific user with status validation
   */
  async getConnections(userId: string): Promise<IConnection[]> {
    try {
      logger.info(`📡 Getting connections for user: ${userId}`);
      
      const connections = await Connection.find({ userId }).sort({ createdAt: -1 });
      
      logger.info(`📊 Found ${connections.length} connections for user ${userId}`);
      
      // Log status distribution for debugging
      const statusCounts = connections.reduce((acc, conn) => {
        acc[conn.status] = (acc[conn.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      logger.info(`📈 Status distribution:`, statusCounts);
      
      // Validate and fix any connections with invalid status
      const validatedConnections = await Promise.all(
        connections.map(async (conn) => {
          if (!['connected', 'disconnected', 'error'].includes(conn.status)) {
            logger.warn(`🔧 Fixing invalid status "${conn.status}" for connection ${conn.name}`);
            conn.status = 'disconnected'; // Default to disconnected for safety
            await conn.save();
          }
          return conn;
        })
      );
      
      return validatedConnections;
      
    } catch (error) {
      logger.error('Failed to get connections:', error);
      throw error;
    }
  }

  /**
   * Test connection and update status
   */
  async testConnection(userId: string, connectionId: string): Promise<ConnectionTestResult> {
    try {
      logger.info(`🧪 Testing connection ${connectionId} for user ${userId}`);
      
      const connection = await Connection.findOne({ _id: connectionId, userId });
      
      if (!connection) {
        throw new Error('Connection not found');
      }

      // Test the actual connection based on platform
      let testResult: ConnectionTestResult;
      
      switch (connection.platform) {
        case 'jira':
          testResult = await this.testJiraConnection(connection.config);
          break;
        case 'monday':
          testResult = await this.testMondayConnection(connection.config);
          break;
        default:
          throw new Error(`Unsupported platform: ${connection.platform}`);
      }

      // Update connection status based on test result
      const newStatus = testResult.success ? 'connected' : 'error';
      const updateData: any = { 
        status: newStatus,
        lastSync: new Date()
      };
      
      if (testResult.success) {
        updateData.lastSyncError = null;
      } else {
        updateData.lastSyncError = testResult.message;
      }

      await Connection.findByIdAndUpdate(connectionId, updateData);
      
      logger.info(`🎯 Connection test result for ${connection.name}: ${testResult.success ? 'SUCCESS' : 'FAILED'}`);
      
      return testResult;
      
    } catch (error: any) {
      logger.error('Connection test failed:', error);
      
      // Update connection with error status
      await Connection.findByIdAndUpdate(connectionId, {
        status: 'error',
        lastSyncError: error?.message || 'Connection test failed',
        lastSync: new Date()
      });
      
      return {
        success: false,
        message: error?.message || 'Connection test failed'
      };
    }
  }

  /**
   * Sync connection data and update project count
   */
  async syncConnection(userId: string, connectionId: string): Promise<ConnectionSyncResult> {
    try {
      logger.info(`🔄 Syncing connection ${connectionId} for user ${userId}`);
      
      const connection = await Connection.findOne({ _id: connectionId, userId });
      
      if (!connection) {
        throw new Error('Connection not found');
      }

      // First test the connection
      const testResult = await this.testConnection(userId, connectionId);
      
      if (!testResult.success) {
        return {
          success: false,
          message: `Connection test failed: ${testResult.message}`
        };
      }

      // Sync data based on platform
      let syncResult: ConnectionSyncResult;
      
      switch (connection.platform) {
        case 'jira':
          syncResult = await this.syncJiraConnection(connection);
          break;
        case 'monday':
          syncResult = await this.syncMondayConnection(connection);
          break;
        default:
          throw new Error(`Unsupported platform: ${connection.platform}`);
      }

      // Update connection with sync results
      const updateData: any = {
        status: syncResult.success ? 'connected' : 'error',
        lastSync: new Date(),
        projectCount: syncResult.projectCount || connection.projectCount
      };
      
      if (syncResult.success) {
        updateData.lastSyncError = null;
      } else {
        updateData.lastSyncError = syncResult.message;
      }

      await Connection.findByIdAndUpdate(connectionId, updateData);
      
      logger.info(`✅ Connection sync completed for ${connection.name}`);
      
      return syncResult;
      
    } catch (error: any) {
      logger.error('Connection sync failed:', error);
      
      // Update connection with error status
      await Connection.findByIdAndUpdate(connectionId, {
        status: 'error',
        lastSyncError: error?.message || 'Connection sync failed',
        lastSync: new Date()
      });
      
      return {
        success: false,
        message: error?.message || 'Connection sync failed'
      };
    }
  }

  /**
   * Delete a connection
   */
  async deleteConnection(userId: string, connectionId: string): Promise<boolean> {
    try {
      logger.info(`🗑️ Deleting connection ${connectionId} for user ${userId}`);
      
      const result = await Connection.deleteOne({ _id: connectionId, userId });
      
      if (result.deletedCount === 0) {
        throw new Error('Connection not found or not authorized');
      }
      
      logger.info(`✅ Connection deleted successfully`);
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
   */
  private async validateConnectionConfig(platform: string, config: any): Promise<boolean> {
    if (!config || typeof config !== 'object') {
      return false;
    }
    
    switch (platform) {
      case 'jira':
        return !!(config.domain && config.email && config.apiToken);
      case 'monday':
        return !!(config.apiKey && config.boardId);
      default:
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
          message: 'Jira connection successful',
          details: {
            user: userData.displayName,
            accountId: userData.accountId
          }
        };
      } else {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          message: `Jira API error: ${response.status} ${response.statusText}`,
          details: errorData
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
   * Sync Jira connection
   */
  private async syncJiraConnection(connection: IConnection): Promise<ConnectionSyncResult> {
    try {
      logger.info('Syncing Jira connection...');
      
      const { domain, email, apiToken } = connection.config;
      const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
      
      // Get projects
      const projectsUrl = `https://${domain}/rest/api/3/project`;
      
      const response = await fetch(projectsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const projects = await response.json() as any[];
        
        return {
          success: true,
          message: 'Jira sync successful',
          projectCount: projects?.length || 0,
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
      
      if (projectId) {
        // Get specific project
        const projectUrl = `https://${domain}/rest/api/3/project/${projectId}`;
        
        const response = await fetch(projectUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          return await response.json();
        } else {
          throw new Error(`Failed to get Jira project: ${response.status}`);
        }
      } else {
        // Get all projects
        const projectsUrl = `https://${domain}/rest/api/3/project`;
        
        const response = await fetch(projectsUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          return await response.json();
        } else {
          throw new Error(`Failed to get Jira projects: ${response.status}`);
        }
      }
      
    } catch (error) {
      logger.error('Failed to get Jira project data:', error);
      throw error;
    }
  }

  // ===== MONDAY.COM PLATFORM METHODS =====

  /**
   * Test Monday.com connection
   */
  private async testMondayConnection(config: any): Promise<ConnectionTestResult> {
    try {
      logger.info('Testing Monday.com connection...');
      
      const { apiKey } = config;
      
      if (!apiKey) {
        return {
          success: false,
          message: 'Missing Monday.com API key'
        };
      }

      // Test API call to get user info
      const query = `query { me { name email } }`;
      
      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
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
          message: 'Monday.com connection successful',
          details: data.data?.me
        };
      } else {
        return {
          success: false,
          message: `Monday.com API error: ${response.status}`
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
   * Sync Monday.com connection
   */
  private async syncMondayConnection(connection: IConnection): Promise<ConnectionSyncResult> {
    try {
      logger.info('Syncing Monday.com connection...');
      
      const { apiKey } = connection.config;
      const query = `query { boards { name id } }`;
      
      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Authorization': apiKey,
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
   */
  private async getMondayProjectData(connection: IConnection, projectId?: string): Promise<any> {
    try {
      const { apiKey } = connection.config;
      
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
          'Authorization': apiKey,
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