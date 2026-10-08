# Frontend FlowOps

Aplikasi web FlowOps: Next.js 16 (App Router), React 19, TypeScript, dan Tailwind CSS 4. Tampilan mengikuti
rancangan Stitch ([catatan desain](../docs/stitch-design.md)); token warna, tipografi, dan jarak ada di
`src/app/globals.css`.

## Prasyarat

- Node.js 22 atau lebih baru.
- Backend FlowOps berjalan (lihat [README akar](../README.md)). Frontend tidak memegang data sendiri: semua
  panggilan ke backend dilakukan dari server Next.js.
- Untuk akun nyata dan data antrean, backend memakai PostgreSQL (`DATABASE_URL`, lihat
  [skema database](../backend/database/README.md)). Tanpa database, backend memakai akun demo dalam memori.

## Menjalankan

```bash
# terminal 1, dari akar repo: backend di http://localhost:3000
npm install
npm run dev

# terminal 2, dari frontend/: aplikasi di http://localhost:3001
npm install
cp .env.example .env.local    # opsional; nilai bawaannya sama
npm run dev
```

Buka `http://localhost:3001` dan masuk dengan `owner@flowops.local` atau `operator@flowops.local`. Kata sandi
bawaan data seed database adalah `change-this-owner-password` dan `change-this-operator-password`; pada mode
memori (tanpa `DATABASE_URL`) kata sandi mengikuti `DEMO_OWNER_PASSWORD` dan `DEMO_OPERATOR_PASSWORD` backend.

## Konfigurasi

| Variabel | Bawaan | Fungsi |
| --- | --- | --- |
| `FLOWOPS_API_BASE_URL` | `http://localhost:3000` | Alamat backend. Hanya dibaca di server; browser tidak pernah memanggil backend langsung. |

Berkas `.env.local` tidak ikut commit. Jangan menaruh kunci Stitch atau rahasia lain di repo.

## Skrip

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Server pengembangan di port 3001. |
| `npm run build` | Build produksi. |
| `npm start` | Menjalankan hasil build. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | Pemeriksaan tipe tanpa menghasilkan berkas. |
| `npm run check` | `typecheck`, `lint`, lalu `build`. |

## Cara kerja sesi

Formulir masuk memanggil Server Action `login()` yang meneruskan ke `POST /api/auth/login`. Token disimpan pada
cookie `httpOnly` (`flowops_session`) sehingga tidak terbaca JavaScript di browser, dan backend tidak memerlukan
CORS. Identitas diambil dari `GET /api/auth/me` (`src/lib/session.ts`), bukan dari isi cookie. Keluar memanggil
`POST /api/auth/logout` lalu menghapus cookie.

- `src/proxy.ts` hanya memeriksa ada tidaknya cookie dan mengalihkan ke `/login`.
- `requireSessionUser()` di layout dan halaman yang memutuskan sesi sah atau tidak. Backend yang tidak dapat
  dihubungi ditampilkan sebagai keadaan gagal, bukan dialihkan ke `/login`.
- Menu mengikuti peran (Impor CSV hanya untuk owner), tetapi akses sebenarnya tetap ditegakkan backend.

## Struktur

| Lokasi | Isi |
| --- | --- |
| `src/app/login`, `src/app/(app)/*` | Halaman. Grup `(app)` memakai kerangka bersama (sidebar dan header) dan mewajibkan login. |
| `src/components/` | Komponen UI: `app-shell`, `login-form`, `states` (kosong, gagal, akses ditolak, tidak ditemukan, kerangka memuat), `dashboard/`. |
| `src/lib/backend.ts` | Satu-satunya pintu ke backend; mengembalikan hasil bertipe dan menangani jaringan gagal, 204, dan galat non-JSON. |
| `src/lib/actions/auth.ts` | Server Action `login` dan `logout`. |
| `src/lib/demo/` | Data contoh untuk layar yang endpoint-nya belum dipakai. Selalu diberi label "Data demo". |

## Status

Login, keluar, penjaga halaman, kerangka dashboard dan antrean beserta keadaan memuat, kosong, gagal, dan akses
ditolak sudah tersedia. Dashboard dan antrean masih berisi data demo; antrean nyata (filter, detail, timeline)
dikerjakan di FO-13 dengan kontrak di [docs/api.md](../docs/api.md). Di halaman antrean, tautan "Pratinjau keadaan"
hanya untuk memeriksa tampilan dan akan diganti status nyata dari API.
