# FlowOps

**Tahu pesanan yang bermasalah sebelum terlambat.**

FlowOps adalah proyek aplikasi untuk membantu penjual daring menemukan dan menangani pesanan yang membutuhkan perhatian. Produk yang direncanakan menerima data pesanan, mendeteksi masalah berdasarkan aturan tenggat, lalu menyajikan antrean tindakan bagi pemilik toko dan operator.

> **Status proyek:** repositori saat ini berisi fondasi API autentikasi, pembatasan akses detail pesanan, dan skema PostgreSQL awal. API belum memakai database tersebut. Antarmuka web, impor CSV, webhook, rules engine, AI, dan notifikasi masih dalam rancangan. Lihat [status implementasi](docs/status-implementasi.md).

## Sasaran produk

- Menyatukan data pesanan dari webhook simulator atau impor CSV.
- Menandai lima jenis masalah operasional dengan aturan tenggat yang dapat dijelaskan.
- Menyajikan antrean prioritas, penanggung jawab, dan riwayat tindakan.
- Membantu operator membaca teks komplain atau retur melalui saran AI yang dapat diperiksa dan dikoreksi.

Daftar ini merupakan **cakupan MVP yang direncanakan**. Kemampuan yang sudah berjalan dijelaskan pada bagian API di bawah dan di [status implementasi](docs/status-implementasi.md).

## Teknologi saat ini

| Bagian | Teknologi |
| --- | --- |
| API | Node.js, TypeScript, Express 5 |
| Validasi dan keamanan dasar | Zod, Argon2, Helmet, express-rate-limit |
| Pengujian | Node Test Runner, Supertest |
| Penyimpanan | Memori proses untuk data demo dan sesi |

Skema PostgreSQL awal tersedia di `backend/database/`, tetapi penyimpanan API masih berada dalam memori. Aplikasi frontend belum tersedia.

## Mulai cepat

Prasyarat: **Node.js 22 atau lebih baru** dan npm.

Jalankan perintah berikut dari akar repo. Proyek memakai npm workspaces; skrip akar meneruskan perintah ke `backend/`.

```bash
npm install
npm run dev
```

Server berjalan di `http://localhost:3000` secara bawaan. Periksa dengan `GET /health`. Untuk mencoba login, gunakan akun demo `owner@flowops.local` atau `operator@flowops.local`. Kata sandinya diambil dari `DEMO_OWNER_PASSWORD` dan `DEMO_OPERATOR_PASSWORD`; tanpa pengaturan, masing-masing memakai `change-this-owner-password` dan `change-this-operator-password`. **Tetapkan kata sandi sendiri jika server dapat diakses selain dari komputer lokal.** Data akun, sesi, dan dua pesanan contoh disimpan dalam memori sehingga kembali ke keadaan awal saat server dimulai ulang.

Contoh PowerShell:

```powershell
$env:DEMO_OWNER_PASSWORD = 'kata-sandi-demo-anda'
$env:DEMO_OPERATOR_PASSWORD = 'kata-sandi-operator-anda'
npm run dev
```

Panduan permintaan API beserta respons dan kode status ada di [dokumentasi API](docs/api.md).

## API yang tersedia

| Metode | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/health` | Memeriksa kesiapan server. |
| `POST` | `/api/auth/login` | Login owner atau operator demo. |
| `GET` | `/api/auth/me` | Membaca identitas pemilik token. |
| `POST` | `/api/auth/logout` | Mengakhiri sesi. |
| `GET` | `/api/orders/:id` | Membaca detail pesanan sesuai peran dan penugasan. |

Rute yang memerlukan login memakai header `Authorization: Bearer <token>`. Token diperoleh dari respons login dan berlaku selama 15 menit. [Referensi API](docs/api.md) menyediakan contoh permintaan serta kode respons.

## Perintah pengembangan

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Menjalankan server dengan pemuatan ulang saat kode berubah. |
| `npm run build` | Mengompilasi TypeScript backend ke `backend/dist/`. |
| `npm start` | Menjalankan hasil kompilasi; jalankan `npm run build` lebih dulu. |
| `npm test` | Menjalankan pengujian API. |
| `npm run typecheck` | Memeriksa tipe tanpa menghasilkan berkas. |

Variabel lingkungan yang tersedia: `PORT` (bawaan `3000`), `DEMO_OWNER_PASSWORD`, dan `DEMO_OPERATOR_PASSWORD`. Tidak ada berkas `.env` yang dimuat otomatis oleh aplikasi saat ini.

## Isi repositori

| Lokasi | Isi |
| --- | --- |
| `backend/src/app.ts` | Rute API, autentikasi, validasi, dan kontrol akses. |
| `backend/src/server.ts` | Data demo dan titik masuk server. |
| `backend/src/auth/`, `backend/src/orders/` | Penyimpanan pengguna, sesi, dan pesanan dalam memori. |
| `backend/test/` | Pengujian login dan akses berdasarkan peran. |
| `backend/database/` | Skrip pembuatan database dan skema PostgreSQL awal. |
| `frontend/` | Tempat pengembangan aplikasi web; saat ini berisi panduan awal. |
| `docs/` | Panduan, spesifikasi produk, arsitektur, dan status pengerjaan. |

## Dokumentasi

- [Beranda dokumentasi](docs/index.md)
- [Panduan menjalankan dan pengembangan](docs/pengembangan.md)
- [Referensi API](docs/api.md)
- [Arsitektur saat ini dan rancangan](docs/architecture.md)
- [Status implementasi](docs/status-implementasi.md)
- [Skema PostgreSQL](backend/database/README.md)
- [Product Requirements Document](docs/prd.md)
- [Latar belakang dan ide awal](docs/ide-awal.md)
- [Rancangan antarmuka di Stitch](docs/desain-stitch.md)

## Tim

Proyek Senior Project TI, Departemen Teknologi Elektro dan Teknologi Informasi, Fakultas Teknik, Universitas Gadjah Mada.

| Anggota | NIM |
| --- | --- |
| Faaid Sakhaa | 24/539398/TK/59820 |
| Rafif Raihan Bahrul Alam | 24/534432/TK/59237 |
| Hendra Kurnia Maliqi | 24/542344/TK/60216 |
