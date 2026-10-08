import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import argon2 from 'argon2';
import { z } from 'zod';
import type { SessionStore } from './auth/session-store.js';
import type { PublicUser } from './auth/user-repository.js';
import { UserRepository } from './auth/user-repository.js';
import type { OrderReader } from './orders/order-repository.js';
import type { IngestionStore } from './ingestion/postgres-ingestion.js';
import { InputError, MAX_CSV_BYTES, normalizeWebhook, previewCsv } from './ingestion/input.js';
import { workflowRouter } from './workflow/router.js';
import type { WorkflowStore } from './workflow/types.js';

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(1024)
});

interface AppDependencies {
  users: UserRepository;
  sessions: SessionStore;
  orders: OrderReader;
  ingestion?: IngestionStore;
  workflow?: WorkflowStore;
}

function publicUser(user: PublicUser): PublicUser {
  return { id: user.id, email: user.email, role: user.role };
}

function bearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length);
}

export function createApp({ users, sessions, orders, ingestion, workflow }: AppDependencies) {
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

      const user = await users.findByEmail(parsed.data.email.toLowerCase());
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

  const requireOwner = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Autentikasi diperlukan.' });
    if (req.user.role !== 'owner') return res.status(403).json({ error: 'Hanya owner yang dapat memeriksa data impor.' });
    return next();
  };

  app.post('/api/ingestion/csv/preview', requireOwner, express.text({ type: 'text/csv', limit: MAX_CSV_BYTES }), (req, res) => {
    if (!req.is('text/csv')) return res.status(415).json({ error: 'Gunakan Content-Type: text/csv.' });
    return res.json(previewCsv(req.body ?? ''));
  });

  app.post('/api/ingestion/webhook/preview', requireOwner, (req, res) => {
    if (!req.is('application/json')) return res.status(415).json({ error: 'Gunakan Content-Type: application/json.' });
    return res.json({ persisted: false, event: normalizeWebhook(req.body) });
  });

  app.post('/api/ingestion/csv', requireOwner, express.text({ type: 'text/csv', limit: MAX_CSV_BYTES }), async (req, res) => {
    if (!ingestion) return res.status(503).json({ error: 'Penyimpanan database belum dikonfigurasi.' });
    if (!req.is('text/csv')) return res.status(415).json({ error: 'Gunakan Content-Type: text/csv.' });
    const preview = previewCsv(req.body ?? '');
    const result = await ingestion.ingest(preview.events);
    return res.json({ ...preview, events: undefined, persisted: true, ...result });
  });

  app.post('/api/ingestion/webhook', requireOwner, async (req, res) => {
    if (!ingestion) return res.status(503).json({ error: 'Penyimpanan database belum dikonfigurasi.' });
    if (!req.is('application/json')) return res.status(415).json({ error: 'Gunakan Content-Type: application/json.' });
    const result = await ingestion.ingest([normalizeWebhook(req.body)]);
    return res.json({ persisted: true, total: 1, valid: 1, invalid: 0, errors: [], ...result });
  });

  app.get('/api/orders/:id', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Autentikasi diperlukan.' });
    const order = await orders.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order tidak ditemukan.' });

    const canAccess = req.user.role === 'owner' || order.assigneeId === req.user.id || Boolean(workflow && await workflow.canAccessOrder(req.user, order.id));
    if (!canAccess) return res.status(403).json({ error: 'Anda tidak memiliki akses ke order ini.' });
    return res.json({ order, ...(workflow ? await workflow.orderTimeline(req.user,order.id) : {}) });
  });

  app.use('/api', workflowRouter(workflow));

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof InputError) return res.status(error.status).json({ error: error.message, fields: error.fields });
    if (error && typeof error === 'object' && 'type' in error && error.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Ukuran input melebihi batas.' });
    }
    if (error instanceof SyntaxError && 'body' in error) {
      return res.status(400).json({ error: 'JSON tidak valid.' });
    }
    return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  });

  return app;
}
