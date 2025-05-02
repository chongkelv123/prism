// src/utils/logger.ts
export const logger = {
    info: (message: string): void => {
      console.log(`[INFO] ${new Date().toISOString()} - ${message}`);
    },
    
    error: (message: string): void => {
      console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
    },
    
    warn: (message: string): void => {
      console.warn(`[WARN] ${new Date().toISOString()} - ${message}`);
    },
    
    debug: (message: string): void => {
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`);
      }
    }
  };