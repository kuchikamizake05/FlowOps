# Spesifikasi Proyek FlowOps

> **Status:** target MVP. Dokumen ini menyelaraskan rancangan awal dengan PRD dan struktur repo. Fitur yang direncanakan belum tentu tersedia; lihat [status implementasi](implementation-status.md).

## Ringkasan

FlowOps membantu owner dan operator toko daring menemukan pesanan yang memerlukan tindakan sebelum tenggat terlewat. Data dari webhook simulator atau CSV dinormalisasi, diperiksa oleh aturan yang dapat dijelaskan, lalu ditampilkan sebagai antrean exception. AI membantu memahami teks komplain atau retur, sedangkan keputusan operasional tetap pada pengguna.

Pertanyaan produk: **pesanan mana yang perlu ditangani, mengapa diprioritaskan, dan apa tindakan berikutnya?**

## Pengguna dan masalah

Pesanan, status pengiriman, dan pesan pelanggan dapat tersebar di beberapa kanal. Operator perlu memilah pesanan normal untuk menemukan masalah mendesak. Owner membutuhkan pandangan seluruh pekerjaan, pembagian tugas, dan riwayat penanganan; operator membutuhkan daftar tugasnya, alasan prioritas, dan tempat mencatat tindakan. Kebutuhan ini masih perlu divalidasi lewat uji prototipe.

## Batas implementasi saat ini

Repo sudah memiliki API Node.js, TypeScript, dan Express 5: health check, login, identitas sesi, logout, serta baca detail satu pesanan. Dua akun dan dua pesanan demo disimpan dalam memori. Owner dapat membaca kedua pesanan; operator hanya pesanan yang ditugaskan. Sesi berlaku 15 menit. Skema PostgreSQL awal tersedia di backend/database/schema.sql, tetapi belum dipakai oleh API.

Frontend, CSV/webhook, rules engine, antrean exception, alur penugasan dan audit, AI, notifikasi, serta deployment cloud belum tersedia. [Referensi API](api.md) dan [status implementasi](implementation-status.md) menjadi rujukan kemampuan yang dapat dijalankan.

## Cakupan MVP

1. **Akses:** owner melihat data tokonya dan operator hanya pesanan yang ditugaskan; setiap endpoint memeriksa identitas serta hak akses.
2. **Ingestion:** CSV dan webhook simulator divalidasi dan dinormalisasi. Event yang dikirim ulang tidak membuat pekerjaan ganda.
3. **Deteksi:** lima aturan di bawah menghasilkan exception beserta alasan, tenggat relevan, dan saran tindakan tanpa bergantung pada AI.
4. **Antrean dan detail:** daftar dapat diurutkan menurut prioritas dan tenggat serta difilter menurut status dan penanggung jawab. Detail memuat order, sumber event, exception, dan riwayat.
5. **Alur operator:** owner menugaskan pekerjaan; operator mengambil, mencatat, dan menyelesaikannya. Penugasan dan perubahan status masuk audit trail.
6. **AI triage:** teks komplain/retur diringkas menjadi kategori, urgensi, ringkasan, saran, dan confidence. Operator dapat mengoreksi hasilnya, dan alur manual tetap tersedia ketika AI gagal.

Notifikasi prioritas tinggi dan ringkasan harian dapat ditambahkan setelah alur inti berjalan. Integrasi marketplace produksi, manajemen stok penuh, akuntansi, billing, dan tindakan otomatis seperti refund berada di luar MVP.

## Lima aturan exception

Kode berikut adalah identitas rancangan, belum kode yang diimplementasikan. Deadline berasal dari data sumber atau konfigurasi demo. Ambang 120 menit, bila dipakai dalam demo, bukan SLA resmi marketplace.

| Kode | Pemicu | Bukti yang ditampilkan |
| --- | --- | --- |
| EX-01 — belum ready to ship | Pesanan belum ready to ship saat deadline mendekat. | Status, deadline RTS, waktu tersisa, sumber deadline. |
| EX-02 — belum diserahkan | Pesanan sudah siap tetapi belum diserahkan saat deadline handoff mendekat. | Status RTS, deadline handoff, waktu tersisa. |
| EX-03 — pembatalan tertunda | Permintaan pembatalan belum diputuskan mendekati batas respons. | Waktu permintaan, deadline respons, status. |
| EX-04 — label belum tersedia | Label atau resi belum tersedia mendekati handoff. | Status label, deadline handoff, waktu tersisa. |
| EX-05 — komplain/retur tertunda | Komplain atau retur belum ditindaklanjuti dalam batas operasional. | Waktu masuk, status, batas internal. |

Satu order dapat memiliki beberapa exception. Replay atau evaluasi ulang harus memperbarui exception relevan tanpa membuat duplikat aktif. Prioritas mempertimbangkan waktu tersisa, dampak, dan status; alasan perhitungannya perlu disimpan agar dapat diuji.

## Alur data dan model

1. CSV atau webhook simulator membawa identitas sumber, ID event dari sumber, tipe, waktu kejadian, dan referensi order.
2. Ingestion memvalidasi, memeriksa duplikasi, lalu menormalisasi order dan deadline yang diperlukan.
3. Event dan order disimpan; aturan membuat atau memperbarui exception.
4. Teks komplain/retur dapat dikirim ke AI untuk saran terstruktur yang divalidasi.
5. Owner dan operator bekerja pada antrean sesuai hak akses; setiap tindakan tercatat.

Format payload dan endpoint ingestion belum ditetapkan sebagai kontrak API final. Skema awal baru memuat users, orders, order_events, exceptions, dan action_logs. Skema belum mencakup toko/organisasi, data komplain dan hasil AI, atau notifikasi. Penyimpanan permanen, migrasi, dan isolasi data antartoko harus disiapkan sebelum data nyata dipakai.

Status exception pada skema awal adalah open, in_progress, dan resolved. Gunakan istilah ini secara konsisten saat API dibuat. Tindakan mengambil tugas dan menulis catatan masuk ke action_logs.

## AI dan batas keputusan

Output target memuat category, urgency, summary, suggested_action, dan confidence. Kategori dan ambang confidence final ditentukan dari data uji berlabel. Operator dapat mengoreksi hasil dan koreksinya disimpan untuk evaluasi.

AI tidak menetapkan SLA, mengubah status pesanan, membatalkan order, atau menyetujui refund. Output harus divalidasi; secret dan token integrasi tidak dikirim ke model; data pelanggan diminimalkan. Jika AI gagal, teks asli tetap tersedia untuk penanganan manual.

## Teknologi dan urutan pengembangan

| Area | Kondisi repo | Arah pengembangan |
| --- | --- | --- |
| Backend | Express 5 dan TypeScript; data demo dalam memori. | Pertahankan kontrak API, lalu tambah penyimpanan dan endpoint MVP. |
| Database | Skema PostgreSQL awal, belum terhubung. | Migrasi, transaksi, idempotensi, dan isolasi toko. |
| Frontend | Direktori frontend baru berisi panduan. | Web responsif mengacu pada [rancangan Stitch](stitch-design.md). |
| Ingestion, aturan, AI | Belum ada. | Bangun setelah model data dan kontrak event jelas. |
| Cloud dan notifikasi | Belum ada. | Pilih layanan setelah alur lokal teruji. |

Rancangan awal pernah menyebut Azure Functions, Service Bus, Azure OpenAI, dan Telegram. Ini opsi arsitektur, bukan teknologi yang sudah dipakai atau keputusan deployment final. Pilihan cloud perlu mempertimbangkan backend Express yang telah ada, biaya, serta kebutuhan demo jaringan, cloud, dan AI.

Urutan kerja: model data dan akses; ingestion dan idempotensi; aturan dan prioritas; API dan UI antrean serta audit; AI triage dan evaluasi; notifikasi serta deployment; pengujian alur penuh.

## Kriteria penerimaan

| Area | Bukti selesai |
| --- | --- |
| Ingestion | CSV dan webhook menerima data valid, menolak input cacat, dan replay tidak menggandakan order atau exception. |
| Rules | Setiap EX-01 sampai EX-05 lulus contoh positif dan negatif; alasan serta deadline terlihat. |
| Akses | Owner dan operator hanya dapat membaca atau mengubah data sesuai peran, penugasan, dan toko. |
| Alur operator | Penugasan, catatan, perubahan status, dan koreksi AI dapat ditelusuri ke aktor serta waktu. |
| AI | Output tervalidasi, koreksi tersedia, dan alur manual tetap berjalan saat AI gagal. |
| Demo | Data masuk hingga tindakan tercatat dapat diperagakan; hasil uji dan keterbatasan dilaporkan apa adanya. |

Target angka reliabilitas, latensi, dan akurasi AI baru ditetapkan setelah skenario serta dataset evaluasi tersedia. Kriteria di atas belum dinyatakan lulus.

## Risiko dan keputusan terbuka

- Tetapkan format CSV/webhook dan perilaku untuk event yang datang tidak berurutan.
- Tetapkan sumber deadline, zona waktu, ambang tiap aturan, dan perilaku bila deadline tidak ada.
- Tambahkan model toko dan uji akses lintas toko sebelum menggunakan data nyata.
- Pilih layanan cloud yang cocok dengan Express dan kebutuhan tugas, lalu dokumentasikan biaya.
- Siapkan dataset teks berlabel dan ukuran kualitas AI sebelum menetapkan target akurasi.

## Rujukan internal

- [PRD](prd.md) — kebutuhan dan cakupan produk.
- [Arsitektur](architecture.md) — kode saat ini dan komponen target.
- [Status implementasi](implementation-status.md) — kemampuan yang benar-benar tersedia.
- [Referensi API](api.md) — endpoint yang berjalan.
- [Latar belakang](project-background.md) — konteks dan sumber riset awal.
