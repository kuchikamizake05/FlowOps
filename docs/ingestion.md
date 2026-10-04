# CSV and webhook input

FO-11 menyediakan validasi, normalisasi, dan penyimpanan transaksional PostgreSQL untuk demo satu toko. Preview tetap tersedia tanpa database. Kontrak di dokumen ini merupakan referensi implementasi untuk integrasi FO-22; persetujuan bersama frontend masih perlu dicatat di FO-22. Webhook memakai sesi owner sebagai simulator, belum autentikasi webhook marketplace produksi.

## Endpoint penyimpanan

Setel `DATABASE_URL`, jalankan `npm run db:migrate`, lalu mulai server. Akun dan sesi login demo masih berada dalam memori. Tanpa konfigurasi database eksplisit, endpoint penyimpanan mengembalikan `503`.

| Endpoint | Content-Type | Batas |
| --- | --- | --- |
| `POST /api/ingestion/csv` | `text/csv` | 256 KiB, 1000 record |
| `POST /api/ingestion/webhook` | `application/json` | 32 KiB, satu event |

Keduanya memerlukan Bearer token owner. Respons berhasil `200` berisi `persisted: true`, `total`, `valid`, `invalid`, `accepted`, `duplicates`, `stale`, dan `errors`. `accepted` menghitung event baru yang disimpan; `duplicates` event identik yang sudah ada; `stale` adalah bagian dari accepted yang hanya masuk riwayat. `valid = accepted + duplicates`, dan `total = valid + invalid`.

CSV dengan nilai salah per record menyimpan record valid dan mengembalikan nomor baris serta alasan record invalid. Struktur rusak membatalkan seluruh impor dengan `400`. Konflik identitas event membatalkan seluruh batch valid dengan `409`. Error ukuran `413`, media `415`, autentikasi `401`, dan peran `403` berlaku seperti preview. Error konflik tidak mengembalikan payload tersimpan.

## Penyimpanan dan urutan

- `orders.marketplace_order_id` unik; pengiriman melalui dua sumber mengacu pada pesanan yang sama.
- `(source, source_event_id)` unik. Pengiriman ulang payload normalisasi yang identik tidak membuat event, order, atau pembaruan snapshot baru. ID yang dipakai untuk payload berbeda ditolak `409`.
- Payload normalisasi lengkap, termasuk komplain, disimpan dalam `order_events.payload` (JSONB). Payload belum dianalisis AI.
- Snapshot status/deadline mengikuti `occurredAt` terbesar. Event terlambat tetap disimpan dalam riwayat tanpa mengubah snapshot atau assignee.
- Timestamp sama diurutkan berdasarkan `source:sourceEventId` dengan kolasi PostgreSQL `C`; kunci terbesar menang sehingga hasil tidak bergantung urutan kedatangan.
- Seluruh batch valid memakai satu transaksi dan advisory lock. Lock global menyederhanakan konkurensi demo satu toko; penulisan antar batch diserialkan dan belum dioptimalkan untuk throughput produksi.
- Migrasi menambahkan kolom dengan `ADD COLUMN IF NOT EXISTS` serta mengisi versi snapshot dari riwayat lama. Event lama tanpa payload menolak replay `409` karena kesamaan payload tidak bisa dibuktikan.
- Belum ada model tenant/toko; kunci unik masih global. Jangan memakai jalur ini untuk banyak toko sebelum konteks toko dari sesi dan isolasi data tersedia.
- FO-12 akan membaca event tersimpan untuk rules engine. FO-11 belum membuat exception atau pekerjaan antrean.

## Endpoint preview

Keduanya memerlukan Bearer token owner. Tanpa token: `401`; operator: `403`. Respons berhasil: `200`. Payload tidak valid: `400`; melebihi batas: `413`; tipe media salah: `415`.

| Endpoint | Content-Type | Batas |
| --- | --- | --- |
| `POST /api/ingestion/csv/preview` | `text/csv` | 256 KiB, maksimum 1000 baris data |
| `POST /api/ingestion/webhook/preview` | `application/json` | 32 KiB, satu event |

Preview mengembalikan `persisted: false` dan tidak mengubah database.

## Format event

| CSV | JSON webhook | Ketentuan |
| --- | --- | --- |
| `source_event_id` | `sourceEventId` | Wajib, 1–128 karakter setelah trim |
| `marketplace_order_id` | `marketplaceOrderId` | Wajib, 1–128 karakter setelah trim |
| `event_type` | `eventType` | `order_created`, `order_updated`, `complaint_received`, `return_requested` |
| `status` | `status` | `new`, `processing`, `ready_to_ship`, `shipped`, `completed`, `cancelled`, `cancellation_pending`, `return_pending`; huruf besar dinormalisasi ke huruf kecil |
| `occurred_at` | `occurredAt` | Wajib, ISO 8601 dengan `Z` atau offset seperti `+07:00` |
| `processing_deadline` | `processingDeadline` | Opsional; kosong/null menjadi null; format waktu sama |
| `complaint_text` | `complaintText` | Opsional, maksimal 4000 karakter setelah trim |

Waktu dikonversi ke UTC. Kolom/field asing ditolak. CSV mendukung BOM UTF-8, CRLF/LF, koma dan baris baru dalam kutip, serta kutip yang di-escape dengan `""`. Kolom wajib harus lengkap dan header tidak boleh duplikat. Baris kosong diabaikan; struktur CSV rusak membatalkan seluruh preview. Kesalahan nilai per baris dilaporkan dalam `errors`; `line` menunjuk baris fisik terakhir record, termasuk record multiline.

Contoh CSV tersedia di [template](../backend/examples/orders.csv). Kirim dari akar repo setelah login sebagai owner:

```bash
curl -X POST http://localhost:3000/api/ingestion/csv/preview \
  -H "Authorization: Bearer <token-owner>" \
  -H "Content-Type: text/csv" --data-binary @backend/examples/orders.csv
```

Respons CSV memuat `persisted`, `total`, `valid`, `invalid`, `events`, dan `errors`. `valid` berarti lolos validasi, bukan sudah diterima ke database. Respons webhook berisi `persisted` dan satu `event`. Error validasi menyertakan `fields` dengan `field` dan `message`.

Contoh payload webhook:

```json
{
  "sourceEventId": "evt-1",
  "marketplaceOrderId": "ORD-1",
  "eventType": "order_updated",
  "status": "ready_to_ship",
  "occurredAt": "2026-10-03T10:00:00+07:00",
  "processingDeadline": "2026-10-03T12:00:00+07:00"
}
```

## Pengujian

`npm test` menjalankan tes unit/API. Tes PostgreSQL dilewati jika `TEST_DATABASE_URL` tidak disetel. Untuk menjalankan semua 25 tes, buat database tes terpisah, setel `TEST_DATABASE_URL` dan `DATABASE_URL` ke URL database tes yang sama, lalu jalankan `npm test`. Tes migrasi mengisi data demo hanya ketika kedua URL cocok. Tes ingestion membuat schema acak dan menghapusnya setelah selesai. Jangan arahkan URL tes ke database produksi.

Tes mencakup CSV/webhook setara, replay konkuren, transaksi rollback, batas byte/record, error per baris, kontrol akses, event terlambat, timestamp sama, assignee, serta migrasi riwayat lama. `npm run typecheck`, `npm run build`, dan `npm audit` menjadi pemeriksaan tambahan.
