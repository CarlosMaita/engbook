import path from 'node:path';
import { createApp } from './app';
import { createDatabase } from './db';

const PORT = Number(process.env.PORT) || 3001;
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../data/engbook.db');
const STATIC_DIR =
  process.env.STATIC_DIR || path.resolve(__dirname, '../../client/dist');

const db = createDatabase(DB_PATH);
const app = createApp({ db, staticDir: STATIC_DIR });

app.listen(PORT, () => {
  console.log(`EngBook server listening on http://localhost:${PORT}`);
});
