import type pg from 'pg';
import type { PublicUser } from '../auth/user-repository.js';
import { InputError } from '../ingestion/input.js';
import type {
  QueueFilters,
  NotificationFilters,
  WorkflowStatus,
  WorkflowStore,
} from './types.js';
const projection = `e.id::text AS id,e.order_id AS "orderId",o.marketplace_order_id AS "marketplaceOrderId",e.rule_code AS "ruleCode",e.priority,e.status,e.reason,e.assignee_id AS "assigneeId",e.version,e.created_at AS "createdAt",e.updated_at AS "updatedAt",o.processing_deadline AS "processingDeadline"`;
const notificationProjection = `id::text AS id,recipient_id AS "recipientId",exception_id::text AS "exceptionId",kind,priority,read_at AS "readAt",created_at AS "createdAt"`;
function dto(row: any): any {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      value instanceof Date ? value.toISOString() : value,
    ]),
  );
}
function numericId(id: string) {
  if (!/^[1-9][0-9]{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n)
    throw new InputError('Invalid identifier.');
}
function paging(filters: { page?: number; pageSize?: number }) {
  const page = filters.page ?? 1,
    pageSize = filters.pageSize ?? 20;
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  )
    throw new InputError('Invalid pagination.');
  return { page, pageSize };
}
function snapshot(row: any) {
  return {
    status: row.status,
    assigneeId: row.assigneeId,
    version: row.version,
  };
}
export class PostgresWorkflow implements WorkflowStore {
  constructor(private readonly pool: pg.Pool) {}
  async list(user: PublicUser, filters: QueueFilters = {}) {
    const { page, pageSize } = paging(filters),
      values: any[] = [],
      clauses: string[] = [];
    const add = (sql: string, value: any) => {
      values.push(value);
      clauses.push(sql.replace('?', `$${values.length}`));
    };
    if (user.role === 'operator')
      add('(e.assignee_id IS NULL OR e.assignee_id = ?)', user.id);
    if (filters.priority) {
      if (!['low', 'medium', 'high', 'critical'].includes(filters.priority))
        throw new InputError('Invalid priority.');
      add('e.priority = ?', filters.priority);
    }
    if (filters.status) {
      if (!['open', 'in_progress', 'resolved'].includes(filters.status))
        throw new InputError('Invalid status.');
      add('e.status = ?', filters.status);
    }
    if (filters.ruleCode) add('e.rule_code = ?', filters.ruleCode);
    if (filters.assigneeId === 'unassigned')
      clauses.push('e.assignee_id IS NULL');
    else if (filters.assigneeId) add('e.assignee_id = ?', filters.assigneeId);
    if (filters.deadlineBefore) {
      if (!Number.isFinite(Date.parse(filters.deadlineBefore)))
        throw new InputError('Invalid deadline.');
      add('o.processing_deadline <= ?', filters.deadlineBefore);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const count = await this.pool.query(
      `SELECT count(*)::int AS total FROM exceptions e JOIN orders o ON o.id=e.order_id ${where}`,
      values,
    );
    const rows = await this.pool.query(
      `SELECT ${projection} FROM exceptions e JOIN orders o ON o.id=e.order_id ${where} ORDER BY CASE e.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,o.processing_deadline ASC NULLS LAST,e.created_at,e.id LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, pageSize, (page - 1) * pageSize],
    );
    return {
      items: rows.rows.map(dto),
      total: count.rows[0].total,
      page,
      pageSize,
    };
  }
  private async load(
    query: pg.Pool | pg.PoolClient,
    user: PublicUser,
    id: string,
    lock = false,
    allowClaimConflict = false,
  ) {
    numericId(id);
    const result = await query.query(
      `SELECT ${projection} FROM exceptions e JOIN orders o ON o.id=e.order_id WHERE e.id=$1 ${lock ? 'FOR UPDATE OF e' : ''}`,
      [id],
    );
    const row = result.rows[0];
    if (!row) throw new InputError('Exception not found.', 404);
    if (
      !allowClaimConflict &&
      user.role === 'operator' &&
      row.assigneeId &&
      row.assigneeId !== user.id
    )
      throw new InputError('Access denied.', 403);
    return dto(row);
  }
  async detail(user: PublicUser, id: string) {
    return this.load(this.pool, user, id);
  }
  private async mutate(
    user: PublicUser,
    id: string,
    version: number,
    change: (
      client: pg.PoolClient,
      row: any,
    ) => Promise<{
      status: WorkflowStatus;
      assigneeId: string | null;
      action: string;
      note: string | null;
    }>,
    allowClaimConflict = false,
  ) {
    if (!Number.isInteger(version) || version < 1)
      throw new InputError('expectedVersion must be a positive integer.');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const before = await this.load(
        client,
        user,
        id,
        true,
        allowClaimConflict,
      );
      if (before.version !== version)
        throw new InputError('Exception has changed.', 409);
      const next = await change(client, before);
      if (
        next.status === before.status &&
        next.assigneeId === before.assigneeId
      ) {
        await client.query('COMMIT');
        return before;
      }
      if (before.status === 'resolved')
        throw new InputError('Resolved exception is immutable.', 409);
      await client.query(
        'UPDATE exceptions SET status=$2,assignee_id=$3,version=version+1,updated_at=now() WHERE id=$1',
        [id, next.status, next.assigneeId],
      );
      const after = await this.load(client, user, id);
      await client.query(
        'INSERT INTO action_logs(exception_id,actor_id,action,note,before_state,after_state) VALUES ($1,$2,$3,$4,$5,$6)',
        [
          id,
          user.id,
          next.action,
          next.note,
          JSON.stringify(snapshot(before)),
          JSON.stringify(snapshot(after)),
        ],
      );
      if (next.assigneeId)
        await client.query(
          'INSERT INTO notifications(recipient_id,exception_id,kind,priority,dedupe_key) VALUES ($1,$2,$3,$4,$5) ON CONFLICT(dedupe_key) DO NOTHING',
          [
            next.assigneeId,
            id,
            next.action,
            after.priority,
            `workflow:${id}:${after.version}:${next.assigneeId}`,
          ],
        );
      await client.query('COMMIT');
      return after;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async claim(user: PublicUser, id: string, expectedVersion: number) {
    if (user.role !== 'operator')
      throw new InputError('Only operators can claim.', 403);
    return this.mutate(
      user,
      id,
      expectedVersion,
      async (_client, row) => {
        if (row.assigneeId || row.status !== 'open')
          throw new InputError('Exception is not claimable.', 409);
        return {
          status: 'in_progress',
          assigneeId: user.id,
          action: 'claim',
          note: null,
        };
      },
      true,
    );
  }
  async assign(
    user: PublicUser,
    id: string,
    assigneeId: string,
    expectedVersion: number,
  ) {
    if (user.role !== 'owner')
      throw new InputError('Only owner can assign.', 403);
    return this.mutate(user, id, expectedVersion, async (client, row) => {
      const operator = await client.query(
        "SELECT id FROM users WHERE id=$1 AND role='operator'",
        [assigneeId],
      );
      if (!operator.rowCount)
        throw new InputError('Assignee must be an operator.');
      return { status: row.status, assigneeId, action: 'assign', note: null };
    });
  }
  async transition(
    user: PublicUser,
    id: string,
    status: WorkflowStatus,
    note: string | null | undefined,
    expectedVersion: number,
  ) {
    if (!['open', 'in_progress', 'resolved'].includes(status))
      throw new InputError('Invalid status.');
    if (note != null && (typeof note !== 'string' || note.trim().length > 2000))
      throw new InputError('Invalid note.');
    return this.mutate(user, id, expectedVersion, async (_client, row) => {
      if (user.role === 'operator' && row.assigneeId !== user.id)
        throw new InputError('Claim before changing status.', 403);
      if (row.status === status)
        return {
          status,
          assigneeId: row.assigneeId,
          action: 'status_change',
          note: null,
        };
      if (
        !(
          (row.status === 'open' && status === 'in_progress') ||
          (row.status === 'in_progress' && status === 'resolved')
        )
      )
        throw new InputError('Invalid transition.', 409);
      if (!row.assigneeId)
        throw new InputError('Assign an operator first.', 409);
      if (status === 'resolved' && !note?.trim())
        throw new InputError('Resolution note is required.');
      return {
        status,
        assigneeId: row.assigneeId,
        action: 'status_change',
        note: note?.trim() ?? null,
      };
    });
  }
  async actions(user: PublicUser, id: string) {
    await this.detail(user, id);
    const result = await this.pool.query(
      `SELECT a.id::text AS id,a.exception_id::text AS "exceptionId",e.order_id AS "orderId",a.actor_id AS "actorId",a.action,a.note,a.before_state AS "beforeState",a.after_state AS "afterState",a.created_at AS "createdAt" FROM action_logs a JOIN exceptions e ON e.id=a.exception_id WHERE a.exception_id=$1 ORDER BY a.created_at,a.id`,
      [id],
    );
    return result.rows.map(dto);
  }
  async notifications(user: PublicUser, filters: NotificationFilters = {}) {
    const { page, pageSize } = paging(filters);
    const condition = filters.unreadOnly ? 'AND read_at IS NULL' : '';
    const count = await this.pool.query(
      `SELECT count(*)::int total FROM notifications WHERE recipient_id=$1 ${condition}`,
      [user.id],
    );
    const result = await this.pool.query(
      `SELECT ${notificationProjection} FROM notifications WHERE recipient_id=$1 ${condition} ORDER BY created_at DESC,id DESC LIMIT $2 OFFSET $3`,
      [user.id, pageSize, (page - 1) * pageSize],
    );
    return {
      items: result.rows.map(dto),
      total: count.rows[0].total,
      page,
      pageSize,
    };
  }
  async readNotification(user: PublicUser, id: string) {
    numericId(id);
    const result = await this.pool.query(
      `UPDATE notifications SET read_at=coalesce(read_at,now()) WHERE id=$1 AND recipient_id=$2 RETURNING ${notificationProjection}`,
      [id, user.id],
    );
    if (!result.rowCount) throw new InputError('Notification not found.', 404);
    return dto(result.rows[0]);
  }
  async canAccessOrder(user: PublicUser, orderId: string) {
    const result = await this.pool.query(
      `SELECT 1 FROM orders o WHERE o.id=$1 AND ($2='owner' OR o.assignee_id=$3 OR EXISTS(SELECT 1 FROM exceptions e WHERE e.order_id=o.id AND e.assignee_id=$3))`,
      [orderId, user.role, user.id],
    );
    return !!result.rowCount;
  }
  async orderTimeline(user: PublicUser, orderId: string) {
    if (!(await this.canAccessOrder(user, orderId)))
      throw new InputError('Order not found.', 404);
    const events = await this.pool.query(
      `SELECT id::text AS id,order_id AS "orderId",source,source_event_id AS "sourceEventId",event_type AS "eventType",occurred_at AS "occurredAt",payload FROM order_events WHERE order_id=$1 ORDER BY occurred_at,id`,
      [orderId],
    );
    const exceptions = await this.pool.query(
      `SELECT ${projection} FROM exceptions e JOIN orders o ON o.id=e.order_id WHERE e.order_id=$1 AND ($2='owner' OR e.assignee_id=$3) ORDER BY e.created_at,e.id`,
      [orderId, user.role, user.id],
    );
    const actions = await this.pool.query(
      `SELECT a.id::text AS id,a.exception_id::text AS "exceptionId",e.order_id AS "orderId",a.actor_id AS "actorId",a.action,a.note,a.before_state AS "beforeState",a.after_state AS "afterState",a.created_at AS "createdAt" FROM action_logs a JOIN exceptions e ON e.id=a.exception_id WHERE e.order_id=$1 AND ($2='owner' OR e.assignee_id=$3) ORDER BY a.created_at,a.id`,
      [orderId, user.role, user.id],
    );
    return {
      events: events.rows.map(dto),
      exceptions: exceptions.rows.map(dto),
      actions: actions.rows.map(dto),
    };
  }
  async operators(user: PublicUser) {
    if (user.role !== 'owner')
      throw new InputError('Only owner can list operators.', 403);
    return (
      await this.pool.query(
        "SELECT id,email,role FROM users WHERE role='operator' ORDER BY email,id",
      )
    ).rows;
  }
}
