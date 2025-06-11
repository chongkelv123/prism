// =============================================================================
// 2. BACKEND: Enhanced Connection Routes (MINIMAL ADDITIONS)
// File: backend/services/platform-integrations-service/src/routes/connectionRoutes.ts
// =============================================================================

import { Router, Request, Response } from 'express';
import { ConnectionService } from '../services/ConnectionService';
import { authenticateJWT } from '../middleware/auth';
import logger from '../utils/logger';

interface AuthRequest extends Request {
  user?: { userId: string };
}

const router = Router();
const connectionService = new ConnectionService();

// All routes require authentication
router.use(authenticateJWT);

// CREATE: Store connection in backend
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { name, platform, config, metadata } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    if (!name || !platform || !config) {
      return res.status(400).json({
        message: 'Name, platform, and config are required'
      });
    }

    const connectionData = {
      name,
      platform,
      config,
      metadata: metadata || {} // Optional metadata
    };

    const connection = await connectionService.createConnection(userId, connectionData);

    // Return safe connection data (no sensitive config)
    const safeConnection = {
      id: connection.id,
      name: connection.name,
      platform: connection.platform,
      status: connection.status,
      projectCount: connection.projectCount,
      metadata: connection.metadata,
      lastSync: connection.lastSync,
      createdAt: connection.createdAt
    };

    res.status(201).json(safeConnection);
  } catch (error) {
    logger.error('Create connection error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create connection';
    res.status(500).json({ message });
  }
});

// READ: Get all connections for user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const connections = await connectionService.getConnections(userId);
    
    // Return safe connections (no sensitive config)
    const safeConnections = connections.map(conn => ({
      id: conn.id,
      name: conn.name,
      platform: conn.platform,
      status: conn.status,
      projectCount: conn.projectCount,
      metadata: conn.metadata,
      lastSync: conn.lastSync,
      lastSyncError: conn.lastSyncError,
      createdAt: conn.createdAt
    }));

    res.json(safeConnections);
  } catch (error) {
    logger.error('Get connections error:', error);
    res.status(500).json({ message: 'Failed to get connections' });
  }
});

// UPDATE: Update connection metadata
router.put('/:connectionId/metadata', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { connectionId } = req.params;
    const { metadata } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const success = await connectionService.updateConnectionMetadata(userId, connectionId, metadata);
    
    if (!success) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    res.json({ success: true, message: 'Metadata updated successfully' });
  } catch (error) {
    logger.error('Update metadata error:', error);
    res.status(500).json({ message: 'Failed to update metadata' });
  }
});

// MIGRATION: Bulk import from localStorage
router.post('/import', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { connections } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    if (!Array.isArray(connections)) {
      return res.status(400).json({ message: 'Connections must be an array' });
    }

    logger.info(`Importing ${connections.length} connections for user ${userId}`);

    const importResults = [];
    
    for (const connData of connections) {
      try {
        // Transform localStorage format to backend format
        const connectionData = {
          name: connData.name || `${connData.platform} Connection`,
          platform: connData.platform,
          config: connData.credentials || connData.config || {},
          metadata: {
            selectedProjects: [],
            defaultTemplate: 'standard',
            reportPreferences: {
              includeCharts: true,
              includeTeamInfo: true,
              dateRange: 30
            }
          }
        };

        const connection = await connectionService.createConnection(userId, connectionData);
        importResults.push({
          success: true,
          originalId: connData.id,
          newId: connection.id,
          name: connection.name
        });
      } catch (error) {
        logger.error(`Failed to import connection ${connData.name}:`, error);
        importResults.push({
          success: false,
          originalId: connData.id,
          name: connData.name,
          error: error instanceof Error ? error.message : 'Import failed'
        });
      }
    }

    const successCount = importResults.filter(r => r.success).length;
    const failureCount = importResults.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Import completed: ${successCount} successful, ${failureCount} failed`,
      results: importResults
    });
  } catch (error) {
    logger.error('Bulk import error:', error);
    res.status(500).json({ message: 'Failed to import connections' });
  }
});

// DELETE: Remove connection
router.delete('/:connectionId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { connectionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    await connectionService.deleteConnection(userId, connectionId);
    res.json({ success: true, message: 'Connection deleted successfully' });
  } catch (error) {
    logger.error('Delete connection error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete connection';
    res.status(500).json({ success: false, message });
  }
});

export default router;