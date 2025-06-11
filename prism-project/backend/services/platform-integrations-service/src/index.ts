// backend/services/platform-integrations-service/src/index.ts - ENSURE THESE ROUTES EXIST
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { connectDB, disconnectDB } from './config/database';
import platformRoutes from './routes/platformRoutes';
import connectionRoutes from './routes/connectionRoutes';
import logger from './utils/logger';

const app = express();
app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json());

// CRITICAL: These routes must exist for the frontend to work

// 1. Basic service health endpoints (NO /api prefix needed)
app.get('/health', (req, res) => {
  logger.info('Health check requested');
  res.status(200).json({
    status: 'healthy',
    service: 'platform-integrations',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    }
  });
});

app.get('/status', (req, res) => {
  logger.info('Status check requested');
  res.status(200).json({
    service: 'platform-integrations',
    status: 'running',
    uptime: `${Math.floor(process.uptime())}s`,
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// 2. Platform integrations specific endpoints (WITH /api prefix)
app.get('/api/platform-integrations/health', (req, res) => {
  logger.info('Platform integrations health check');
  res.status(200).json({
    status: 'healthy',
    service: 'platform-integrations',
    version: '1.0.0',
    capabilities: [
      'Connection management',
      'Platform validation',
      'Data synchronization'
    ],
    supportedPlatforms: ['monday', 'jira'],
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/platform-integrations/status', (req, res) => {
  res.status(200).json({
    service: 'platform-integrations',
    status: 'running',
    uptime: `${Math.floor(process.uptime())}s`,
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/platform-integrations/info', (req, res) => {
  logger.info('Service info requested');
  res.json({
    service: 'platform-integrations',
    version: '1.0.0',
    description: 'PRISM Platform Integrations Service',
    supportedPlatforms: [
      { id: 'monday', name: 'Monday.com', status: 'supported' },
      { id: 'jira', name: 'Jira Cloud', status: 'supported' }
    ],
    endpoints: {
      health: '/api/platform-integrations/health',
      platforms: '/api/platforms',
      connections: '/api/connections'
    },
    timestamp: new Date().toISOString()
  });
});

// 3. Main API routes
app.use('/api/platforms', platformRoutes);
app.use('/api/connections', connectionRoutes);

const PORT = Number(process.env.PORT) || 4005;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`Platform Integrations service running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`Available endpoints:`);
      logger.info(`  - GET /health (service health)`);
      logger.info(`  - GET /status (service status)`);
      logger.info(`  - GET /api/platform-integrations/health`);
      logger.info(`  - GET /api/platform-integrations/status`);
      logger.info(`  - GET /api/platform-integrations/info`);
      logger.info(`  - /api/platforms/* (platform management)`);
      logger.info(`  - /api/connections/* (connection management)`);
    });
  } catch (err) {
    logger.error('Startup failed', err);
    process.exit(1);
  }
}

start();

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down...');
  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);