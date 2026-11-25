import { getLocalDateString } from './date';
import type {
  HeatmapCell,
  ReviewQuality,
  StatsOverview,
  User,
  WeeklyPoint,
  Word,
} from '../types';

export const DEMO_USER: User = {
  id: 'demo-user',
  email: 'demo@engbook.upsofte.com',
  name: 'Visitante Demo',
  dailyGoal: 5,
  createdAt: new Date().toISOString(),
};

interface DemoDay {
  wordsAdded: number;
  reviewsDone: number;
  goalTarget: number;
}

function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

class DemoStore {
  private user: User = { ...DEMO_USER };
  private words: Word[] = [];
  private activity: Map<string, DemoDay> = new Map();
  private totalReviews = 48;

  constructor() {
    this.reset();
  }

  reset(): void {
    const today = getLocalDateString();
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    this.user = { ...DEMO_USER };
    this.totalReviews = 48;
    this.activity = new Map();

    // Seed realistic historical activity over the last 90 days + active 6-day streak up to yesterday
    for (let i = 90; i >= 1; i--) {
      const date = addDays(today, -i);
      if (i <= 6) {
        // Active 6-day streak leading up to today
        this.activity.set(date, {
          wordsAdded: i % 2 === 0 ? 2 : 1,
          reviewsDone: i % 2 === 0 ? 4 : 5,
          goalTarget: 5,
        });
      } else if (i >= 18 && i <= 29) {
        // Previous 12-day best streak
        this.activity.set(date, {
          wordsAdded: 2,
          reviewsDone: 4,
          goalTarget: 5,
        });
      } else if ((i * 7) % 5 === 0) {
        this.activity.set(date, {
          wordsAdded: 1,
          reviewsDone: 5,
          goalTarget: 5,
        });
      } else if ((i * 3) % 7 === 0) {
        this.activity.set(date, {
          wordsAdded: 1,
          reviewsDone: 2,
          goalTarget: 5,
        });
      }
    }

    // Today starts at 3/5 actions so visitor can finish today's goal in 2 clicks!
    this.activity.set(today, {
      wordsAdded: 1,
      reviewsDone: 2,
      goalTarget: 5,
    });

    const mkWord = (
      id: string,
      term: string,
      translation: string,
      example: string,
      notes: string,
      opts: {
        reps: number;
        interval: number;
        dueOffsetDays: number;
        status: Word['status'];
      }
    ): Word => ({
      id,
      term,
      translation,
      example,
      notes,
      easeFactor: 2.5,
      intervalDays: opts.interval,
      repetitions: opts.reps,
      nextReviewAt: new Date(now + opts.dueOffsetDays * dayMs).toISOString(),
      createdAt: new Date(now - 5 * dayMs).toISOString(),
      updatedAt: new Date(now - dayMs).toISOString(),
      status: opts.status,
      isDue: opts.dueOffsetDays <= 0,
      intervalPreview: { 1: 1, 2: Math.max(1, Math.round(opts.interval * 1.2) || 1), 3: opts.reps === 0 ? 1 : opts.reps === 1 ? 6 : Math.max(15, Math.round(opts.interval * 2.5)), 4: opts.reps === 0 ? 4 : Math.max(8, Math.round(opts.interval * 3.2)) },
    });

    this.words = [
      mkWord(
        'demo-1',
        'Breakthrough',
        'Avance importante / descubrimiento',
        'Scientists achieved a major breakthrough in renewable energy.',
        'Muy usado en tecnología y noticias',
        { reps: 0, interval: 0, dueOffsetDays: -1, status: 'new' }
      ),
      mkWord(
        'demo-2',
        'To figure out',
        'Descubrir / resolver / entender',
        'I finally figured out how to configure the server.',
        'Phrasal verb esencial en el día a día',
        { reps: 1, interval: 1, dueOffsetDays: 0, status: 'learning' }
      ),
      mkWord(
        'demo-3',
        'Resilient',
        'Resiliente / resistente',
        'Building a daily habit makes your English skills resilient.',
        'Adjetivo',
        { reps: 1, interval: 1, dueOffsetDays: 0, status: 'learning' }
      ),
      mkWord(
        'demo-4',
        'Seamless',
        'Fluido / sin interrupciones',
        'The offline sync creates a seamless experience on mobile.',
        'Muy común en producto y software',
        { reps: 0, interval: 0, dueOffsetDays: 0, status: 'new' }
      ),
      mkWord(
        'demo-5',
        'Consistency',
        'Constancia / consistencia',
        'Consistency beats intensity when learning a new language.',
        'Sustantivo',
        { reps: 4, interval: 21, dueOffsetDays: 14, status: 'mastered' }
      ),
      mkWord(
        'demo-6',
        'Compelling',
        'Convincente / atractivo',
        'She presented a compelling argument during the meeting.',
        'Adjetivo formal/profesional',
        { reps: 3, interval: 16, dueOffsetDays: 9, status: 'mastered' }
      ),
      mkWord(
        'demo-7',
        'Trade-off',
        'Compromiso / equilibrio entre opciones',
        'There is always a trade-off between speed and perfection.',
        'Expresión muy usada en ingeniería y negocios',
        { reps: 2, interval: 6, dueOffsetDays: 3, status: 'learning' }
      ),
    ];
  }

  getUser(): User {
    return { ...this.user };
  }

  updateSettings(data: { name?: string; dailyGoal?: number }): User {
    if (data.name) this.user.name = data.name;
    if (data.dailyGoal) {
      this.user.dailyGoal = data.dailyGoal;
      const today = getLocalDateString();
      const row = this.activity.get(today) ?? {
        wordsAdded: 0,
        reviewsDone: 0,
        goalTarget: data.dailyGoal,
      };
      row.goalTarget = data.dailyGoal;
      this.activity.set(today, row);
    }
    return this.getUser();
  }

  getWords(): Word[] {
    return [...this.words];
  }

  getDueWords(): Word[] {
    return this.words.filter((w) => w.isDue);
  }

  createWord(body: { term: string; translation: string; example: string; notes: string }): Word {
    const nowIso = new Date().toISOString();
    const word: Word = {
      id: `demo-${Date.now()}`,
      term: body.term,
      translation: body.translation,
      example: body.example,
      notes: body.notes,
      easeFactor: 2.5,
      intervalDays: 0,
      repetitions: 0,
      nextReviewAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso,
      status: 'new',
      isDue: true,
      intervalPreview: { 1: 1, 2: 1, 3: 1, 4: 4 },
    };
    this.words = [word, ...this.words];
    this.bumpToday('add');
    return word;
  }

  updateWord(
    id: string,
    body: { term?: string; translation?: string; example?: string; notes?: string }
  ): Word {
    const idx = this.words.findIndex((w) => w.id === id);
    if (idx === -1) throw new Error('Palabra no encontrada');
    const updated: Word = {
      ...this.words[idx],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    this.words[idx] = updated;
    return updated;
  }

  deleteWord(id: string): void {
    this.words = this.words.filter((w) => w.id !== id);
  }

  reviewWord(id: string, quality: ReviewQuality): Word {
    const idx = this.words.findIndex((w) => w.id === id);
    if (idx === -1) throw new Error('Palabra no encontrada');
    const w = this.words[idx];
    const nextInterval = w.intervalPreview[quality] || 1;
    const nextReps = quality === 1 ? 0 : w.repetitions + 1;
    const mastered = nextReps >= 3 && nextInterval >= 14;
    const updated: Word = {
      ...w,
      repetitions: nextReps,
      intervalDays: nextInterval,
      nextReviewAt: new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000).toISOString(),
      status: mastered ? 'mastered' : nextReps > 0 ? 'learning' : 'new',
      isDue: false,
    };
    this.words[idx] = updated;
    this.totalReviews += 1;
    this.bumpToday('review');
    return updated;
  }

  private bumpToday(type: 'add' | 'review'): void {
    const today = getLocalDateString();
    const row = this.activity.get(today) ?? {
      wordsAdded: 0,
      reviewsDone: 0,
      goalTarget: this.user.dailyGoal,
    };
    if (type === 'add') row.wordsAdded += 1;
    else row.reviewsDone += 1;
    this.activity.set(today, row);
  }

  getOverview(): StatsOverview {
    const today = getLocalDateString();
    const todayRow = this.activity.get(today) ?? {
      wordsAdded: 0,
      reviewsDone: 0,
      goalTarget: this.user.dailyGoal,
    };
    const todayActions = todayRow.wordsAdded + todayRow.reviewsDone;
    const completedToday = todayActions >= todayRow.goalTarget;

    const completedDates = Array.from(this.activity.entries())
      .filter(([, v]) => v.wordsAdded + v.reviewsDone >= v.goalTarget)
      .map(([k]) => k)
      .sort();

    const dateSet = new Set(completedDates);
    let currentStreak = 0;
    let cursor = completedToday ? today : addDays(today, -1);
    while (dateSet.has(cursor)) {
      currentStreak += 1;
      cursor = addDays(cursor, -1);
    }

    const bestStreak = Math.max(12, currentStreak);

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(today, i - 6);
      const r = this.activity.get(date);
      const actions = (r?.wordsAdded ?? 0) + (r?.reviewsDone ?? 0);
      return {
        date,
        actions,
        completed: r ? actions >= r.goalTarget : false,
      };
    });

    const masteredWords = this.words.filter((w) => w.status === 'mastered').length;
    const dueCount = this.words.filter((w) => w.isDue).length;

    return {
      today,
      dailyGoal: this.user.dailyGoal,
      todayProgress: {
        wordsAdded: todayRow.wordsAdded,
        reviewsDone: todayRow.reviewsDone,
        totalActions: todayActions,
        goalTarget: todayRow.goalTarget,
        completed: completedToday,
      },
      streak: {
        currentStreak,
        bestStreak,
        completedToday,
        streakAtRisk: !completedToday && currentStreak > 0,
        totalCompletedDays: completedDates.length,
      },
      totals: {
        totalWords: this.words.length,
        masteredWords,
        learningWords: this.words.length - masteredWords,
        dueCount,
        totalReviews: this.totalReviews,
      },
      last7Days,
    };
  }

  getHeatmap(days = 182): { cells: HeatmapCell[] } {
    const today = getLocalDateString();
    const startDate = addDays(today, -(days - 1));
    const cells: HeatmapCell[] = Array.from({ length: days }, (_, i) => {
      const date = addDays(startDate, i);
      const r = this.activity.get(date);
      const wordsAdded = r?.wordsAdded ?? 0;
      const reviewsDone = r?.reviewsDone ?? 0;
      const totalActions = wordsAdded + reviewsDone;
      const goalTarget = r?.goalTarget ?? this.user.dailyGoal;
      const goalCompleted = totalActions >= goalTarget;
      let level: HeatmapCell['level'] = 0;
      if (totalActions > 0) {
        const ratio = totalActions / Math.max(1, goalTarget);
        if (ratio >= 1.4) level = 4;
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
    return { cells };
  }

  getWeekly(days = 14): { series: WeeklyPoint[] } {
    const today = getLocalDateString();
    const startDate = addDays(today, -(days - 1));
    const series: WeeklyPoint[] = Array.from({ length: days }, (_, i) => {
      const date = addDays(startDate, i);
      const r = this.activity.get(date);
      const wordsAdded = r?.wordsAdded ?? 0;
      const reviewsDone = r?.reviewsDone ?? 0;
      const goalTarget = r?.goalTarget ?? this.user.dailyGoal;
      return {
        date,
        wordsAdded,
        reviewsDone,
        goalTarget,
        goalCompleted: wordsAdded + reviewsDone >= goalTarget,
      };
    });
    return { series };
  }
}

export const demoStore = new DemoStore();
