// backend/services/platform-integrations-service/src/routes/connectionRoutes.ts

import { Router, Request, Response } from 'express';
import authenticateJWT from '../middleware/auth'; // Fixed: default import
import { ConnectionService } from '../services/ConnectionService';
import logger from '../utils/logger';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name: string; // Added to match auth middleware output
  };
}

const router = Router();
const connectionService = new ConnectionService();

// Apply authentication to all routes
router.use(authenticateJWT);

// GET all connections for a user
router.get('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const connections = await connectionService.getConnections(userId);

    // Return safe connection data (without sensitive config)
    const safeConnections = connections.map(conn => ({
      id: conn._id || conn.id,
      name: conn.name,
      platform: conn.platform,
      status: conn.status,
      projectCount: conn.projectCount || 0,
      lastSync: conn.lastSync,
      lastSyncError: conn.lastSyncError,
      createdAt: conn.createdAt
    }));

    res.json(safeConnections);
  } catch (error: any) {
    logger.error('Get connections error:', error);
    res.status(500).json({ message: 'Failed to get connections' });
  }
});

// CREATE: Add new connection
router.post('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const { name, platform, config, metadata } = req.body;

    if (!name || !platform || !config) {
      return res.status(400).json({
        message: 'Name, platform, and config are required'
      });
    }

    // Validate platform is supported
    const supportedPlatforms = ['monday', 'jira', 'trofos']; // Based on ConnectionService
    if (!supportedPlatforms.includes(platform)) {
      return res.status(400).json({
        message: `Unsupported platform: ${platform}. Supported: ${supportedPlatforms.join(', ')}`
      });
    }

    const connection = await connectionService.createConnection(userId, {
      name,
      platform,
      config,
      metadata
    });

    res.status(201).json({
      id: connection._id || connection.id,
      name: connection.name,
      platform: connection.platform,
      status: connection.status,
      createdAt: connection.createdAt
    });

  } catch (error: any) {
    logger.error('Create connection error:', error);
    const message = error.message || 'Failed to create connection';
    res.status(500).json({ message });
  }
});

// GET specific connection by ID
router.get('/:connectionId', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { connectionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const connection = await connectionService.getConnection(userId, connectionId);

    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    // Return safe connection data
    res.json({
      id: connection._id || connection.id,
      name: connection.name,
      platform: connection.platform,
      status: connection.status,
      projectCount: connection.projectCount || 0,
      lastSync: connection.lastSync,
      lastSyncError: connection.lastSyncError,
      createdAt: connection.createdAt
    });

  } catch (error: any) {
    logger.error('Get connection error:', error);
    res.status(500).json({ message: 'Failed to get connection' });
  }
});

// GET projects for a connection - CRITICAL ENDPOINT for Report Generation Service
router.get('/:connectionId/projects', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { connectionId } = req.params;
    const { projectId } = req.query;

    logger.info('Projects endpoint called', {
      userId,
      connectionId,
      projectId: projectId || 'all projects',
      endpoint: 'GET /api/connections/:connectionId/projects'
    });

    // ✅ ADD THIS DEBUG LOG:
    console.log('🔍 DEBUG - Platform-integrations received request:', {
      connectionId,
      projectId,  // ← This should be different for different projects
      endpoint: 'GET /api/connections/:connectionId/projects'
    });

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    // Use ConnectionService to get project data
    const projects = await connectionService.getProjectData(
      userId,
      connectionId,
      projectId as string
    );

    if (!projects || projects.length === 0) {
      logger.warn('No projects found', { connectionId, userId });
      return res.status(404).json({
        message: 'No projects found for this connection',
        projects: []
      });
    }

    // Return standardized project data
    res.json({
      projects: projects,
      connectionId: connectionId,
      totalCount: projects.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Get project data error:', error);
    res.status(500).json({
      message: 'Failed to get project data',
      error: error.message || 'Unknown error'
    });
  }
});

// POST test connection
router.post('/:connectionId/test', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { connectionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const result = await connectionService.testConnection(userId, connectionId);

    res.json({
      success: result.success,
      message: result.message,
      details: result.details,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Connection test failed'
    });
  }
});

// POST sync connection
router.post('/:connectionId/sync', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { connectionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const result = await connectionService.syncConnection(userId, connectionId);
    res.json(result);

  } catch (error: any) {
    logger.error('Sync connection error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Sync failed'
    });
  }
});

// DELETE connection
router.delete('/:connectionId', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { connectionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    await connectionService.deleteConnection(userId, connectionId);
    res.json({ message: 'Connection deleted successfully' });

  } catch (error: any) {
    logger.error('Delete connection error:', error);
    res.status(500).json({
      message: error.message || 'Failed to delete connection'
    });
  }
});

// Legacy support: GET specific Jira project (for backward compatibility)
router.get('/:connectionId/jira/projects/:projectId', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { connectionId, projectId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const projects = await connectionService.getProjectData(userId, connectionId, projectId);

    if (!projects || projects.length === 0) {
      return res.status(404).json({ message: 'Jira project not found' });
    }

    const project = projects[0];

    res.json({
      project: project,
      connectionId: connectionId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    logger.error('Get Jira project error:', error);
    res.status(500).json({ message: 'Failed to get Jira project data' });
  }
});

export default router;