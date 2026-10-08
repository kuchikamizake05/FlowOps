import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateOrderExceptions } from '../src/rules/rules-engine.js';

test('accepted ingestion statuses trigger cancellation and return rules; completed is terminal', () => {
  const now = new Date('2026-10-08T10:00:00Z');
  const evaluate = (status: string) => evaluateOrderExceptions({ id: 'order', status, processingDeadline: now }, now).map(x => x.ruleCode);
  assert.ok(evaluate('cancellation_pending').includes('EX-03'));
  assert.ok(evaluate('return_pending').includes('EX-05'));
  assert.deepEqual(evaluate('completed'), []);
});

import { before, after } from 'node:test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { PostgresIngestion } from '../src/ingestion/postgres-ingestion.js';
import { normalizeWebhook } from '../src/ingestion/input.js';
import { syncOrderExceptionsInTransaction } from '../src/rules/rules-engine.js';
const url = process.env.TEST_DATABASE_URL;
const schema = `rules_${randomUUID().replaceAll('-', '')}`;
let admin: pg.Pool, db: pg.Pool, ingestion: PostgresIngestion;
before(async () => {
  if (!url) return;
  admin = new pg.Pool({ connectionString: url });
  await admin.query(`CREATE SCHEMA ${schema}`);
  db = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}` });
  await db.query(await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8'));
  await db.query(`INSERT INTO users(id,email,role,password_hash) VALUES ('o','owner@rules.test','owner','hash'),('a','a@rules.test','operator','hash'),('b','b@rules.test','operator','hash')`);
  ingestion = new PostgresIngestion(db);
});
after(async () => { if (url) { await db.end(); await admin.query(`DROP SCHEMA ${schema} CASCADE`); await admin.end(); } });
const event = (id: string, order: string, status = 'cancellation_pending') => normalizeWebhook({ sourceEventId:id, marketplaceOrderId:order, eventType:'order_updated', status, occurredAt:'2026-10-08T10:00:00Z' });
async function sync(id: string, now = new Date()) {
  const client = await db.connect();
  try { await client.query('BEGIN'); await syncOrderExceptionsInTransaction(client,id,now); await client.query('COMMIT'); }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
test('accepted event creates one active finding and recipient notifications; replay and concurrent sync deduplicate', { skip: !url }, async () => {
  const input = event('cancel-1','cancel');
  await Promise.all([ingestion.ingest([input]),ingestion.ingest([input])]);
  const order = (await db.query(`SELECT id FROM orders WHERE marketplace_order_id='cancel'`)).rows[0].id;
  await Promise.all([sync(order),sync(order)]);
  assert.equal((await db.query(`SELECT count(*)::int n FROM exceptions WHERE order_id=$1`,[order])).rows[0].n,1);
  assert.equal((await db.query('SELECT count(*)::int n FROM notifications')).rows[0].n,3);
  await db.query(`UPDATE exceptions SET status='resolved' WHERE order_id=$1`,[order]);
  await sync(order);
  await ingestion.ingest([{...event('cancel-unrelated','cancel','processing'), occurredAt:'2026-10-09T10:00:00.000Z'}]);
  assert.equal((await db.query(`SELECT count(*)::int n FROM exceptions WHERE order_id=$1`,[order])).rows[0].n,1);
});
test('escalation targets assigned operator and owner once, preserving complaint after assignment audit', { skip: !url }, async () => {
  await ingestion.ingest([event('return-1','return','return_pending')]);
  const ex = (await db.query(`SELECT e.* FROM exceptions e JOIN orders o ON o.id=e.order_id WHERE o.marketplace_order_id='return' AND rule_code='EX-05'`)).rows[0];
  await db.query(`UPDATE exceptions SET assignee_id='a', priority='medium' WHERE id=$1`,[ex.id]);
  await db.query(`INSERT INTO action_logs(exception_id,actor_id,action) VALUES($1,'o','assign')`,[ex.id]);
  await sync(ex.order_id); await sync(ex.order_id);
  assert.equal((await db.query(`SELECT priority FROM exceptions WHERE id=$1`,[ex.id])).rows[0].priority,'high');
  const notifications = await db.query(`SELECT recipient_id FROM notifications WHERE exception_id=$1 AND kind='escalation' ORDER BY recipient_id`,[ex.id]);
  assert.deepEqual(notifications.rows.map(r=>r.recipient_id),['a','o']);
});
test('notification failure rolls back order, event and exception atomically', { skip: !url }, async () => {
  await db.query(`ALTER TABLE notifications ADD CONSTRAINT test_failure CHECK(kind <> 'new') NOT VALID`);
  try { await assert.rejects(ingestion.ingest([event('rollback-1','rollback')])); }
  finally { await db.query('ALTER TABLE notifications DROP CONSTRAINT test_failure'); }
  assert.equal((await db.query(`SELECT count(*)::int n FROM orders WHERE marketplace_order_id='rollback'`)).rows[0].n,0);
  assert.equal((await db.query(`SELECT count(*)::int n FROM order_events WHERE source_event_id='rollback-1'`)).rows[0].n,0);
});
test('stale history does not reopen a rule on terminal latest snapshot', { skip: !url }, async () => {
  await ingestion.ingest([event('terminal-1','terminal','completed')]);
  const stale = {...event('terminal-0','terminal'),occurredAt:'2026-10-07T10:00:00.000Z'};
  assert.equal((await ingestion.ingest([stale])).stale,1);
  assert.equal((await db.query(`SELECT count(*)::int n FROM exceptions e JOIN orders o ON o.id=e.order_id WHERE o.marketplace_order_id='terminal'`)).rows[0].n,0);
});

test('new complaint refreshes active watermark before resolution', {skip:!url}, async()=>{
  await ingestion.ingest([event('watermark-a','watermark','return_pending')]);
  await ingestion.ingest([{...event('watermark-b','watermark','return_pending'),occurredAt:'2026-10-09T10:00:00.000Z'}]);
  const ex=(await db.query(`SELECT e.* FROM exceptions e JOIN orders o ON o.id=e.order_id WHERE o.marketplace_order_id='watermark' AND rule_code='EX-05'`)).rows[0];
  await db.query(`UPDATE exceptions SET status='resolved' WHERE id=$1`,[ex.id]);
  await sync(ex.order_id);
  assert.equal((await db.query(`SELECT count(*)::int n FROM exceptions WHERE order_id=$1 AND rule_code='EX-05'`,[ex.order_id])).rows[0].n,1);
});
test('late complaint is evaluated while latest completed snapshot remains unchanged',{skip:!url},async()=>{
  await ingestion.ingest([event('late-complaint-current','late-complaint','completed')]);
  await ingestion.ingest([{...event('late-complaint-history','late-complaint','return_pending'),occurredAt:'2026-10-07T10:00:00.000Z'}]);
  assert.equal((await db.query(`SELECT status FROM orders WHERE marketplace_order_id='late-complaint'`)).rows[0].status,'completed');
  assert.equal((await db.query(`SELECT count(*)::int n FROM exceptions e JOIN orders o ON o.id=e.order_id WHERE o.marketplace_order_id='late-complaint' AND rule_code='EX-05'`)).rows[0].n,1);
});
test('new cancellation request after historical approval needs a fresh decision',()=>{
  const now=new Date('2026-10-08T10:00:00Z');
  const result=evaluateOrderExceptions({id:'cancel-history',status:'processing',events:[
    {eventType:'cancellation_requested',occurredAt:'2026-10-05T10:00:00Z'},
    {eventType:'cancellation_approved',occurredAt:'2026-10-06T10:00:00Z'},
    {eventType:'cancellation_requested',occurredAt:'2026-10-07T10:00:00Z'}
  ]},now);
  assert.ok(result.some(x=>x.ruleCode==='EX-03'));
});

