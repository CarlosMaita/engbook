import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'engbook-dev-secret-change-in-production';
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '30d' });
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de autenticación requerido' });
    return;
  }

  const token = header.slice(7).trim();
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthPayload;
    req.user = { userId: decoded.userId, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida o expirada' });
  }
}
