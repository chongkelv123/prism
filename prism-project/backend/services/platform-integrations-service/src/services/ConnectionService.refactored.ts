// backend/services/platform-integrations-service/src/services/ConnectionService.refactored.ts
// REFACTORED VERSION - Addresses coupling issues with dependency injection

import { 
  IConnectionRepository, 
  IPlatformClientFactory, 
  IConfigValidator, 
  IDataTransformer,
  IJiraClient,
  IMondayClient,
  ITrofosClient,
  ConnectionCreateData,
  ConnectionTestResult,
  ProjectData,
  ValidationResult
} from '../interfaces/ConnectionInterfaces';
import { IConnection } from '../models/Connection';
import logger from '../utils/logger';

export class ConnectionService {
  constructor(
    private connectionRepository: IConnectionRepository,
    private platformClientFactory: IPlatformClientFactory,
    private configValidator: IConfigValidator,
    private dataTransformer: IDataTransformer
  ) {}

  /**
   * CRITICAL: Get project data - REFACTORED for better testability and bug prevention
   * 
   * Key improvements:
   * 1. Separated connection validation from data fetching
   * 2. Abstracted platform-specific logic through factory
   * 3. Isolated data transformation
   * 4. Clear error boundaries to prevent data bleeding
   */
  async getProjectData(userId: string, connectionId: string, projectId?: string): Promise<ProjectData[]> {
    try {
      logger.info(`🔄 Getting project data for connection ${connectionId}, project: ${projectId || 'all'}`);

      // Step 1: Validate connection access and ownership
      const connection = await this.validateConnectionAccess(userId, connectionId);

      // Step 2: Fetch platform-specific raw data (isolated per connection)
      const rawData = await this.fetchPlatformData(connection, projectId);

      if (!rawData) {
        logger.warn(`⚠️ No raw data returned from ${connection.platform} platform`);
        return [];
      }

      // Step 3: Transform data using dedicated transformer (prevents cross-contamination)
      const transformedData = this.transformPlatformData(rawData, connection.platform);

      logger.info(`✅ Successfully transformed ${transformedData.length} projects from ${connection.platform}`);
      return transformedData;

    } catch (error) {
      logger.error('❌ Failed to get project data:', error);
      throw error;
    }
  }

  /**
   * Validate connection access - EXTRACTED for isolated testing
   * This method prevents unauthorized access and ensures connection is active
   */
  private async validateConnectionAccess(userId: string, connectionId: string): Promise<IConnection> {
    // Use repository abstraction instead of direct database call
    const connection = await this.connectionRepository.findOne({ 
      _id: connectionId, 
      userId 
    });
    
    if (!connection) {
      throw new Error('Connection not found');
    }

    if (connection.status !== 'connected') {
      throw new Error(`Connection is not active (status: ${connection.status})`);
    }

    return connection;
  }

  /**
   * Fetch platform-specific data - ABSTRACTED for better isolation
   * Each platform client is created fresh to prevent configuration bleeding
   */
  private async fetchPlatformData(connection: IConnection, projectId?: string): Promise<any> {
    switch (connection.platform) {
      case 'jira':
        // Create isolated Jira client for this specific connection
        const jiraClient = this.platformClientFactory.createJiraClient(connection.config);
        return await jiraClient.getProjectData(projectId);
      
      case 'monday':
        // Create isolated Monday client for this specific connection
        const mondayClient = this.platformClientFactory.createMondayClient(connection.config);
        return await mondayClient.getProjectData(projectId);
      
      case 'trofos':
        // Create isolated TROFOS client for this specific connection
        const trofosClient = this.platformClientFactory.createTrofosClient(connection.config);
        return await trofosClient.getProjectData(projectId);
      
      default:
        throw new Error(`Unsupported platform: ${connection.platform}`);
    }
  }

  /**
   * Transform platform data - DELEGATED to specialized transformer
   * Ensures consistent data format while maintaining platform isolation
   */
  private transformPlatformData(rawData: any, platform: string): ProjectData[] {
    switch (platform) {
      case 'jira':
        return this.dataTransformer.transformJiraData(rawData);
      case 'monday':
        return this.dataTransformer.transformMondayData(rawData);
      case 'trofos':
        return this.dataTransformer.transformTrofosData(rawData);
      default:
        throw new Error(`Unsupported platform for transformation: ${platform}`);
    }
  }

  /**
   * Create a new platform connection - REFACTORED with validation separation
   */
  async createConnection(userId: string, data: ConnectionCreateData): Promise<IConnection> {
    try {
      logger.info(`Creating ${data.platform} connection for user ${userId}`);

      // Validate configuration using abstracted validator
      const validation = this.validateConnectionConfig(data.platform, data.config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.message}`);
      }

      // Create connection entity
      const connectionData = {
        userId,
        name: data.name,
        platform: data.platform,
        config: data.config,
        metadata: data.metadata || {},
        status: 'disconnected',
        createdAt: new Date(),
        lastSync: null,
        projectCount: 0
      };

      const connection = await this.connectionRepository.create(connectionData);

      // Test the connection using abstracted method
      const testResult = await this.testConnectionConfig(data.platform, data.config);
      
      connection.status = testResult.success ? 'connected' : 'error';
      if (!testResult.success) {
        connection.lastSyncError = testResult.message;
      }

      return await this.connectionRepository.save(connection);
    } catch (error) {
      logger.error('Failed to create connection:', error);
      throw error;
    }
  }

  /**
   * Get all connections for a user - SIMPLIFIED with repository abstraction
   */
  async getConnections(userId: string): Promise<IConnection[]> {
    try {
      return await this.connectionRepository.find({ userId });
    } catch (error) {
      logger.error('Failed to get connections:', error);
      throw error;
    }
  }

  /**
   * Get a specific connection - ABSTRACTED for easier mocking
   */
  async getConnection(userId: string, connectionId: string): Promise<IConnection | null> {
    try {
      return await this.connectionRepository.findOne({ _id: connectionId, userId });
    } catch (error) {
      logger.error('Failed to get connection:', error);
      throw error;
    }
  }

  /**
   * Validate connection configuration - EXTRACTED for isolated testing
   */
  private validateConnectionConfig(platform: string, config: any): ValidationResult {
    switch (platform) {
      case 'jira':
        return this.configValidator.validateJiraConfig(config);
      case 'monday':
        return this.configValidator.validateMondayConfig(config);
      case 'trofos':
        return this.configValidator.validateTrofosConfig(config);
      default:
        return { valid: false, message: `Unsupported platform: ${platform}` };
    }
  }

  /**
   * Test connection configuration - ABSTRACTED for easier mocking
   */
  private async testConnectionConfig(platform: string, config: any): Promise<ConnectionTestResult> {
    try {
      switch (platform) {
        case 'jira':
          const jiraClient = this.platformClientFactory.createJiraClient(config);
          return await jiraClient.testConnection();
        
        case 'monday':
          const mondayClient = this.platformClientFactory.createMondayClient(config);
          return await mondayClient.testConnection();
        
        case 'trofos':
          const trofosClient = this.platformClientFactory.createTrofosClient(config);
          return await trofosClient.testConnection();
        
        default:
          return { success: false, message: `Unsupported platform: ${platform}` };
      }
    } catch (error) {
      logger.error('Connection test failed:', error);
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}