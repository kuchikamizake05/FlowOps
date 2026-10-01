import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import argon2 from 'argon2';
import { z } from 'zod';
import type { SessionStore } from './auth/session-store.js';
import type { PublicUser } from './auth/user-repository.js';
import { UserRepository } from './auth/user-repository.js';
import { OrderRepository } from './orders/order-repository.js';

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(1024)
});

interface AppDependencies {
  users: UserRepository;
  sessions: SessionStore;
  orders: OrderRepository;
}

function publicUser(user: PublicUser): PublicUser {
  return { id: user.id, email: user.email, role: user.role };
}

function bearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

export function createApp({ users, sessions, orders }: AppDependencies) {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '32kb' }));

  app.use((req: Request, _res: Response, next: NextFunction) => {
    const token = bearerToken(req.get('authorization'));
    req.user = token ? sessions.find(token) : null;
    next();
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false
  });

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.post('/api/auth/login', loginLimiter, async (req, res, next) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Input login tidak valid.' });

      const user = users.findByEmail(parsed.data.email.toLowerCase());
      const passwordValid = user && await argon2.verify(user.passwordHash, parsed.data.password);
      if (!passwordValid) return res.status(401).json({ error: 'Email atau password salah.' });

      const session = sessions.create(publicUser(user));
      return res.status(200).json({
        token: session.token,
        expiresAt: new Date(session.expiresAt).toISOString(),
        user: publicUser(user)
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/auth/me', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Autentikasi diperlukan.' });
    return res.json({ user: req.user });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = bearerToken(req.get('authorization'));
    if (!req.user || !token) return res.status(401).json({ error: 'Autentikasi diperlukan.' });
    sessions.revoke(token);
    return res.status(204).end();
  });

  app.get('/api/orders/:id', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Autentikasi diperlukan.' });
    const order = orders.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order tidak ditemukan.' });

    const canAccess = req.user.role === 'owner' || order.assigneeId === req.user.id;
    if (!canAccess) return res.status(403).json({ error: 'Anda tidak memiliki akses ke order ini.' });
    return res.json({ order });
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof SyntaxError && 'body' in error) {
      return res.status(400).json({ error: 'JSON tidak valid.' });
    }
    return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  });

  return app;
}
