// backend/services/report-generation-service/src/index.ts
import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { connectDB, disconnectDB } from './config/database';
import reportRoutes from './routes/reportRoutes';
import logger from './utils/logger';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'report-generation-service',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/reports', reportRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

const PORT = Number(process.env.PORT) || 4002;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      logger.info(`Report generation service running on port ${PORT}`);
      logger.info(`API Gateway URL: ${process.env.API_GATEWAY_URL || 'http://localhost:3000'}`);
    });
  } catch (err) {
    logger.error('Startup failed', err);
    process.exit(1);
  }
}

start();

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down report generation service...');
  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);