# FlowOps — praktik Modul 5: pembuatan basis data

Folder ini berisi **contoh basis data dan tabel** untuk ditunjukkan pada worksheet. Skemanya mengikuti kebutuhan inti di `docs/prd.md` dan `docs/architecture.md`. ERD FO-05 belum tersedia di repo, sehingga nama kolom dan relasi di sini adalah rancangan sementara. Ini **belum** menyelesaikan FO-10: migrasi aplikasi, data contoh, dan integrasi backend masih perlu disepakati dengan Hendra.

## Alat

- PostgreSQL sebagai database. Pada komputer ini PostgreSQL 16 sudah dipasang di WSL `Ubuntu-24.04`.
- `psql` di WSL untuk menjalankan SQL dan mengambil screenshot hasilnya. pgAdmin boleh dipakai jika sudah tersedia.

## Database yang sudah dibuat di komputer ini

Pada 25 September 2026, kedua skrip telah dijalankan pada PostgreSQL lokal di WSL. Database `flowops` berisi lima tabel, dan kelima relasi foreign key berhasil diperiksa. Untuk menampilkan hasilnya lagi dari PowerShell:

```powershell
wsl -d Ubuntu-24.04 -u root -- service postgresql start
wsl -d Ubuntu-24.04 -u postgres -- psql -d flowops -c "SELECT current_database() AS database_name, table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;"
wsl -d Ubuntu-24.04 -u postgres -- psql -d flowops -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' ORDER BY ordinal_position;"
```

Ambil screenshot hasil perintah pertama untuk menunjukkan nama database dan daftar tabel. Perintah kedua menunjukkan kolom tabel utama. Tidak perlu menjalankan skrip pembuatan ulang pada database yang sudah ada.

## Cara menjalankan lewat pgAdmin

1. Sambungkan pgAdmin ke server PostgreSQL lokal.
2. Buka **Query Tool** pada database `postgres`, jalankan isi `01-create-database.sql`.
3. Refresh daftar database, lalu buka **Query Tool** pada database `flowops`.
4. Jalankan isi `02-create-tables.sql` sekali. Bila database atau tabel sudah ada, jangan menjalankan ulang perintah `CREATE`; gunakan database kosong baru untuk mengulang praktik.
5. Refresh `flowops → Schemas → public → Tables`. Seharusnya muncul lima tabel: `users`, `orders`, `order_events`, `exceptions`, dan `action_logs`.
6. Untuk memeriksa daftar tabel lewat SQL, jalankan:

   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
   ORDER BY table_name;
   ```

7. Periksa relasi dengan membuka `orders → Columns` dan `orders → Constraints`, atau jalankan:

   ```sql
   SELECT tc.table_name, kcu.column_name, ccu.table_name AS referenced_table
   FROM information_schema.table_constraints AS tc
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
   JOIN information_schema.constraint_column_usage AS ccu
     ON tc.constraint_name = ccu.constraint_name
    AND tc.table_schema = ccu.table_schema
   WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
   ORDER BY tc.table_name, kcu.column_name;
   ```

## Bukti untuk worksheet

Ambil screenshot **database `flowops` beserta daftar lima tabel** dari terminal `psql` atau panel pgAdmin. Ambil satu screenshot tambahan yang menampilkan struktur tabel `orders` beserta kolomnya. Gunakan screenshot dari PostgreSQL yang benar-benar dijalankan, bukan diagram rancangan.

| Tabel | Fungsi |
| --- | --- |
| `users` | Akun owner dan operator. |
| `orders` | Pesanan dan operator yang ditugaskan. |
| `order_events` | Peristiwa dari CSV atau webhook; pasangan sumber dan ID event dibuat unik untuk mencegah duplikasi. |
| `exceptions` | Masalah order yang perlu ditangani. |
| `action_logs` | Catatan tindakan terhadap exception. |

Database awal memang kosong. Instruksi Modul 5 hanya meminta database dan tabel; data contoh adalah bagian dari cakupan FO-10 berikutnya.
