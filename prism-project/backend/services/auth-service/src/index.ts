import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { connectDB, disconnectDB } from './config/database';
import { eventPublisher } from './events/publisher';
import authRoutes from './routes/authRoutes';
import logger from './utils/logger';

const app = express();
app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json());
app.use('/api/auth', authRoutes);

const PORT = Number(process.env.PORT) || 4000;

async function start() {
  try {
    await connectDB();
    await eventPublisher.init();
    app.listen(PORT, () => logger.info(`Auth service up on ${PORT}`));
  } catch (err) {
    logger.error('Startup failed', err);
    process.exit(1);
  }
}

start();

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down...');
  await eventPublisher.close();
  await disconnectDB();
  process.exit(0);
}

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);
