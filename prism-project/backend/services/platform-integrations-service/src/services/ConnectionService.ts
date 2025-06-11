// =============================================================================
// 3. BACKEND: Enhanced Connection Service (MINIMAL ADDITIONS)
// File: backend/services/platform-integrations-service/src/services/ConnectionService.ts
// =============================================================================

import { Connection, IConnection } from '../models/Connection';
import { ClientFactory, BaseClient, PlatformConnection } from '../clients/BaseClient';
import logger from '../utils/logger';

export class ConnectionService {
  async createConnection(userId: string, connectionData: {
    name: string;
    platform: 'monday' | 'jira';
    config: Record<string, any>;
    metadata?: any;
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
        config: connectionData.config,
        metadata: connectionData.metadata || {
          selectedProjects: [],
          defaultTemplate: 'standard',
          reportPreferences: {
            includeCharts: true,
            includeTeamInfo: true,
            dateRange: 30
          }
        },
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

  // NEW: Update connection metadata
  async updateConnectionMetadata(userId: string, connectionId: string, metadata: any): Promise<boolean> {
    try {
      const result = await Connection.updateOne(
        { _id: connectionId, userId },
        { 
          $set: { 
            metadata: metadata,
            updatedAt: new Date()
          } 
        }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      logger.error('Failed to update connection metadata:', error);
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

  // Existing methods remain unchanged...
  async testConnection(userId: string, connectionId: string): Promise<boolean> {
    // ... existing implementation
    return true; // placeholder
  }

  async syncConnection(userId: string, connectionId: string): Promise<void> {
    // ... existing implementation
  }

  async getProjectData(userId: string, connectionId: string, projectId?: string) {
    // ... existing implementation
  }
}
