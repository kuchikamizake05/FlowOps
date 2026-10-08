import { Router } from 'express';
import { z } from 'zod';
import { InputError } from '../ingestion/input.js';
import type { WorkflowStore } from './types.js';

const version = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
const id = z
  .string()
  .regex(/^[1-9]\d{0,18}$/)
  .refine(
    (v) => /^[1-9]\d{0,18}$/.test(v) && BigInt(v) <= 9223372036854775807n,
  );
const page = z.coerce.number().int().min(1).max(1000000).default(1);
const pageSize = z.coerce.number().int().min(1).max(100).default(20);
const query = z
  .object({
    priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
    status: z.enum(['open', 'in_progress', 'resolved']).optional(),
    ruleCode: z.enum(['EX-01', 'EX-02', 'EX-03', 'EX-04', 'EX-05']).optional(),
    assigneeId: z.string().min(1).max(128).optional(),
    deadlineBefore: z.iso.datetime({ offset: true }).optional(),
    page,
    pageSize,
  })
  .strict();
const inboxQuery = z
  .object({
    page,
    pageSize,
    unreadOnly: z
      .enum(['true', 'false'])
      .transform((v) => v === 'true')
      .optional(),
  })
  .strict();
const claim = z.object({ expectedVersion: version }).strict();
const assign = claim.extend({ assigneeId: z.string().trim().min(1).max(128) });
const transition = claim.extend({
  status: z.enum(['open', 'in_progress', 'resolved']),
  note: z.string().trim().min(1).max(2000).optional(),
});

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success)
    throw new InputError(
      'Input tidak valid.',
      400,
      parsed.error.issues.map((i) => ({
        field: i.path.join('.') || 'payload',
        message: i.message,
      })),
    );
  return parsed.data;
}

export function workflowRouter(workflow?: WorkflowStore) {
  const router = Router();
  router.use((req, res, next) => {
    if (!req.user)
      return res.status(401).json({ error: 'Autentikasi diperlukan.' });
    if (!workflow)
      return res
        .status(503)
        .json({ error: 'Penyimpanan database belum dikonfigurasi.' });
    next();
  });
  router.get('/exceptions', async (req, res) =>
    res.json(await workflow!.list(req.user!, parse(query, req.query))),
  );
  router.get('/exceptions/:id', async (req, res) =>
    res.json({
      exception: await workflow!.detail(req.user!, parse(id, req.params.id)),
    }),
  );
  router.post('/exceptions/:id/claim', async (req, res) => {
    const body = parse(claim, req.body);
    return res.json({
      exception: await workflow!.claim(
        req.user!,
        parse(id, req.params.id),
        body.expectedVersion,
      ),
    });
  });
  router.patch('/exceptions/:id/assignee', async (req, res) => {
    const body = parse(assign, req.body);
    return res.json({
      exception: await workflow!.assign(
        req.user!,
        parse(id, req.params.id),
        body.assigneeId,
        body.expectedVersion,
      ),
    });
  });
  router.patch('/exceptions/:id/status', async (req, res) => {
    const body = parse(transition, req.body);
    return res.json({
      exception: await workflow!.transition(
        req.user!,
        parse(id, req.params.id),
        body.status,
        body.note,
        body.expectedVersion,
      ),
    });
  });
  router.get('/exceptions/:id/actions', async (req, res) =>
    res.json({
      items: await workflow!.actions(req.user!, parse(id, req.params.id)),
    }),
  );
  router.get('/operators', async (req, res) =>
    res.json({ items: await workflow!.operators(req.user!) }),
  );
  router.get('/notifications', async (req, res) =>
    res.json(
      await workflow!.notifications(req.user!, parse(inboxQuery, req.query)),
    ),
  );
  router.patch('/notifications/:id/read', async (req, res) => {
    parse(z.object({}).strict(), req.body);
    return res.json({
      notification: await workflow!.readNotification(
        req.user!,
        parse(id, req.params.id),
      ),
    });
  });
  return router;
}
