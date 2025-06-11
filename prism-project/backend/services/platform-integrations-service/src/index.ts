// backend/services/platform-integrations-service/src/index.ts - COMPLETE FIXED VERSION
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { connectDB, disconnectDB } from './config/database';
import platformRoutes from './routes/platformRoutes';
import connectionRoutes from './routes/connectionRoutes';
import logger from './utils/logger';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({ 
  origin: true,
  credentials: true 
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { 
    headers: req.headers, 
    body: req.method !== 'GET' ? req.body : undefined 
  });
  next();
});

// 1. BASIC HEALTH ENDPOINTS (NO AUTH REQUIRED)

// Root health endpoint
app.get('/health', (req, res) => {
  logger.info('Basic health check requested');
  res.status(200).json({
    status: 'healthy',
    service: 'platform-integrations',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  logger.info('Status check requested');
  res.status(200).json({
    service: 'platform-integrations',
    status: 'running',
    uptime: `${Math.floor(process.uptime())}s`,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    pid: process.pid
  });
});

// 2. API GATEWAY ROUTED ENDPOINTS

// Platform integrations health (through API Gateway)
app.get('/api/platform-integrations/health', (req, res) => {
  logger.info('Platform integrations health check via API Gateway');
  res.status(200).json({
    status: 'healthy',
    service: 'platform-integrations',
    version: '1.0.0',
    description: 'PRISM Platform Integrations Service',
    capabilities: [
      'Connection management',
      'Platform validation', 
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
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/platform-integrations/health',
      status: '/api/platform-integrations/status',
      platforms: '/api/platforms',
      connections: '/api/connections'
    }
  });
});

// Platform integrations status
app.get('/api/platform-integrations/status', (req, res) => {
  logger.info('Platform integrations status via API Gateway');
  res.status(200).json({
    service: 'platform-integrations',
    status: 'running',
    uptime: `${Math.floor(process.uptime())}s`,
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Service info endpoint
app.get('/api/platform-integrations/info', (req, res) => {
  logger.info('Platform integrations info requested');
  res.json({
    service: 'platform-integrations',
    version: '1.0.0',
    description: 'PRISM Platform Integrations Service',
    supportedPlatforms: [
      { id: 'monday', name: 'Monday.com', status: 'supported' },
      { id: 'jira', name: 'Jira Cloud', status: 'supported' },
      { id: 'trofos', name: 'TROFOS', status: 'supported' }
    ],
    endpoints: {
      health: '/api/platform-integrations/health',
      status: '/api/platform-integrations/status', 
      platforms: '/api/platforms',
      connections: '/api/connections'
    },
    timestamp: new Date().toISOString()
  });
});

// 3. MAIN API ROUTES (AUTHENTICATION REQUIRED)
app.use('/api/platforms', platformRoutes);
app.use('/api/connections', connectionRoutes);

// 4. ERROR HANDLING

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  logger.warn(`404 - API endpoint not found: ${req.method} ${req.path}`);
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    service: 'platform-integrations',
    availableRoutes: [
      'GET /health',
      'GET /status', 
      'GET /api/platform-integrations/health',
      'GET /api/platform-integrations/status',
      'GET /api/platform-integrations/info',
      'GET /api/platforms',
      'POST /api/platforms/:platformId/validate',
      'GET /api/connections (auth required)',
      'POST /api/connections (auth required)',
      'POST /api/connections/import (auth required)',
      'DELETE /api/connections/:id (auth required)'
    ],
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err: any, req: any, res: any, next: any) => {
  logger.error('Unhandled error:', err);
  
  if (!res.headersSent) {
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred',
      service: 'platform-integrations',
      timestamp: new Date().toISOString()
    });
  }
});

// 5. SERVER STARTUP

const PORT = Number(process.env.PORT) || 4005;

async function start() {
  try {
    // Connect to database (but continue if fails in development)
    await connectDB();
    
    app.listen(PORT, () => {
      logger.info(`Platform Integrations service running on port ${PORT}`);
      logger.info(`Health endpoints:`);
      logger.info(`  - GET http://localhost:${PORT}/health`);
      logger.info(`  - GET http://localhost:${PORT}/status`);
      logger.info(`  - GET http://localhost:${PORT}/api/platform-integrations/health`);
      logger.info(`  - GET http://localhost:${PORT}/api/platform-integrations/status`);
      logger.info(`API endpoints:`);
      logger.info(`  - GET /api/platforms`);
      logger.info(`  - POST /api/platforms/:platformId/validate`);
      logger.info(`  - GET /api/connections (auth required)`);
      logger.info(`  - POST /api/connections (auth required)`);
      logger.info(`Ready to receive requests!`);
    });
  } catch (err) {
    logger.error('Startup failed', err);
    process.exit(1);
  }
}

start();

// 6. GRACEFUL SHUTDOWN
async function shutdown() {
  logger.info('Shutting down platform integrations service...');
  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// 7. STARTUP HEALTH CHECK
setTimeout(() => {
  logger.info('Platform Integrations Service startup complete');
  logger.info('Testing internal health endpoint...');
  
  // Self-health check
  const http = require('http');
  const options = {
    hostname: 'localhost',
    port: PORT,
    path: '/health',
    method: 'GET'
  };
  
  const req = http.request(options, (res: any) => {
    if (res.statusCode === 200) {
      logger.info(`Self-health check passed: ${res.statusCode}`);
    } else {
      logger.warn(`Self-health check failed: ${res.statusCode}`);
    }
  });
  
  req.on('error', (err: any) => {
    logger.error('Self-health check error:', err.message);
  });
  
  req.end();
}, 2000);