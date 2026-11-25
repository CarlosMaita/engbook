export type ReviewQuality = 1 | 2 | 3 | 4; // 1=Again, 2=Hard, 3=Good, 4=Easy

export interface SrsState {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
}

export interface SrsResult extends SrsState {
  nextReviewAt: string;
}

const MIN_EASE_FACTOR = 1.3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Pure SM-2 spaced repetition calculation adapted for 4-button UX:
 * 1 = Again (reset repetitions, review in 1 day)
 * 2 = Hard  (slight interval growth, lower ease)
 * 3 = Good  (standard SM-2 progression: 1d -> 6d -> interval * EF)
 * 4 = Easy  (accelerated interval growth, higher ease)
 */
export function calculateNextSrs(
  state: SrsState,
  quality: ReviewQuality,
  now: Date = new Date()
): SrsResult {
  let { repetitions, intervalDays, easeFactor } = state;

  if (quality === 1) {
    repetitions = 0;
    intervalDays = 1;
    easeFactor = Math.max(MIN_EASE_FACTOR, Number((easeFactor - 0.2).toFixed(2)));
  } else {
    // Map 4-point scale (2,3,4) to SM-2 quality (3,4,5)
    const sm2Q = quality + 1;
    const delta = 0.1 - (5 - sm2Q) * (0.08 + (5 - sm2Q) * 0.02);
    easeFactor = Math.max(MIN_EASE_FACTOR, Number((easeFactor + delta).toFixed(2)));

    if (repetitions === 0) {
      intervalDays = quality === 4 ? 4 : 1;
    } else if (repetitions === 1) {
      intervalDays = quality === 2 ? 3 : quality === 4 ? 8 : 6;
    } else {
      const multiplier = quality === 2 ? 1.2 : quality === 4 ? easeFactor * 1.3 : easeFactor;
      intervalDays = Math.max(intervalDays + 1, Math.round(intervalDays * multiplier));
    }
    repetitions += 1;
  }

  const nextDate = new Date(now.getTime() + intervalDays * MS_PER_DAY);

  return {
    repetitions,
    intervalDays,
    easeFactor,
    nextReviewAt: nextDate.toISOString(),
  };
}

export function isWordMastered(repetitions: number, intervalDays: number): boolean {
  return repetitions >= 3 && intervalDays >= 14;
}

export function previewIntervals(state: SrsState): Record<ReviewQuality, number> {
  return {
    1: calculateNextSrs(state, 1).intervalDays,
    2: calculateNextSrs(state, 2).intervalDays,
    3: calculateNextSrs(state, 3).intervalDays,
    4: calculateNextSrs(state, 4).intervalDays,
  };
}
