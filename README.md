# Car Web API — Contoh Prototype (Turborepo)

Contoh nyata (prototype yang bisa dijalankan) dari proyek **Car Web API**
untuk klien Projects.co.id (AntekAsing): API spesifikasi mobil + developer
portal, seperti dashboard.api.co.id tapi khusus mobil — **bukan** public
website katalog seperti auto-data.net.

Scope yang disepakati dengan klien (Rp7.000.000, 40 hari): pengumpulan +
kurasi data spek mobil, database, REST API (API key, rate limiting, tier
penggunaan), dokumentasi API, dan developer portal (daftar, API key,
statistik pemakaian, paket, checkout/top-up via Midtrans).

> Prototype ini dibuat untuk DIDEMOKAN ke klien. Bagian yang masih demo
> terdaftar jelas di bawah ("Yang masih demo").

## Arsitektur (Turborepo)

```
car-api-example/
├── apps/
│   ├── api/            Hono + TypeScript (REST API, port 3001)
│   │   └── src/
│   │       ├── index.ts    semua endpoint + middleware auth/rate-limit
│   │       ├── data.ts     seed 10 mobil Indonesia (DATA CONTOH)
│   │       ├── store.ts    API key, tier, pemakaian (in-memory)
│   │       ├── openapi.ts  spesifikasi OpenAPI 3.0
│   │       └── docs.ts     halaman dokumentasi HTML (/v1/docs)
│   └── portal/         Astro (developer portal, port 4321)
│       └── src/pages/
│           ├── index.astro      landing + contoh response API live
│           ├── docs.astro       dokumentasi endpoint
│           ├── dashboard.astro  daftar → API key → statistik → paket + top-up
│           └── playground.astro coba API dari browser
├── packages/
│   └── shared/         tipe + katalog parameter + taksonomi powertrain
│                       (dipakai API dan portal — satu sumber kebenaran)
├── package.json        scripts root (pnpm dev / pnpm build)
├── turbo.json          pipeline Turborepo
└── pnpm-workspace.yaml
```

**Tech stack:** Turborepo + pnpm workspaces · API: Hono + TypeScript (Node)
· Portal: Astro · Database produksi: PostgreSQL (lihat "Yang masih demo").

**Desain data** (sesuai yang dijelaskan ke klien): tiap mobil punya penanda
jenis penggerak dengan taksonomi ICE, MHEV, FHEV, PHEV, REEV, BEV, FCEV,
PFCEV. Parameter disimpan dalam katalog fleksibel — tiap parameter ditandai
berlaku untuk jenis penggerak yang mana (`packages/shared/src/index.ts`).
API mengembalikan satu format spek yang sama; field yang tidak berlaku
dikosongkan (`null`). Cakupan awal: mobil yang beredar di Indonesia.

## Cara menjalankan

```bash
# Prasyarat: Node 18+ dan pnpm (di VM ini: Node v24, pnpm 12.21.0)
pnpm install
pnpm dev        # API di http://localhost:3001, portal di http://localhost:4321
pnpm build      # build semua workspace (portal: astro build)
```

Server dev tetap berjalan setelah verifikasi (API :3001, portal :4321).

**Variabel env (opsional):**

| Variabel | Default | Keterangan |
|---|---|---|
| `PORT` | `3001` | Port API |
| `CARAPI_PUBLIC_URL` | `http://localhost:PORT` | URL publik API (dipakai di halaman docs) |
| `CARAPI_FREE_DAILY_LIMIT` | `100` | Kuota harian tier Free (bisa dikecilkan untuk uji rate limit) |
| `CARAPI_PRO_DAILY_LIMIT` | `10000` | Kuota harian tier Pro |
| `PUBLIC_API_URL` | `http://localhost:3001` | URL API yang dipakai portal (Astro) |

## Endpoint API

Semua endpoint `/v1/*` (kecuali register, docs, openapi.json) butuh header
`x-api-key`. Tanpa key / key salah → `401`. Kuota harian habis → `429`
dengan header `X-RateLimit-Limit`, `X-RateLimit-Remaining`,
`X-RateLimit-Reset`.

| Method | Path | Keterangan |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/v1/specs` | Daftar spek. Filter: `?brand=`, `?powertrain=`, `?year=`, `?search=` |
| `GET` | `/v1/specs/:id` | Satu spek berdasarkan id |
| `GET` | `/v1/brands` | Daftar merek + jumlah model |
| `GET` | `/v1/parameters` | Katalog parameter + powertrain yang berlaku |
| `POST` | `/v1/auth/register` | Daftar (`{"name","email"}`) → API key baru, tier Free |
| `GET` | `/v1/usage` | Statistik pemakaian API key (hit hari ini, sisa kuota, total) |
| `GET` | `/v1/docs` | Dokumentasi API (HTML) |
| `GET` | `/openapi.json` | Spesifikasi OpenAPI 3.0 |

**Key demo** (tier Free, untuk mencoba tanpa daftar):
`carapi_demo_9f2e7a1b4c5d6e7f`

**Tier & kuota (angka contoh):** Free — 100 request/hari, Rp0. Pro —
10.000 request/hari, Rp99.000/bulan (contoh). Catatan: request ke
`/v1/usage` juga dihitung dalam kuota (perilaku standar seperti api.co.id).

### Contoh curl

```bash
# Daftar dan dapatkan API key
curl -X POST http://localhost:3001/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Budi Santoso","email":"budi@contoh.id"}'

# Daftar spek mobil listrik
curl "http://localhost:3001/v1/specs?powertrain=BEV" \
  -H "x-api-key: carapi_demo_9f2e7a1b4c5d6e7f"

# Satu mobil
curl http://localhost:3001/v1/specs/byd-atto-3-superior-2024 \
  -H "x-api-key: carapi_demo_9f2e7a1b4c5d6e7f"

# Statistik pemakaian
curl http://localhost:3001/v1/usage \
  -H "x-api-key: <API_KEY_ANDA>"
```

## Pemetaan ke scope yang dijanjikan ke klien

| Scope (Rp7jt) | Status di prototype ini |
|---|---|
| Pengumpulan + kurasi data spek | Seed 10 mobil Indonesia di `apps/api/src/data.ts` — **DATA CONTOH**, tiap nilai harus diverifikasi dari situs resmi pabrikan sebelum tayang (lihat bawah) |
| Database | In-memory (Map) di contoh; skema siap dipindah ke PostgreSQL |
| REST API (API key, rate limiting, tier) | ✅ Jalan: register, `x-api-key`, rate limit/hari per tier, header `X-RateLimit-*` |
| Dokumentasi API | ✅ Jalan: `/v1/docs` (HTML) + `/openapi.json` |
| Developer portal (daftar, API key, statistik, paket, checkout) | ✅ Jalan: Astro — daftar, tampilkan key, statistik pemakaian, paket Free/Pro; checkout Midtrans masih placeholder demo |
| Checkout/top-up Midtrans | ⚠️ Placeholder demo (tombol membuka penjelasan, bukan pembayaran sungguhan) |
| Public website katalog (auto-data.net) | ❌ Sengaja TIDAK termasuk — sesuai kesepakatan dengan klien |

## Data contoh — baca sebelum demo ke klien

Seed berisi 10 mobil: Toyota Avanza 1.5 G, Honda Brio RS, Daihatsu Sigra
1.2 R, Mitsubishi Xpander Ultimate, Suzuki Ertiga GX, Hyundai Creta Prime,
Wuling Air ev Long Range, BYD Atto 3 Superior, Toyota Kijang Innova Zenix
2.0 Q HV, Honda CR-V 2.0 RS e:HEV (semua tahun model 2024).

Nilai ditulis dari pengetahuan umum tentang spesifikasi pabrikan. **Field
yang tidak kami yakini nilainya sengaja dikosongkan (`null`), bukan
ditebak.** Harga adalah perkiraan OTR Jakarta (contoh). Pesan ini juga
muncul di setiap respons API (`meta.disclaimer`), di halaman docs, dan di
footer portal. Sesuai janji kurasi ke klien, sebelum tayang setiap nilai
harus diverifikasi ulang dari situs resmi pabrikan dan dicatat sumber +
waktu verifikasinya.

## Yang masih demo / harus dibangun untuk produksi

1. **PostgreSQL** — ganti `apps/api/src/store.ts` (in-memory) dengan tabel
   `api_keys` + `api_usage`; ganti `apps/api/src/data.ts` (seed) dengan
   tabel `cars` + `car_specs` + `parameter_catalog`.
2. **Pipeline scraping terjadwal** — ambil spek dari situs resmi pabrikan
   → simpan mentah → tahap review kurasi → baru tayang. (Sesuai janji ke
   klien: tiap nilai dicatat sumber + waktu verifikasi.)
3. **Auth sungguhan** — password/login, hash API key di database, kirim
   key lewat email, rotasi/revoke key, lupa key.
4. **Midtrans sungguhan** — akun + API key Midtrans dari pemilik produk,
   Snap/checkout, webhook notifikasi pembayaran → upgrade tier otomatis.
5. **RapidAPI** — listing API di RapidAPI (monetisasi USD) — di luar
   scope Rp7jt, dibahas terpisah bila klien mau.
6. **Deployment** — VPS/server + domain + HTTPS + backup database.
   (Contoh ini hanya jalan lokal.)

## Hasil verifikasi (18 Nov 2026, di VM ini)

- `pnpm install` ✅ (Node v24.22.1, pnpm 12.21.0; perlu `pnpm approve-builds esbuild sharp` karena pnpm 12 memblokir build script secara default)
- `pnpm --filter @car-api/api typecheck` ✅ (tanpa error)
- `pnpm dev` ✅ — API :3001 + portal :4321 jalan bersamaan
- `GET /v1/specs` tanpa key → **401** ✅
- `POST /v1/auth/register` → key baru `carapi_…`, tier free, limit 100/hari ✅
- `GET /v1/specs?powertrain=BEV` dengan key → **200**, 2 mobil (Wuling Air ev, BYD Atto 3) ✅
- `GET /v1/specs?search=innova&year=2024` → Kijang Innova Zenix ✅
- `GET /v1/specs/byd-atto-3-superior-2024` → **200** ✅
- Key salah → **401**; powertrain salah → **400**; id tidak ada → **404** ✅
- `GET /v1/brands` → 8 merek ✅ · `GET /v1/parameters` → 36 parameter, 5 grup ✅
- `GET /v1/usage` → `usedToday` bertambah tiap hit, `remainingToday` berkurang ✅
- **Rate limit terbukti**: instance uji `PORT=3002 CARAPI_FREE_DAILY_LIMIT=5` → 5× `200`, lalu `429` + pesan kuota habis ✅
- `GET /v1/docs` (HTML) ✅ · `GET /openapi.json` (8 path) ✅
- `pnpm --filter @car-api/portal build` ✅ — 4 halaman, 2,49 detik
- Portal: `/`, `/docs`, `/dashboard`, `/playground` semua **HTTP 200** ✅
