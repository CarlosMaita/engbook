import { describe, expect, it } from 'vitest';
import { calculateStreaks } from './streak';

describe('Streak engine', () => {
  it('returns zeros when no completed days exist', () => {
    expect(calculateStreaks([], '2026-11-25')).toEqual({
      currentStreak: 0,
      bestStreak: 0,
      completedToday: false,
      streakAtRisk: false,
      totalCompletedDays: 0,
    });
  });

  it('counts active streak including today', () => {
    const res = calculateStreaks(['2026-11-23', '2026-11-24', '2026-11-25'], '2026-11-25');
    expect(res.currentStreak).toBe(3);
    expect(res.bestStreak).toBe(3);
    expect(res.completedToday).toBe(true);
    expect(res.streakAtRisk).toBe(false);
  });

  it('keeps streak alive and marks at-risk when yesterday was completed but today is not', () => {
    const res = calculateStreaks(['2026-11-22', '2026-11-23', '2026-11-24'], '2026-11-25');
    expect(res.currentStreak).toBe(3);
    expect(res.completedToday).toBe(false);
    expect(res.streakAtRisk).toBe(true);
  });

  it('breaks current streak when a full day is missed while preserving best streak', () => {
    const res = calculateStreaks(
      ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-23'],
      '2026-11-25'
    );
    expect(res.currentStreak).toBe(0);
    expect(res.bestStreak).toBe(4);
    expect(res.totalCompletedDays).toBe(5);
  });
});
