// src/config/database.ts
import mongoose from 'mongoose';
import { logger } from '../utils/logger';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/prism-auth';
    
    await mongoose.connect(mongoURI);
    
    logger.info('MongoDB Connected');
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`MongoDB Connection Error: ${error.message}`);
    } else {
      logger.error('Unknown MongoDB Connection Error');
    }
    // Exit process with failure
    process.exit(1);
  }
};

export default connectDB;