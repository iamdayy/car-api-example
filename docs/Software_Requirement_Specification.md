# Software Requirement Specification — Car Web API

| | |
|---|---|
| Proyek | Car Web API — API spesifikasi mobil + developer portal |
| Klien | AntekAsing (Projects.co.id) |
| Pelaksana | DayDev Studio |
| Versi dokumen | 1.0 — 19 November 2026 |
| Status | Draf untuk review klien |
| Repository | https://github.com/iamdayy/car-api-example |
| Anggaran & durasi | Rp7.000.000, 40 hari kerja |

Dokumen ini menjelaskan kebutuhan perangkat lunak yang disepakati untuk
Car Web API. Dokumen ini adalah acuan pengerjaan dan kriteria penerimaan;
perubahan scope setelah dokumen ini disetujui dibahas terpisah.

---

## 1. Pendahuluan

### 1.1 Tujuan

Membangun API berbayar yang menyediakan data spesifikasi mobil, lengkap
dengan developer portal tempat pengembang mendaftar, mendapatkan API key,
memantau pemakaian, dan membeli paket. Produk ini meniru pola layanan
seperti dashboard.api.co.id, tetapi khusus mobil.

### 1.2 Ruang Lingkup

Yang **termasuk** dalam scope ini:

1. Pengumpulan dan kurasi data spesifikasi mobil.
2. Database spesifikasi mobil.
3. REST API dengan API key, rate limiting, dan tier penggunaan.
4. Dokumentasi API (halaman dokumentasi + spesifikasi OpenAPI).
5. Developer portal: registrasi, API key, statistik pemakaian, paket,
   dan checkout/top-up.

Yang **tidak termasuk** dalam scope ini:

- Website katalog publik (seperti auto-data.net) — tidak dibuat.
- Integrasi RapidAPI — di luar scope ini.
- Aplikasi mobile — tidak dibuat.

### 1.3 Definisi dan Istilah

| Istilah | Arti |
|---|---|
| API | Antarmuka pemrograman aplikasi (REST, JSON) yang dipakai pengembang untuk mengambil data spek mobil. |
| API key | Kunci unik per pengembang yang wajib dikirim di setiap request API. |
| Developer portal | Website tempat pengembang mendaftar, mengelola API key, melihat statistik pemakaian, dan membeli paket. |
| Powertrain | Jenis penggerak mobil: ICE, MHEV, FHEV, PHEV, REEV, BEV, FCEV, PFCEV. |
| Parameter | Satu atribut spesifikasi (misalnya kapasitas mesin, kapasitas baterai, jarak tempuh). |
| Katalog parameter | Daftar parameter yang berlaku untuk tiap jenis penggerak. |
| Kurasi | Proses memeriksa nilai spesifikasi terhadap sumbernya (situs resmi pabrikan) sebelum diterbitkan, termasuk mencatat sumber dan waktu verifikasi per nilai. |
| Tier / paket | Tingkat langganan yang menentukan batas pemakaian harian (contoh: Free, Pro). |
| Rate limiting | Pembatasan jumlah request per API key dalam satu periode. |
| Midtrans | Payment gateway untuk checkout/top-up paket (akun dari owner). |

### 1.4 Referensi

- Repository contoh runnable: https://github.com/iamdayy/car-api-example
- Layanan pembanding (pola portal & monetisasi): dashboard.api.co.id
- Referensi taksonomi parameter: auto-data.net (referensi struktur saja;
  data mobil Indonesia diambil dari situs resmi pabrikan).

---

## 2. Gambaran Umum

### 2.1 Deskripsi Produk

Car Web API adalah layanan data spesifikasi mobil berbayar. Pengembang
mendaftar di developer portal, menerima API key, lalu memanggil endpoint
API untuk mendapatkan spesifikasi mobil (merek, model, dimensi, mesin
atau baterai, performa, harga, dan lain-lain). Pemakaian dicatat per API
key dan dibatasi sesuai paket. Data dikurasi: setiap nilai memiliki sumber
dan waktu verifikasi, dan hanya data yang sudah direview yang diterbitkan.

### 2.2 Pengguna

| Pengguna | Yang dilakukan |
|---|---|
| Developer (pengguna API) | Daftar, mendapatkan API key, memanggil API, memantau pemakaian, membeli paket. |
| Admin / Kurator | Memasukkan dan mengoreksi data mobil, mencatat sumber dan waktu verifikasi, mereview data sebelum diterbitkan. |
| Owner | Menentukan harga paket, mengelola akun Midtrans, memantau pemakaian keseluruhan. |

### 2.3 Batasan Umum

- Cakupan data awal: mobil yang beredar di Indonesia.
- Data contoh pada prototype (10 mobil) bukan data produksi; data produksi
  dikurasi dari situs resmi pabrikan sebelum tayang.
- Akun Midtrans disediakan oleh owner.
- Bahasa antarmuka portal dan dokumentasi: Bahasa Indonesia (istilah
  teknis API tetap dalam Bahasa Inggris).

---

## 3. Kebutuhan Fungsional

### 3.1 API Publik

| ID | Kebutuhan |
|---|---|
| FR-01 | API menyediakan daftar spesifikasi mobil dengan filter merek (`brand`), jenis penggerak (`powertrain`), tahun (`year`), dan pencarian teks (`search`). |
| FR-02 | API menyediakan detail satu spesifikasi mobil berdasarkan ID. |
| FR-03 | API menyediakan daftar merek beserta jumlah model per merek. |
| FR-04 | API menyediakan katalog parameter beserta jenis penggerak yang berlaku untuk tiap parameter. |
| FR-05 | Semua endpoint spek mengembalikan satu format respons yang sama; field yang tidak berlaku untuk jenis penggerak mobil tersebut dikembalikan sebagai `null` (bukan dihilangkan, bukan ditebak). |
| FR-06 | API mengembalikan error yang konsisten: `401` bila API key tidak ada atau salah, `400` bila parameter filter tidak valid, `404` bila data tidak ditemukan, `429` bila kuota harian habis. |

### 3.2 Autentikasi dan Kuota

| ID | Kebutuhan |
|---|---|
| FR-07 | Setiap request API wajib membawa API key melalui header `x-api-key`. |
| FR-08 | API key terikat pada satu tier/paket yang menentukan batas request harian (contoh: Free 100 request/hari, Pro 10.000 request/hari; angka final ditentukan owner di portal). |
| FR-09 | API membatasi request per API key sesuai tier dan mengembalikan sisa kuota melalui header `X-RateLimit-Limit` dan `X-RateLimit-Remaining`. |
| FR-10 | Setiap request API yang berhasil maupun gagal dicatat (waktu, endpoint, API key, status) untuk statistik pemakaian. |

### 3.3 Developer Portal

| ID | Kebutuhan |
|---|---|
| FR-11 | Pengembang dapat mendaftar dengan nama dan email, lalu langsung menerima API key tier Free. |
| FR-12 | Pengembang dapat melihat API key-nya, membuat ulang (regenerate), dan menonaktifkan (revoke) API key. |
| FR-13 | Portal menampilkan statistik pemakaian: total hit, hit hari ini, sisa kuota, dan riwayat hit per hari. |
| FR-14 | Portal menampilkan daftar paket beserta harga dan batas pemakaiannya. |
| FR-15 | Pengembang dapat membeli paket atau top-up melalui checkout Midtrans; setelah pembayaran terkonfirmasi, tier API key naik otomatis. |
| FR-16 | Portal menyediakan halaman "coba API" (playground): pengembang memasukkan API key dan endpoint, lalu melihat respons JSON langsung di browser. |
| FR-17 | Portal menyediakan halaman dokumentasi endpoint dan file spesifikasi OpenAPI 3.0. |

### 3.4 Kurasi Data

| ID | Kebutuhan |
|---|---|
| FR-18 | Admin dapat memasukkan dan mengoreksi data mobil (merek, model, varian, tahun, dimensi, parameter per jenis penggerak). |
| FR-19 | Setiap nilai spesifikasi menyimpan sumber (URL situs resmi pabrikan atau dokumen resmi) dan waktu verifikasi. |
| FR-20 | Data melalui alur review sebelum diterbitkan: `Draft` → `In Review` → `Published`. Data berstatus `Draft` atau `In Review` tidak tampil di API publik. |
| FR-21 | Parameter baru dapat ditambahkan ke katalog beserta jenis penggerak yang berlaku, tanpa mengubah struktur API. |

---

## 4. Kebutuhan Non-Fungsional

| ID | Kebutuhan | Target |
|---|---|---|
| NFR-01 | Performa API | 95% request `GET /v1/specs` selesai di bawah 500 ms pada beban normal. |
| NFR-02 | Keamanan transport | Semua akses API dan portal melalui HTTPS. |
| NFR-03 | Keamanan API key | API key hanya ditampilkan penuh sekali saat dibuat; yang disimpan adalah hash-nya. |
| NFR-04 | Keandalan | API dan portal tersedia 99% per bulan (di luar maintenance terjadwal). |
| NFR-05 | Skalabilitas | Database PostgreSQL dengan index pada kolom filter (`brand`, `powertrain`, `year`); penambahan data tidak mengubah struktur API. |
| NFR-06 | Keterpeliharaan | Kode dalam satu monorepo Turborepo (API Hono + TypeScript, portal Astro, paket shared untuk tipe dan katalog parameter). |
| NFR-07 | Dokumentasi | Setiap endpoint terdokumentasi di halaman docs dan spesifikasi OpenAPI 3.0. |
| NFR-08 | Audit | Perubahan data (siapa, kapan, nilai lama/baru) tercatat untuk keperluan review kurasi. |

---

## 5. Model Data

Tabel utama (PostgreSQL pada produksi; prototype memakai data in-memory
dengan struktur yang sama):

| Tabel | Kolom utama |
|---|---|
| `brands` | `id`, `name`, `country`, `logo_url` |
| `cars` | `id`, `brand_id`, `model`, `variant`, `year`, `body_type`, `powertrain`, `seats`, `price_idr`, `status` (`draft`/`in_review`/`published`) |
| `parameters` | `id`, `key`, `label`, `group`, `unit`, `applicable_powertrains[]` |
| `car_parameter_values` | `car_id`, `parameter_id`, `value`, `source_url`, `verified_at`, `reviewed_by` |
| `developers` | `id`, `name`, `email`, `password_hash`, `created_at` |
| `api_keys` | `id`, `developer_id`, `key_hash`, `tier`, `is_active`, `created_at`, `last_used_at` |
| `usage_logs` | `id`, `api_key_id`, `endpoint`, `status_code`, `created_at` |
| `plans` | `id`, `name`, `price_idr`, `daily_limit`, `is_active` |
| `payments` | `id`, `developer_id`, `plan_id`, `amount_idr`, `midtrans_order_id`, `status`, `paid_at` |

Relasi utama: satu `brand` memiliki banyak `car`; satu `car` memiliki
banyak `car_parameter_values`; satu `parameter` berlaku untuk banyak
`car` melalui `car_parameter_values`; satu `developer` memiliki banyak
`api_keys`; satu `api_key` memiliki banyak `usage_logs`.

---

## 6. Antarmuka API

Base URL produksi ditentukan saat deployment. Semua endpoint di bawah
memakai header `x-api-key`, kecuali yang ditandai "tanpa auth".

| Method | Endpoint | Auth | Deskripsi |
|---|---|---|---|
| GET | `/` | — | Health check. |
| GET | `/v1/specs` | API key | Daftar spek; filter `brand`, `powertrain`, `year`, `search`. |
| GET | `/v1/specs/:id` | API key | Detail satu spek. |
| GET | `/v1/brands` | API key | Daftar merek + jumlah model. |
| GET | `/v1/parameters` | API key | Katalog parameter + powertrain yang berlaku. |
| POST | `/v1/auth/register` | Tanpa auth | Daftar (nama + email) → API key baru tier Free. |
| GET | `/v1/usage` | API key | Statistik pemakaian API key. |
| GET | `/v1/docs` | Tanpa auth | Halaman dokumentasi HTML. |
| GET | `/openapi.json` | Tanpa auth | Spesifikasi OpenAPI 3.0. |

Contoh respons `GET /v1/specs?powertrain=BEV` (disingkat): satu objek
per mobil dengan `id`, `brand`, `model`, `variant`, `year`,
`powertrain: "BEV"`, dimensi, `batteryCapacityKwh`, `motorPowerKw`,
`rangeWltpKm`, dan `engineDisplacementCc: null` (tidak berlaku untuk
mobil listrik). Setiap respons menyertakan `meta.disclaimer` bahwa data
contoh harus diverifikasi sebelum tayang — pada produksi, disclaimer ini
diganti penanda status kurasi per nilai.

---

## 7. Kriteria Penerimaan

| ID | Kriteria |
|---|---|
| AC-01 | `GET /v1/specs` tanpa API key mengembalikan `401`; dengan API key salah mengembalikan `401`; dengan API key benar mengembalikan `200` beserta data. |
| AC-02 | Filter `powertrain=BEV` hanya mengembalikan mobil listrik; field mesin bensin pada mobil tersebut bernilai `null`. |
| AC-03 | Setelah kuota harian tier Free habis, request berikutnya mengembalikan `429` dan header sisa kuota menunjukkan `0`. |
| AC-04 | Pendaftaran baru di portal menghasilkan API key yang langsung dapat dipakai memanggil API. |
| AC-05 | Halaman statistik menampilkan hit yang bertambah setiap kali API dipanggil dengan API key tersebut. |
| AC-06 | Pembayaran paket via Midtrans (sandbox) mengubah tier API key dan menaikkan batas hariannya. |
| AC-07 | Setiap nilai spek yang tampil di API memiliki sumber dan waktu verifikasi yang tercatat (FR-19). |
| AC-08 | Dokumentasi API (halaman docs + OpenAPI) mencakup semua endpoint yang tersedia. |

---

## 8. Asumsi dan Batasan

1. Akun Midtrans (merchant ID, server key, client key) disediakan oleh
   owner; integrasi memakai Midtrans Snap.
2. Harga paket final dan batas tiap tier ditentukan owner sebelum
   peluncuran; angka pada dokumen ini (Free 100/hari, Pro 10.000/hari)
   adalah contoh.
3. Data awal mencakup mobil yang beredar di Indonesia; penambahan merek
   atau negara lain dibahas setelah peluncuran.
4. Katalog publik (website daftar spek untuk umum) dan RapidAPI tidak
   termasuk dalam scope ini.
5. Prototype pada repository adalah contoh runnable untuk demo; database
   in-memory, auth sederhana, dan checkout Midtrans placeholder akan
   diganti implementasi produksi pada tahap pengerjaan.

---

## 9. Rencana Pengerjaan (40 hari)

| Fase | Pekerjaan | Perkiraan |
|---|---|---|
| 1 | Model data + pipeline kurasi (input, sumber, verifikasi, review) | Hari 1–10 |
| 2 | REST API: endpoint spek, API key, rate limiting, usage log | Hari 8–18 |
| 3 | Developer portal: registrasi, API key, statistik, playground, docs | Hari 16–28 |
| 4 | Paket + checkout Midtrans + webhook pembayaran | Hari 26–34 |
| 5 | Pengujian akhir, pengisian data produksi, dokumentasi, serah terima | Hari 33–40 |

Laporan mingguan diberikan setiap minggu selama pengerjaan.
