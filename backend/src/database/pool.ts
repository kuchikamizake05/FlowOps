import pg from 'pg';

const { Pool } = pg;

export const DEFAULT_DATABASE_URL =
  'postgres://flowops_user:flowops_password@localhost:5432/flowops';

const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function query<R extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<R>> {
  return pool.query<R>(text, params);
}

export async function closePool(): Promise<void> {
  await pool.end();
}
