import assert from 'node:assert/strict';
import test, { before, after } from 'node:test';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import argon2 from 'argon2';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { SessionStore } from '../src/auth/session-store.js';
import { UserRepository } from '../src/auth/user-repository.js';
import { OrderRepository } from '../src/orders/order-repository.js';
import { PostgresOrderRepository } from '../src/orders/postgres-order-repository.js';
import { PostgresUserRepository } from '../src/auth/postgres-user-repository.js';
import { PostgresWorkflow } from '../src/workflow/postgres-workflow.js';

const url = process.env.TEST_DATABASE_URL;
const schema = `fo14_api_${randomUUID().replaceAll('-', '')}`;
let db: pg.Pool, admin: pg.Pool;
before(async () => {
  if (!url) return;
  admin = new pg.Pool({ connectionString: url });
  await admin.query(`CREATE SCHEMA ${schema}`);
  db = new pg.Pool({
    connectionString: url,
    options: `-c search_path=${schema}`,
  });
  await db.query(
    await readFile(new URL('../database/schema.sql', import.meta.url), 'utf8'),
  );
  const hash = await argon2.hash('test-password-long');
  for (const [id, role] of [
    ['api-owner', 'owner'],
    ['api-op1', 'operator'],
    ['api-op2', 'operator'],
  ]) {
    await db.query(
      'INSERT INTO users(id,email,role,password_hash) VALUES($1,$2,$3,$4)',
      [id, `${id}@test.local`, role, hash],
    );
  }
});
after(async () => {
  if (url) {
    await db?.end();
    await admin.query(`DROP SCHEMA ${schema} CASCADE`);
    await admin.end();
  }
});

async function fixture() {
  const suffix = randomUUID();
  const orderId = `order-${suffix}`;
  await db.query(
    "INSERT INTO orders(id,marketplace_order_id,status) VALUES($1,$1,'processing')",
    [orderId],
  );
  const id = (
    await db.query(
      "INSERT INTO exceptions(order_id,rule_code,priority,status,reason) VALUES($1,'EX-01','high','open','deadline') RETURNING id",
      [orderId],
    )
  ).rows[0].id;
  const sessions = new SessionStore();
  const token = (name: string, role: 'owner' | 'operator') =>
    sessions.create({ id: name, email: `${name}@test.local`, role }).token;
  const tokens = {
    owner: token('api-owner', 'owner'),
    op1: token('api-op1', 'operator'),
    op2: token('api-op2', 'operator'),
  };
  const app = createApp({
    users: new PostgresUserRepository(db),
    sessions,
    orders: new PostgresOrderRepository(db),
    workflow: new PostgresWorkflow(db),
  });
  const auth = (t: string) => `Bearer ${t}`;
  return { app, tokens, id, orderId, auth };
}

test('workflow endpoints require authentication before storage access', async () => {
  const app = createApp({
    users: new UserRepository(),
    sessions: new SessionStore(),
    orders: new OrderRepository(),
  });
  for (const path of [
    '/api/exceptions',
    '/api/exceptions/1',
    '/api/exceptions/1/actions',
    '/api/notifications',
    '/api/operators',
  ]) {
    assert.equal((await request(app).get(path)).status, 401, path);
  }
});

test('workflow endpoints explicitly report unavailable storage', async () => {
  const sessions = new SessionStore();
  const token = sessions.create({
    id: 'owner',
    email: 'owner@test.local',
    role: 'owner',
  }).token;
  const app = createApp({
    users: new UserRepository(),
    sessions,
    orders: new OrderRepository(),
  });
  assert.equal(
    (
      await request(app)
        .get('/api/exceptions')
        .set('Authorization', `Bearer ${token}`)
    ).status,
    503,
  );
});

test(
  'HTTP workflow claim conflict, authorization, completion audit and order timeline',
  { skip: !url },
  async () => {
    const { app, tokens, id, orderId, auth } = await fixture();
    const claims = await Promise.all(
      [tokens.op1, tokens.op2].map((t) =>
        request(app)
          .post(`/api/exceptions/${id}/claim`)
          .set('Authorization', auth(t))
          .send({ expectedVersion: 1 }),
      ),
    );
    assert.deepEqual(claims.map((r) => r.status).sort(), [200, 409]);
    const winnerIndex = claims.findIndex((r) => r.status === 200);
    const winning = [tokens.op1, tokens.op2][winnerIndex],
      losing = [tokens.op1, tokens.op2][1 - winnerIndex];
    const exception = claims[winnerIndex].body.exception;
    assert.equal(exception.status, 'in_progress');
    assert.equal(
      (
        await request(app)
          .get(`/api/orders/${orderId}`)
          .set('Authorization', auth(winning))
      ).status,
      200,
    );
    assert.equal(
      (
        await request(app)
          .get(`/api/orders/${orderId}`)
          .set('Authorization', auth(losing))
      ).status,
      403,
    );
    assert.equal(
      (
        await request(app)
          .patch(`/api/exceptions/${id}/status`)
          .set('Authorization', auth(losing))
          .send({
            status: 'resolved',
            note: 'done',
            expectedVersion: exception.version,
          })
      ).status,
      403,
    );
    assert.equal(
      (
        await request(app)
          .patch(`/api/exceptions/${id}/status`)
          .set('Authorization', auth(winning))
          .send({ status: 'resolved', expectedVersion: exception.version })
      ).status,
      400,
    );
    const resolved = await request(app)
      .patch(`/api/exceptions/${id}/status`)
      .set('Authorization', auth(winning))
      .send({
        status: 'resolved',
        note: 'Shipment checked',
        expectedVersion: exception.version,
      });
    assert.equal(resolved.status, 200);
    assert.equal(resolved.body.exception.status, 'resolved');
    const actions = await request(app)
      .get(`/api/exceptions/${id}/actions`)
      .set('Authorization', auth(tokens.owner));
    assert.equal(actions.status, 200);
    assert.equal(actions.body.items.length, 2);
    assert.equal(actions.body.items[1].note, 'Shipment checked');
    const detail = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', auth(winning));
    assert.ok(Array.isArray(detail.body.events));
    assert.ok(Array.isArray(detail.body.actions));
  },
);

test(
  'HTTP owner directory assignment and strict request validation',
  { skip: !url },
  async () => {
    const { app, tokens, id, auth } = await fixture();
    assert.equal(
      (
        await request(app)
          .get('/api/operators')
          .set('Authorization', auth(tokens.op1))
      ).status,
      403,
    );
    const operators = await request(app)
      .get('/api/operators')
      .set('Authorization', auth(tokens.owner));
    assert.equal(operators.status, 200);
    assert.equal(operators.body.items.length, 2);
    assert.equal('passwordHash' in operators.body.items[0], false);
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'api-op1@test.local', password: 'test-password-long' });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.id, 'api-op1');
    assert.equal(
      (
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'api-op1@test.local', password: 'wrong' })
      ).status,
      401,
    );
    const assigned = await request(app)
      .patch(`/api/exceptions/${id}/assignee`)
      .set('Authorization', auth(tokens.owner))
      .send({ assigneeId: 'api-op1', expectedVersion: 1 });
    assert.equal(assigned.status, 200);
    assert.equal(assigned.body.exception.assigneeId, 'api-op1');
    for (const path of [
      '/api/exceptions?page=0',
      '/api/exceptions?pageSize=101',
      '/api/exceptions?deadlineBefore=bad',
      '/api/exceptions?priority=wrong',
      '/api/exceptions?extra=yes',
      '/api/exceptions/9999999999999999999',
      '/api/exceptions/not-a-number',
      '/api/notifications?unreadOnly=yes',
    ]) {
      assert.equal(
        (await request(app).get(path).set('Authorization', auth(tokens.owner)))
          .status,
        400,
        path,
      );
    }
    assert.equal(
      (
        await request(app)
          .get('/api/exceptions/9223372036854775807')
          .set('Authorization', auth(tokens.owner))
      ).status,
      404,
    );
    assert.equal(
      (
        await request(app)
          .post(`/api/exceptions/${id}/claim`)
          .set('Authorization', auth(tokens.op1))
          .send({ expectedVersion: 0 })
      ).status,
      400,
    );
    assert.equal(
      (
        await request(app)
          .post(`/api/exceptions/${id}/claim`)
          .set('Authorization', auth(tokens.op1))
          .send({ expectedVersion: 2, extra: true })
      ).status,
      400,
    );
    assert.equal(
      (
        await request(app)
          .get('/api/exceptions?page=1&pageSize=1')
          .set('Authorization', auth(tokens.owner))
      ).body.items.length,
      1,
    );
  },
);

test(
  'HTTP notification recipient privacy and idempotent read',
  { skip: !url },
  async () => {
    const { app, tokens, id, auth } = await fixture();
    const notification = (
      await db.query(
        "INSERT INTO notifications(recipient_id,exception_id,kind,priority,dedupe_key) VALUES('api-op1',$1,'new','high',$2) RETURNING id",
        [id, randomUUID()],
      )
    ).rows[0].id;
    const inbox = await request(app)
      .get('/api/notifications?unreadOnly=true')
      .set('Authorization', auth(tokens.op1));
    assert.equal(inbox.status, 200);
    assert.ok(inbox.body.items.some((n: any) => n.id === notification));
    assert.equal(
      (
        await request(app)
          .patch(`/api/notifications/${notification}/read`)
          .set('Authorization', auth(tokens.op2))
          .send({})
      ).status,
      404,
    );
    const first = await request(app)
      .patch(`/api/notifications/${notification}/read`)
      .set('Authorization', auth(tokens.op1))
      .send({});
    const second = await request(app)
      .patch(`/api/notifications/${notification}/read`)
      .set('Authorization', auth(tokens.op1))
      .send({});
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(
      first.body.notification.readAt,
      second.body.notification.readAt,
    );
  },
);
