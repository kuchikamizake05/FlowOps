# Panduan menjalankan dan mengembangkan

## Prasyarat

- Node.js versi 22 atau lebih baru.
- npm yang disertakan bersama Node.js.

## Menjalankan secara lokal

```bash
npm install
npm run dev
```

Semua perintah di halaman ini dijalankan dari akar repo. Skrip akar meneruskan perintah ke workspace `backend/`. Server mendengarkan pada `http://localhost:3000` secara bawaan. Kunjungi `http://localhost:3000/health` untuk memastikan API siap; responsnya `{"status":"ok"}`.

Untuk menjalankan hasil kompilasi:

```bash
npm run build
npm start
```

## Konfigurasi

| Variabel | Bawaan | Fungsi |
| --- | --- | --- |
| `PORT` | `3000` | Port HTTP server. |
| `DEMO_OWNER_PASSWORD` | `change-this-owner-password` | Kata sandi akun demo owner. |
| `DEMO_OPERATOR_PASSWORD` | `change-this-operator-password` | Kata sandi akun demo operator. |

Contoh untuk PowerShell:

```powershell
$env:PORT = '3000'
$env:DEMO_OWNER_PASSWORD = 'kata-sandi-owner-anda'
$env:DEMO_OPERATOR_PASSWORD = 'kata-sandi-operator-anda'
npm run dev
```

Contoh untuk shell Unix:

```bash
PORT=3000 DEMO_OWNER_PASSWORD='kata-sandi-owner-anda' DEMO_OPERATOR_PASSWORD='kata-sandi-operator-anda' npm run dev
```

Aplikasi membaca variabel lingkungan dari proses. Berkas `.env` tidak dimuat otomatis. Nilai bawaan kata sandi hanya sesuai untuk percobaan lokal; tetapkan nilai sendiri sebelum server dapat diakses dari jaringan lain.

## Data demo

| Akun | Peran | Pesanan yang ditugaskan |
| --- | --- | --- |
| `owner@flowops.local` | owner | `ord-002`; dapat membaca semua pesanan contoh. |
| `operator@flowops.local` | operator | `ord-001` saja. |

Pesanan contoh memiliki ID `ord-001` dan `ord-002`. Pengguna, pesanan, serta sesi tidak disimpan secara permanen; semuanya kembali ke nilai awal ketika server dimulai ulang.

## Pemeriksaan

```bash
npm run typecheck
npm test
npm run build
```

Pengujian saat ini berfokus pada login dan kontrol akses. Workflow GitHub Actions di repositori hanya memeriksa keberadaan berkas dokumentasi GitHub Pages, sehingga hasilnya tidak mewakili kelulusan pengujian aplikasi.

## Struktur kode

- `backend/src/server.ts`: inisialisasi data demo dan server HTTP.
- `backend/src/app.ts`: rute, middleware, validasi input, dan respons kesalahan.
- `backend/src/auth/`: pengguna serta sesi dalam memori.
- `backend/src/orders/`: pesanan contoh dalam memori.
- `backend/test/`: pengujian API berbasis Node Test Runner dan Supertest.
- `backend/database/`: skema PostgreSQL awal; belum terhubung ke API.
- `frontend/`: tempat aplikasi web; belum ada aplikasi yang dapat dijalankan.

Lihat [referensi API](api.md) untuk mencoba endpoint dan [status implementasi](implementation-status.md) untuk batas kemampuan versi ini.
