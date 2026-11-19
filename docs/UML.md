# UML — Car Web API

Diagram-diagram di bawah memakai [Mermaid](https://mermaid.js.org/),
yang dirender langsung oleh GitHub pada file Markdown ini. Diagram
mencerminkan implementasi pada repository ini (monorepo Turborepo:
`apps/api` Hono + TypeScript, `apps/portal` Astro, `packages/shared`)
dan kebutuhan pada
[`Software_Requirement_Specification.md`](Software_Requirement_Specification.md).

---

## 1. Use Case Diagram

```mermaid
flowchart LR
    Dev([Developer])
    Admin([Admin / Kurator])
    Owner([Owner])

    subgraph Portal["Developer Portal"]
        UC1((Daftar & kelola API key))
        UC2((Lihat statistik pemakaian))
        UC3((Beli / top-up paket))
        UC4((Coba API di playground))
        UC5((Baca dokumentasi))
    end

    subgraph API["REST API"]
        UC6((Ambil daftar spek mobil))
        UC7((Ambil detail spek mobil))
        UC8((Ambil katalog parameter))
    end

    subgraph Kurasi["Kurasi Data"]
        UC9((Input & koreksi data mobil))
        UC10((Review data sebelum terbit))
    end

    Dev --> UC1
    Dev --> UC2
    Dev --> UC3
    Dev --> UC4
    Dev --> UC5
    Dev --> UC6
    Dev --> UC7
    Dev --> UC8
    Admin --> UC9
    Admin --> UC10
    Owner --> UC3
```

Keterangan: Developer adalah pengguna API (FR-11 s.d. FR-17).
Admin/Kurator mengelola data dan alur review (FR-18 s.d. FR-21).
Owner menentukan harga paket dan menyediakan akun Midtrans.

---

## 2. Class Diagram (Model Data)

```mermaid
classDiagram
    class Brand {
        +string id
        +string name
        +string country
        +string logoUrl
    }
    class Car {
        +string id
        +string brandId
        +string model
        +string variant
        +int year
        +string bodyType
        +Powertrain powertrain
        +int seats
        +int priceIdr
        +CarStatus status
    }
    class Parameter {
        +string id
        +string key
        +string label
        +string group
        +string unit
        +Powertrain[] applicablePowertrains
    }
    class CarParameterValue {
        +string carId
        +string parameterId
        +string value
        +string sourceUrl
        +datetime verifiedAt
        +string reviewedBy
    }
    class Developer {
        +string id
        +string name
        +string email
        +string passwordHash
        +datetime createdAt
    }
    class ApiKey {
        +string id
        +string developerId
        +string keyHash
        +Tier tier
        +boolean isActive
        +datetime createdAt
        +datetime lastUsedAt
    }
    class UsageLog {
        +string id
        +string apiKeyId
        +string endpoint
        +int statusCode
        +datetime createdAt
    }
    class Plan {
        +string id
        +string name
        +int priceIdr
        +int dailyLimit
        +boolean isActive
    }
    class Payment {
        +string id
        +string developerId
        +string planId
        +int amountIdr
        +string midtransOrderId
        +PaymentStatus status
        +datetime paidAt
    }

    Brand "1" -- "*" Car : memiliki
    Car "1" -- "*" CarParameterValue : memiliki nilai
    Parameter "1" -- "*" CarParameterValue : didefinisikan oleh
    Developer "1" -- "*" ApiKey : memiliki
    ApiKey "1" -- "*" UsageLog : dicatat pada
    Developer "1" -- "*" Payment : melakukan
    Plan "1" -- "*" Payment : dibeli melalui
    Plan "1" -- "*" ApiKey : menentukan tier
```

Catatan: `powertrain` memakai taksonomi ICE, MHEV, FHEV, PHEV, REEV,
BEV, FCEV, PFCEV. `status` mobil: `draft`, `in_review`, `published`
— hanya `published` yang tampil di API publik (FR-20).

---

## 3. Sequence Diagram — Permintaan API

```mermaid
sequenceDiagram
    participant C as Client (Developer)
    participant A as API (Hono)
    participant S as Store (API key & usage)
    participant D as Database (PostgreSQL)

    C->>A: GET /v1/specs?powertrain=BEV<br/>header: x-api-key
    A->>S: Validasi API key (hash)
    alt API key tidak ada / salah
        S-->>A: key tidak valid
        A-->>C: 401 unauthorized
    else API key valid
        A->>S: Cek pemakaian hari ini vs batas tier
        alt Kuota habis
            S-->>A: limit tercapai
            A-->>C: 429 rate_limited
        else Kuota tersedia
            A->>D: Query spek (filter powertrain=BEV, status=published)
            D-->>A: Daftar mobil + nilai parameter
            A->>S: Catat usage log
            A-->>C: 200 + data + header X-RateLimit-Remaining
        end
    end
```

Memenuhi FR-01, FR-05, FR-06, FR-07, FR-09, dan FR-10.

---

## 4. Sequence Diagram — Registrasi & Penerbitan API Key

```mermaid
sequenceDiagram
    participant D as Developer
    participant P as Portal (Astro)
    participant A as API (Hono)
    participant S as Store (API key & usage)

    D->>P: Isi form daftar (nama + email)
    P->>A: POST /v1/auth/register
    A->>S: Buat developer + API key tier Free
    S-->>A: API key baru
    A-->>P: 201 + API key (ditampilkan sekali)
    P-->>D: Tampilkan API key + tautan dokumentasi
    D->>A: GET /v1/specs (dengan API key baru)
    A-->>D: 200 + data
```

Memenuhi FR-11 dan FR-12 (regenerate dan revoke memakai alur yang
sama: API key lama dinonaktifkan, key baru diterbitkan).

---

## 5. Sequence Diagram — Top-up Paket via Midtrans

```mermaid
sequenceDiagram
    participant D as Developer
    participant P as Portal (Astro)
    participant A as API (Hono)
    participant M as Midtrans Snap
    participant W as Webhook API

    D->>P: Pilih paket Pro, klik checkout
    P->>A: POST /v1/payments (plan_id)
    A->>M: Buat transaksi (order_id, amount)
    M-->>A: Snap token
    A-->>P: Snap token
    P->>M: Tampilkan halaman pembayaran
    D->>M: Bayar (QRIS / transfer / kartu)
    M->>W: Webhook notification (settlement)
    W->>A: Verifikasi signature + status
    A->>A: Naikkan tier API key ke Pro
    A-->>D: Paket aktif, batas harian bertambah
```

Memenuhi FR-15. Akun Midtrans disediakan owner (lihat SRS bagian 8).
Pada prototype, langkah ini masih placeholder — lihat README.

---

## 6. Component Diagram

```mermaid
flowchart TB
    subgraph Client["Client"]
        Browser["Browser — Developer Portal"]
        App["Aplikasi Developer (REST client)"]
    end

    subgraph Repo["Monorepo Turborepo — car-api-example"]
        subgraph Portal["apps/portal — Astro"]
            Landing["Landing + Docs"]
            Dashboard["Dashboard (API key, statistik, paket)"]
            Playground["Playground (coba API)"]
        end
        subgraph Api["apps/api — Hono + TypeScript"]
            Routes["Routes /v1/*"]
            Auth["Middleware auth + rate limit"]
            Store["Store (key, tier, usage)"]
        end
        Shared["packages/shared<br/>tipe + katalog parameter"]
    end

    subgraph Infra["Infrastruktur (produksi)"]
        DB[("PostgreSQL<br/>brands, cars, parameters,<br/>api_keys, usage_logs, payments")]
        Midtrans["Midtrans Snap + Webhook"]
    end

    Browser --> Landing
    Browser --> Dashboard
    Browser --> Playground
    App --> Routes
    Playground --> Routes
    Dashboard --> Routes
    Routes --> Auth
    Auth --> Store
    Routes --> DB
    Store --> DB
    Routes --> Midtrans
    Portal -.-> Shared
    Api -.-> Shared
```

Pada prototype, `Store` dan data memakai in-memory (lihat
`apps/api/src/store.ts` dan `apps/api/src/data.ts`); pada produksi
diganti PostgreSQL tanpa mengubah kontrak API.

---

## 7. State Diagram — Status Kurasi Data

```mermaid
stateDiagram-v2
    [*] --> Draft : Admin input data mobil
    Draft --> InReview : Ajukan review
    InReview --> Published : Review lolos<br/>(sumber + waktu verifikasi tercatat)
    InReview --> Draft : Perlu perbaikan
    Published --> InReview : Koreksi data
    Published --> [*] : Arsip (tidak tampil di API)
```

Hanya data berstatus `Published` yang dikembalikan API publik (FR-20).
