// backend/services/platform-integrations-service/src/utils/logger.ts
// FIXED VERSION - Prevents circular structure errors
// Replace your existing logger.ts with this version

import winston from 'winston';

// Helper function to safely stringify objects, avoiding circular references
function safeStringify(obj: any): string {
  if (obj === null || obj === undefined) {
    return 'null';
  }
  
  if (typeof obj === 'string') {
    return obj;
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return String(obj);
  }
  
  if (obj instanceof Error) {
    return JSON.stringify({
      name: obj.name,
      message: obj.message,
      stack: obj.stack
    });
  }
  
  try {
    // Use JSON.stringify with replacer to handle circular references
    return JSON.stringify(obj, (key, value) => {
      // Skip circular references and problematic objects
      if (value === null) return null;
      if (typeof value === 'object') {
        // Skip known problematic objects that cause circular references
        if (value.constructor && (
          value.constructor.name === 'TLSSocket' ||
          value.constructor.name === 'HTTPParser' ||
          value.constructor.name === 'ClientRequest' ||
          value.constructor.name === 'IncomingMessage' ||
          value.constructor.name === 'Socket'
        )) {
          return '[Circular Object Removed]';
        }
        
        // Handle axios response objects
        if (value.request || value.response || value.config) {
          return {
            status: value.status || value.statusCode,
            statusText: value.statusText || value.statusMessage,
            message: value.message,
            code: value.code
          };
        }
      }
      return value;
    }, 2);
  } catch (error) {
    // If JSON.stringify still fails, return a safe representation
    return `[Object could not be serialized: ${obj.constructor?.name || typeof obj}]`;
  }
}

// Custom format that safely handles all objects
const safeFormat = winston.format.printf(({ level, message, timestamp, service, ...meta }) => {
  let metaString = '';
  
  if (Object.keys(meta).length > 0) {
    try {
      metaString = ' ' + safeStringify(meta);
    } catch (error) {
      metaString = ' [Meta data could not be serialized]';
    }
  }
  
  const servicePrefix = service ? `[${service}]` : '[Platform-Integrations]';
  return `${timestamp} ${servicePrefix} [${level}]: ${message}${metaString}`;
});

// Create logger with safe formatting
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    safeFormat
  ),
  defaultMeta: { service: 'platform-integrations' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      safeFormat
    )
  }));
}

// Safe logging methods that prevent circular structure errors
const safeLogger = {
  error: (message: string, meta?: any) => {
    logger.error(message, meta ? { safeMeta: safeStringify(meta) } : {});
  },
  
  warn: (message: string, meta?: any) => {
    logger.warn(message, meta ? { safeMeta: safeStringify(meta) } : {});
  },
  
  info: (message: string, meta?: any) => {
    logger.info(message, meta ? { safeMeta: safeStringify(meta) } : {});
  },
  
  debug: (message: string, meta?: any) => {
    logger.debug(message, meta ? { safeMeta: safeStringify(meta) } : {});
  }
};

export default safeLogger;