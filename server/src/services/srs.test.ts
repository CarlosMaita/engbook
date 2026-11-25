import { describe, expect, it } from 'vitest';
import { calculateNextSrs, isWordMastered } from './srs';

describe('SM-2 Spaced Repetition (SRS)', () => {
  const baseDate = new Date('2026-11-25T12:00:00.000Z');

  it('progresses intervals on Good (3) responses', () => {
    const first = calculateNextSrs({ repetitions: 0, intervalDays: 0, easeFactor: 2.5 }, 3, baseDate);
    expect(first.repetitions).toBe(1);
    expect(first.intervalDays).toBe(1);

    const second = calculateNextSrs(first, 3, baseDate);
    expect(second.repetitions).toBe(2);
    expect(second.intervalDays).toBe(6);

    const third = calculateNextSrs(second, 3, baseDate);
    expect(third.repetitions).toBe(3);
    expect(third.intervalDays).toBeGreaterThanOrEqual(14);
    expect(isWordMastered(third.repetitions, third.intervalDays)).toBe(true);
  });

  it('resets repetitions on Again (1) and respects minimum ease factor', () => {
    const res = calculateNextSrs({ repetitions: 4, intervalDays: 20, easeFactor: 1.35 }, 1, baseDate);
    expect(res.repetitions).toBe(0);
    expect(res.intervalDays).toBe(1);
    expect(res.easeFactor).toBe(1.3);
  });

  it('accelerates interval on Easy (4)', () => {
    const easy = calculateNextSrs({ repetitions: 0, intervalDays: 0, easeFactor: 2.5 }, 4, baseDate);
    expect(easy.repetitions).toBe(1);
    expect(easy.intervalDays).toBe(4);
    expect(easy.easeFactor).toBeGreaterThan(2.5);
  });
});
