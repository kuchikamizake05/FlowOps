# FlowOps

**Tahu pesanan yang bermasalah sebelum terlambat.**

FlowOps adalah proyek aplikasi untuk membantu penjual daring menemukan dan menangani pesanan yang membutuhkan perhatian. Produk yang direncanakan menerima data pesanan, mendeteksi masalah berdasarkan aturan tenggat, lalu menyajikan antrean tindakan bagi pemilik toko dan operator.

> **Status proyek:** API autentikasi, ingestion, rules, antrean, penugasan exception, audit, dan notifikasi PostgreSQL tersedia untuk demo satu toko. Fondasi frontend tersedia; integrasi layar antrean dan AI masih dilanjutkan. Lihat [status implementasi](docs/implementation-status.md).

## Sasaran produk

- Menyatukan data pesanan dari webhook simulator atau impor CSV.
- Menandai lima jenis masalah operasional dengan aturan tenggat yang dapat dijelaskan.
- Menyajikan antrean prioritas, penanggung jawab, dan riwayat tindakan.
- Membantu operator membaca teks komplain atau retur melalui saran AI yang dapat diperiksa dan dikoreksi.

Daftar ini merupakan **cakupan MVP yang direncanakan**. Kemampuan yang sudah berjalan dijelaskan pada bagian API di bawah dan di [status implementasi](docs/implementation-status.md).

## Teknologi saat ini

| Bagian | Teknologi |
| --- | --- |
| API | Node.js, TypeScript, Express 5 |
| Validasi dan keamanan dasar | Zod, Argon2, Helmet, express-rate-limit |
| Pengujian | Node Test Runner, Supertest |
| Penyimpanan | PostgreSQL untuk akun, pesanan/event, exception, audit, dan notifikasi; sesi dalam memori |

Skema PostgreSQL tersedia di `backend/database/`. Setel `DATABASE_URL` dan jalankan `npm run db:migrate` untuk mengaktifkan penyimpanan pesanan/event. Tanpa DATABASE_URL eksplisit, server memakai pesanan demo dalam memori dan endpoint penyimpanan mengembalikan 503.

Dengan `DATABASE_URL`, login memakai akun dan hash kata sandi dalam tabel `users`; jalankan `npm run db:seed` untuk menyiapkan akun contoh dan lihat panduan database untuk konfigurasi kata sandinya. Variabel kata sandi demo server hanya berlaku untuk mode tanpa database. Impor yang diterima mengevaluasi rules dan menyimpan notifikasi dalam transaksi yang sama. Notifikasi dibaca melalui API inbox; belum berupa push atau WebSocket.

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
| `POST` | `/api/ingestion/csv` | Mengimpor CSV ke PostgreSQL. |
| `POST` | `/api/ingestion/webhook` | Menyimpan event webhook simulator. |
| `POST` | `/api/ingestion/csv/preview`, `/api/ingestion/webhook/preview` | Memvalidasi tanpa penyimpanan. |
| `GET` | `/api/exceptions`, `/api/exceptions/:id` | Antrean terfilter dan detail exception. |
| `POST` | `/api/exceptions/:id/claim` | Operator mengambil tugas dengan pemeriksaan versi. |
| `PATCH` | `/api/exceptions/:id/assignee`, `/api/exceptions/:id/status` | Penugasan owner dan perubahan status dengan audit. |
| `GET` | `/api/exceptions/:id/actions`, `/api/operators` | Riwayat tindakan dan direktori operator untuk owner. |
| `GET`, `PATCH` | `/api/notifications`, `/api/notifications/:id/read` | Inbox pengguna dan penandaan sudah dibaca. |

Rute yang memerlukan login memakai header `Authorization: Bearer <token>`. Token diperoleh dari respons login dan berlaku selama 15 menit. [Referensi API](docs/api.md) menyediakan contoh permintaan serta kode respons.

## Perintah pengembangan

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Menjalankan server dengan pemuatan ulang saat kode berubah. |
| `npm run build` | Mengompilasi TypeScript backend ke `backend/dist/`. |
| `npm start` | Menjalankan hasil kompilasi; jalankan `npm run build` lebih dulu. |
| `npm test` | Menjalankan pengujian API. |
| `npm run typecheck` | Memeriksa tipe tanpa menghasilkan berkas. |

Variabel lingkungan: `PORT` (bawaan `3000`), `DEMO_OWNER_PASSWORD`, `DEMO_OPERATOR_PASSWORD`, dan `DATABASE_URL`. Tes database memerlukan `TEST_DATABASE_URL`; lihat [panduan ingestion](docs/ingestion.md#pengujian). Modul pool memuat `.env` akar dan backend bila tersedia; variabel lingkungan yang sudah ditetapkan tetap diprioritaskan.

## Isi repositori

| Lokasi | Isi |
| --- | --- |
| `backend/src/app.ts` | Rute API, autentikasi, validasi, dan kontrol akses. |
| `backend/src/server.ts` | Data demo dan titik masuk server. |
| `backend/src/auth/`, `backend/src/orders/` | Penyimpanan pengguna, sesi, dan pesanan dalam memori. |
| `backend/test/` | Pengujian login dan akses berdasarkan peran. |
| `backend/database/` | Skrip pembuatan database dan skema PostgreSQL awal. |
| `backend/src/workflow/`, `backend/src/rules/` | Penanganan exception, inbox, dan evaluasi rules. |
| `frontend/` | Next.js: login, kerangka aplikasi, dashboard demo, dan kerangka antrean. |
| `docs/` | Panduan, spesifikasi produk, arsitektur, dan status pengerjaan. |

## Dokumentasi

- [Beranda dokumentasi](docs/index.md)
- [Panduan menjalankan dan pengembangan](docs/development-guide.md)
- [Referensi API](docs/api.md)
- [CSV dan webhook preview](docs/ingestion.md)
- [Arsitektur saat ini dan rancangan](docs/architecture.md)
- [Status implementasi](docs/implementation-status.md)
- [Skema PostgreSQL](backend/database/README.md)
- [Product Requirements Document](docs/prd.md)
- [Latar belakang dan ide awal](docs/project-background.md)
- [Rancangan antarmuka di Stitch](docs/stitch-design.md)

## Tim

Proyek Senior Project TI, Departemen Teknologi Elektro dan Teknologi Informasi, Fakultas Teknik, Universitas Gadjah Mada.

| Anggota | NIM |
| --- | --- |
| Faaid Sakhaa | 24/539398/TK/59820 |
| Rafif Raihan Bahrul Alam | 24/534432/TK/59237 |
| Hendra Kurnia Maliqi | 24/542344/TK/60216 |
