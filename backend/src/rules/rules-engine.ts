import { pool, query } from '../database/pool.js';

export type RuleCode = 'EX-01' | 'EX-02' | 'EX-03' | 'EX-04' | 'EX-05';
export type ExceptionPriority = 'low' | 'medium' | 'high' | 'critical';
export type ExceptionStatus = 'open' | 'in_progress' | 'resolved';

export interface OrderEvaluationInput {
  id: string;
  marketplaceOrderId?: string;
  status: string;
  processingDeadline?: Date | string | null;
  handoffDeadline?: Date | string | null;
  requiresShippingLabel?: boolean;
  shippingLabelReady?: boolean;
  events?: Array<{
    eventType: string;
    occurredAt: Date | string;
  }>;
  hasActionLog?: boolean;
}

export interface DetectedException {
  ruleCode: RuleCode;
  priority: ExceptionPriority;
  status: ExceptionStatus;
  reason: string;
  remainingMinutes?: number | null;
}

export const DEFAULT_THRESHOLD_MINUTES = 120;

/**
 * Menghitung selisih waktu dalam menit antara deadline dan waktu acuan (now).
 */
export function calculateRemainingMinutes(deadline: Date | string, now: Date): number {
  const deadlineMs = new Date(deadline).getTime();
  const nowMs = now.getTime();
  return Math.floor((deadlineMs - nowMs) / (1000 * 60));
}

/**
 * Menentukan level prioritas berbasis sisa waktu menit.
 */
export function calculateTimePriority(remainingMinutes: number, thresholdMinutes = DEFAULT_THRESHOLD_MINUTES): ExceptionPriority {
  if (remainingMinutes <= 0) {
    return 'critical';
  }
  if (remainingMinutes <= thresholdMinutes) {
    return 'high';
  }
  return 'medium';
}

/**
 * EX-01: Pesanan belum Ready-to-Ship mendekati tenggat RTS.
 */
export function checkEX01(
  order: OrderEvaluationInput,
  now: Date,
  thresholdMinutes = DEFAULT_THRESHOLD_MINUTES
): DetectedException | null {
  const terminalStatuses = ['ready_to_ship', 'shipped', 'delivered', 'cancelled'];
  if (terminalStatuses.includes(order.status.toLowerCase())) {
    return null;
  }

  if (!order.processingDeadline) {
    return null;
  }

  const remaining = calculateRemainingMinutes(order.processingDeadline, now);
  if (remaining <= thresholdMinutes) {
    const priority = calculateTimePriority(remaining, thresholdMinutes);
    const reason =
      remaining <= 0
        ? `Pesanan belum Ready-to-Ship dan telah melewati batas tenggat pemrosesan sejak ${Math.abs(remaining)} menit lalu.`
        : `Pesanan belum Ready-to-Ship, sisa waktu pemrosesan tersisa ${remaining} menit (ambang ${thresholdMinutes} menit).`;

    return {
      ruleCode: 'EX-01',
      priority,
      status: 'open',
      reason,
      remainingMinutes: remaining
    };
  }

  return null;
}

/**
 * EX-02: Pesanan sudah siap (RTS) tetapi belum diserahkan ke kurir (handoff).
 */
export function checkEX02(
  order: OrderEvaluationInput,
  now: Date,
  thresholdMinutes = DEFAULT_THRESHOLD_MINUTES
): DetectedException | null {
  if (order.status.toLowerCase() !== 'ready_to_ship') {
    return null;
  }

  const deadline = order.handoffDeadline ?? order.processingDeadline;
  if (!deadline) {
    return null;
  }

  const remaining = calculateRemainingMinutes(deadline, now);
  if (remaining <= thresholdMinutes) {
    const priority = calculateTimePriority(remaining, thresholdMinutes);
    const reason =
      remaining <= 0
        ? `Pesanan sudah siap dikemas tetapi terlambat diserahkan ke kurir (${Math.abs(remaining)} menit terlewat).`
        : `Pesanan sudah siap dikemas tetapi belum diserahkan ke kurir, sisa waktu penyerahan tersisa ${remaining} menit.`;

    return {
      ruleCode: 'EX-02',
      priority,
      status: 'open',
      reason,
      remainingMinutes: remaining
    };
  }

  return null;
}

/**
 * EX-03: Permintaan pembatalan dari pembeli belum direspons.
 */
export function checkEX03(
  order: OrderEvaluationInput,
  now: Date,
  thresholdMinutes = DEFAULT_THRESHOLD_MINUTES
): DetectedException | null {
  if (order.status.toLowerCase() === 'cancelled') {
    return null;
  }

  const events = order.events ?? [];
  const hasCancelRequest = events.some((e) => e.eventType === 'cancellation_requested');
  const cancelResolved = events.some((e) =>
    ['cancellation_approved', 'cancellation_rejected'].includes(e.eventType)
  );

  if (hasCancelRequest && !cancelResolved) {
    // Pembatalan order selalu butuh perhatian prioritas tinggi/kritis agar pesanan tidak terlanjur dikirim
    const deadline = order.processingDeadline;
    const remaining = deadline ? calculateRemainingMinutes(deadline, now) : null;
    const priority = remaining !== null && remaining <= 0 ? 'critical' : 'high';

    return {
      ruleCode: 'EX-03',
      priority,
      status: 'open',
      reason: 'Pembeli mengajukan pembatalan pesanan dan menunggu keputusan respons operasional.',
      remainingMinutes: remaining
    };
  }

  return null;
}

/**
 * EX-04: Label resi pengiriman belum tersedia mendekati jadwal penyerahan.
 */
export function checkEX04(
  order: OrderEvaluationInput,
  now: Date,
  thresholdMinutes = DEFAULT_THRESHOLD_MINUTES
): DetectedException | null {
  const terminalStatuses = ['shipped', 'delivered', 'cancelled'];
  if (terminalStatuses.includes(order.status.toLowerCase())) {
    return null;
  }

  if (order.requiresShippingLabel && !order.shippingLabelReady) {
    const deadline = order.handoffDeadline ?? order.processingDeadline;
    if (!deadline) {
      return null;
    }

    const remaining = calculateRemainingMinutes(deadline, now);
    if (remaining <= thresholdMinutes) {
      const priority = calculateTimePriority(remaining, thresholdMinutes);
      return {
        ruleCode: 'EX-04',
        priority,
        status: 'open',
        reason: `Label atau resi pengiriman belum tersedia/tercetak, batas waktu kurir tersisa ${remaining} menit.`,
        remainingMinutes: remaining
      };
    }
  }

  return null;
}

/**
 * EX-05: Komplain atau retur pembeli belum ditindaklanjuti.
 */
export function checkEX05(
  order: OrderEvaluationInput,
  now: Date
): DetectedException | null {
  const events = order.events ?? [];
  const hasComplaintEvent = events.some((e) => e.eventType === 'complaint_filed' || e.eventType === 'buyer_complaint_filed');
  const isComplaintStatus = order.status.toLowerCase().includes('complaint');

  if ((hasComplaintEvent || isComplaintStatus) && !order.hasActionLog) {
    return {
      ruleCode: 'EX-05',
      priority: 'high',
      status: 'open',
      reason: 'Kasus komplain/retur pembeli terbuka dan belum memiliki catatan tindak lanjut oleh operator.'
    };
  }

  return null;
}

/**
 * Evaluasi seluruh 5 aturan (EX-01 s/d EX-05) secara deterministik.
 */
export function evaluateOrderExceptions(
  order: OrderEvaluationInput,
  now: Date = new Date(),
  thresholdMinutes = DEFAULT_THRESHOLD_MINUTES
): DetectedException[] {
  const detected: DetectedException[] = [];

  const ex01 = checkEX01(order, now, thresholdMinutes);
  if (ex01) detected.push(ex01);

  const ex02 = checkEX02(order, now, thresholdMinutes);
  if (ex02) detected.push(ex02);

  const ex03 = checkEX03(order, now, thresholdMinutes);
  if (ex03) detected.push(ex03);

  const ex04 = checkEX04(order, now, thresholdMinutes);
  if (ex04) detected.push(ex04);

  const ex05 = checkEX05(order, now);
  if (ex05) detected.push(ex05);

  return detected;
}

/**
 * Membaca data pesanan dari database, mengevaluasi rules, dan menyimpan/memperbarui
 * hasilnya ke tabel exceptions di PostgreSQL tanpa duplikasi (idempotent).
 */
export async function syncOrderExceptions(orderId: string, now: Date = new Date()): Promise<DetectedException[]> {
  // 1. Ambil data pesanan
  const orderRes = await query(
    `SELECT id, marketplace_order_id, status, processing_deadline
     FROM orders WHERE id = $1`,
    [orderId]
  );

  if (orderRes.rows.length === 0) {
    throw new Error(`Order ${orderId} tidak ditemukan`);
  }

  const orderRow = orderRes.rows[0];

  // 2. Ambil riwayat event pesanan
  const eventsRes = await query(
    `SELECT event_type, occurred_at FROM order_events WHERE order_id = $1 ORDER BY occurred_at ASC`,
    [orderId]
  );

  // 3. Cek apakah sudah ada catatan penanganan di action_logs untuk order ini
  const actionLogRes = await query(
    `SELECT a.id FROM action_logs a
     JOIN exceptions e ON a.exception_id = e.id
     WHERE e.order_id = $1 LIMIT 1`,
    [orderId]
  );

  const evaluationInput: OrderEvaluationInput = {
    id: orderRow.id,
    marketplaceOrderId: orderRow.marketplace_order_id,
    status: orderRow.status,
    processingDeadline: orderRow.processing_deadline,
    events: eventsRes.rows.map((r: any) => ({
      eventType: r.event_type,
      occurredAt: r.occurred_at
    })),
    hasActionLog: actionLogRes.rows.length > 0
  };

  const detected = evaluateOrderExceptions(evaluationInput, now);

  // 4. Sinkronkan ke tabel exceptions secara aman (hindari duplikasi aktif)
  for (const ex of detected) {
    const existingRes = await query(
      `SELECT id, status FROM exceptions
       WHERE order_id = $1 AND rule_code = $2 AND status IN ('open', 'in_progress')
       LIMIT 1`,
      [orderId, ex.ruleCode]
    );

    if (existingRes.rows.length > 0) {
      // Perbarui prioritas dan alasan terbaru jika exception sudah aktif
      await query(
        `UPDATE exceptions
         SET priority = $1, reason = $2
         WHERE id = $3`,
        [ex.priority, ex.reason, existingRes.rows[0].id]
      );
    } else {
      // Masukkan baris baru
      await query(
        `INSERT INTO exceptions (order_id, rule_code, priority, status, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, ex.ruleCode, ex.priority, ex.status, ex.reason]
      );
    }
  }

  return detected;
}
