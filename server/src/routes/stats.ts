import { Router } from 'express';
import type { AppDatabase } from '../db';
import { type AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { isWordMastered } from '../services/srs';
import {
  addDaysToDateString,
  calculateStreaks,
  type DailyActivityRow,
  normalizeLocalDate,
} from '../services/streak';

export function createStatsRouter(db: AppDatabase): Router {
  const router = Router();
  router.use(requireAuth);

  router.get('/overview', (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const today = normalizeLocalDate(
      typeof req.query.today === 'string' ? req.query.today : undefined
    );
    const nowIso = new Date().toISOString();

    const user = db
      .prepare('SELECT daily_goal FROM users WHERE id = ?')
      .get(userId) as unknown as { daily_goal: number } | undefined;
    const dailyGoal = user?.daily_goal ?? 5;

    const words = db
      .prepare('SELECT repetitions, interval_days, next_review_at FROM words WHERE user_id = ?')
      .all(userId) as unknown as Array<{
      repetitions: number;
      interval_days: number;
      next_review_at: string;
    }>;

    const totalWords = words.length;
    let masteredWords = 0;
    let dueCount = 0;
    for (const w of words) {
      if (isWordMastered(w.repetitions, w.interval_days)) masteredWords += 1;
      if (w.next_review_at <= nowIso) dueCount += 1;
    }

    const totalReviewsRow = db
      .prepare('SELECT COUNT(*) as count FROM review_logs WHERE user_id = ?')
      .get(userId) as unknown as { count: number };

    const completedRows = db
      .prepare(
        'SELECT activity_date FROM daily_activity WHERE user_id = ? AND goal_completed = 1 ORDER BY activity_date ASC'
      )
      .all(userId) as unknown as Array<{ activity_date: string }>;

    const streak = calculateStreaks(
      completedRows.map((r) => r.activity_date),
      today
    );

    const todayRow = db
      .prepare('SELECT * FROM daily_activity WHERE user_id = ? AND activity_date = ?')
      .get(userId, today) as unknown as DailyActivityRow | undefined;

    const todayWordsAdded = todayRow?.words_added ?? 0;
    const todayReviewsDone = todayRow?.reviews_done ?? 0;
    const todayTotal = todayWordsAdded + todayReviewsDone;

    // Last 7 days quick status
    const start7 = addDaysToDateString(today, -6);
    const last7Rows = db
      .prepare(
        `SELECT * FROM daily_activity
         WHERE user_id = ? AND activity_date >= ? AND activity_date <= ?`
      )
      .all(userId, start7, today) as unknown as DailyActivityRow[];
    const last7Map = new Map(last7Rows.map((r) => [r.activity_date, r]));

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = addDaysToDateString(start7, i);
      const row = last7Map.get(date);
      const actions = (row?.words_added ?? 0) + (row?.reviews_done ?? 0);
      return {
        date,
        actions,
        completed: row?.goal_completed === 1,
      };
    });

    res.json({
      today,
      dailyGoal,
      todayProgress: {
        wordsAdded: todayWordsAdded,
        reviewsDone: todayReviewsDone,
        totalActions: todayTotal,
        goalTarget: todayRow?.goal_target ?? dailyGoal,
        completed: todayRow ? todayRow.goal_completed === 1 : false,
      },
      streak,
      totals: {
        totalWords,
        masteredWords,
        learningWords: totalWords - masteredWords,
        dueCount,
        totalReviews: totalReviewsRow.count,
      },
      last7Days,
    });
  });

  router.get('/heatmap', (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const today = normalizeLocalDate(
      typeof req.query.today === 'string' ? req.query.today : undefined
    );
    const days = Math.min(365, Math.max(30, Number(req.query.days) || 365));
    const startDate = addDaysToDateString(today, -(days - 1));

    const rows = db
      .prepare(
        `SELECT * FROM daily_activity
         WHERE user_id = ? AND activity_date >= ? AND activity_date <= ?
         ORDER BY activity_date ASC`
      )
      .all(userId, startDate, today) as unknown as DailyActivityRow[];

    const rowMap = new Map(rows.map((r) => [r.activity_date, r]));

    const cells = Array.from({ length: days }, (_, i) => {
      const date = addDaysToDateString(startDate, i);
      const row = rowMap.get(date);
      const wordsAdded = row?.words_added ?? 0;
      const reviewsDone = row?.reviews_done ?? 0;
      const totalActions = wordsAdded + reviewsDone;
      const goalTarget = row?.goal_target ?? 5;
      const goalCompleted = row?.goal_completed === 1;

      // Intensity level 0-4
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (totalActions > 0) {
        const ratio = totalActions / Math.max(1, goalTarget);
        if (ratio >= 1.5) level = 4;
        else if (goalCompleted || ratio >= 1) level = 3;
        else if (ratio >= 0.5) level = 2;
        else level = 1;
      }

      return {
        date,
        wordsAdded,
        reviewsDone,
        totalActions,
        goalTarget,
        goalCompleted,
        level,
      };
    });

    res.json({ startDate, endDate: today, cells });
  });

  router.get('/weekly', (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const today = normalizeLocalDate(
      typeof req.query.today === 'string' ? req.query.today : undefined
    );
    const days = Math.min(30, Math.max(7, Number(req.query.days) || 14));
    const startDate = addDaysToDateString(today, -(days - 1));

    const rows = db
      .prepare(
        `SELECT * FROM daily_activity
         WHERE user_id = ? AND activity_date >= ? AND activity_date <= ?
         ORDER BY activity_date ASC`
      )
      .all(userId, startDate, today) as unknown as DailyActivityRow[];

    const rowMap = new Map(rows.map((r) => [r.activity_date, r]));
    const user = db
      .prepare('SELECT daily_goal FROM users WHERE id = ?')
      .get(userId) as unknown as { daily_goal: number } | undefined;
    const fallbackGoal = user?.daily_goal ?? 5;

    const series = Array.from({ length: days }, (_, i) => {
      const date = addDaysToDateString(startDate, i);
      const row = rowMap.get(date);
      return {
        date,
        wordsAdded: row?.words_added ?? 0,
        reviewsDone: row?.reviews_done ?? 0,
        goalTarget: row?.goal_target ?? fallbackGoal,
        goalCompleted: row?.goal_completed === 1,
      };
    });

    res.json({ series });
  });

  return router;
}
