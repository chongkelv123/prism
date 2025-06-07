// src/routes/connectionRoutes.ts

import { Router, Request, Response } from 'express';
import { ConnectionService } from '../services/ConnectionService';
import { authenticateJWT } from '../middleware/auth';
import logger from '../utils/logger';

/**
 * Extend Express’s Request so that `req.user?.userId` is known to TypeScript.
 * Your JWT middleware attaches `{ userId: string }` on req.user.
 */
interface AuthRequest extends Request {
  user?: { userId: string };
}

const router = Router();
const connectionService = new ConnectionService();

// All routes require a valid JWT
router.use(authenticateJWT);

/**
 * Create a new connection
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { name, platform, config } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }
    if (!name || !platform || !config) {
      return res.status(400).json({
        message: 'Name, platform, and config are required'
      });
    }

    const connection = await connectionService.createConnection(userId, {
      name,
      platform,
      config
    });

    // Strip out sensitive config before returning
    const safeConnection = {
      id: connection.id,
      name: connection.name,
      platform: connection.platform,
      status: connection.status,
      projectCount: connection.projectCount,
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

/**
 * List all connections for the authenticated user
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const connections = await connectionService.getConnections(userId);
    const safeConnections = connections.map(conn => ({
      id: conn.id,
      name: conn.name,
      platform: conn.platform,
      status: conn.status,
      projectCount: conn.projectCount,
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

/**
 * Get details of a single connection
 */
router.get('/:connectionId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { connectionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const connection = await connectionService.getConnection(userId, connectionId);
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    const safeConnection = {
      id: connection.id,
      name: connection.name,
      platform: connection.platform,
      status: connection.status,
      projectCount: connection.projectCount,
      lastSync: connection.lastSync,
      lastSyncError: connection.lastSyncError,
      createdAt: connection.createdAt
    };

    res.json(safeConnection);
  } catch (error) {
    logger.error('Get connection error:', error);
    res.status(500).json({ message: 'Failed to get connection' });
  }
});

/**
 * Test (validate) a connection’s credentials
 */
router.post('/:connectionId/test', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { connectionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const isConnected = await connectionService.testConnection(userId, connectionId);
    res.json({
      success: isConnected,
      status: isConnected ? 'connected' : 'error',
      message: isConnected ? 'Connection successful' : 'Connection failed'
    });
  } catch (error) {
    logger.error('Test connection error:', error);
    const message = error instanceof Error ? error.message : 'Connection test failed';
    res.status(500).json({ success: false, message });
  }
});

/**
 * Kick off a sync of the connection’s data
 */
router.post('/:connectionId/sync', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { connectionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    await connectionService.syncConnection(userId, connectionId);
    res.json({ success: true, message: 'Sync started' });
  } catch (error) {
    logger.error('Sync connection error:', error);
    const message = error instanceof Error ? error.message : 'Connection sync failed';
    res.status(500).json({ success: false, message });
  }
});

/**
 * Delete a connection
 */
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

/**
 * Get project data via query parameter `?projectId=...`
 */
router.get('/:connectionId/projects', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { connectionId } = req.params;
    const { projectId } = req.query;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const projectData = await connectionService.getProjectData(
      userId,
      connectionId,
      projectId as string
    );
    res.json(projectData);
  } catch (error) {
    logger.error('Get project data error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get project data';
    res.status(500).json({ message });
  }
});

export default router;
