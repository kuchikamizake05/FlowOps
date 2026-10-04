import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import { pool, closePool, query } from '../src/database/pool.js';
import { runMigration } from '../src/database/migrate.js';
import { runSeed } from '../src/database/seed.js';

// Seed only an explicitly selected test database, never the default local database.
const integration = { skip: !process.env.TEST_DATABASE_URL || process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL };

after(async () => {
  await closePool();
});

test('database migration dan seeding dapat dijalankan berulang kali tanpa error', integration, async () => {
  await runMigration();
  await runSeed();
  // Jalankan kedua kali untuk membuktikan idempotensi
  await runMigration();
  await runSeed();

  const userRes = await query('SELECT count(*)::int as total FROM users');
  assert.equal(userRes.rows[0].total >= 2, true);

  const orderRes = await query('SELECT count(*)::int as total FROM orders');
  assert.equal(orderRes.rows[0].total >= 4, true);

  const exceptionRes = await query('SELECT count(*)::int as total FROM exceptions');
  assert.equal(exceptionRes.rows[0].total >= 3, true);
});

test('tabel users memuat akun demo dengan role yang tepat', integration, async () => {
  const ownerRes = await query('SELECT id, email, role FROM users WHERE email = $1', ['owner@flowops.local']);
  assert.equal(ownerRes.rows.length, 1);
  assert.equal(ownerRes.rows[0].role, 'owner');

  const opRes = await query('SELECT id, email, role FROM users WHERE email = $1', ['operator@flowops.local']);
  assert.equal(opRes.rows.length, 1);
  assert.equal(opRes.rows[0].role, 'operator');
});

test('tabel exceptions memuat aturan EX-01 sampai EX-05 dengan tingkat prioritas valid', integration, async () => {
  const res = await query('SELECT rule_code, priority, status FROM exceptions ORDER BY rule_code');
  const codes = res.rows.map((r) => r.rule_code);
  assert.equal(codes.includes('EX-01'), true);
  assert.equal(codes.includes('EX-05'), true);

  const ex05 = res.rows.find((r) => r.rule_code === 'EX-05');
  assert.equal(ex05?.priority, 'critical');
  assert.equal(ex05?.status, 'in_progress');
});

test('order_events mencegah duplikasi event (idempotency constraint)', integration, async () => {
  const event = {
    order_id: 'demo-order-1',
    source: 'webhook',
    source_event_id: 'TEST-IDEMPOTENCY-001',
    event_type: 'order_created',
    occurred_at: new Date()
  };

  // Insert pertama sukses
  await query(
    `INSERT INTO order_events (order_id, source, source_event_id, event_type, occurred_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (source, source_event_id) DO NOTHING`,
    [event.order_id, event.source, event.source_event_id, event.event_type, event.occurred_at]
  );

  // Insert kedua dengan source dan source_event_id sama diabaikan (DO NOTHING) tanpa error
  const duplicateRes = await query(
    `INSERT INTO order_events (order_id, source, source_event_id, event_type, occurred_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (source, source_event_id) DO NOTHING`,
    [event.order_id, event.source, event.source_event_id, event.event_type, event.occurred_at]
  );

  assert.equal(duplicateRes.rowCount, 0);
});
