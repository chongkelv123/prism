// backend/services/platform-integrations-service/src/config/database.ts
import mongoose from 'mongoose';
import logger from '../utils/logger';

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  logger.info(`Database connection - Environment: ${nodeEnv}`);
  logger.info(`Database connection - MONGODB_URI provided: ${uri ? 'Yes' : 'No'}`);
  
  // Always allow development mode to run without MongoDB
  if (!uri) {
    logger.warn('MONGODB_URI not set - running without database (development mode)');
    logger.warn('This is normal for development. Some features may not work without database.');
    logger.info('To enable database later: Set MONGODB_URI in .env file');
    return; // Return early without throwing error
  }
  
  try {
    logger.info(`Connecting to MongoDB: ${uri}`);
    await mongoose.connect(uri);
    logger.info('MongoDB connected successfully for Platform Integrations');
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    
    // In development, continue without database
    logger.warn('Continuing without database connection (development mode)');
    logger.info('To fix: Install MongoDB or use Docker: docker run -d -p 27017:27017 mongo');
  }
}

export async function disconnectDB() {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected');
    }
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
  }
}