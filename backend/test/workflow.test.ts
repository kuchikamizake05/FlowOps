import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { PostgresWorkflow } from '../src/workflow/postgres-workflow.js';
const url = process.env.TEST_DATABASE_URL;
const schema = `wf_${randomUUID().replaceAll('-', '')}`;
let admin: pg.Pool, db: pg.Pool, store: PostgresWorkflow;
const owner = { id: 'owner', email: 'owner@local', role: 'owner' as const };
const op = { id: 'op', email: 'op@local', role: 'operator' as const };
const other = { id: 'other', email: 'other@local', role: 'operator' as const };
before(async () => {
  if (!url) return;
  admin = new pg.Pool({ connectionString: url });
  await admin.query(`CREATE SCHEMA ${schema}`);
  db = new pg.Pool({
    connectionString: url,
    options: `-c search_path=${schema}`,
  });
  const sql = await readFile(
    new URL('../database/schema.sql', import.meta.url),
    'utf8',
  );
  await db.query(sql);
  await db.query(sql);
  await db.query(
    "INSERT INTO users(id,email,role,password_hash) VALUES ('owner','owner@local','owner','x'),('op','op@local','operator','x'),('other','other@local','operator','x')",
  );
  store = new PostgresWorkflow(db);
});
after(async () => {
  if (!url) return;
  await db?.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
});
async function fixture() {
  const id = randomUUID();
  await db.query(
    "INSERT INTO orders(id,marketplace_order_id,status,processing_deadline) VALUES ($1,$1,'processing',now())",
    [id],
  );
  return String(
    (
      await db.query(
        "INSERT INTO exceptions(order_id,rule_code,priority,status,reason) VALUES ($1,'EX-01','high','open','late') RETURNING id",
        [id],
      )
    ).rows[0].id,
  );
}
test(
  'concurrent claims permit one winner and preserve one audit',
  { skip: !url },
  async () => {
    const id = await fixture();
    const results = await Promise.allSettled([
      store.claim(op, id, 1),
      store.claim(other, id, 1),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    for (const result of results)
      if (result.status === 'rejected') assert.equal(result.reason.status, 409);
    assert.equal((await store.actions(owner, id)).length, 1);
    assert.equal((await store.detail(owner, id)).version, 2);
  },
);
test(
  'assignment, versions, access, transition and rollback',
  { skip: !url },
  async () => {
    const id = await fixture();
    await assert.rejects(store.assign(op, id, 'other', 1), { status: 403 });
    await assert.rejects(store.assign(owner, id, 'owner', 1), { status: 400 });
    let item = await store.assign(owner, id, 'op', 1);
    assert.equal(item.version, 2);
    await assert.rejects(store.detail(other, id), { status: 403 });
    await assert.rejects(store.transition(op, id, 'resolved', 'done', 2), {
      status: 409,
    });
    item = await store.transition(op, id, 'in_progress', null, 2);
    await assert.rejects(store.transition(op, id, 'resolved', ' ', 3), {
      status: 400,
    });
    item = await store.transition(op, id, 'resolved', 'Completed', 3);
    assert.equal(item.version, 4);
    await assert.rejects(store.assign(owner, id, 'other', 4), { status: 409 });
    assert.equal((await store.actions(owner, id)).length, 3);
    assert.ok(await store.canAccessOrder(op, item.orderId));
    assert.equal(
      (await store.orderTimeline(op, item.orderId)).exceptions.length,
      1,
    );
  },
);
test(
  'queue filtering, paging and scoped idempotent notification reads',
  { skip: !url },
  async () => {
    await db.query('DELETE FROM notifications');
    const id = await fixture();
    assert.ok(
      (
        await store.list(op, {
          priority: 'high',
          status: 'open',
          ruleCode: 'EX-01',
          page: 1,
          pageSize: 1,
        })
      ).total >= 1,
    );
    assert.equal((await store.operators(owner)).length, 2);
    const n = String(
      (
        await db.query(
          "INSERT INTO notifications(recipient_id,exception_id,kind,priority,dedupe_key) VALUES ('op',$1,'assignment','high',$2) RETURNING id",
          [id, randomUUID()],
        )
      ).rows[0].id,
    );
    assert.equal((await store.notifications(other, {})).total, 0);
    await assert.rejects(store.readNotification(other, n), { status: 404 });
    const first = await store.readNotification(op, n);
    const second = await store.readNotification(op, n);
    assert.equal(first.readAt, second.readAt);
    assert.equal(
      (await store.notifications(op, { unreadOnly: true })).total,
      0,
    );
  },
);
test(
  'workflow validation and no-op mutations have no side effects',
  { skip: !url },
  async () => {
    const id = await fixture();
    await assert.rejects(store.detail(owner, 'bad'), { status: 400 });
    await assert.rejects(store.detail(owner, '9223372036854775808'), {
      status: 400,
    });
    await assert.rejects(store.detail(owner, '99999999'), { status: 404 });
    await assert.rejects(store.claim(owner, id, 1), { status: 403 });
    await assert.rejects(store.claim(op, id, 0), { status: 400 });
    await assert.rejects(store.transition(owner, id, 'in_progress', null, 1), {
      status: 409,
    });
    await assert.rejects(store.transition(op, id, 'in_progress', null, 1), {
      status: 403,
    });
    await assert.rejects(store.transition(owner, id, 'bad' as any, null, 1), {
      status: 400,
    });
    await assert.rejects(
      store.transition(owner, id, 'in_progress', 'x'.repeat(2001), 1),
      { status: 400 },
    );
    await store.assign(owner, id, 'op', 1);
    await store.assign(owner, id, 'op', 2);
    await store.transition(owner, id, 'open', null, 2);
    assert.equal((await store.actions(owner, id)).length, 1);
    await assert.rejects(store.claim(op, id, 2), { status: 409 });
    await assert.rejects(store.assign(owner, id, 'other', 1), { status: 409 });
    await assert.rejects(store.operators(op), { status: 403 });
    assert.equal(
      await store.canAccessOrder(
        other,
        (await store.detail(owner, id)).orderId,
      ),
      false,
    );
    await assert.rejects(
      store.orderTimeline(other, (await store.detail(owner, id)).orderId),
      { status: 404 },
    );
    await assert.rejects(store.list(owner, { page: 0 }), { status: 400 });
    await assert.rejects(store.list(owner, { pageSize: 101 }), { status: 400 });
    await assert.rejects(store.list(owner, { priority: 'bad' }), {
      status: 400,
    });
    await assert.rejects(store.list(owner, { status: 'bad' }), { status: 400 });
    await assert.rejects(store.list(owner, { deadlineBefore: 'bad' }), {
      status: 400,
    });
    const result = await store.list(owner, {
      priority: 'high',
      status: 'open',
      assigneeId: 'op',
      deadlineBefore: '2099-01-01T00:00:00Z',
      page: 1,
      pageSize: 100,
    });
    assert.ok(result.items.some((row: any) => row.id === id));
    await db.query(
      "INSERT INTO order_events(order_id,source,source_event_id,event_type,occurred_at) VALUES ($1,'webhook',$2,'order_updated',now())",
      [(await store.detail(owner, id)).orderId, randomUUID()],
    );
    assert.equal(
      (await store.orderTimeline(op, (await store.detail(owner, id)).orderId))
        .events.length,
      1,
    );
  },
);
