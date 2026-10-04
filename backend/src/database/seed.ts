import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, closePool } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runSeed(): Promise<void> {
  const seedPath = path.resolve(__dirname, '../../database/seed.sql');
  const sql = await fs.readFile(seedPath, 'utf-8');

  console.log('Mengisi data contoh (seed data) ke database FlowOps dari seed.sql...');
  await pool.query(sql);
  console.log('Pengisian data contoh berhasil dijalankan.');
}

// Eksekusi jika dipanggil langsung sebagai skrip
if (process.argv[1] === __filename) {
  runSeed()
    .catch((err) => {
      console.error('Pengisian data contoh gagal:', err);
      process.exitCode = 1;
    })
    .finally(() => closePool());
}
