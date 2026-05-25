import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import gigRoutes from './routes/gigs.js';
import organizationRoutes from './routes/organizations.js';
import participationRoutes from './routes/participations.js';
import paymentRoutes from './routes/payments.js';
import { logger } from './src/lib/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '.env') });

export function createApp() {
  const app = express();
  const isDev = process.env.NODE_ENV !== 'production';

  app.use(compression());
  app.use(
    cors({
      origin: isDev ? true : process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      logger.info(
        {
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          duration: Date.now() - start,
        },
        'request',
      );
    });
    next();
  });

  if (!isDev) {
    const generalLimiter = rateLimit({
      windowMs: 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later' },
    });
    app.use('/api/', generalLimiter);
  }

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'karmamap-api' });
  });

  app.use('/api/gigs', gigRoutes);
  app.use('/api/participations', participationRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/organizations', organizationRoutes);

  app.use(
    (
      err: Error & { statusCode?: number },
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      logger.error({
        err,
        method: req.method,
        path: req.originalUrl,
        statusCode: err.statusCode ?? 500,
      });

      if (err.name === 'ZodError') {
        res.status(400).json({
          error: 'Validation error',
          details: (err as Error & { issues?: unknown }).issues,
        });
        return;
      }

      if (typeof err.statusCode === 'number') {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }

      if ('code' in err && typeof (err as Error & { code: string }).code === 'string') {
        const code = (err as Error & { code: string }).code;
        if (code.startsWith('PGRST') || code.startsWith('235')) {
          res.status(400).json({ error: err.message });
          return;
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    },
  );

  return app;
}

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== 'test') {
  const app = createApp();
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'KarmaMap API running');
  });
}
