import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type AppDatabase = DatabaseSync;

export function createDatabase(dbPath: string): AppDatabase {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  if (dbPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      daily_goal INTEGER NOT NULL DEFAULT 5,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS words (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      term TEXT NOT NULL,
      translation TEXT NOT NULL,
      example TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      ease_factor REAL NOT NULL DEFAULT 2.5,
      interval_days INTEGER NOT NULL DEFAULT 0,
      repetitions INTEGER NOT NULL DEFAULT 0,
      next_review_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_activity (
      user_id TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      words_added INTEGER NOT NULL DEFAULT 0,
      reviews_done INTEGER NOT NULL DEFAULT 0,
      goal_target INTEGER NOT NULL DEFAULT 5,
      goal_completed INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, activity_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      word_id TEXT NOT NULL,
      quality INTEGER NOT NULL,
      reviewed_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_words_user_review
      ON words(user_id, next_review_at);

    CREATE INDEX IF NOT EXISTS idx_activity_user_date
      ON daily_activity(user_id, activity_date);

    CREATE INDEX IF NOT EXISTS idx_review_logs_user_date
      ON review_logs(user_id, reviewed_at);
  `);

  return db;
}
