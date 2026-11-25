import type { AppDatabase } from '../db';

export interface DailyActivityRow {
  user_id: string;
  activity_date: string;
  words_added: number;
  reviews_done: number;
  goal_target: number;
  goal_completed: number;
}

export interface StreakSummary {
  currentStreak: number;
  bestStreak: number;
  completedToday: boolean;
  streakAtRisk: boolean;
  totalCompletedDays: number;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeLocalDate(input?: string): string {
  if (input && DATE_REGEX.test(input)) {
    return input;
  }
  return new Date().toISOString().slice(0, 10);
}

export function addDaysToDateString(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

export function diffDays(dateA: string, dateB: string): number {
  const [yA, mA, dA] = dateA.split('-').map(Number);
  const [yB, mB, dB] = dateB.split('-').map(Number);
  const utcA = Date.UTC(yA, mA - 1, dA);
  const utcB = Date.UTC(yB, mB - 1, dB);
  return Math.round((utcA - utcB) / (24 * 60 * 60 * 1000));
}

/**
 * Pure streak computation from sorted or unsorted YYYY-MM-DD completed dates.
 */
export function calculateStreaks(
  completedDates: string[],
  todayLocalDate: string
): StreakSummary {
  const uniqueSorted = Array.from(new Set(completedDates)).sort();
  const totalCompletedDays = uniqueSorted.length;

  if (totalCompletedDays === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      completedToday: false,
      streakAtRisk: false,
      totalCompletedDays: 0,
    };
  }

  let bestStreak = 1;
  let running = 1;
  for (let i = 1; i < uniqueSorted.length; i++) {
    if (diffDays(uniqueSorted[i], uniqueSorted[i - 1]) === 1) {
      running += 1;
      if (running > bestStreak) bestStreak = running;
    } else {
      running = 1;
    }
  }

  const dateSet = new Set(uniqueSorted);
  const completedToday = dateSet.has(todayLocalDate);
  const yesterday = addDaysToDateString(todayLocalDate, -1);
  const completedYesterday = dateSet.has(yesterday);

  let currentStreak = 0;
  let cursor = completedToday ? todayLocalDate : completedYesterday ? yesterday : null;

  while (cursor && dateSet.has(cursor)) {
    currentStreak += 1;
    cursor = addDaysToDateString(cursor, -1);
  }

  const streakAtRisk = !completedToday && currentStreak > 0;

  return {
    currentStreak,
    bestStreak,
    completedToday,
    streakAtRisk,
    totalCompletedDays,
  };
}

export function recordDailyAction(
  db: AppDatabase,
  userId: string,
  localDate: string,
  actionType: 'add' | 'review'
): DailyActivityRow {
  const dateStr = normalizeLocalDate(localDate);
  const user = db
    .prepare('SELECT daily_goal FROM users WHERE id = ?')
    .get(userId) as unknown as { daily_goal: number } | undefined;

  const dailyGoal = user?.daily_goal ?? 5;

  const existing = db
    .prepare('SELECT * FROM daily_activity WHERE user_id = ? AND activity_date = ?')
    .get(userId, dateStr) as unknown as DailyActivityRow | undefined;

  if (!existing) {
    const wordsAdded = actionType === 'add' ? 1 : 0;
    const reviewsDone = actionType === 'review' ? 1 : 0;
    const goalCompleted = wordsAdded + reviewsDone >= dailyGoal ? 1 : 0;

    db.prepare(
      `INSERT INTO daily_activity (user_id, activity_date, words_added, reviews_done, goal_target, goal_completed)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(userId, dateStr, wordsAdded, reviewsDone, dailyGoal, goalCompleted);

    return {
      user_id: userId,
      activity_date: dateStr,
      words_added: wordsAdded,
      reviews_done: reviewsDone,
      goal_target: dailyGoal,
      goal_completed: goalCompleted,
    };
  }

  const wordsAdded = existing.words_added + (actionType === 'add' ? 1 : 0);
  const reviewsDone = existing.reviews_done + (actionType === 'review' ? 1 : 0);
  const goalTarget = existing.goal_target;
  const goalCompleted = wordsAdded + reviewsDone >= goalTarget ? 1 : 0;

  db.prepare(
    `UPDATE daily_activity
     SET words_added = ?, reviews_done = ?, goal_completed = ?
     WHERE user_id = ? AND activity_date = ?`
  ).run(wordsAdded, reviewsDone, goalCompleted, userId, dateStr);

  return {
    user_id: userId,
    activity_date: dateStr,
    words_added: wordsAdded,
    reviews_done: reviewsDone,
    goal_target: goalTarget,
    goal_completed: goalCompleted,
  };
}
