-- Skema PostgreSQL awal FlowOps. Jalankan sekali pada database flowops yang baru.
-- Integrasi aplikasi dan migrasi berulang akan ditambahkan pada tahap berikutnya.
BEGIN;

CREATE TABLE users (
    id text PRIMARY KEY,
    email text NOT NULL UNIQUE,
    role text NOT NULL CHECK (role IN ('owner', 'operator')),
    password_hash text NOT NULL
);

CREATE TABLE orders (
    id text PRIMARY KEY,
    marketplace_order_id text NOT NULL UNIQUE,
    status text NOT NULL,
    processing_deadline timestamptz,
    assignee_id text REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_events (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    source text NOT NULL CHECK (source IN ('csv', 'webhook')),
    source_event_id text NOT NULL,
    event_type text NOT NULL,
    occurred_at timestamptz NOT NULL,
    UNIQUE (source, source_event_id)
);

CREATE TABLE exceptions (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    rule_code text NOT NULL,
    priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    status text NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved')),
    reason text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE action_logs (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    exception_id bigint NOT NULL REFERENCES exceptions(id) ON DELETE CASCADE,
    actor_id text NOT NULL REFERENCES users(id),
    action text NOT NULL,
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
