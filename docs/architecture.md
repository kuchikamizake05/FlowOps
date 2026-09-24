# Arsitektur FlowOps

> **Status dokumen:** bagian "Implementasi saat ini" menjelaskan kode yang tersedia. Bagian lain di bawahnya adalah rancangan target MVP dan belum seluruhnya diimplementasikan.

## Implementasi saat ini

```mermaid
flowchart LR
  Klien --> Express[Express API]
  Express --> Users[UserRepository dalam memori]
  Express --> Sessions[SessionStore dalam memori]
  Express --> Orders[OrderRepository dalam memori]
```

- `backend/src/server.ts` membuat dua pengguna demo, dua pesanan demo, penyimpanan sesi, lalu menjalankan server pada `PORT` (bawaan 3000).
- `backend/src/app.ts` menyediakan health check, login, identitas pengguna, logout, dan detail satu pesanan. Input login diperiksa dengan Zod; kata sandi diverifikasi memakai Argon2. Helmet memasang header keamanan dan login dibatasi 10 permintaan per 15 menit.
- Token sesi acak dikirim sebagai Bearer token. Sesi berlaku 15 menit, dapat dicabut saat logout, dan hilang ketika proses server berhenti.
- Owner dapat membaca kedua pesanan demo. Operator hanya dapat membaca pesanan yang `assigneeId`-nya sama dengan ID pengguna tersebut. Belum ada isolasi data antartoko atau penyimpanan permanen.
- Skema PostgreSQL awal ada di `backend/database/`, tetapi API belum terhubung ke database. Belum ada frontend, ingestion, rules engine, AI, audit trail, atau notifikasi di kode aplikasi saat ini.

## Rancangan target MVP

## Gambaran umum

Arsitektur FlowOps memisahkan penerimaan data, aturan exception, akses pengguna, dan rekomendasi AI. Pemisahan ini membuat tenggat serta prioritas dapat diuji dan dijelaskan tanpa bergantung pada output AI.

Implementasi API menggunakan Node.js, Express, dan TypeScript dengan mode `strict`. Kode sumber berada di `backend/src/`, lalu dikompilasi menjadi JavaScript ESM di `backend/dist/` sebelum dijalankan di produksi.

```mermaid
flowchart LR
  U[Owner / Operator] --> W[Web application]
  W --> A[API aplikasi]
  CSV[Impor CSV] --> I[Ingestion dan normalisasi]
  WH[Webhook simulator] --> I
  I --> A
  A --> DB[(Database)]
  A --> R[Rules engine]
  R --> DB
  A --> T[AI text triage]
  T --> A
  A --> N[Notifikasi]
```

## Komponen

| Komponen | Tanggung jawab |
| --- | --- |
| Web application | Halaman login, antrean exception, detail order, impor CSV, dan pengaturan. |
| API aplikasi | Autentikasi, otorisasi, validasi input, endpoint order/exception, serta pencatatan audit. |
| Ingestion dan normalisasi | Menerima CSV atau webhook simulator, memeriksa data, mencegah duplikasi event, lalu mengubahnya menjadi model order internal. |
| Database | Menyimpan pengguna, order, event, exception, penugasan, tindakan, dan audit trail. |
| Rules engine | Menjalankan aturan EX-01 sampai EX-05, menghitung urgensi, serta menyimpan alasan rule yang terpicu. |
| AI text triage | Mengubah teks komplain atau retur menjadi ringkasan dan saran terstruktur; hasilnya tidak boleh mengubah status kritis otomatis. |
| Notifikasi | Memberi pemberitahuan untuk exception prioritas tinggi kepada pihak yang relevan. |

## Alur data

1. Owner atau sistem mengirim data order dari CSV atau webhook simulator.
2. Ingestion memvalidasi payload, memeriksa event duplikat, dan menormalisasi data ke format internal.
3. Data order dan event disimpan ke database.
4. Rules engine mengevaluasi data dan membuat atau memperbarui exception beserta alasan prioritasnya.
5. Bila terdapat teks komplain/retur, AI triage membuat rekomendasi terstruktur yang dapat dikoreksi operator.
6. Operator menangani exception yang ditugaskan kepadanya; perubahan status dan tindakan masuk ke audit trail.
7. Owner memantau seluruh antrean, penugasan, dan riwayat tindakan.

## Batas akses

| Aksi | Owner | Operator |
| --- | --- | --- |
| Melihat seluruh order dan exception | Ya | Tidak |
| Melihat order yang ditugaskan | Ya | Ya |
| Menugaskan operator | Ya | Tidak |
| Mengubah status penanganan tugas sendiri | Ya | Ya |
| Meninjau audit trail | Ya | Terbatas pada order yang dapat diakses |

## Prinsip implementasi

- Semua endpoint memeriksa identitas pengguna dan role sebelum membaca atau mengubah data.
- Setiap sumber event memiliki kunci idempotensi agar pengiriman ulang tidak membuat data ganda.
- Rules engine bersifat deterministik; input dan hasilnya dapat diuji dari data contoh.
- AI menerima data minimum yang diperlukan dan keluarannya divalidasi sebelum ditampilkan.
