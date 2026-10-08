import { syncOrderExceptionsInTransaction } from '../rules/rules-engine.js';
import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import { InputError, type NormalizedEvent } from './input.js';

export interface IngestionResult {
  accepted: number;
  duplicates: number;
  stale: number;
}

export interface IngestionStore {
  ingest(events: NormalizedEvent[]): Promise<IngestionResult>;
}

export class PostgresIngestion implements IngestionStore {
  constructor(private readonly pool: pg.Pool) {}

  async ingest(events: NormalizedEvent[]): Promise<IngestionResult> {
    const result = { accepted: 0, duplicates: 0, stale: 0 };
    if (!events.length) return result;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // Serialize writers for the single-store demo, including concurrent retries.
      await client.query('SELECT pg_advisory_xact_lock(110011)');
      for (const event of events) {
        const payload = JSON.stringify(event);
        const existing = await client.query(
          'SELECT payload = $3::jsonb AS identical FROM order_events WHERE source = $1 AND source_event_id = $2',
          [event.source, event.sourceEventId, payload]
        );
        if (existing.rowCount) {
          if (!existing.rows[0].identical) throw new InputError('ID event sudah digunakan dengan data berbeda.', 409);
          result.duplicates++;
          continue;
        }
        const key = `${event.source}:${event.sourceEventId}`;
        await client.query(
          `INSERT INTO orders (id, marketplace_order_id, status)
           VALUES ($1, $2, $3) ON CONFLICT (marketplace_order_id) DO NOTHING`,
          [`ingest-${randomUUID()}`, event.marketplaceOrderId, event.status]
        );
        const order = await client.query('SELECT id FROM orders WHERE marketplace_order_id = $1 FOR UPDATE', [event.marketplaceOrderId]);
        const id: string = order.rows[0].id;
        await client.query(
          `INSERT INTO order_events (order_id, source, source_event_id, event_type, occurred_at, payload)
           VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
          [id, event.source, event.sourceEventId, event.eventType, event.occurredAt, payload]
        );
        const updated = await client.query(
          `UPDATE orders SET status = $2, processing_deadline = $3, last_event_at = $4, last_event_key = $5
           WHERE id = $1 AND (last_event_at IS NULL OR last_event_at < $4::timestamptz
             OR (last_event_at = $4::timestamptz AND COALESCE(last_event_key, '') COLLATE "C" < $5 COLLATE "C"))`,
          [id, event.status, event.processingDeadline, event.occurredAt, key]
        );
        result.accepted++;
        if (!updated.rowCount) result.stale++;
        // Late events may introduce complaints without changing the latest snapshot.
        await syncOrderExceptionsInTransaction(client, id);
      }
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
