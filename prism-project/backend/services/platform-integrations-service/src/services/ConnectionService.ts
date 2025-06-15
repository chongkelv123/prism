// backend/services/platform-integrations-service/src/services/ConnectionService.ts
// COMPLETE FIXED VERSION - Updated Monday.com API integration with proper typing and data transformation

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

interface MondayBoard {
  id: string;
  name: string;
  description?: string;
  state?: string;
  items_count?: number;
  items?: Array<{
    id: string;
    name: string;
    created_at?: string;
    updated_at?: string;
    state?: string;
  }>;
  groups?: Array<{
    id: string;
    title: string;
    position?: number;
  }>;
  columns?: Array<{
    id: string;
    title: string;
    type: string;
  }>;
}

interface MondayUser {
  name: string;
  email: string;
  id: string;
}

interface MondayApiResponse {
  data?: {
    me?: MondayUser;
    boards?: MondayBoard[];
  };
  errors?: Array<{ message: string }>;
}

// Helper function to safely parse Monday.com API response
function parseMondayApiResponse(data: unknown): MondayApiResponse {
  if (!data || typeof data !== 'object') {
    return {};
  }
  
  const response = data as Record<string, unknown>;
  const result: MondayApiResponse = {};
  
  // Parse errors
  if ('errors' in response && Array.isArray(response.errors)) {
    result.errors = response.errors as Array<{ message: string }>;
  }
  
  // Parse data
  if ('data' in response && response.data && typeof response.data === 'object') {
    const responseData = response.data as Record<string, unknown>;
    result.data = {};
    
    // Parse user data
    if ('me' in responseData && responseData.me && typeof responseData.me === 'object') {
      result.data.me = responseData.me as MondayUser;
    }
    
    // Parse boards data
    if ('boards' in responseData && Array.isArray(responseData.boards)) {
      result.data.boards = responseData.boards as MondayBoard[];
    }
  }
  
  return result;
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
   * Get a specific connection
   */
  async getConnection(userId: string, connectionId: string): Promise<IConnection | null> {
    try {
      const connection = await Connection.findOne({ _id: connectionId, userId });
      return connection;
    } catch (error) {
      logger.error('Failed to get connection:', error);
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
   * Get project data from a connection with proper data transformation
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

      // Get raw project data based on platform
      let rawProjectData: any;
      
      switch (connection.platform) {
        case 'jira':
          rawProjectData = await this.getJiraProjectData(connection, projectId);
          break;
        case 'monday':
          rawProjectData = await this.getMondayProjectData(connection, projectId);
          break;
        default:
          throw new Error(`Unsupported platform: ${connection.platform}`);
      }

      // Transform the data to a consistent format for the frontend
      const transformedProjects = this.transformProjectData(rawProjectData, connection.platform);
      
      logger.info(`✅ Transformed ${transformedProjects.length} projects for frontend`);
      
      return transformedProjects;
      
    } catch (error) {
      logger.error('Failed to get project data:', error);
      throw error;
    }
  }

  /**
   * Transform raw project data to consistent frontend format
   */
  private transformProjectData(rawData: any, platform: string): any[] {
    try {
      logger.info(`🔄 Transforming ${platform} project data...`);
      
      // Ensure we have an array
      const dataArray = Array.isArray(rawData) ? rawData : [rawData];
      
      // Filter out any null/undefined items
      const validItems = dataArray.filter(item => item != null);
      
      if (validItems.length === 0) {
        logger.warn(`⚠️  No valid project data to transform for ${platform}`);
        return [];
      }
      
      const transformedProjects = validItems.map((item, index) => {
        try {
          let transformedProject: any;
          
          switch (platform) {
            case 'jira':
              transformedProject = this.transformJiraProject(item);
              break;
            case 'monday':
              transformedProject = this.transformMondayProject(item);
              break;
            default:
              throw new Error(`Unsupported platform: ${platform}`);
          }
          
          // Ensure all required fields are present
          return {
            id: transformedProject.id || `${platform}_${index}`,
            name: transformedProject.name || 'Unnamed Project',
            platform: platform,
            description: transformedProject.description || '',
            status: transformedProject.status || 'active',
            metrics: transformedProject.metrics || [],
            team: transformedProject.team || [],
            tasks: transformedProject.tasks || [],
            lastUpdated: transformedProject.lastUpdated || new Date().toISOString(),
            // Keep original data for debugging
            _raw: item
          };
          
        } catch (itemError) {
          logger.error(`Failed to transform project item ${index}:`, itemError);
          // Return a fallback project object to prevent frontend crashes
          return {
            id: `${platform}_fallback_${index}`,
            name: `${platform.charAt(0).toUpperCase() + platform.slice(1)} Project ${index + 1}`,
            platform: platform,
            description: 'Project data could not be fully loaded',
            status: 'active',
            metrics: [],
            team: [],
            tasks: [],
            lastUpdated: new Date().toISOString(),
            _error: itemError instanceof Error ? itemError.message : 'Unknown error',
            _raw: item
          };
        }
      });
      
      logger.info(`✅ Successfully transformed ${transformedProjects.length} projects`);
      return transformedProjects;
      
    } catch (error) {
      logger.error('Failed to transform project data:', error);
      // Return empty array to prevent frontend crashes
      return [];
    }
  }

  /**
   * Transform Jira project data to standard format
   */
  private transformJiraProject(jiraProject: any): any {
    // Jira project structure: { id, key, name, description, projectTypeKey, etc. }
    return {
      id: jiraProject.key || jiraProject.id || 'unknown',
      name: jiraProject.name || jiraProject.displayName || 'Unnamed Jira Project',
      description: jiraProject.description || '',
      status: 'active',
      projectKey: jiraProject.key,
      projectType: jiraProject.projectTypeKey || 'unknown',
      lead: jiraProject.lead ? {
        id: jiraProject.lead.accountId || jiraProject.lead.key,
        name: jiraProject.lead.displayName || jiraProject.lead.name,
        email: jiraProject.lead.emailAddress
      } : null,
      metrics: [
        {
          name: 'Project Type',
          value: jiraProject.projectTypeKey || 'Standard',
          type: 'text'
        },
        {
          name: 'Project Style',
          value: jiraProject.style || 'Classic',
          type: 'text'
        }
      ],
      team: jiraProject.lead ? [{
        id: jiraProject.lead.accountId || jiraProject.lead.key,
        name: jiraProject.lead.displayName || jiraProject.lead.name,
        role: 'Project Lead',
        email: jiraProject.lead.emailAddress,
        avatar: jiraProject.lead.avatarUrls?.['48x48']
      }] : [],
      tasks: [], // Issues would need separate API call
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Transform Monday.com board data to standard format
   */
  private transformMondayProject(mondayBoard: any): any {
    // Monday.com board structure: { id, name, description, items_count, groups, columns, items, etc. }
    return {
      id: mondayBoard.id || 'unknown',
      name: mondayBoard.name || 'Unnamed Monday.com Board',
      description: mondayBoard.description || '',
      status: mondayBoard.state || 'active',
      boardState: mondayBoard.state,
      itemsCount: mondayBoard.items_count || 0,
      groups: mondayBoard.groups || [],
      columns: mondayBoard.columns || [],
      metrics: [
        {
          name: 'Items Count',
          value: mondayBoard.items_count || 0,
          type: 'number'
        },
        {
          name: 'Groups',
          value: mondayBoard.groups?.length || 0,
          type: 'number'
        },
        {
          name: 'Columns',
          value: mondayBoard.columns?.length || 0,
          type: 'number'
        }
      ],
      team: [], // Would need separate API call to get board subscribers
      tasks: (mondayBoard.items || []).map((item: any, index: number) => ({
        id: item.id || `item_${index}`,
        title: item.name || 'Unnamed Item',
        status: item.state || 'active',
        created: item.created_at,
        updated: item.updated_at
      })),
      lastUpdated: new Date().toISOString()
    };
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

  // ===== MONDAY.COM PLATFORM METHODS (FIXED) =====

  /**
   * Test Monday.com connection - ENHANCED VERSION
   */
  private async testMondayConnection(config: any): Promise<ConnectionTestResult> {
    try {
      logger.info('Testing Monday.com connection...');
      
      const { apiToken } = config;
      
      if (!apiToken) {
        return {
          success: false,
          message: 'Missing Monday.com API token'
        };
      }

      const query = 'query { me { name email id } }';
      
      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'API-Version': '2024-01'  // CRITICAL: Add API version header
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Monday.com connection failed: ${response.status} ${response.statusText}`
        };
      }

      const rawData = await response.json();
      const data = parseMondayApiResponse(rawData);
      
      if (data.errors && data.errors.length > 0) {
        return {
          success: false,
          message: `Monday.com API error: ${data.errors[0].message}`
        };
      }
      
      if (!data.data?.me) {
        return {
          success: false,
          message: 'Authentication failed - invalid API token'
        };
      }
      
      const userData = data.data.me;
      return {
        success: true,
        message: `Connected as ${userData.name} (${userData.email})`,
        details: userData
      };
      
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Monday.com connection test failed'
      };
    }
  }

  /**
   * Sync Monday.com connection - ENHANCED VERSION
   */
  private async syncMondayConnection(connection: IConnection): Promise<ConnectionSyncResult> {
    try {
      logger.info('Syncing Monday.com connection...');
      
      const { apiToken } = connection.config;
      const query = `
        query { 
          boards(limit: 100, state: active) { 
            id 
            name 
            items_count
            state
          } 
        }`;
      
      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'API-Version': '2024-01'  // CRITICAL: Add API version header
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        return {
          success: false,
          message: `Failed to sync Monday.com boards: ${response.status} ${response.statusText}`
        };
      }

      const rawData = await response.json();
      const data = parseMondayApiResponse(rawData);
      
      if (data.errors && data.errors.length > 0) {
        return {
          success: false,
          message: `Monday.com sync error: ${data.errors[0].message}`
        };
      }
      
      const boards = data.data?.boards || [];
      
      return {
        success: true,
        message: 'Monday.com sync successful',
        projectCount: boards.length,
        lastSync: new Date()
      };
      
    } catch (error: any) {
      logger.error('Monday.com sync failed:', error);
      return {
        success: false,
        message: error?.message || 'Monday.com sync failed'
      };
    }
  }

  /**
   * Get Monday.com project data (boards) - ENHANCED VERSION
   */
  private async getMondayProjectData(connection: IConnection, projectId?: string): Promise<MondayBoard[]> {
    try {
      logger.info('📊 Fetching Monday.com data...');
      
      const { apiToken } = connection.config;
      
      if (!apiToken) {
        throw new Error('Monday.com API token not configured');
      }
      
      let query: string;
      
      if (projectId) {
        // Get specific board with enhanced data
        query = `
          query($boardId: ID!) {
            boards(ids: [$boardId]) { 
              id 
              name 
              description
              state
              items_count
              groups {
                id
                title
                position
              }
              columns {
                id
                title
                type
              }
              items(limit: 50) { 
                id 
                name 
                created_at
                updated_at
                state
              }
            } 
          }`;
      } else {
        // Get all boards with basic info
        query = `
          query {
            boards(limit: 100, state: active) { 
              id 
              name 
              description
              state
              items_count
              groups {
                id
                title
              }
              columns {
                id
                title
                type
              }
            } 
          }`;
      }
      
      logger.info('📡 Making Monday.com API request...');
      
      const requestBody: any = { query };
      if (projectId) {
        requestBody.variables = { boardId: projectId };
      }
      
      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'API-Version': '2024-01'  // CRITICAL: Add API version header
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Monday.com API request failed: ${response.status} ${response.statusText}`);
      }

      const rawData = await response.json();
      const data = parseMondayApiResponse(rawData);
      
      if (data.errors && data.errors.length > 0) {
        throw new Error(`Monday.com API error: ${data.errors[0].message}`);
      }
      
      const boards = data.data?.boards || [];
      
      logger.info('✅ Monday.com data retrieved:', {
        boardCount: boards.length,
        boardNames: boards.map(b => b.name).slice(0, 3)
      });
      
      return boards;
      
    } catch (error) {
      logger.error('❌ Failed to get Monday.com project data:', error);
      throw error;
    }
  }
}

export const connectionService = new ConnectionService();
export default connectionService;