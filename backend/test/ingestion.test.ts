import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { previewCsv, normalizeWebhook, InputError, MAX_CSV_BYTES } from '../src/ingestion/input.js';
import { createApp } from '../src/app.js';
import { SessionStore } from '../src/auth/session-store.js';
import { UserRepository } from '../src/auth/user-repository.js';
import { OrderRepository } from '../src/orders/order-repository.js';

const header = 'source_event_id,marketplace_order_id,event_type,status,occurred_at,processing_deadline';
const event = { sourceEventId: 'evt-1', marketplaceOrderId: 'ORD-1', eventType: 'order_updated', status: 'READY_TO_SHIP', occurredAt: '2026-10-03T10:00:00+07:00', processingDeadline: '2026-10-03T12:00:00+07:00' };
const row = 'evt-1,ORD-1,order_updated,READY_TO_SHIP,2026-10-03T10:00:00+07:00,2026-10-03T12:00:00+07:00';

test('CSV and webhook normalize the same event to UTC and canonical status', () => {
  const csv = previewCsv(`${header}\r\n${row}`);
  const webhook = normalizeWebhook(event);
  assert.deepEqual(csv.events[0], { ...webhook, source: 'csv' });
  assert.equal(webhook.status, 'ready_to_ship');
  assert.equal(webhook.occurredAt, '2026-10-03T03:00:00.000Z');
  assert.equal(csv.valid, 1);
});

test('CSV supports BOM, escaped quotes, commas, and multiline values', () => {
  const csv = previewCsv('\uFEFF' + header + ',complaint_text\n' + row + ',"Hai, ""toko""\nbarang rusak"\n');
  assert.equal(csv.events[0].complaintText, 'Hai, "toko"\nbarang rusak');
});

test('invalid CSV rows have physical line numbers and field errors', () => {
  const csv = previewCsv(header + ',complaint_text\n' + row + ',"two\nlines"\n' + row.replace('READY_TO_SHIP', 'unknown'));
  assert.equal(csv.valid, 1);
  assert.equal(csv.invalid, 1);
  assert.equal(csv.errors[0].line, 4);
  assert.equal(csv.errors[0].fields[0].field, 'status');
});

test('CSV structural errors are rejected instead of silently skipping data', () => {
  for (const csv of ['', header, header + '\n"broken', header + '\nshort,row', header + ',extra\n' + row + ',x', header + ',status\n' + row + ',new']) {
    assert.throws(() => previewCsv(csv), InputError);
  }
});

test('CSV limits bytes and number of records', () => {
  assert.throws(() => previewCsv('x'.repeat(MAX_CSV_BYTES + 1)), (e: unknown) => e instanceof InputError && e.status === 413);
  assert.throws(() => previewCsv(header + '\n' + Array(1001).fill(row).join('\n')), (e: unknown) => e instanceof InputError && e.status === 413);
});

test('webhook rejects unknown fields, missing IDs, invalid status and invalid/local times', () => {
  for (const value of [null, {}, { ...event, extra: 1 }, { ...event, sourceEventId: ' ' }, { ...event, status: 'whatever' }, { ...event, occurredAt: '2026-02-30T10:00:00Z' }, { ...event, occurredAt: '2026-10-03T10:00:00' }, { ...event, processingDeadline: 'tomorrow' }, { ...event, complaintText: 'x'.repeat(4001) }]) {
    assert.throws(() => normalizeWebhook(value), InputError);
  }
  assert.equal(normalizeWebhook({ ...event, processingDeadline: null }).processingDeadline, null);
});

test('preview preserves repeated and out-of-order events for future persistence', () => {
  const csv = previewCsv(header + '\n' + row + '\n' + row.replace('evt-1', 'evt-2').replace('10:00:00', '09:00:00') + '\n' + row);
  assert.equal(csv.events.length, 3);
  assert.equal(csv.events[1].occurredAt, '2026-10-03T02:00:00.000Z');
  assert.equal(csv.persisted, false);
});

function fixture() {
  const sessions = new SessionStore();
  const owner = sessions.create({ id: 'owner', email: 'owner@test.local', role: 'owner' }).token;
  const operator = sessions.create({ id: 'operator', email: 'operator@test.local', role: 'operator' }).token;
  return { app: createApp({ sessions, users: new UserRepository(), orders: new OrderRepository() }), owner, operator };
}

test('preview API enforces owner access and accepts CSV/webhook without persisting', async () => {
  const { app, owner, operator } = fixture();
  for (const path of ['/api/ingestion/csv/preview', '/api/ingestion/webhook/preview']) {
    assert.equal((await request(app).post(path)).status, 401);
    assert.equal((await request(app).post(path).set('Authorization', `Bearer ${operator}`)).status, 403);
  }
  const csv = await request(app).post('/api/ingestion/csv/preview').set('Authorization', `Bearer ${owner}`).type('text/csv').send(header + '\n' + row);
  assert.equal(csv.status, 200);
  assert.equal(csv.body.persisted, false);
  const webhook = await request(app).post('/api/ingestion/webhook/preview').set('Authorization', `Bearer ${owner}`).send(event);
  assert.equal(webhook.status, 200);
  assert.equal(webhook.body.event.source, 'webhook');
  assert.equal(webhook.body.persisted, false);
});

test('preview API reports malformed inputs, media types and oversized bodies', async () => {
  const { app, owner } = fixture();
  const post = (path: string) => request(app).post(path).set('Authorization', `Bearer ${owner}`);
  assert.equal((await post('/api/ingestion/csv/preview').send({ csv: row })).status, 415);
  assert.equal((await post('/api/ingestion/webhook/preview').type('text/plain').send('x')).status, 415);
  assert.equal((await post('/api/ingestion/csv/preview').type('text/csv').send(header + '\n"broken')).status, 400);
  assert.equal((await post('/api/ingestion/webhook/preview').send({ ...event, status: 'unknown' })).status, 400);
  assert.equal((await post('/api/ingestion/webhook/preview').type('json').send('{broken')).status, 400);
  assert.equal((await post('/api/ingestion/csv/preview').type('text/csv').send('x'.repeat(MAX_CSV_BYTES + 1))).status, 413);
  assert.equal((await post('/api/ingestion/webhook/preview').send({ text: 'x'.repeat(33000) })).status, 413);
});
