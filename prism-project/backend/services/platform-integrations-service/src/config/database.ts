// backend/services/platform-integrations-service/src/config/database.ts
import mongoose from 'mongoose';
import logger from '../utils/logger';

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');
  await mongoose.connect(uri);
  logger.info('MongoDB connected for Platform Integrations');
}

export async function disconnectDB() {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}