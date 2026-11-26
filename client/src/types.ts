export type ReviewQuality = 1 | 2 | 3 | 4;

export interface User {
  id: string;
  email: string;
  name: string;
  dailyGoal: number;
  createdAt: string;
}

export interface Word {
  id: string;
  term: string;
  translation: string;
  example: string;
  notes: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: string;
  createdAt: string;
  updatedAt: string;
  status: 'inbox' | 'new' | 'learning' | 'mastered';
  isDue: boolean;
  intervalPreview: Record<ReviewQuality, number>;
}

export interface StatsOverview {
  today: string;
  dailyGoal: number;
  todayProgress: {
    wordsAdded: number;
    reviewsDone: number;
    totalActions: number;
    goalTarget: number;
    completed: boolean;
  };
  streak: {
    currentStreak: number;
    bestStreak: number;
    completedToday: boolean;
    streakAtRisk: boolean;
    totalCompletedDays: number;
  };
  totals: {
    totalWords: number;
    inboxWords?: number;
    masteredWords: number;
    learningWords: number;
    dueCount: number;
    totalReviews: number;
  };
  last7Days: Array<{
    date: string;
    actions: number;
    completed: boolean;
  }>;
}

export interface HeatmapCell {
  date: string;
  wordsAdded: number;
  reviewsDone: number;
  totalActions: number;
  goalTarget: number;
  goalCompleted: boolean;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface WeeklyPoint {
  date: string;
  wordsAdded: number;
  reviewsDone: number;
  goalTarget: number;
  goalCompleted: boolean;
}
