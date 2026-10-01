# Status implementasi

Dokumen ini membedakan kemampuan yang dapat dijalankan sekarang dari target di [PRD](prd.md). Status merujuk pada isi repositori saat dokumentasi ini diperbarui.

| Area | Status | Bukti dan batasan |
| --- | --- | --- |
| Server API | Tersedia | Express dan TypeScript, dengan `GET /health`. |
| Login owner/operator | Tersedia untuk demo | Dua pengguna dibuat saat server mulai; kata sandi dapat diatur melalui variabel lingkungan. |
| Sesi dan logout | Tersedia untuk demo | Bearer token berlaku 15 menit dan disimpan dalam memori. |
| Kontrol akses detail pesanan | Tersedia untuk demo | Owner dapat membaca semua pesanan contoh; operator hanya pesanan yang ditugaskan kepadanya. |
| Penyimpanan permanen dan data toko | Belum terintegrasi | Skema PostgreSQL awal ada di `backend/database/`, tetapi API masih memakai data contoh dalam memori; model tenant toko belum ada. |
| Antarmuka web | Belum tersedia | Repositori belum memuat aplikasi frontend. |
| Impor CSV dan webhook | Belum tersedia | Belum ada endpoint penerimaan data pesanan. |
| Normalisasi dan pencegahan duplikasi event | Belum tersedia | Masih kebutuhan rancangan. |
| Deteksi EX-01 sampai EX-05 dan prioritas | Belum tersedia | Belum ada rules engine. |
| Antrean, penugasan, timeline, dan audit | Belum tersedia | API saat ini hanya membaca satu pesanan berdasarkan ID. |
| AI untuk teks komplain/retur | Belum tersedia | Belum ada integrasi model atau endpoint triage. |
| Notifikasi dan deployment cloud | Belum tersedia | Belum ada implementasi di repositori ini. |

## Yang telah diuji

Pengujian di `backend/test/auth-access.test.ts` memeriksa bahwa login tidak mengembalikan hash kata sandi, operator ditolak saat membaca pesanan pengguna lain, dan owner maupun operator yang ditugaskan dapat membaca pesanan yang diizinkan. Jalankan `npm test` dari akar repo untuk memverifikasi pada mesin Anda.

## Tahap pengembangan berikutnya

Urutan ini mengikuti ketergantungan pada [PRD](prd.md) dan [arsitektur](architecture.md):

1. Tetapkan model data dan penyimpanan permanen beserta batas data per toko.
2. Implementasikan penerimaan event dan impor CSV dengan validasi serta idempotensi.
3. Tambahkan aturan exception dan prioritas yang dapat diuji tanpa AI.
4. Sediakan API dan antarmuka antrean, penugasan, tindakan, serta audit.
5. Tambahkan triage teks sebagai bantuan operator dan uji alur pengguna.

Daftar ini adalah rencana, bukan janji bahwa endpoint atau halaman tersebut sudah tersedia.
