import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import type { AppDatabase } from '../db';
import {
  type AuthenticatedRequest,
  requireAuth,
  signToken,
} from '../middleware/auth';
import { normalizeLocalDate } from '../services/streak';

const registerSchema = z.object({
  email: z.string().trim().email('Correo electrónico inválido').toLowerCase(),
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(60),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').max(100),
  dailyGoal: z.number().int().min(1).max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  dailyGoal: z.number().int().min(1).max(50).optional(),
  localDate: z.string().optional(),
});

interface UserRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  daily_goal: number;
  created_at: string;
}

function serializeUser(u: UserRow) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    dailyGoal: u.daily_goal,
    createdAt: u.created_at,
  };
}

export function createAuthRouter(db: AppDatabase): Router {
  const router = Router();

  router.post('/register', async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }

    const { email, name, password, dailyGoal = 5 } = parsed.data;
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({ error: 'Ya existe una cuenta con ese correo electrónico' });
      return;
    }

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();

    db.prepare(
      `INSERT INTO users (id, email, name, password_hash, daily_goal, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, email, name, passwordHash, dailyGoal, createdAt);

    const token = signToken({ userId: id, email });
    res.status(201).json({
      token,
      user: { id, email, name, dailyGoal, createdAt },
    });
  });

  router.post('/login', async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Correo o contraseña inválidos' });
      return;
    }

    const { email, password } = parsed.data;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as unknown as
      | UserRow
      | undefined;

    if (!user) {
      res.status(401).json({ error: 'Credenciales incorrectas' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: 'Credenciales incorrectas' });
      return;
    }

    const token = signToken({ userId: user.id, email: user.email });
    res.json({
      token,
      user: serializeUser(user),
    });
  });

  router.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const user = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(req.user!.userId) as unknown as UserRow | undefined;

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({ user: serializeUser(user) });
  });

  router.patch('/settings', requireAuth, (req: AuthenticatedRequest, res) => {
    const parsed = settingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Datos inválidos' });
      return;
    }

    const userId = req.user!.userId;
    const current = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as unknown as
      | UserRow
      | undefined;
    if (!current) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const nextName = parsed.data.name ?? current.name;
    const nextGoal = parsed.data.dailyGoal ?? current.daily_goal;

    db.prepare('UPDATE users SET name = ?, daily_goal = ? WHERE id = ?').run(
      nextName,
      nextGoal,
      userId
    );

    if (parsed.data.dailyGoal !== undefined) {
      const today = normalizeLocalDate(parsed.data.localDate);
      const todayRow = db
        .prepare('SELECT words_added, reviews_done FROM daily_activity WHERE user_id = ? AND activity_date = ?')
        .get(userId, today) as unknown as { words_added: number; reviews_done: number } | undefined;

      if (todayRow) {
        const completed = todayRow.words_added + todayRow.reviews_done >= nextGoal ? 1 : 0;
        db.prepare(
          `UPDATE daily_activity
           SET goal_target = ?, goal_completed = ?
           WHERE user_id = ? AND activity_date = ?`
        ).run(nextGoal, completed, userId, today);
      }
    }

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as unknown as UserRow;
    res.json({ user: serializeUser(updated) });
  });

  return router;
}
