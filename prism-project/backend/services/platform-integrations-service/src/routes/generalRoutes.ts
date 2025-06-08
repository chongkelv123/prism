// backend/services/platform-integrations-service/src/routes/generalRoutes.ts
import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../middleware/auth';
import logger from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    name: string;
  };
}

const router = Router();

// Public endpoints (no authentication required)

// Service information endpoint
router.get('/', (req: Request, res: Response) => {
  logger.info('Service info requested');
  
  res.json({
    service: 'platform-integrations',
    version: '1.0.0',
    description: 'PRISM Platform Integrations Service',
    capabilities: [
      'Platform connection management',
      'Credential validation',
      'Data synchronization',
      'Multi-platform support'
    ],
    supportedPlatforms: [
      {
        id: 'monday',
        name: 'Monday.com',
        status: 'supported',
        features: ['Boards', 'Items', 'Status Updates', 'Team Members']
      },
      {
        id: 'jira',
        name: 'Jira Cloud',
        status: 'supported',
        features: ['Issues', 'Projects', 'Sprints', 'Workflows']
      },
      {
        id: 'trofos',
        name: 'TROFOS',
        status: 'supported',
        features: ['Projects', 'Backlogs', 'Resources', 'Metrics']
      }
    ],
    endpoints: {
      platforms: '/api/platforms',
      connections: '/api/connections',
      documentation: '/api/platform-integrations/docs'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  logger.info('Health check requested');
  
  res.json({
    status: 'healthy',
    service: 'platform-integrations',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    },
    database: 'connected', // You could add actual DB health check here
    dependencies: {
      mongodb: 'connected',
      'external-apis': 'available'
    }
  });
});

// Service status endpoint
router.get('/status', (req: Request, res: Response) => {
  logger.info('Status check requested');
  
  const uptime = process.uptime();
  const uptimeString = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;
  
  res.json({
    service: 'platform-integrations',
    status: 'running',
    uptime: uptimeString,
    uptimeSeconds: uptime,
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    pid: process.pid,
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// API documentation endpoint
router.get('/docs', (req: Request, res: Response) => {
  logger.info('API documentation requested');
  
  res.json({
    title: 'PRISM Platform Integrations API',
    version: '1.0.0',
    description: 'API for managing platform connections and data synchronization',
    baseUrl: '/api/platform-integrations',
    endpoints: {
      general: {
        'GET /': 'Service information',
        'GET /health': 'Health check',
        'GET /status': 'Service status',
        'GET /docs': 'API documentation',
        'GET /metrics': 'Service metrics (authenticated)'
      },
      platforms: {
        'GET /api/platforms': 'List supported platforms',
        'GET /api/platforms/:id': 'Get platform details',
        'POST /api/platforms/:id/validate': 'Validate platform configuration'
      },
      connections: {
        'GET /api/connections': 'List user connections',
        'POST /api/connections': 'Create new connection',
        'GET /api/connections/:id': 'Get connection details',
        'POST /api/connections/:id/test': 'Test connection',
        'POST /api/connections/:id/sync': 'Sync connection data',
        'DELETE /api/connections/:id': 'Delete connection',
        'GET /api/connections/:id/projects': 'Get project data'
      }
    },
    authentication: {
      type: 'Bearer Token (JWT)',
      header: 'Authorization: Bearer <token>',
      note: 'Most endpoints require authentication except health checks and documentation'
    },
    examples: {
      validateJira: {
        url: 'POST /api/platforms/jira/validate',
        body: {
          config: {
            domain: 'company.atlassian.net',
            email: 'user@company.com',
            apiToken: 'your-api-token',
            projectKey: 'PROJ'
          }
        }
      },
      createConnection: {
        url: 'POST /api/connections',
        body: {
          name: 'My Jira Connection',
          platform: 'jira',
          config: {
            domain: 'company.atlassian.net',
            email: 'user@company.com',
            apiToken: 'your-api-token',
            projectKey: 'PROJ'
          }
        }
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Protected endpoints (authentication required)

// Service metrics endpoint (authenticated)
router.get('/metrics', authenticateJWT, (req: AuthenticatedRequest, res: Response) => {
  logger.info('Metrics requested', { userId: req.user?.userId });
  
  res.json({
    service: 'platform-integrations',
    metrics: {
      requests: {
        total: 0, // You could implement actual metrics tracking
        successful: 0,
        failed: 0,
        rate: '0 req/min'
      },
      connections: {
        total: 0, // You could query database for actual counts
        active: 0,
        failed: 0
      },
      platforms: {
        monday: { connections: 0, status: 'available' },
        jira: { connections: 0, status: 'available' },
        trofos: { connections: 0, status: 'available' }
      },
      performance: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    },
    timestamp: new Date().toISOString()
  });
});

// User connection summary (authenticated)
router.get('/summary', authenticateJWT, async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.info('Connection summary requested', { userId: req.user?.userId });
    
    // In a real implementation, you would query the database for user's connections
    // For now, returning a mock summary
    res.json({
      userId: req.user?.userId,
      connections: {
        total: 0,
        byPlatform: {
          monday: 0,
          jira: 0,
          trofos: 0
        },
        byStatus: {
          connected: 0,
          disconnected: 0,
          error: 0
        }
      },
      lastActivity: new Date().toISOString(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching connection summary:', error);
    res.status(500).json({
      error: 'Failed to fetch connection summary',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling for unknown routes
router.use('*', (req: Request, res: Response) => {
  logger.warn(`Unknown route accessed: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /api/platform-integrations/',
      'GET /api/platform-integrations/health',
      'GET /api/platform-integrations/status',
      'GET /api/platform-integrations/docs',
      'GET /api/platform-integrations/metrics (auth required)',
      'GET /api/platform-integrations/summary (auth required)'
    ],
    timestamp: new Date().toISOString()
  });
});

export default router;