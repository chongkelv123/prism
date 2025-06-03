import { Connection, IConnection } from '../models/Connection';
import { ClientFactory, BaseClient, PlatformConnection } from '../clients/BaseClient';
import logger from '../utils/logger';

export class ConnectionService {
  async createConnection(userId: string, connectionData: {
    name: string;
    platform: 'monday' | 'jira' | 'trofos';
    config: Record<string, any>;
  }): Promise<IConnection> {
    try {
      // Test the connection first
      const tempConnection: PlatformConnection = {
        id: 'temp',
        name: connectionData.name,
        platform: connectionData.platform,
        config: connectionData.config,
        status: 'disconnected'
      };

      const client = ClientFactory.createClient(tempConnection);
      const isConnected = await client.testConnection();

      if (!isConnected) {
        throw new Error('Connection test failed. Please check your credentials.');
      }

      // Get project count
      let projectCount = 0;
      try {
        const projects = await client.getProjects();
        projectCount = projects.length;
      } catch (error) {
        logger.warn('Could not get project count, defaulting to 0:', error);
      }

      // Create the connection
      const connection = new Connection({
        userId,
        name: connectionData.name,
        platform: connectionData.platform,
        config: connectionData.config, // This will be encrypted automatically
        status: 'connected',
        projectCount,
        lastSync: new Date()
      });

      await connection.save();
      logger.info(`Connection created: ${connection.id} for user ${userId}`);
      
      return connection;
    } catch (error) {
      logger.error('Failed to create connection:', error);
      throw error;
    }
  }

  async getConnections(userId: string): Promise<IConnection[]> {
    try {
      return await Connection.find({ userId }).sort({ createdAt: -1 });
    } catch (error) {
      logger.error('Failed to get connections:', error);
      throw error;
    }
  }

  async getConnection(userId: string, connectionId: string): Promise<IConnection | null> {
    try {
      return await Connection.findOne({ _id: connectionId, userId });
    } catch (error) {
      logger.error('Failed to get connection:', error);
      throw error;
    }
  }

  async testConnection(userId: string, connectionId: string): Promise<boolean> {
    try {
      const connection = await this.getConnection(userId, connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      const platformConnection: PlatformConnection = {
        id: connection.id,
        name: connection.name,
        platform: connection.platform,
        config: connection.config,
        status: connection.status
      };

      const client = ClientFactory.createClient(platformConnection);
      const isConnected = await client.testConnection();

      // Update connection status
      connection.status = isConnected ? 'connected' : 'error';
      connection.lastSync = new Date();
      if (!isConnected) {
        connection.lastSyncError = 'Connection test failed';
      }
      await connection.save();

      return isConnected;
    } catch (error) {
      logger.error('Failed to test connection:', error);
      
      // Update connection with error status
      try {
        const connection = await this.getConnection(userId, connectionId);
        if (connection) {
          connection.status = 'error';
          connection.lastSyncError = error instanceof Error ? error.message : 'Unknown error';
          await connection.save();
        }
      } catch (updateError) {
        logger.error('Failed to update connection status:', updateError);
      }
      
      return false;
    }
  }

  async syncConnection(userId: string, connectionId: string): Promise<void> {
    try {
      const connection = await this.getConnection(userId, connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      const platformConnection: PlatformConnection = {
        id: connection.id,
        name: connection.name,
        platform: connection.platform,
        config: connection.config,
        status: connection.status
      };

      const client = ClientFactory.createClient(platformConnection);
      
      // Test connection first
      const isConnected = await client.testConnection();
      if (!isConnected) {
        throw new Error('Connection test failed during sync');
      }

      // Get updated project data
      const projects = await client.getProjects();
      
      // Update connection
      connection.status = 'connected';
      connection.projectCount = projects.length;
      connection.lastSync = new Date();
      connection.lastSyncError = undefined;
      await connection.save();

      logger.info(`Connection synced: ${connectionId}`);
    } catch (error) {
      logger.error('Failed to sync connection:', error);
      
      // Update connection with error
      try {
        const connection = await this.getConnection(userId, connectionId);
        if (connection) {
          connection.status = 'error';
          connection.lastSyncError = error instanceof Error ? error.message : 'Sync failed';
          await connection.save();
        }
      } catch (updateError) {
        logger.error('Failed to update connection after sync error:', updateError);
      }
      
      throw error;
    }
  }

  async deleteConnection(userId: string, connectionId: string): Promise<void> {
    try {
      const result = await Connection.deleteOne({ _id: connectionId, userId });
      if (result.deletedCount === 0) {
        throw new Error('Connection not found');
      }
      logger.info(`Connection deleted: ${connectionId}`);
    } catch (error) {
      logger.error('Failed to delete connection:', error);
      throw error;
    }
  }

  async getProjectData(userId: string, connectionId: string, projectId?: string) {
    try {
      const connection = await this.getConnection(userId, connectionId);
      if (!connection) {
        throw new Error('Connection not found');
      }

      const platformConnection: PlatformConnection = {
        id: connection.id,
        name: connection.name,
        platform: connection.platform,
        config: connection.config,
        status: connection.status
      };

      const client = ClientFactory.createClient(platformConnection);
      
      if (projectId) {
        return await client.getProject(projectId);
      } else {
        return await client.getProjects();
      }
    } catch (error) {
      logger.error('Failed to get project data:', error);
      throw error;
    }
  }
}