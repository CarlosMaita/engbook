import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import type { AppDatabase } from '../db';
import { type AuthenticatedRequest, requireAuth } from '../middleware/auth';
import {
  calculateNextSrs,
  isWordMastered,
  previewIntervals,
  type ReviewQuality,
} from '../services/srs';
import { normalizeLocalDate, recordDailyAction } from '../services/streak';

interface WordRow {
  id: string;
  user_id: string;
  term: string;
  translation: string;
  example: string;
  notes: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string;
  created_at: string;
  updated_at: string;
}

const createWordSchema = z.object({
  term: z.string().trim().min(1, 'La palabra en inglés es obligatoria').max(120),
  translation: z.string().trim().min(1, 'La traducción es obligatoria').max(200),
  example: z.string().trim().max(400).optional().default(''),
  notes: z.string().trim().max(500).optional().default(''),
  localDate: z.string().optional(),
});

const updateWordSchema = z.object({
  term: z.string().trim().min(1).max(120).optional(),
  translation: z.string().trim().min(1).max(200).optional(),
  example: z.string().trim().max(400).optional(),
  notes: z.string().trim().max(500).optional(),
});

const reviewSchema = z.object({
  quality: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  localDate: z.string().optional(),
});

function serializeWord(row: WordRow, nowIso: string) {
  const mastered = isWordMastered(row.repetitions, row.interval_days);
  const isDue = row.next_review_at <= nowIso;
  return {
    id: row.id,
    term: row.term,
    translation: row.translation,
    example: row.example,
    notes: row.notes,
    easeFactor: row.ease_factor,
    intervalDays: row.interval_days,
    repetitions: row.repetitions,
    nextReviewAt: row.next_review_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: mastered ? 'mastered' : row.repetitions > 0 ? 'learning' : 'new',
    isDue,
    intervalPreview: previewIntervals({
      repetitions: row.repetitions,
      intervalDays: row.interval_days,
      easeFactor: row.ease_factor,
    }),
  };
}

export function createWordsRouter(db: AppDatabase): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/', (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const status = typeof req.query.status === 'string' ? req.query.status : 'all';
    const nowIso = new Date().toISOString();

    const rows = db
      .prepare('SELECT * FROM words WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as unknown as WordRow[];

    const serialized = rows
      .map((r) => serializeWord(r, nowIso))
      .filter((w) => {
        if (search) {
          const hay = `${w.term} ${w.translation} ${w.example} ${w.notes}`.toLowerCase();
          if (!hay.includes(search)) return false;
        }
        if (status === 'due') return w.isDue;
        if (status === 'mastered') return w.status === 'mastered';
        if (status === 'learning') return w.status !== 'mastered';
        return true;
      });

    res.json({ words: serialized });
  });

  router.get('/due', (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const nowIso = new Date().toISOString();

    const rows = db
      .prepare(
        `SELECT * FROM words
         WHERE user_id = ? AND next_review_at <= ?
         ORDER BY next_review_at ASC
         LIMIT ?`
      )
      .all(userId, nowIso, limit) as unknown as WordRow[];

    res.json({
      dueWords: rows.map((r) => serializeWord(r, nowIso)),
    });
  });

  router.post('/', (req: AuthenticatedRequest, res) => {
    const parsed = createWordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }

    const userId = req.user!.userId;
    const nowIso = new Date().toISOString();
    const id = crypto.randomUUID();
    const { term, translation, example, notes, localDate } = parsed.data;

    db.prepare(
      `INSERT INTO words (
         id, user_id, term, translation, example, notes,
         ease_factor, interval_days, repetitions, next_review_at, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, 2.5, 0, 0, ?, ?, ?)`
    ).run(id, userId, term, translation, example, notes, nowIso, nowIso, nowIso);

    const activity = recordDailyAction(db, userId, normalizeLocalDate(localDate), 'add');
    const created = db.prepare('SELECT * FROM words WHERE id = ?').get(id) as unknown as WordRow;

    res.status(201).json({
      word: serializeWord(created, nowIso),
      dailyActivity: {
        date: activity.activity_date,
        wordsAdded: activity.words_added,
        reviewsDone: activity.reviews_done,
        goalTarget: activity.goal_target,
        goalCompleted: activity.goal_completed === 1,
      },
    });
  });

  router.patch('/:id', (req: AuthenticatedRequest, res) => {
    const parsed = updateWordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }

    const userId = req.user!.userId;
    const wordId = String(req.params.id);
    const existing = db
      .prepare('SELECT * FROM words WHERE id = ? AND user_id = ?')
      .get(wordId, userId) as unknown as WordRow | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Palabra no encontrada' });
      return;
    }

    const nowIso = new Date().toISOString();
    db.prepare(
      `UPDATE words
       SET term = ?, translation = ?, example = ?, notes = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    ).run(
      parsed.data.term ?? existing.term,
      parsed.data.translation ?? existing.translation,
      parsed.data.example ?? existing.example,
      parsed.data.notes ?? existing.notes,
      nowIso,
      wordId,
      userId
    );

    const updated = db.prepare('SELECT * FROM words WHERE id = ?').get(wordId) as unknown as WordRow;
    res.json({ word: serializeWord(updated, nowIso) });
  });

  router.delete('/:id', (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const wordId = String(req.params.id);
    const result = db
      .prepare('DELETE FROM words WHERE id = ? AND user_id = ?')
      .run(wordId, userId);

    if (Number(result.changes) === 0) {
      res.status(404).json({ error: 'Palabra no encontrada' });
      return;
    }

    res.json({ deleted: true, id: wordId });
  });

  router.post('/:id/review', (req: AuthenticatedRequest, res) => {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Calidad de repaso inválida (1-4)' });
      return;
    }

    const userId = req.user!.userId;
    const wordId = String(req.params.id);
    const existing = db
      .prepare('SELECT * FROM words WHERE id = ? AND user_id = ?')
      .get(wordId, userId) as unknown as WordRow | undefined;

    if (!existing) {
      res.status(404).json({ error: 'Palabra no encontrada' });
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const quality = parsed.data.quality as ReviewQuality;

    const nextSrs = calculateNextSrs(
      {
        repetitions: existing.repetitions,
        intervalDays: existing.interval_days,
        easeFactor: existing.ease_factor,
      },
      quality,
      now
    );

    db.prepare(
      `UPDATE words
       SET ease_factor = ?, interval_days = ?, repetitions = ?, next_review_at = ?, updated_at = ?
       WHERE id = ? AND user_id = ?`
    ).run(
      nextSrs.easeFactor,
      nextSrs.intervalDays,
      nextSrs.repetitions,
      nextSrs.nextReviewAt,
      nowIso,
      wordId,
      userId
    );

    db.prepare(
      `INSERT INTO review_logs (id, user_id, word_id, quality, reviewed_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), userId, wordId, quality, nowIso);

    const activity = recordDailyAction(
      db,
      userId,
      normalizeLocalDate(parsed.data.localDate),
      'review'
    );

    const updated = db.prepare('SELECT * FROM words WHERE id = ?').get(wordId) as unknown as WordRow;
    res.json({
      word: serializeWord(updated, nowIso),
      dailyActivity: {
        date: activity.activity_date,
        wordsAdded: activity.words_added,
        reviewsDone: activity.reviews_done,
        goalTarget: activity.goal_target,
        goalCompleted: activity.goal_completed === 1,
      },
    });
  });

  return router;
}
