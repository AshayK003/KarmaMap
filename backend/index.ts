import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import gigRoutes from './routes/gigs.js';
import participationRoutes from './routes/participations.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const isDev = process.env.NODE_ENV !== 'production';

app.use(
  cors({
    // Dev: allow phone on same Wi‑Fi (any origin). Prod: only FRONTEND_URL.
    origin: isDev
      ? true
      : process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'karmamap-api' });
});

app.use('/api/gigs', gigRoutes);
app.use('/api/participations', participationRoutes);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
);

app.listen(PORT, () => {
  console.log(`KarmaMap API running on port ${PORT}`);
});
