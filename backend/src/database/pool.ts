import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// baca env dari backend dan atau dari flowops
try {
  process.loadEnvFile(path.resolve(__dirname, '../../../.env'));
} catch { }
try {
  process.loadEnvFile(path.resolve(__dirname, '../../.env'));
} catch { }
try {
  process.loadEnvFile();
} catch { }

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
