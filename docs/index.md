# FlowOps

**Tahu pesanan yang bermasalah sebelum terlambat.**

FlowOps dirancang sebagai antrean kerja untuk penjual daring: data pesanan masuk, aturan operasional menandai masalah atau tenggat yang mendekat, dan tim mengetahui tindakan berikutnya. Proyek ini dikerjakan oleh kelompok Senior Project TI, Departemen Teknologi Elektro dan Teknologi Informasi, Fakultas Teknik, Universitas Gadjah Mada.

> **Kondisi saat ini:** implementasi yang tersedia adalah API login, identitas sesi, logout, dan pembacaan detail pesanan dengan pembatasan akses owner/operator. Fitur lainnya pada dokumen produk adalah target pengembangan.

## Mulai membaca

| Dokumen | Untuk apa |
| --- | --- |
| [README repositori](https://github.com/kuchikamizake05/FlowOps#readme) | Ringkasan proyek dan cara mulai cepat. |
| [Panduan pengembangan](development-guide.md) | Menjalankan aplikasi, konfigurasi, pengujian, dan keterbatasan lokal. |
| [Referensi API](api.md) | Endpoint yang tersedia, contoh pemakaian, dan respons kesalahan. |
| [Status implementasi](implementation-status.md) | Fitur yang sudah ada dan yang masih direncanakan. |
| [Arsitektur](architecture.md) | Struktur kode saat ini dan rancangan sistem berikutnya. |
| [PRD](prd.md) | Masalah, pengguna, kebutuhan, dan cakupan MVP. |
| [Spesifikasi proyek](FLOWOPS_PROJECT_SPEC.md) | Rincian MVP, kondisi repo, aturan exception, dan kriteria penerimaan. |
| [Latar belakang dan ide awal](project-background.md) | Materi awal proyek dan analisis kompetitor. |
| [Rancangan antarmuka di Stitch](stitch-design.md) | Tautan desain, daftar layar, dan cara menerapkannya ke repo. |

## Gambaran produk

Masalah yang ingin diselesaikan adalah sulitnya menemukan pesanan yang perlu ditangani segera ketika data tersebar di berbagai kanal. FlowOps menargetkan lima jenis exception awal: risiko terlambat ready-to-ship, risiko terlambat diserahkan ke pengiriman, pembatalan tertunda, label pengiriman belum tersedia, serta komplain atau retur yang belum ditindaklanjuti. Aturan tenggat dirancang deterministik; AI hanya membantu merangkum teks dan memberi saran yang dapat diperiksa manusia.

Untuk menjalankan fondasi API yang sudah tersedia, lihat [panduan pengembangan](development-guide.md). Spesifikasi produk di [PRD](prd.md) menjelaskan sasaran akhir, bukan daftar fitur yang sudah berfungsi.

## Tim

| Nama | NIM |
| --- | --- |
| Faaid Sakhaa | 24/539398/TK/59820 |
| Rafif Raihan Bahrul Alam | 24/534432/TK/59237 |
| Hendra Kurnia Maliqi | 24/542344/TK/60216 |
