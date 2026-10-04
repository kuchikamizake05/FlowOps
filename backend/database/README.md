# Database FlowOps

Folder ini menyimpan skema PostgreSQL, data contoh (*seed data*), dan skrip runner untuk domain pesanan dan penanganan exception FlowOps.

| Berkas | Fungsi |
| --- | --- |
| `create-database.sql` | Membuat database `flowops` dan role `flowops_user` satu kali. |
| `schema.sql` | Skema DDL tabel, constraint, keunikan event, dan indeks pencarian. Bersifat *repeatable* (`CREATE TABLE IF NOT EXISTS`). |
| `seed.sql` | Data contoh akun demo (`owner` dan `operator`), pesanan contoh, event log, exception aktif, dan riwayat tindakan. Bersifat *repeatable*. |

## Perintah Cepat

Jalankan perintah ini dari akar repositori:

```bash
# Menjalankan migrasi skema tabel
npm run db:migrate

# Mengisi data contoh demo
npm run db:seed
```

Secara bawaan, koneksi membaca variabel lingkungan `DATABASE_URL`. Jika tidak disetel, aplikasi otomatis menggunakan konfigurasi lokal:
```text
postgres://flowops_user:flowops_password@localhost:5432/flowops
```

## Struktur Skema

1. **`users`**: Akun pengguna, peran (`owner`, `operator`), dan hash kata sandi Argon2.
2. **`orders`**: Data pesanan marketplace, status pemrosesan, batas tenggat (*deadline*), dan penanggung jawab (*assignee*).
3. **`order_events`**: Rekaman log event pesanan dari webhook atau impor CSV. Pasangan `(source, source_event_id)` bersifat unik untuk mencegah pemrosesan event duplikat (idempotensi).
4. **`exceptions`**: Masalah operasional terdeteksi (`EX-01` s/d `EX-05`), tingkat prioritas (`low`, `medium`, `high`, `critical`), dan status penanganan (`open`, `in_progress`, `resolved`).
5. **`action_logs`**: Rekam jejak audit dan catatan penanganan oleh operator.
