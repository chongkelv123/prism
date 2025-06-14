// backend/services/platform-integrations-service/src/config/database.ts
import mongoose from 'mongoose';
import logger from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      logger.warn('MONGODB_URI not set - running without database (development mode)');
      logger.warn('This is normal for development. Some features may not work without database.');
      logger.info('To enable database later: Set MONGODB_URI in .env file');
      return;
    }

    // Fix URI construction - handle database name properly
    const databaseName = 'prism-platform-integrations';
    let uri: string;
    
    // Parse the existing URI to inject database name correctly
    if (mongoUri.includes('?')) {
      // URI has query parameters: mongodb+srv://user:pass@host/?params
      // We need: mongodb+srv://user:pass@host/database?params
      const [baseUri, queryString] = mongoUri.split('?');
      
      // Remove trailing slash if present
      const cleanBaseUri = baseUri.endsWith('/') ? baseUri.slice(0, -1) : baseUri;
      
      uri = `${cleanBaseUri}/${databaseName}?${queryString}`;
    } else {
      // URI has no query parameters
      const cleanBaseUri = mongoUri.endsWith('/') ? mongoUri.slice(0, -1) : mongoUri;
      uri = `${cleanBaseUri}/${databaseName}`;
    }

    logger.info('Connecting to MongoDB...', { 
      uri: uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'), // Hide credentials in logs
      databaseName: databaseName
    });

    await mongoose.connect(uri, {
      connectTimeoutMS: 10000,  // 10 second timeout
      serverSelectionTimeoutMS: 5000, // 5 second timeout
    });

    logger.info('✅ MongoDB connected successfully');
    
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error);
    
    // In development, continue without database
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Continuing in development mode without database');
    } else {
      throw error;
    }
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
  }
};