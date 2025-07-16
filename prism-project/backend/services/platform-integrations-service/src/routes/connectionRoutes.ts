// backend/services/platform-integrations-service/src/routes/connectionRoutes.ts
// UPDATED CONNECTION ROUTES - Fixed TypeScript syntax errors

import { Router, Request, Response, NextFunction } from 'express';
import { authenticateJWT } from '../middleware/auth';
import logger from '../utils/logger';
import { ConnectionService } from '../services/ConnectionService';
import { PlatformConnectionFactory } from '../factories/PlatformConnectionFactory';

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

const router = Router();
const connectionService = new ConnectionService();
const platformFactory = new PlatformConnectionFactory();

// Apply authentication to all routes
router.use(authenticateJWT);

// Get all connections for a user
router.get('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    
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

// Create a new connection (supports all platforms including TROFOS)
router.post('/', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const { name, platform, config } = req.body;

    if (!name || !platform || !config) {
      return res.status(400).json({
        message: 'Missing required fields: name, platform, config'
      });
    }

    // Validate platform is supported
    const supportedPlatforms = platformFactory.getSupportedPlatforms();
    if (!supportedPlatforms.includes(platform)) {
      return res.status(400).json({
        message: `Unsupported platform: ${platform}. Supported: ${supportedPlatforms.join(', ')}`
      });
    }

    // Validate configuration using platform factory
    const configValidation = await platformFactory.validatePlatformConfig(platform, config);
    if (!configValidation.valid) {
      return res.status(400).json({
        message: 'Invalid configuration',
        details: configValidation.message,
        errors: configValidation.details
      });
    }

    // Create connection using existing ConnectionService (works for all platforms)
    const connection = await connectionService.createConnection(userId, {
      name,
      platform,
      config
    });

    res.status(201).json({
      id: connection.id,
      name: connection.name,
      platform: connection.platform,
      status: connection.status,
      createdAt: connection.createdAt
    });

  } catch (error) {
    logger.error('Create connection error:', error);
    res.status(500).json({ 
      message: 'Failed to create connection',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get projects for a connection - ENHANCED WITH PLATFORM FACTORY
router.get('/:connectionId/projects', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { connectionId } = req.params;
    const { projectId } = req.query;

    logger.info('Projects endpoint called via platform factory', {
      userId,
      connectionId,
      projectId: projectId || 'all projects',
      endpoint: 'GET /api/connections/:connectionId/projects'
    });

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    // Use platform factory to route to appropriate handler
    const result = await platformFactory.getProjectData(
      userId,
      connectionId,
      projectId as string
    );

    if (!result.success) {
      logger.warn('Platform factory returned error', {
        connectionId,
        error: result.error,
        handler: result.handler
      });
      
      return res.status(404).json({
        message: result.error || 'Failed to get project data',
        handler: result.handler
      });
    }

    const projects = result.data || [];

    // Filter out any null/undefined projects (defensive)
    const validProjects = projects.filter(project => 
      project && project.id && project.name
    );
    
    if (validProjects.length === 0) {
      logger.warn('No valid projects after filtering', {
        connectionId,
        originalCount: projects.length,
        handler: result.handler
      });
      
      return res.status(404).json({ 
        message: 'No valid projects found',
        details: 'All returned projects were invalid or empty',
        handler: result.handler
      });
    }

    // Add metadata for response
    const response = {
      projects: validProjects,
      connectionInfo: {
        id: connectionId,
        handler: result.handler,
        architecture: result.handler === 'trofos' ? 'SOLID' : 'Legacy'
      },
      totalCount: validProjects.length,
      metadata: result.metadata,
      timestamp: new Date().toISOString()
    };

    logger.info(`Successfully returned ${validProjects.length} projects via ${result.handler} handler`, {
      connectionId,
      handler: result.handler,
      projectsCount: validProjects.length
    });

    res.json(response);

  } catch (error) {
    logger.error('Get project data error:', error);
    res.status(500).json({ 
      message: 'Failed to get project data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test connection - ENHANCED WITH PLATFORM FACTORY
router.post('/:connectionId/test', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { connectionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    logger.info('Testing connection via platform factory', {
      userId,
      connectionId
    });

    // Use platform factory to route to appropriate handler
    const result = await platformFactory.testConnection(userId, connectionId);

    logger.info('Connection test completed', {
      connectionId,
      success: result.success,
      handler: result.handler
    });

    res.json({
      success: result.success,
      message: result.message,
      handler: result.handler,
      details: result.details,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Connection test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check for connection - NEW ENDPOINT
router.get('/:connectionId/health', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { connectionId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    const result = await platformFactory.healthCheck(userId, connectionId);

    res.json({
      healthy: result.healthy,
      handler: result.handler,
      components: result.components,
      message: result.message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      healthy: false,
      message: error instanceof Error ? error.message : 'Health check failed'
    });
  }
});

// Sync connection (uses existing ConnectionService for all platforms)
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

  } catch (error) {
    logger.error('Sync connection error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Sync failed'
    });
  }
});

// Delete connection (uses existing ConnectionService)
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

  } catch (error) {
    logger.error('Delete connection error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to delete connection'
    });
  }
});

// Get platform information - NEW ENDPOINT
router.get('/platforms/:platform/info', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    
    const supportedPlatforms = platformFactory.getSupportedPlatforms();
    if (!supportedPlatforms.includes(platform)) {
      return res.status(404).json({
        message: `Platform '${platform}' not supported`,
        supportedPlatforms
      });
    }

    const platformInfo = platformFactory.getPlatformInfo(platform);
    
    res.json({
      platform,
      ...platformInfo,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Get platform info error:', error);
    res.status(500).json({
      message: 'Failed to get platform information'
    });
  }
});

// Legacy platform-specific endpoints (for backward compatibility)
router.get('/:connectionId/jira/projects/:projectId', async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    const { connectionId, projectId } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User ID required' });
    }

    // Route through platform factory
    const result = await platformFactory.getProjectData(userId, connectionId, projectId);
    
    if (!result.success || !result.data || result.data.length === 0) {
      return res.status(404).json({ message: 'Jira project not found' });
    }

    const project = result.data[0];
    
    res.json({
      project: project,
      connectionInfo: {
        id: connectionId,
        handler: result.handler
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Get Jira project error:', error);
    res.status(500).json({ message: 'Failed to get Jira project data' });
  }
});

export default router;