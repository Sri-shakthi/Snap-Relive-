import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import routes from './routes/index.js';
import { config } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { loggerMiddleware } from './middleware/logger.js';
import { apiRateLimitMiddleware } from './middleware/rateLimit.js';
import { requestIdMiddleware } from './middleware/requestId.js';

const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Snapshots API',
    version: '1.0.0'
  },
  servers: [{ url: 'http://localhost:4000/api/v1' }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: { '200': { description: 'OK' } }
      }
    },
    '/events': {
      post: { summary: 'Create event', responses: { '201': { description: 'Created' } } }
    },
    '/selfies/presign': {
      post: { summary: 'Presign selfie upload', responses: { '200': { description: 'OK' } } }
    },
    '/selfies/confirm': {
      post: { summary: 'Confirm selfie upload', responses: { '202': { description: 'Accepted' } } }
    },
    '/photos/presign': {
      post: { summary: 'Presign photo upload', responses: { '200': { description: 'OK' } } }
    },
    '/photos/confirm': {
      post: { summary: 'Confirm photo upload', responses: { '202': { description: 'Accepted' } } }
    },
    '/matches': {
      get: { summary: 'Get matches', responses: { '200': { description: 'OK' } } }
    },
    '/matches/refresh': {
      post: { summary: 'Queue manual rematch', responses: { '202': { description: 'Accepted' } } }
    },
    '/downloads': {
      post: { summary: 'Queue ZIP download job', responses: { '202': { description: 'Accepted' } } }
    },
    '/downloads/links': {
      post: { summary: 'Get direct links for selected photos', responses: { '200': { description: 'OK' } } }
    },
    '/downloads/{downloadId}': {
      get: { summary: 'Get ZIP download job status', responses: { '200': { description: 'OK' } } }
    },
    '/queue/status': {
      get: { summary: 'Queue backpressure status', responses: { '200': { description: 'OK' } } }
    }
  }
};

export const createApp = () => {
  const app = express();

  if (config.app.trustProxy !== undefined) {
    app.set('trust proxy', config.app.trustProxy);
  }

  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(loggerMiddleware);
  app.use(apiRateLimitMiddleware);

  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.get(`${config.app.apiPrefix}/health`, (req, res) => {
    return res.status(200).json({
      success: true,
      data: { status: 'ok' },
      requestId: req.requestId
    });
  });

  app.use(config.app.apiPrefix, routes);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
