import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ReviewQuality, StatsOverview, Word } from '../types';

export type OfflineMutation =
  | {
      id: string;
      type: 'addWord';
      payload: {
        term: string;
        translation: string;
        example: string;
        notes: string;
        localDate: string;
      };
      createdAt: number;
    }
  | {
      id: string;
      type: 'reviewWord';
      payload: {
        wordId: string;
        quality: ReviewQuality;
        localDate: string;
      };
      createdAt: number;
    };

interface EngBookDB extends DBSchema {
  cache: {
    key: string;
    value: unknown;
  };
  queue: {
    key: string;
    value: OfflineMutation;
  };
}

let dbPromise: Promise<IDBPDatabase<EngBookDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<EngBookDB>('engbook-offline', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache');
        }
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export async function cacheWords(words: Word[]): Promise<void> {
  const db = await getDb();
  await db.put('cache', words, 'words');
}

export async function getCachedWords(): Promise<Word[]> {
  const db = await getDb();
  return ((await db.get('cache', 'words')) as Word[] | undefined) ?? [];
}

export async function cacheOverview(overview: StatsOverview): Promise<void> {
  const db = await getDb();
  await db.put('cache', overview, 'overview');
}

export async function getCachedOverview(): Promise<StatsOverview | null> {
  const db = await getDb();
  return ((await db.get('cache', 'overview')) as StatsOverview | undefined) ?? null;
}

export async function enqueueMutation(mutation: Omit<OfflineMutation, 'id' | 'createdAt'>): Promise<void> {
  const db = await getDb();
  const item: OfflineMutation = {
    ...mutation,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  } as OfflineMutation;
  await db.put('queue', item);
}

export async function getPendingMutations(): Promise<OfflineMutation[]> {
  const db = await getDb();
  const all = await db.getAll('queue');
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeMutation(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('queue', id);
}

export async function clearOfflineStore(): Promise<void> {
  const db = await getDb();
  await db.clear('cache');
  await db.clear('queue');
}
