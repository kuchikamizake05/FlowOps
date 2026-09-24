# Database FlowOps

Folder ini menyimpan skema PostgreSQL awal untuk domain pesanan dan penanganan exception.

| Berkas | Fungsi |
| --- | --- |
| `create-database.sql` | Membuat database `flowops` satu kali dari koneksi ke database `postgres`. |
| `schema.sql` | Membuat tabel, batasan nilai, keunikan event, dan relasi foreign key pada database `flowops`. |

Jalankan dari akar repositori menggunakan akun PostgreSQL yang memiliki izin membuat database dan tabel:

```bash
psql -d postgres -f backend/database/create-database.sql
psql -d flowops -f backend/database/schema.sql
```

Kedua skrip ditujukan untuk database baru dan belum merupakan migrasi yang dapat dijalankan berulang. Jangan jalankan ulang `CREATE DATABASE` atau `CREATE TABLE` pada database yang sudah terisi. Belum ada seed data atau migrasi otomatis.

Skema awal terdiri atas `users`, `orders`, `order_events`, `exceptions`, dan `action_logs`. `order_events` menjaga keunikan pasangan `source` dan `source_event_id` agar event yang sama tidak dicatat dua kali. Relasi dari pesanan, exception, dan tindakan memakai foreign key.

API saat ini masih memakai penyimpanan dalam memori; skema PostgreSQL ini belum dipakai oleh kode `backend/src/`. Integrasi repository, migrasi berulang, data contoh, dan isolasi data per toko merupakan pekerjaan berikutnya.
