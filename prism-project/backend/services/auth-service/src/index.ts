// src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { eventPublisher } from './events/publisher';
import connectDB from './config/database';
import authRoutes from './routes/authRoutes';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 4000;

// Connect to MongoDB
connectDB();

// Initialize event publisher
(async () => {
  try {
    await eventPublisher.init();
    logger.info('Event publisher initialized');
  } catch (error) {
    logger.error(`Failed to initialize event publisher: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
})();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'Auth service is running' });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: Function) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ message: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Auth service running on port ${PORT}`);
});

// Handle graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down auth service...');
  await eventPublisher.close();
  process.exit(0);
};

// Listen for termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);