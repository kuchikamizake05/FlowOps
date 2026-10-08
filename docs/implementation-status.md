# Status implementasi

Diperbarui 8 Oktober 2026 untuk pengerjaan FO-22 dan FO-14 pada branch `539398`. Tabel ini membedakan backend yang dapat dijalankan dari integrasi frontend yang masih dilanjutkan.

| Area | Status | Bukti dan batasan |
| --- | --- | --- |
| Server API | Tersedia | Express/TypeScript dan GET /health. |
| Login owner/operator | Tersedia | Dengan DATABASE_URL memakai akun PostgreSQL; tanpa database memakai akun demo memori. |
| Sesi/logout | Tersedia untuk demo | Bearer token 15 menit dalam memori; restart menghapus sesi. |
| Penyimpanan | PostgreSQL | Akun, order/event, exception, audit, dan inbox. Model tenant/toko belum ada. |
| CSV/webhook | Tersedia | Validasi, normalisasi UTC/status, transaksi dan pencegahan replay. Event accepted mengevaluasi rules dalam transaksi yang sama. |
| Rules EX-01–EX-05 | Evaluator tersedia | Nama event/status FO-11 diselaraskan. EX-04 memerlukan flag label pengiriman yang belum tersedia pada data ingestion tersimpan. Evaluasi tenggat dilakukan saat event diterima atau fungsi sync dipanggil; belum ada scheduler. |
| Antrean/detail | API tersedia | Filter, pagination, prioritas/tenggat, akses owner/operator, dan timeline. |
| Assignee/status/audit | API tersedia | Claim atomik, expectedVersion, penugasan owner, status open/in_progress/resolved, dan catatan wajib penyelesaian. |
| Notifikasi | Inbox API tersedia | Exception baru/eskalasi dan perubahan workflow menghasilkan notifikasi persisten; scoped ke penerima, deduplikasi, read acknowledgment. Belum push/WebSocket. |
| Kontrak API FO-22 | Tersedia | docs/api.md mencakup fitur tersedia dan rencana AI. Disusun Faaid sesuai arahan; adopsi frontend Rafif masih dilanjutkan. |
| Frontend | Fondasi tersedia | Login dan kerangka dashboard/antrean Next.js; dashboard masih data demo. Adapter PATCH/CSV dan layar workflow perlu diintegrasikan pada FO-13. |
| AI | Belum tersedia | Kontrak rencana terpisah dari endpoint tersedia; FO-15/FO-16. |
| Deployment cloud | Belum tersedia | FO-18 setelah integrasi dan pengujian alur lengkap. |

## Verifikasi

Tes PostgreSQL memakai database terpisah dan schema acak. Cakupan pengujian meliputi klaim bersamaan, akses, perubahan versi, rollback, filter, catatan selesai, audit, inbox per penerima, event replay, serta eskalasi rules. Jalankan npm test dengan TEST_DATABASE_URL dan DATABASE_URL yang menunjuk database tes yang sama; tanpa konfigurasi tersebut tes PostgreSQL dilewati. Pemeriksaan tipe dan build backend juga tersedia dari skrip akar.

## Batasan migrasi

Migrasi aman dijalankan ulang. Bila database lama memiliki dua exception aktif untuk kombinasi order/rule yang sama, indeks unik menolak migrasi agar riwayat tidak dihapus diam-diam; rekonsiliasi data tersebut terlebih dahulu. Data contoh lama mungkin memiliki status in_progress tanpa assignee exception; owner dapat menetapkan operator sebelum melanjutkan penanganan.

## Berikutnya

Integrasikan frontend FO-13 dengan kontrak API, lanjutkan AI FO-15/FO-16, uji alur menyeluruh FO-17, lalu deploy FO-18. Tentukan model tenant dan scheduler aturan sebelum mengklaim dukungan produksi untuk banyak toko.
