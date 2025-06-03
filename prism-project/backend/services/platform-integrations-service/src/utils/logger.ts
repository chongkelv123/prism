// backend/services/platform-integrations-service/src/utils/logger.ts
import { createLogger, format, transports } from 'winston';

export default createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message, ...meta }) =>
      `${timestamp} [Platform-Integrations] [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`
    )
  ),
  transports: [new transports.Console()]
});

