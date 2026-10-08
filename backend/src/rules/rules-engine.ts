import type pg from 'pg';
import { pool } from '../database/pool.js';

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
  const terminalStatuses = ['ready_to_ship', 'shipped', 'delivered', 'completed', 'cancelled'];
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
  if (['cancelled', 'completed'].includes(order.status.toLowerCase())) {
    return null;
  }

  const events = order.events ?? [];
  const ordered = events.map((event, index) => ({ ...event, index })).sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime() || a.index - b.index);
  const latestRequest = ordered.findLastIndex(event => ['cancellation_requested', 'cancellation_pending'].includes(event.eventType));
  const latestDecision = ordered.findLastIndex(event => ['cancellation_approved', 'cancellation_rejected'].includes(event.eventType));
  const hasCancelRequest = latestRequest >= 0 || order.status.toLowerCase() === 'cancellation_pending';
  const cancelResolved = latestDecision >= 0 && latestDecision > latestRequest;

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
  const terminalStatuses = ['shipped', 'delivered', 'completed', 'cancelled'];
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
  const hasComplaintEvent = events.some((e) => ['complaint_filed', 'buyer_complaint_filed', 'complaint_received', 'return_requested', 'return_pending'].includes(e.eventType));
  const isComplaintStatus = order.status.toLowerCase().includes('complaint') || ['return_requested', 'return_pending'].includes(order.status.toLowerCase());

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

/** Synchronize within the caller's transaction. The order lock serializes each order. */
export async function syncOrderExceptionsInTransaction(client: pg.PoolClient, orderId: string, now = new Date()): Promise<DetectedException[]> {
  const orderRes = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
  const order = orderRes.rows[0];
  if (!order) throw new Error(`Order ${orderId} tidak ditemukan`);
  const events = await client.query('SELECT id, event_type, occurred_at, payload FROM order_events WHERE order_id=$1 ORDER BY occurred_at, id', [orderId]);
  const triggerKey = (rule: RuleCode): string | null => {
    const types = rule === 'EX-03' ? ['cancellation_requested', 'cancellation_pending'] : ['complaint_filed', 'buyer_complaint_filed', 'complaint_received', 'return_requested', 'return_pending'];
    const trigger = [...events.rows].reverse().find(row => types.includes(row.event_type) || types.includes(row.payload?.status));
    return trigger ? `event:${trigger.id}` : order.last_event_key;
  };
  // Assignment/status audits are not evidence that a complaint has been handled.
  const handled = await client.query(`SELECT id FROM exceptions WHERE order_id=$1 AND rule_code='EX-05' AND status='resolved' AND detection_key IS NOT DISTINCT FROM $2 LIMIT 1`, [orderId, triggerKey('EX-05')]);
  const detected = evaluateOrderExceptions({ id: order.id, status: order.status, processingDeadline: order.processing_deadline,
    events: events.rows.flatMap(row => [{ eventType: row.event_type, occurredAt: row.occurred_at }, ...(['cancellation_pending', 'return_pending'].includes(row.payload?.status) ? [{ eventType: row.payload.status, occurredAt: row.occurred_at }] : [])]), hasActionLog: !!handled.rowCount }, now);
  const ranks: Record<ExceptionPriority, number> = { low: 0, medium: 1, high: 2, critical: 3 };
  for (const ex of detected) {
    const detectionKey = ['EX-03', 'EX-05'].includes(ex.ruleCode) ? triggerKey(ex.ruleCode) : order.last_event_key;
    const active = await client.query(`SELECT * FROM exceptions WHERE order_id=$1 AND rule_code=$2 AND status IN ('open','in_progress') FOR UPDATE`, [orderId, ex.ruleCode]);
    let exception = active.rows[0];
    let kind: string | undefined;
    if (exception) {
      const escalated = ranks[ex.priority] > ranks[exception.priority as ExceptionPriority];
      const changed = exception.priority !== ex.priority || exception.reason !== ex.reason || exception.detection_key !== detectionKey;
      if (changed) {
        const updated = await client.query(`UPDATE exceptions SET priority=$2, reason=$3, detection_key=$4, updated_at=$5, version=version+1 WHERE id=$1 RETURNING *`, [exception.id, ex.priority, ex.reason, detectionKey, now]);
        exception = updated.rows[0];
      }
      if (escalated) kind = 'escalation';
    } else {
      // A resolved finding on the same snapshot stays resolved, even when re-evaluated.
      const resolved = await client.query(`SELECT id FROM exceptions WHERE order_id=$1 AND rule_code=$2 AND status='resolved' AND detection_key IS NOT DISTINCT FROM $3 LIMIT 1`, [orderId, ex.ruleCode, detectionKey]);
      if (resolved.rowCount) continue;
      const inserted = await client.query(`INSERT INTO exceptions(order_id,rule_code,priority,status,reason,detection_key) VALUES($1,$2,$3,'open',$4,$5) RETURNING *`, [orderId, ex.ruleCode, ex.priority, ex.reason, detectionKey]);
      exception = inserted.rows[0];
      kind = 'new';
    }
    if (kind) {
      await client.query(`INSERT INTO notifications(recipient_id,exception_id,kind,priority,dedupe_key)
        SELECT id,$1,$2,$3,$4 || ':' || id FROM users WHERE role='owner' OR (role='operator' AND ($5::text IS NULL OR id=$5))
        ON CONFLICT(dedupe_key) DO NOTHING`, [exception.id, kind, ex.priority, kind === 'new' ? `new:${exception.id}` : `escalation:${exception.id}:${ex.priority}:${exception.version}`, exception.assignee_id]);
    }
  }
  return detected;
}

/** Public standalone entry point; all statements use one transaction and connection. */
export async function syncOrderExceptions(orderId: string, now = new Date()): Promise<DetectedException[]> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const detected = await syncOrderExceptionsInTransaction(client, orderId, now);
    await client.query('COMMIT');
    return detected;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
