import type pg from 'pg';
import type { Order, OrderReader } from './order-repository.js';

export class PostgresOrderRepository implements OrderReader {
  constructor(private readonly pool: pg.Pool) {}

  async findById(id: string): Promise<Order | null> {
    const result = await this.pool.query(
      `SELECT id, marketplace_order_id AS "marketplaceOrderId", assignee_id AS "assigneeId",
              status, processing_deadline AS "processingDeadline", last_event_at AS "lastEventAt"
       FROM orders WHERE id = $1`, [id]
    );
    return result.rows[0] ?? null;
  }
}
