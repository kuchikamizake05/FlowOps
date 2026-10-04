import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, closePool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigration(): Promise<void> {
  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
  const sql = await fs.readFile(schemaPath, 'utf-8');

  console.log('Menjalankan migrasi database FlowOps dari schema.sql...');
  await pool.query(sql);
  console.log('Migrasi skema database berhasil dijalankan.');
}

// Eksekusi jika dipanggil langsung sebagai skrip
if (process.argv[1] === __filename) {
  runMigration()
    .catch((err) => {
      console.error('Migrasi database gagal:', err);
      process.exitCode = 1;
    })
    .finally(() => closePool());
}
