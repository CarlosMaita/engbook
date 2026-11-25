import type {
  HeatmapCell,
  ReviewQuality,
  StatsOverview,
  User,
  WeeklyPoint,
  Word,
} from '../types';
import { getLocalDateString } from './date';
import {
  cacheOverview,
  cacheWords,
  enqueueMutation,
  getCachedOverview,
  getCachedWords,
  getPendingMutations,
  removeMutation,
} from './offlineSync';

const TOKEN_KEY = 'engbook_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status}`);
  }
  return data as T;
}

export const api = {
  async register(body: {
    email: string;
    name: string;
    password: string;
    dailyGoal?: number;
  }): Promise<{ token: string; user: User }> {
    return request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async login(body: {
    email: string;
    password: string;
  }): Promise<{ token: string; user: User }> {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  async me(): Promise<{ user: User }> {
    return request('/api/auth/me');
  },

  async updateSettings(body: {
    name?: string;
    dailyGoal?: number;
  }): Promise<{ user: User }> {
    return request('/api/auth/settings', {
      method: 'PATCH',
      body: JSON.stringify({ ...body, localDate: getLocalDateString() }),
    });
  },

  async getWords(params?: { search?: string; status?: string }): Promise<Word[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status && params.status !== 'all') query.set('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';

    try {
      const data = await request<{ words: Word[] }>(`/api/words${qs}`);
      if (!params?.search && (!params?.status || params.status === 'all')) {
        await cacheWords(data.words);
      }
      return data.words;
    } catch (err) {
      if (!navigator.onLine) {
        return getCachedWords();
      }
      throw err;
    }
  },

  async getDueWords(): Promise<Word[]> {
    try {
      const data = await request<{ dueWords: Word[] }>('/api/words/due');
      return data.dueWords;
    } catch (err) {
      if (!navigator.onLine) {
        const cached = await getCachedWords();
        return cached.filter((w) => w.isDue);
      }
      throw err;
    }
  },

  async createWord(body: {
    term: string;
    translation: string;
    example: string;
    notes: string;
  }): Promise<{ word?: Word; queued?: boolean }> {
    const localDate = getLocalDateString();
    if (!navigator.onLine) {
      await enqueueMutation({
        type: 'addWord',
        payload: { ...body, localDate },
      });
      return { queued: true };
    }
    try {
      return await request('/api/words', {
        method: 'POST',
        body: JSON.stringify({ ...body, localDate }),
      });
    } catch (err) {
      if (!navigator.onLine) {
        await enqueueMutation({
          type: 'addWord',
          payload: { ...body, localDate },
        });
        return { queued: true };
      }
      throw err;
    }
  },

  async updateWord(
    id: string,
    body: { term?: string; translation?: string; example?: string; notes?: string }
  ): Promise<{ word: Word }> {
    return request(`/api/words/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  async deleteWord(id: string): Promise<void> {
    await request(`/api/words/${id}`, { method: 'DELETE' });
  },

  async reviewWord(
    wordId: string,
    quality: ReviewQuality
  ): Promise<{ word?: Word; queued?: boolean }> {
    const localDate = getLocalDateString();
    if (!navigator.onLine) {
      await enqueueMutation({
        type: 'reviewWord',
        payload: { wordId, quality, localDate },
      });
      return { queued: true };
    }
    try {
      return await request(`/api/words/${wordId}/review`, {
        method: 'POST',
        body: JSON.stringify({ quality, localDate }),
      });
    } catch (err) {
      if (!navigator.onLine) {
        await enqueueMutation({
          type: 'reviewWord',
          payload: { wordId, quality, localDate },
        });
        return { queued: true };
      }
      throw err;
    }
  },

  async getOverview(): Promise<StatsOverview> {
    const today = getLocalDateString();
    try {
      const data = await request<StatsOverview>(`/api/stats/overview?today=${today}`);
      await cacheOverview(data);
      return data;
    } catch (err) {
      if (!navigator.onLine) {
        const cached = await getCachedOverview();
        if (cached) return cached;
      }
      throw err;
    }
  },

  async getHeatmap(days = 365): Promise<{ cells: HeatmapCell[] }> {
    const today = getLocalDateString();
    return request(`/api/stats/heatmap?today=${today}&days=${days}`);
  },

  async getWeekly(days = 14): Promise<{ series: WeeklyPoint[] }> {
    const today = getLocalDateString();
    return request(`/api/stats/weekly?today=${today}&days=${days}`);
  },

  async syncPendingQueue(): Promise<number> {
    if (!navigator.onLine) return 0;
    const items = await getPendingMutations();
    let synced = 0;
    for (const item of items) {
      try {
        if (item.type === 'addWord') {
          await request('/api/words', {
            method: 'POST',
            body: JSON.stringify(item.payload),
          });
        } else if (item.type === 'reviewWord') {
          await request(`/api/words/${item.payload.wordId}/review`, {
            method: 'POST',
            body: JSON.stringify({
              quality: item.payload.quality,
              localDate: item.payload.localDate,
            }),
          });
        }
        await removeMutation(item.id);
        synced += 1;
      } catch {
        break;
      }
    }
    return synced;
  },
};
