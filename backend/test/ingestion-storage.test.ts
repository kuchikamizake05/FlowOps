import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import request from 'supertest';
import { PostgresIngestion } from '../src/ingestion/postgres-ingestion.js';
import { normalizeWebhook } from '../src/ingestion/input.js';
import { createApp } from '../src/app.js';
import { SessionStore } from '../src/auth/session-store.js';
import { UserRepository } from '../src/auth/user-repository.js';
import { PostgresOrderRepository } from '../src/orders/postgres-order-repository.js';

const url = process.env.TEST_DATABASE_URL;
const schema = `fo11_${randomUUID().replaceAll('-', '')}`;
let admin: pg.Pool;
let db: pg.Pool;
let ingestion: PostgresIngestion;
before(async () => {
  if (!url) return;
  admin = new pg.Pool({ connectionString: url });
  await admin.query(`CREATE SCHEMA ${schema}`);
  db = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}` });
  const sql = await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8');
  await db.query(sql);
  await db.query(sql);
  ingestion = new PostgresIngestion(db);
});
after(async () => {
  if (!url) return;
  await db?.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
});
const event = (order: string, id: string, time = '2026-10-04T10:00:00Z', status = 'processing') => normalizeWebhook({ sourceEventId: id, marketplaceOrderId: order, eventType: 'order_updated', status, occurredAt: time });

test('persistent ingestion replays concurrently without duplicate orders/events', { skip: !url }, async () => {
  const input = event('replay', 'replay-1');
  const results = await Promise.all([ingestion.ingest([input]), ingestion.ingest([input])]);
  assert.equal(results.reduce((sum, result) => sum + result.accepted, 0), 1);
  assert.equal(results.reduce((sum, result) => sum + result.duplicates, 0), 1);
  assert.equal((await db.query("SELECT count(*)::int n FROM orders WHERE marketplace_order_id='replay'")).rows[0].n, 1);
  assert.equal((await db.query("SELECT count(*)::int n FROM order_events WHERE source_event_id='replay-1'")).rows[0].n, 1);
});

test('late events stay in history and cannot replace the latest snapshot', { skip: !url }, async () => {
  await ingestion.ingest([event('late', 'newest', '2026-10-04T12:00:00Z', 'shipped')]);
  const result = await ingestion.ingest([event('late', 'older', '2026-10-04T10:00:00Z', 'processing')]);
  assert.equal(result.stale, 1);
  assert.equal(result.accepted, 1);
  assert.equal((await db.query("SELECT status FROM orders WHERE marketplace_order_id='late'")).rows[0].status, 'shipped');
});

test('equal timestamps converge regardless of input order', { skip: !url }, async () => {
  await ingestion.ingest([event('tie-a', 'a', undefined, 'new'), event('tie-a', 'z', undefined, 'shipped')]);
  await ingestion.ingest([event('tie-b', 'z-b', undefined, 'shipped'), event('tie-b', 'a-b', undefined, 'new')]);
  const rows = await db.query("SELECT status FROM orders WHERE marketplace_order_id IN ('tie-a','tie-b')");
  assert.deepEqual(rows.rows.map(row => row.status), ['shipped', 'shipped']);
});

test('reuse of an event ID with different data rolls back the whole batch', { skip: !url }, async () => {
  await ingestion.ingest([event('conflict', 'conflict-id')]);
  await assert.rejects(ingestion.ingest([event('rollback', 'rollback-id'), event('different-order', 'conflict-id')]), (error: any) => error.status === 409);
  assert.equal((await db.query("SELECT count(*)::int n FROM orders WHERE marketplace_order_id IN ('rollback','different-order')")).rows[0].n, 0);
  assert.equal((await db.query("SELECT count(*)::int n FROM order_events WHERE source_event_id='rollback-id'")).rows[0].n, 0);
});

test('CSV and webhook API persist equivalent snapshots and report invalid rows', { skip: !url }, async () => {
  const sessions = new SessionStore();
  const token = sessions.create({ id: 'owner', email: 'owner@test.local', role: 'owner' }).token;
  const operator = sessions.create({ id: 'op', email: 'op@test.local', role: 'operator' }).token;
  const app = createApp({ users: new UserRepository(), sessions, orders: new PostgresOrderRepository(db), ingestion });
  const post = (path: string) => request(app).post(path).set('Authorization', `Bearer ${token}`);
  const csv = 'source_event_id,marketplace_order_id,event_type,status,occurred_at\napi-csv,api-csv,order_updated,SHIPPED,2026-10-04T17:00:00+07:00\nbad,api-bad,order_updated,wrong,2026-10-04T10:00:00Z';
  const result = await post('/api/ingestion/csv').type('text/csv').send(csv);
  assert.equal(result.status, 200);
  assert.equal(result.body.accepted, 1);
  assert.equal(result.body.invalid, 1);
  assert.equal(result.body.errors[0].line, 3);
  assert.equal(result.body.persisted, true);
  const webhook = event('api-webhook', 'api-webhook', '2026-10-04T10:00:00Z', 'shipped');
  const { source, ...payload } = webhook;
  const response = await post('/api/ingestion/webhook').send(payload);
  assert.equal(response.status, 200);
  assert.equal((await post('/api/ingestion/webhook').send(payload)).body.duplicates, 1);
  const rows = (await db.query("SELECT id,status,last_event_at FROM orders WHERE marketplace_order_id IN ('api-csv','api-webhook')")).rows;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].status, rows[1].status);
  assert.equal(rows[0].last_event_at.toISOString(), rows[1].last_event_at.toISOString());
  assert.equal((await request(app).get(`/api/orders/${rows[0].id}`).set('Authorization', `Bearer ${token}`)).status, 200);
  assert.equal((await request(app).get(`/api/orders/${rows[0].id}`).set('Authorization', `Bearer ${operator}`)).status, 403);
  assert.equal((await request(app).post('/api/ingestion/webhook').send(payload)).status, 401);
  assert.equal((await request(app).post('/api/ingestion/webhook').set('Authorization', `Bearer ${operator}`).send(payload)).status, 403);
  assert.equal((await post('/api/ingestion/csv').send({ csv })).status, 415);
  assert.equal((await post('/api/ingestion/webhook').type('text/plain').send('x')).status, 415);
  assert.equal((await post('/api/ingestion/webhook').send({ ...payload, status: 'invalid' })).status, 400);
  assert.equal((await post('/api/ingestion/webhook').send({ ...payload, marketplaceOrderId: 'conflict' })).status, 409);
  assert.equal((await post('/api/ingestion/csv').type('text/csv').send('x'.repeat(262145))).status, 413);
});

test('persistent endpoints fail explicitly when storage is not configured', async () => {
  const sessions = new SessionStore();
  const token = sessions.create({ id: 'owner', email: 'owner@test.local', role: 'owner' }).token;
  const app = createApp({ users: new UserRepository(), sessions, orders: new PostgresOrderRepository({} as pg.Pool) });
  const response = await request(app).post('/api/ingestion/webhook').set('Authorization', `Bearer ${token}`).send({});
  assert.equal(response.status, 503);
  const csv = await request(app).post('/api/ingestion/csv').set('Authorization', `Bearer ${token}`).type('text/csv').send('x');
  assert.equal(csv.status, 503);
});

test('snapshot updates preserve assignees and store complaint/deadline data', { skip: !url }, async () => {
  await ingestion.ingest([event('assigned', 'assigned-1')]);
  await db.query("INSERT INTO users (id,email,role,password_hash) VALUES ('operator','operator@test.local','operator','test-only')");
  await db.query("UPDATE orders SET assignee_id='operator' WHERE marketplace_order_id='assigned'");
  const input = { ...event('assigned', 'assigned-2', '2026-10-04T11:00:00Z'), processingDeadline: '2026-10-05T00:00:00.000Z', complaintText: 'Please check delivery' };
  await ingestion.ingest([input]);
  const row = (await db.query("SELECT id,assignee_id,processing_deadline FROM orders WHERE marketplace_order_id='assigned'")).rows[0];
  assert.equal(row.assignee_id, 'operator');
  assert.equal(row.processing_deadline.toISOString(), input.processingDeadline);
  assert.equal((await db.query("SELECT payload->>'complaintText' complaint FROM order_events WHERE source_event_id='assigned-2'")).rows[0].complaint, input.complaintText);
  const reader = new PostgresOrderRepository(db);
  assert.equal((await reader.findById(row.id))?.assigneeId, 'operator');
  assert.equal(await reader.findById('missing'), null);
});

test('legacy history prevents old events from replacing seeded snapshots', { skip: !url }, async () => {
  await db.query("INSERT INTO orders (id,marketplace_order_id,status) VALUES ('legacy','legacy','shipped')");
  await db.query("INSERT INTO order_events (order_id,source,source_event_id,event_type,occurred_at) VALUES ('legacy','webhook','legacy-event','order_updated','2026-10-04T12:00:00Z')");
  await db.query(await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8'));
  assert.equal((await ingestion.ingest([event('legacy', 'legacy-old')])).stale, 1);
  assert.equal((await db.query("SELECT status FROM orders WHERE id='legacy'")).rows[0].status, 'shipped');
  await assert.rejects(ingestion.ingest([event('legacy', 'legacy-event', '2026-10-04T12:00:00Z', 'shipped')]), (error: any) => error.status === 409);
  assert.deepEqual(await ingestion.ingest([]), { accepted: 0, duplicates: 0, stale: 0 });
});

test('source distinguishes event identities while keeping one marketplace order', { skip: !url }, async () => {
  const input = event('shared', 'shared-event');
  assert.equal((await ingestion.ingest([input, { ...input, source: 'csv' }])).accepted, 2);
  assert.equal((await db.query("SELECT count(*)::int n FROM orders WHERE marketplace_order_id='shared'")).rows[0].n, 1);
});
