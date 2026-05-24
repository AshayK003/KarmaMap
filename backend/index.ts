import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import gigRoutes from './routes/gigs.js';
import participationRoutes from './routes/participations.js';
import { logger } from './src/lib/logger.js';

dotenv.config();

export function createApp() {
  const app = express();
  const isDev = process.env.NODE_ENV !== 'production';

  app.use(
    cors({
      origin: isDev
        ? true
        : process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'karmamap-api' });
  });

  app.use('/api/gigs', gigRoutes);
  app.use('/api/participations', participationRoutes);

  app.use(
    (
      err: Error & { statusCode?: number },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      logger.error(err);

      if (err.name === 'ZodError' || (err.constructor?.name === 'ZodError')) {
        res.status(400).json({ error: 'Validation error', details: (err as Error & { issues?: unknown }).issues });
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
    }
  );

  return app;
}

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== 'test') {
  const app = createApp();
  app.listen(PORT, () => {
    logger.info({ port: PORT }, 'KarmaMap API running');
  });
  import('./services/queue.js').then(({ startWorker }) => startWorker());
}
