# Product Requirements Document — FlowOps

## Ringkasan produk

FlowOps adalah aplikasi web berbasis cloud untuk membantu seller online menemukan order yang bermasalah atau mendekati tenggat pemrosesan. Sistem mengubah event order dari webhook atau CSV menjadi antrean exception yang menjelaskan alasan, prioritas, penanggung jawab, dan tindakan berikutnya.

## Masalah yang diselesaikan

Data order, status pengiriman, dan komplain sering tersebar di beberapa kanal. Operator perlu memeriksa banyak order normal untuk menemukan order yang perlu ditangani segera. Akibatnya, order dapat terlambat diproses, ditangani ganda, atau tidak memiliki riwayat tindakan yang jelas.

## Target pengguna

| Pengguna | Kebutuhan utama |
| --- | --- |
| Owner | Memantau seluruh exception, membagi tugas, dan mengevaluasi penanganan order. |
| Operator | Melihat exception yang ditugaskan kepadanya, mengambil tindakan, dan mencatat hasilnya. |

## Tujuan MVP

1. Menerima data order melalui impor CSV dan webhook simulator.
2. Menampilkan order yang membutuhkan tindakan berdasarkan aturan yang dapat dijelaskan.
3. Memprioritaskan exception berdasarkan waktu tersisa, dampak, dan status order.
4. Mendukung penugasan operator dan riwayat tindakan.
5. Membantu membaca teks komplain atau retur melalui ringkasan AI yang dapat dikoreksi operator.

## Ruang lingkup MVP

| Area | Kebutuhan |
| --- | --- |
| Akses | Login untuk role `owner` dan `operator`. Owner melihat seluruh data toko; operator hanya mengakses order yang ditugaskan kepadanya. |
| Ingestion | Validasi dan simpan event dari webhook simulator atau CSV; event duplikat tidak membuat order ganda. |
| Exception | Deteksi lima kondisi awal: belum RTS, belum diserahkan ke pengiriman, pembatalan tertunda, label belum tersedia mendekati handoff, dan komplain/retur belum ditindaklanjuti. |
| Antrean | Filter prioritas, status, assignee, dan tenggat; setiap item menampilkan alasan pemicu serta tindakan berikutnya. |
| Detail order | Data order, sumber event, exception aktif, assignee, status penanganan, dan timeline audit. |
| AI triage | Kategori, ringkasan, urgensi, saran tindakan, dan confidence untuk teks komplain/retur. Operator dapat mengoreksi hasilnya. |

## Di luar ruang lingkup MVP

- Integrasi produksi ke seluruh marketplace.
- Pembatalan, refund, atau perubahan status marketplace secara otomatis oleh AI.
- Manajemen stok, akuntansi, dan ERP lengkap.

## Aturan produk penting

- Status kritis dan tenggat dihitung dengan aturan deterministik, bukan diputuskan AI.
- Output AI bersifat rekomendasi dan selalu dapat diperiksa atau dikoreksi operator.
- Setiap perubahan status, penugasan, dan koreksi dicatat sebagai audit trail.
- Nilai batas 120 menit pada demo merupakan asumsi rancangan, bukan klaim SLA resmi marketplace.

## Ukuran keberhasilan awal

- Data order valid dapat diimpor atau diterima tanpa duplikasi.
- Lima exception MVP dapat dideteksi dari data contoh.
- Operator dapat menyelesaikan alur login, melihat tugasnya, lalu mencatat tindakan pada sebuah exception.
- Owner dapat meninjau status dan riwayat penanganan exception.

