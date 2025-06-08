// backend/services/platform-integrations-service/src/index.ts - ADD MISSING ROUTES
import dotenv from 'dotenv';
dotenv.config();

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

// Existing routes
app.use('/api/platforms', platformRoutes);
app.use('/api/connections', connectionRoutes);

// NEW: Add the missing /api/platform-integrations routes
app.use('/api/platform-integrations', (req, res, next) => {
  logger.info(`Platform integrations route accessed: ${req.method} ${req.path}`);
  next();
});

// Service info endpoint
app.get('/api/platform-integrations/info', (req, res) => {
  logger.info('Service info requested');
  res.json({
    service: 'platform-integrations',
    version: '1.0.0',
    status: 'running',
    description: 'PRISM Platform Integrations Service',
    supportedPlatforms: [
      { id: 'monday', name: 'Monday.com', status: 'supported' },
      { id: 'jira', name: 'Jira Cloud', status: 'supported' },
      { id: 'trofos', name: 'TROFOS', status: 'supported' }
    ],
    endpoints: {
      platforms: '/api/platforms',
      connections: '/api/connections',
      info: '/api/platform-integrations/info',
      health: '/api/platform-integrations/health'
    },
    timestamp: new Date().toISOString()
  });
});

// Health check for platform integrations
app.get('/api/platform-integrations/health', (req, res) => {
  logger.info('Platform integrations health check');
  res.json({
    status: 'healthy',
    service: 'platform-integrations',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Service status
app.get('/api/platform-integrations/status', (req, res) => {
  res.json({
    service: 'platform-integrations',
    status: 'running',
    uptime: `${Math.floor(process.uptime())}s`,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    },
    timestamp: new Date().toISOString()
  });
});

// Root service health check (no /api prefix)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'platform-integrations',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Service status (no /api prefix)
app.get('/status', (req, res) => {
  res.status(200).json({
    service: 'platform-integrations',
    status: 'running',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

const PORT = Number(process.env.PORT) || 4005;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`Platform Integrations service up on ${PORT}`);
      logger.info(`Available routes:`);
      logger.info(`  - GET /health (service health)`);
      logger.info(`  - GET /status (service status)`);
      logger.info(`  - /api/platforms/* (platform management)`);
      logger.info(`  - /api/connections/* (connection management)`);
      logger.info(`  - /api/platform-integrations/info (service info)`);
      logger.info(`  - /api/platform-integrations/health (service health)`);
      logger.info(`  - /api/platform-integrations/status (service status)`);
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