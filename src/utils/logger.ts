import winston from 'winston';

// Configure log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// Configure Winston logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'blocktrade-backend' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    
    // File transport for production
    new winston.transports.File({
      filename: process.env.LOG_FILE || 'logs/error.log',
      level: 'error',
    }),
    
    new winston.transports.File({
      filename: process.env.LOG_FILE || 'logs/combined.log',
    }),
  ],
});

// Create logs directory if it doesn't exist
import fs from 'fs';
import path from 'path';

const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

export default logger;
