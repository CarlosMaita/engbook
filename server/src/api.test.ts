import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { createDatabase } from './db';

describe('EngBook API Integration', () => {
  function setup() {
    const db = createDatabase(':memory:');
    const app = createApp({ db });
    return { db, app };
  }

  it('registers users, isolates data, tracks daily goal, streak, reviews, and heatmap', async () => {
    const { app } = setup();

    // Register User A with daily goal of 2
    const regA = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'ana@example.com',
        name: 'Ana',
        password: 'password123',
        dailyGoal: 2,
      })
      .expect(201);

    const tokenA = regA.body.token as string;
    expect(regA.body.user.dailyGoal).toBe(2);

    // Register User B
    const regB = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'bob@example.com',
        name: 'Bob',
        password: 'password123',
      })
      .expect(201);
    const tokenB = regB.body.token as string;

    // User A adds 1 word on 2026-11-25 (progress 1/2 -> not completed yet)
    const w1 = await request(app)
      .post('/api/words')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        term: 'Resilient',
        translation: 'Resiliente',
        example: 'She is very resilient.',
        localDate: '2026-11-25',
      })
      .expect(201);

    expect(w1.body.dailyActivity.goalCompleted).toBe(false);
    const wordId = w1.body.word.id as string;

    // User B cannot see User A's words
    const bobWords = await request(app)
      .get('/api/words')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(bobWords.body.words).toHaveLength(0);

    // User A reviews the word on 2026-11-25 (progress 2/2 -> daily goal completed!)
    const rev = await request(app)
      .post(`/api/words/${wordId}/review`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ quality: 3, localDate: '2026-11-25' })
      .expect(200);

    expect(rev.body.word.repetitions).toBe(1);
    expect(rev.body.dailyActivity.goalCompleted).toBe(true);

    // Overview stats reflect streak = 1 and completed today
    const overview = await request(app)
      .get('/api/stats/overview?today=2026-11-25')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(overview.body.streak.currentStreak).toBe(1);
    expect(overview.body.streak.bestStreak).toBe(1);
    expect(overview.body.todayProgress.completed).toBe(true);
    expect(overview.body.totals.totalWords).toBe(1);
    expect(overview.body.totals.totalReviews).toBe(1);

    // Heatmap and weekly stats return expected series
    const heatmap = await request(app)
      .get('/api/stats/heatmap?today=2026-11-25&days=30')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(heatmap.body.cells).toHaveLength(30);
    expect(heatmap.body.cells[29].goalCompleted).toBe(true);

    const weekly = await request(app)
      .get('/api/stats/weekly?today=2026-11-25&days=7')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(weekly.body.series).toHaveLength(7);
    expect(weekly.body.series[6].wordsAdded).toBe(1);
    expect(weekly.body.series[6].reviewsDone).toBe(1);

    // Quick capture (inbox word without translation) does not enter due queue until defined
    const captured = await request(app)
      .post('/api/words')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        term: 'Ubiquitous',
        notes: 'YouTube video',
        localDate: '2026-11-25',
      })
      .expect(201);
    expect(captured.body.word.status).toBe('inbox');
    expect(captured.body.word.isDue).toBe(false);

    const dueBefore = await request(app)
      .get('/api/words/due')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(dueBefore.body.dueWords).toHaveLength(0);

    // Defining its meaning promotes it from inbox into due queue & counts daily action
    const promoted = await request(app)
      .patch(`/api/words/${captured.body.word.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ translation: 'Omnipresente', localDate: '2026-11-25' })
      .expect(200);
    expect(promoted.body.promotedFromInbox).toBe(true);
    expect(promoted.body.word.status).toBe('new');
    expect(promoted.body.word.isDue).toBe(true);
  });
});
