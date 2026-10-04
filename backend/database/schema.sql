-- Skema PostgreSQL FlowOps (Repeatable Migration)
-- Mendukung pembuatan tabel berulang (idempotent) tanpa error jika tabel sudah ada.

BEGIN;

CREATE TABLE IF NOT EXISTS users (
    id text PRIMARY KEY,
    email text NOT NULL UNIQUE,
    role text NOT NULL CHECK (role IN ('owner', 'operator')),
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
    id text PRIMARY KEY,
    marketplace_order_id text NOT NULL UNIQUE,
    status text NOT NULL,
    processing_deadline timestamptz,
    assignee_id text REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    source text NOT NULL CHECK (source IN ('csv', 'webhook')),
    source_event_id text NOT NULL,
    event_type text NOT NULL,
    occurred_at timestamptz NOT NULL,
    UNIQUE (source, source_event_id)
);

-- Event payloads and snapshot ordering for FO-11; safe for existing databases.
ALTER TABLE order_events ADD COLUMN IF NOT EXISTS payload jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_event_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_event_key text;
UPDATE orders o SET last_event_at = latest.occurred_at,
    last_event_key = latest.event_key
FROM (SELECT DISTINCT ON (order_id) order_id, occurred_at,
      source || ':' || source_event_id AS event_key FROM order_events
      ORDER BY order_id, occurred_at DESC, (source || ':' || source_event_id) COLLATE "C" DESC) latest
WHERE o.id = latest.order_id AND o.last_event_at IS NULL;

CREATE TABLE IF NOT EXISTS exceptions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    rule_code text NOT NULL,
    priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status text NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved')),
    reason text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Pastikan constraint priority mencakup 'critical' jika tabel sudah dibuat sebelumnya
ALTER TABLE exceptions DROP CONSTRAINT IF EXISTS exceptions_priority_check;
ALTER TABLE exceptions ADD CONSTRAINT exceptions_priority_check CHECK (priority IN ('low', 'medium', 'high', 'critical'));

CREATE TABLE IF NOT EXISTS action_logs (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    exception_id bigint NOT NULL REFERENCES exceptions(id) ON DELETE CASCADE,
    actor_id text NOT NULL REFERENCES users(id),
    action text NOT NULL,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indeks performa query antrean dan pencarian
CREATE INDEX IF NOT EXISTS idx_orders_assignee ON orders(assignee_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_events_order_id ON order_events(order_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_order_id ON exceptions(order_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON exceptions(status);
CREATE INDEX IF NOT EXISTS idx_exceptions_priority ON exceptions(priority);
CREATE INDEX IF NOT EXISTS idx_action_logs_exception ON action_logs(exception_id);

COMMIT;
