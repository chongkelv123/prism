// backend/services/platform-integrations-service/src/index.ts
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

// Routes
app.use('/api/platforms', platformRoutes);
app.use('/api/connections', connectionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'platform-integrations' });
});

const PORT = Number(process.env.PORT) || 4005;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => logger.info(`Platform Integrations service up on ${PORT}`));
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