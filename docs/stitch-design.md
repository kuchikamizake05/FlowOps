# Desain antarmuka di Stitch

[Buka proyek FlowOps di Google Stitch](https://stitch.withgoogle.com/projects/14921766067638530754)

Proyek Stitch **FlowOps Indonesian Operations System** menjadi acuan visual untuk antarmuka yang direncanakan. Koneksi MCP Stitch tersedia pada konfigurasi lokal pengembang; repo ini hanya menyimpan tautan dan catatan implementasi. Kunci API tidak boleh dimasukkan ke README, kode, atau konfigurasi yang dikomit.

## Layar yang tersedia

| Rancangan Stitch | Padanan dalam produk FlowOps | Status repo |
| --- | --- | --- |
| Landing Page | Pengenalan produk | Belum ada frontend |
| Login | Masuk sebagai owner/operator | API login tersedia; UI belum ada |
| Dashboard | Ringkasan kondisi operasional | Belum ada frontend maupun endpoint ringkasan |
| Antrean Exception | Daftar masalah dan prioritas | Belum ada rules engine maupun endpoint antrean |
| Detail Order | Detail pesanan dan riwayat | API baca satu pesanan tersedia; UI dan riwayat belum ada |
| Impor CSV | Unggah dan validasi data | Belum ada endpoint impor |
| Pengaturan | Konfigurasi dan anggota tim | Belum ada endpoint pengaturan |
| Logo dan aset gambar | Identitas visual | Belum diintegrasikan ke aplikasi |

## Cara memakai desain dalam pengembangan

1. Buka layar di Stitch atau ambil detail layar melalui MCP Stitch.
2. Gunakan rancangan sebagai acuan komponen, hierarki informasi, teks, warna, dan responsivitas. Periksa kembali alur terhadap [PRD](prd.md) dan [status implementasi](implementation-status.md).
3. Bangun frontend sebagai kode aplikasi di repo. Hubungkan layar yang sudah siap ke endpoint yang tercatat pada [referensi API](api.md).
4. Untuk bagian yang API-nya belum tersedia, gunakan data contoh yang diberi label jelas sebagai demo. Tambahkan integrasi nyata ketika endpoint tersebut selesai.
5. Jika desain Stitch berubah, tinjau perbedaannya dan perbarui komponen terkait secara sadar. Koneksi MCP tidak menyinkronkan kode repo secara otomatis.

Stitch menyediakan rancangan dan kode frontend yang dapat diekspor, tetapi kode hasil ekspor tetap perlu disesuaikan dengan struktur aplikasi, aksesibilitas, dan kontrak API FlowOps. Lihat [penjelasan Google tentang ekspor kode Stitch](https://developers.googleblog.com/stitch-a-new-way-to-design-uis/).

## Struktur repo yang disarankan saat frontend dimulai

```text
FlowOps/
├── frontend/          # Aplikasi web dan komponen dari rancangan Stitch
├── backend/
│   ├── src/           # API Express
│   └── test/          # Pengujian API
├── docs/              # Spesifikasi, panduan, dan tautan desain
└── package.json       # Skrip akar untuk workspace backend
```

Struktur ini sudah disiapkan di repo. `frontend/` saat ini baru berisi panduan awal; tambahkan aplikasi dan skripnya ketika implementasi UI dimulai.
