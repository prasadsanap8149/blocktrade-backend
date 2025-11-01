import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'BlockTrade API',
    version: '1.0.0',
    description: 'Blockchain-based Trade Finance Platform API',
    contact: {
      name: 'BlockTrade Team',
      email: 'support@blocktrade.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization'
    },
    {
      name: 'Letters of Credit',
      description: 'Letter of Credit management'
    },
    {
      name: 'Documents',
      description: 'Document management'
    },
    {
      name: 'KYC/AML',
      description: 'Know Your Customer and Anti-Money Laundering'
    },
    {
      name: 'Users',
      description: 'User management'
    }
  ]
};

export const setupSwagger = (app: Express): void => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
};
