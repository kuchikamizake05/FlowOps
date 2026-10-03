# CSV and webhook input

FO-11 tahap awal menyediakan validasi dan normalisasi yang dapat dijalankan tanpa database. Endpoint ini menghasilkan preview dengan `persisted: false`; belum menyimpan order, menjalankan rules engine, atau menghitung event duplikat. Format ini menjadi usulan untuk FO-22 dan adapter penyimpanan FO-10.

## Endpoint preview

Keduanya memerlukan Bearer token owner. Tanpa token: `401`; operator: `403`. Respons berhasil: `200`. Payload tidak valid: `400`; melebihi batas: `413`; tipe media salah: `415`.

| Endpoint | Content-Type | Batas |
| --- | --- | --- |
| `POST /api/ingestion/csv/preview` | `text/csv` | 256 KiB, maksimum 1000 baris data |
| `POST /api/ingestion/webhook/preview` | `application/json` | 32 KiB, satu event |

Webhook ini adalah preview simulator yang memakai sesi owner, belum integrasi marketplace atau endpoint webhook produksi.

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

## Integrasi berikutnya

Normalisasi menambahkan `source: csv | webhook` dan mempertahankan urutan event serta ID sumber. Event yang dikirim ulang tetap muncul di preview; belum ada klaim idempotensi. FO-10 harus menyimpan event secara transaksional dengan kunci unik sesuai toko dan sumber, serta memakai `occurredAt` untuk mencegah event lama menimpa snapshot terbaru. Payload belum menerima ID toko dari pengguna; konteks toko harus berasal dari identitas sesi setelah model toko tersedia. Deadline tambahan untuk tiap rule dan pemetaan status marketplace perlu disepakati sebelum ingestion final.

Tes tersedia di `backend/test/ingestion.test.ts` dan dijalankan melalui `npm test`.
