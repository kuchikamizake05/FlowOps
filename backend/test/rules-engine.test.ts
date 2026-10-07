import assert from 'node:assert/strict';
import test, { after } from 'node:test';
import {
  evaluateOrderExceptions,
  checkEX01,
  checkEX02,
  checkEX03,
  checkEX04,
  checkEX05,
  calculateTimePriority,
  syncOrderExceptions
} from '../src/rules/rules-engine.js';
import { pool, closePool, query } from '../src/database/pool.js';
import { runMigration } from '../src/database/migrate.js';
import { runSeed } from '../src/database/seed.js';

after(async () => {
  await closePool();
});

test('calculateTimePriority menghasilkan level urgensi yang benar', () => {
  assert.equal(calculateTimePriority(-5), 'critical');
  assert.equal(calculateTimePriority(0), 'critical');
  assert.equal(calculateTimePriority(45), 'high');
  assert.equal(calculateTimePriority(120), 'high');
  assert.equal(calculateTimePriority(150), 'medium');
});

test('EX-01: mendeteksi pesanan belum RTS mendekati deadline (high) dan lewat deadline (critical)', () => {
  const now = new Date('2026-10-04T10:00:00Z');

  // Skenario 1: Sisa 45 menit -> EX-01 High
  const orderHigh = {
    id: 'ord-1',
    status: 'processing',
    processingDeadline: new Date('2026-10-04T10:45:00Z')
  };
  const resHigh = checkEX01(orderHigh, now);
  assert.notEqual(resHigh, null);
  assert.equal(resHigh?.ruleCode, 'EX-01');
  assert.equal(resHigh?.priority, 'high');
  assert.equal(resHigh?.remainingMinutes, 45);

  // Skenario 2: Lewat 15 menit -> EX-01 Critical
  const orderCrit = {
    id: 'ord-2',
    status: 'created',
    processingDeadline: new Date('2026-10-04T09:45:00Z')
  };
  const resCrit = checkEX01(orderCrit, now);
  assert.notEqual(resCrit, null);
  assert.equal(resCrit?.priority, 'critical');
  assert.equal(resCrit?.remainingMinutes, -15);

  // Skenario 3: Masih 5 jam lagi (> 120 menit) -> Null (tidak ada masalah)
  const orderSafe = {
    id: 'ord-3',
    status: 'processing',
    processingDeadline: new Date('2026-10-04T15:00:00Z')
  };
  assert.equal(checkEX01(orderSafe, now), null);

  // Skenario 4: Sudah ready_to_ship -> Null (karena sudah siap)
  const orderRTS = {
    id: 'ord-4',
    status: 'ready_to_ship',
    processingDeadline: new Date('2026-10-04T10:30:00Z')
  };
  assert.equal(checkEX01(orderRTS, now), null);
});

test('EX-02: mendeteksi pesanan sudah RTS tetapi belum diserahkan ke kurir saat batas handoff mendekat', () => {
  const now = new Date('2026-10-04T10:00:00Z');

  const orderHandoffLate = {
    id: 'ord-handoff',
    status: 'ready_to_ship',
    handoffDeadline: new Date('2026-10-04T10:30:00Z')
  };

  const res = checkEX02(orderHandoffLate, now);
  assert.notEqual(res, null);
  assert.equal(res?.ruleCode, 'EX-02');
  assert.equal(res?.priority, 'high');
  assert.equal(res?.remainingMinutes, 30);

  // Jika status bukan ready_to_ship, EX-02 tidak aktif
  const orderProcessing = { ...orderHandoffLate, status: 'processing' };
  assert.equal(checkEX02(orderProcessing, now), null);
});

test('EX-03: mendeteksi permintaan pembatalan pembeli yang belum diputuskan', () => {
  const now = new Date('2026-10-04T10:00:00Z');

  // Permintaan pembatalan belum direspons
  const orderPending = {
    id: 'ord-cancel',
    status: 'processing',
    events: [
      { eventType: 'order_created', occurredAt: '2026-10-04T08:00:00Z' },
      { eventType: 'cancellation_requested', occurredAt: '2026-10-04T09:30:00Z' }
    ]
  };
  const res = checkEX03(orderPending, now);
  assert.notEqual(res, null);
  assert.equal(res?.ruleCode, 'EX-03');
  assert.equal(res?.priority, 'high');

  // Jika pembatalan sudah disetujui / ditolak -> Null
  const orderResolved = {
    ...orderPending,
    events: [
      ...orderPending.events,
      { eventType: 'cancellation_rejected', occurredAt: '2026-10-04T09:40:00Z' }
    ]
  };
  assert.equal(checkEX03(orderResolved, now), null);
});

test('EX-04: mendeteksi label pengiriman belum siap saat mendekati handoff', () => {
  const now = new Date('2026-10-04T10:00:00Z');

  const orderNoLabel = {
    id: 'ord-label',
    status: 'ready_to_ship',
    handoffDeadline: new Date('2026-10-04T10:40:00Z'),
    requiresShippingLabel: true,
    shippingLabelReady: false
  };

  const res = checkEX04(orderNoLabel, now);
  assert.notEqual(res, null);
  assert.equal(res?.ruleCode, 'EX-04');
  assert.equal(res?.priority, 'high');

  // Jika label sudah siap -> Null
  const orderLabelReady = { ...orderNoLabel, shippingLabelReady: true };
  assert.equal(checkEX04(orderLabelReady, now), null);
});

test('EX-05: mendeteksi komplain pembeli terbuka yang belum ditindaklanjuti', () => {
  const now = new Date('2026-10-04T10:00:00Z');

  const orderComplaint = {
    id: 'ord-complaint',
    status: 'complaint_pending',
    events: [{ eventType: 'buyer_complaint_filed', occurredAt: '2026-10-04T09:00:00Z' }],
    hasActionLog: false
  };

  const res = checkEX05(orderComplaint, now);
  assert.notEqual(res, null);
  assert.equal(res?.ruleCode, 'EX-05');
  assert.equal(res?.priority, 'high');

  // Jika operator sudah mencatat tindakan penanganan (hasActionLog = true) -> Null
  const orderHandled = { ...orderComplaint, hasActionLog: true };
  assert.equal(checkEX05(orderHandled, now), null);
});

test('syncOrderExceptions menyinkronkan exception ke PostgreSQL tanpa duplikasi (idempotent)', async () => {
  await runMigration();
  await runSeed();

  const now = new Date();

  // Sinkronisasi pertama untuk demo-order-1 (deadline 45 menit -> memicu EX-01)
  const exceptions1 = await syncOrderExceptions('demo-order-1', now);
  assert.equal(exceptions1.some((e) => e.ruleCode === 'EX-01'), true);

  // Ambil jumlah exception untuk demo-order-1
  const countBefore = await query(
    `SELECT count(*)::int as total FROM exceptions WHERE order_id = $1 AND rule_code = 'EX-01'`,
    ['demo-order-1']
  );
  assert.equal(countBefore.rows[0].total, 1);

  // Sinkronisasi kedua kali (harus memperbarui, BUKAN menambah baris duplikat)
  await syncOrderExceptions('demo-order-1', now);

  const countAfter = await query(
    `SELECT count(*)::int as total FROM exceptions WHERE order_id = $1 AND rule_code = 'EX-01'`,
    ['demo-order-1']
  );
  assert.equal(countAfter.rows[0].total, 1);
});
