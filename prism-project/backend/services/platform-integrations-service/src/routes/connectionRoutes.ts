// backend/services/platform-integrations-service/src/routes/connectionRoutes.ts
// MISSING ENDPOINTS FIX - Add the endpoints that report generation service is calling
// Replace your existing connectionRoutes.ts with this complete version

import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { ConnectionService } from '../services/ConnectionService';
import logger from '../utils/logger';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name: string;
  };
}

const router = Router();
const connectionService = new ConnectionService();

// Apply authentication to all routes
router.use(authenticateJWT);

// CREATE: Add new connection
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const { name, platform, config, metadata } = req.body;

    if (!name || !platform || !config) {
      return res.status(400).json({ 
        message: 'Name, platform, and config are required' 
      });
    }

    const connection = await connectionService.createConnection(userId, {
      name,
      platform,
      config,
      metadata
    });

    res.status(201).json(connection);
  } catch (error: any) {
    logger.error('Create connection error:', error);
    const message = error.message || 'Failed to create connection';
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

// **CRITICAL MISSING ENDPOINT #1**: Projects endpoint 
// This is the PRIMARY endpoint that report generation service calls
router.get('/:connectionId/projects', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { connectionId } = req.params;
    const { projectId } = req.query;

    logger.info('🎯 CRITICAL ENDPOINT CALLED: Projects endpoint', {
      userId,
      connectionId,
      projectId: projectId || 'all projects',
      endpoint: 'GET /api/connections/:connectionId/projects'
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

    if (!projectData) {
      logger.warn('⚠️ No project data returned from platform');
      return res.status(404).json({ 
        message: 'Project data not found',
        details: 'The platform returned no data for this project'
      });
    }

    // Transform data for consistent format
    let projects = Array.isArray(projectData) ? projectData : [projectData];
    
    // Filter out any null/undefined projects
    projects = projects.filter(project => project && project.id && project.name);
    
    if (projects.length === 0) {
      logger.warn('⚠️ No valid projects after filtering');
      return res.status(404).json({ 
        message: 'No valid projects found',
        details: 'All returned projects were invalid or empty'
      });
    }

    // Add metadata for report generation
    const response = {
      projects: projects,
      connectionInfo: {
        id: connection.id,
        name: connection.name,
        platform: connection.platform,
        lastSync: connection.lastSync
      },
      totalCount: projects.length,
      timestamp: new Date().toISOString()
    };

    logger.info(`✅ Successfully returned ${projects.length} projects for connection ${connectionId}`);
    res.json(response);

  } catch (error) {
    logger.error('❌ Get project data error:', error);
    res.status(500).json({ 
      message: 'Failed to get project data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// **MISSING ENDPOINT #2**: Platform-specific Jira endpoint 
// Report service sometimes calls this for backward compatibility
router.get('/:connectionId/jira/projects/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { connectionId, projectId } = req.params;

    logger.info('🎯 Jira-specific project endpoint called:', {
      userId,
      connectionId,
      projectId,
      endpoint: 'GET /api/connections/:connectionId/jira/projects/:projectId'
    });

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    // Verify connection is Jira
    const connection = await connectionService.getConnection(userId, connectionId);
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    if (connection.platform !== 'jira') {
      return res.status(400).json({ 
        message: 'This endpoint is only for Jira connections',
        actualPlatform: connection.platform
      });
    }

    // Get project data
    const projectData = await connectionService.getProjectData(userId, connectionId, projectId);
    
    if (!projectData) {
      return res.status(404).json({ message: 'Jira project not found' });
    }

    // Return single project or first project from array
    const project = Array.isArray(projectData) ? projectData[0] : projectData;
    
    if (!project || !project.id || !project.name) {
      return res.status(404).json({ message: 'Invalid Jira project data' });
    }

    res.json({
      project: project,
      connectionInfo: {
        id: connection.id,
        name: connection.name,
        platform: connection.platform
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ Get Jira project error:', error);
    res.status(500).json({ message: 'Failed to get Jira project data' });
  }
});

// **MISSING ENDPOINT #3**: Platform-specific Monday.com endpoint
router.get('/:connectionId/monday/projects/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { connectionId, projectId } = req.params;

    logger.info('🎯 Monday.com-specific project endpoint called:', {
      userId,
      connectionId,
      projectId,
      endpoint: 'GET /api/connections/:connectionId/monday/projects/:projectId'
    });

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    // Verify connection is Monday.com
    const connection = await connectionService.getConnection(userId, connectionId);
    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    if (connection.platform !== 'monday') {
      return res.status(400).json({ 
        message: 'This endpoint is only for Monday.com connections',
        actualPlatform: connection.platform
      });
    }

    // Get project data
    const projectData = await connectionService.getProjectData(userId, connectionId, projectId);
    
    if (!projectData) {
      return res.status(404).json({ message: 'Monday.com project not found' });
    }

    // Return single project or first project from array
    const project = Array.isArray(projectData) ? projectData[0] : projectData;
    
    if (!project || !project.id || !project.name) {
      return res.status(404).json({ message: 'Invalid Monday.com project data' });
    }

    res.json({
      project: project,
      connectionInfo: {
        id: connection.id,
        name: connection.name,
        platform: connection.platform
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('❌ Get Monday.com project error:', error);
    res.status(500).json({ message: 'Failed to get Monday.com project data' });
  }
});

// CONNECTION MANAGEMENT: Test connection
router.post('/:connectionId/test', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { connectionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const result = await connectionService.testConnection(userId, connectionId);
    res.json(result);
  } catch (error) {
    logger.error('Test connection error:', error);
    res.status(500).json({ message: 'Failed to test connection' });
  }
});

// CONNECTION MANAGEMENT: Sync connection data
router.post('/:connectionId/sync', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { connectionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const result = await connectionService.syncConnection(userId, connectionId);
    res.json(result);
  } catch (error) {
    logger.error('Sync connection error:', error);
    res.status(500).json({ message: 'Failed to sync connection' });
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
    res.status(500).json({ message: 'Failed to delete connection' });
  }
});

// IMPORT: Import connections from file/backup
router.post('/import', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const { connections } = req.body;
    if (!Array.isArray(connections)) {
      return res.status(400).json({ message: 'Connections array required' });
    }

    const results = [];
    for (const connData of connections) {
      try {
        const connection = await connectionService.createConnection(userId, connData);
        results.push({ success: true, connection });
      } catch (error: any) {
        results.push({ 
          success: false, 
          error: error.message,
          connectionName: connData.name 
        });
      }
    }

    res.json({ 
      imported: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results 
    });
  } catch (error) {
    logger.error('Import connections error:', error);
    res.status(500).json({ message: 'Failed to import connections' });
  }
});

export default router;