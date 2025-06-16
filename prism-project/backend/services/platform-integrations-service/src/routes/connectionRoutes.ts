// backend/services/platform-integrations-service/src/routes/connectionRoutes.ts
// FIXED VERSION - Added missing projects endpoint

import { Router, Request, Response } from 'express';
import { ConnectionService } from '../services/ConnectionService';
import { authenticateJWT } from '../middleware/auth';
import logger from '../utils/logger';

// Add this at the top of your connectionRoutes.ts file, after the imports
console.log('🔍 ConnectionRoutes: Loading connection routes...');

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
      metadata: metadata || {}
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
    
    // Return connections without sensitive config data
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

// ⭐ **CRITICAL FIX**: Missing Projects Endpoint
router.get('/:connectionId/projects', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { connectionId } = req.params;
    const { projectId } = req.query;

    logger.info('🔍 Projects endpoint called:', {
      userId,
      connectionId,
      projectId: projectId || 'all projects'
    });

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    // Get connection first to verify it exists and belongs to user
    const connection = await connectionService.getConnection(userId, connectionId);
    
    if (!connection) {
      logger.warn('❌ Connection not found:', { userId, connectionId });
      return res.status(404).json({ message: 'Connection not found' });
    }

    if (connection.status !== 'connected') {
      logger.warn('❌ Connection not active:', { 
        connectionId, 
        status: connection.status 
      });
      return res.status(400).json({ 
        message: 'Connection is not active',
        status: connection.status 
      });
    }

    // Get project data using ConnectionService
    logger.info('🔄 Fetching project data from external API...');
    const projectData = await connectionService.getProjectData(
      userId, 
      connectionId, 
      projectId as string
    );

    // Transform data for consistent format
    let projects = Array.isArray(projectData) ? projectData : [projectData];
    
    // Add additional fields for frontend consumption
    projects = projects.map((project: any) => ({
      id: project.id || project.key || project.board_id,
      name: project.name || project.displayName || project.title,
      platform: connection.platform,
      description: project.description || project.summary || '',
      status: project.status || 'active',
      metrics: project.metrics || [],
      team: project.team || project.members || [],
      tasks: project.tasks || project.items || project.issues || [],
      lastUpdated: project.updated || project.modified || new Date().toISOString(),
      // Raw data for debugging
      _raw: project
    }));

    logger.info('✅ Project data retrieved successfully:', {
      connectionId,
      platform: connection.platform,
      projectCount: projects.length,
      projectNames: projects.map(p => p.name).slice(0, 3) // First 3 names for debugging
    });

    res.json(projects);

  } catch (error) {
    logger.error('❌ Failed to get project data:', {
      connectionId: req.params.connectionId,
      userId: req.user?.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Provide helpful error response
    const message = error instanceof Error ? error.message : 'Failed to get project data';
    res.status(500).json({ 
      message,
      error: 'Project data retrieval failed',
      connectionId: req.params.connectionId
    });
  }
});

// READ: Get specific connection details
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

    // Return connection without sensitive config data
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

// TEST: Test connection
router.post('/:connectionId/test', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { connectionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const testResult = await connectionService.testConnection(userId, connectionId);
    
    res.json({ 
      success: testResult.success,
      status: testResult.success ? 'connected' : 'error',
      message: testResult.message || (testResult.success ? 'Connection successful' : 'Connection failed')
    });
  } catch (error) {
    logger.error('Test connection error:', error);
    const message = error instanceof Error ? error.message : 'Connection test failed';
    res.status(500).json({ success: false, message });
  }
});

// SYNC: Sync connection data
router.post('/:connectionId/sync', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { connectionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const syncResult = await connectionService.syncConnection(userId, connectionId);
    
    res.json(syncResult);
  } catch (error) {
    logger.error('Sync connection error:', error);
    const message = error instanceof Error ? error.message : 'Connection sync failed';
    res.status(500).json({ success: false, message });
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
    
    res.status(204).send();
  } catch (error) {
    logger.error('Delete connection error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete connection';
    res.status(500).json({ message });
  }
});

export default router;