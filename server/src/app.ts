import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import helmet from 'helmet';
import path from 'node:path';
import type { AppDatabase } from './db';
import { createAuthRouter } from './routes/auth';
import { createStatsRouter } from './routes/stats';
import { createTranslateRouter } from './routes/translate';
import { createWordsRouter } from './routes/words';

export interface CreateAppOptions {
  db: AppDatabase;
  staticDir?: string;
}

export function createApp({ db, staticDir }: CreateAppOptions) {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'engbook-api' });
  });

  app.use('/api/auth', createAuthRouter(db));
  app.use('/api/words', createWordsRouter(db));
  app.use('/api/stats', createStatsRouter(db));
  app.use('/api/translate', createTranslateRouter());

  if (staticDir && fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  return app;
}
