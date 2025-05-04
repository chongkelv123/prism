import * as dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { connectDB, disconnectDB } from './config/database';
import reportRoutes from './routes/reportRoutes';
import logger from './utils/logger';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/api/reports', reportRoutes);

const PORT = Number(process.env.PORT) || 4002;

async function start() {
  try {
    await connectDB();
    app.listen(PORT, () => logger.info(`Report generation service up on ${PORT}`));
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

process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);