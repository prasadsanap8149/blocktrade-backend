// Load environment variables first, before any other imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { logger } from './utils/logger';
import { database } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { authRoutes } from './routes/auth.routes';
import { letterOfCreditRoutes } from './routes/letterOfCredit.routes';
import { documentRoutes } from './routes/document.routes';
import { kycRoutes } from './routes/kyc.routes';
import { userRoutes } from './routes/user.routes';
import { setupSwagger } from './config/swagger';

const app = express();
const server = createServer(app);

// Port configuration
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware setup
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(compression());

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:4201'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API routes
const apiPrefix = process.env.API_PREFIX || '/api';
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/lc`, letterOfCreditRoutes);
app.use(`${apiPrefix}/documents`, documentRoutes);
app.use(`${apiPrefix}/kyc`, kycRoutes);
app.use(`${apiPrefix}/users`, userRoutes);

// Swagger documentation (development only)
if (NODE_ENV === 'development' && process.env.ENABLE_SWAGGER === 'true') {
  setupSwagger(app);
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist`,
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start server
async function startServer() {
  try {
    // Connect to database
    logger.info('🔌 Connecting to MongoDB...');
    await database.connect();
    
    // Initialize models and create indexes
    const { AuthController } = await import('./controllers/auth.controller');
    const { default: LetterOfCreditController } = await import('./controllers/letterOfCredit.controller');
    
    const authController = new AuthController();
    const lcController = new LetterOfCreditController();
    
    await authController.initializeUserModel();
    await lcController.initializeLCModel();
    
    server.listen(PORT, () => {
      logger.info(`🚀 BlockTrade Backend Server running on port ${PORT}`);
      logger.info(`📑 Environment: ${NODE_ENV}`);
      logger.info(`🌐 API Base URL: http://localhost:${PORT}${apiPrefix}`);
      
      if (NODE_ENV === 'development' && process.env.ENABLE_SWAGGER === 'true') {
        logger.info(`📖 API Documentation: http://localhost:${PORT}/api-docs`);
      }
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
