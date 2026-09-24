# Referensi API yang tersedia

Alamat lokal bawaan: `http://localhost:3000`. Semua rute mengembalikan JSON kecuali logout yang berhasil. API ini memakai data demo dalam memori; daftar di bawah hanya mencakup endpoint yang sudah ada dalam kode.

## Ringkasan endpoint

| Metode | Rute | Perlu token | Fungsi |
| --- | --- | --- | --- |
| GET | `/health` | Tidak | Memeriksa server. |
| POST | `/api/auth/login` | Tidak | Membuat sesi. |
| GET | `/api/auth/me` | Ya | Membaca identitas sesi. |
| POST | `/api/auth/logout` | Ya | Mencabut sesi. |
| GET | `/api/orders/:id` | Ya | Membaca satu pesanan sesuai hak akses. |

## Memulai sesi

Kirim `POST /api/auth/login` dengan `Content-Type: application/json`:

```json
{"email":"operator@flowops.local","password":"kata-sandi-operator-anda"}
```

Contoh menggunakan curl, setelah `DEMO_OPERATOR_PASSWORD` diatur ke nilai tersebut:

```bash
curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"operator@flowops.local","password":"kata-sandi-operator-anda"}'
```

Respons `200` berisi token, waktu kedaluwarsa ISO 8601, dan identitas pengguna:

```json
{
  "token": "<token-acak>",
  "expiresAt": "<waktu-ISO-8601>",
  "user": {"id":"usr-operator","email":"operator@flowops.local","role":"operator"}
}
```

Email dinormalisasi menjadi huruf kecil sebelum pencarian. Payload login harus memuat email valid dan kata sandi yang tidak kosong. Input tidak valid menghasilkan `400`; kredensial salah menghasilkan `401`. Login dibatasi **10 permintaan per 15 menit**; permintaan berikutnya mendapat `429`.

## Memakai token

Tambahkan header `Authorization: Bearer <token>` pada rute yang dilindungi:

```bash
curl http://localhost:3000/api/auth/me -H "Authorization: Bearer <token>"
curl http://localhost:3000/api/orders/ord-001 -H "Authorization: Bearer <token>"
```

`GET /api/auth/me` mengembalikan `200` dengan `{"user":{...}}`. `GET /api/orders/ord-001` mengembalikan `200` dengan bentuk berikut:

```json
{
  "order": {
    "id": "ord-001",
    "marketplaceOrderId": "DEMO-001",
    "assigneeId": "usr-operator",
    "status": "needs_action"
  }
}
```

Owner dapat membaca `ord-001` dan `ord-002`. Operator demo dapat membaca `ord-001`, tetapi memperoleh `403` untuk `ord-002`. ID pesanan yang tidak ada menghasilkan `404`. Tanpa sesi valid, kedua rute menghasilkan `401`.

Untuk keluar:

```bash
curl -X POST http://localhost:3000/api/auth/logout -H "Authorization: Bearer <token>"
```

Respons berhasil adalah `204 No Content`. Token yang sama tidak berlaku lagi setelah logout. Sesi juga kedaluwarsa 15 menit setelah dibuat dan hilang saat server dimulai ulang.

## Respons kesalahan

Kesalahan API memakai bentuk `{"error":"pesan"}`. JSON permintaan yang rusak menghasilkan `400`; kesalahan server yang tidak tertangani menghasilkan `500`. Tidak ada endpoint daftar pesanan, pembuatan pesanan, perubahan status, impor data, atau exception pada implementasi ini; lihat [status implementasi](implementation-status.md).
