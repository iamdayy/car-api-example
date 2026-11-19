/**
 * app.ts — aplikasi Hono Car Web API (tanpa server).
 *
 * Dipakai dua tempat:
 * - src/index.ts  — jalan lokal via @hono/node-server (serve)
 * - src/vercel.ts — entrypoint Vercel Services (export default handler)
 *   Vercel wajib menerima export aplikasi; file ini TIDAK boleh
 *   menjalankan serve() — itulah yang membuat service 500 sebelumnya.
 */
/**
 * Car Web API — Hono + TypeScript.
 *
 * Endpoint:
 *   GET  /                    health check
 *   GET  /v1/specs            daftar spek (filter brand, powertrain, year, search)
 *   GET  /v1/specs/:id        satu spek
 *   GET  /v1/brands           daftar merek
 *   GET  /v1/parameters       katalog parameter + powertrain yang berlaku
 *   POST /v1/auth/register    daftar → API key baru (tier free)
 *   GET  /v1/usage            statistik pemakaian API key
 *   GET  /v1/docs             dokumentasi HTML
 *   GET  /openapi.json        spesifikasi OpenAPI 3.0
 *
 * Auth: header x-api-key. Rate limit per key per hari (free 100/hari,
 * pro 10.000/hari — bisa diubah lewat env CARAPI_FREE_DAILY_LIMIT /
 * CARAPI_PRO_DAILY_LIMIT untuk pengujian).
 *
 * Penyimpanan: PostgreSQL (Drizzle) bila DATABASE_URL diisi, in-memory
 * bila tidak (lihat ./db/client.ts). Perilaku endpoint SAMA di kedua mode.
 */
import { cors } from "hono/cors";
import { Hono } from "hono";
import {
  ALL_PARAMETERS,
  PARAMETER_GROUPS,
  POWERTRAINS,
  TIER_LIMITS,
  TIER_PRICES,
  type Powertrain,
} from "@car-api/shared";
import { DATA_DISCLAIMER } from "./data.js";
import { docsHtml } from "./docs.js";
import { OPENAPI_SPEC } from "./openapi.js";
import { store, type ApiKeyRecord, type KeyStoreLike } from "./store.js";
import { isDbEnabled } from "./db/client.js";
import {
  createDbKeyStore,
  getDbCarStore,
  MemoryCarStore,
  type CarStoreLike,
} from "./db/stores.js";

// Pilih lapisan penyimpanan: PostgreSQL bila DATABASE_URL diisi,
// in-memory bila tidak. Kontrak keduanya sama (lihat ./db/stores.ts).
// Bila PostgreSQL gagal dipakai saat start (mis. DATABASE_URL terisi tapi
// database belum siap / tidak terjangkau — mudah terjadi di serverless),
// fallback ke in-memory supaya API tetap jalan; kegagalannya dicatat
// di log, bukan dibiarkan mematikan seluruh API.
let keyStore: KeyStoreLike;
let carStore: CarStoreLike;
export let demo: ApiKeyRecord;
try {
  keyStore = isDbEnabled ? await createDbKeyStore() : store;
  carStore = isDbEnabled ? getDbCarStore() : new MemoryCarStore();
  demo = await keyStore.seedDemoKey();
} catch (error) {
  console.error("[car-api] PostgreSQL tidak bisa dipakai, fallback ke in-memory:", error);
  keyStore = store;
  carStore = new MemoryCarStore();
  demo = await keyStore.seedDemoKey();
}

const app = new Hono();
app.use("*", cors());

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function err(code: string, message: string, status: number) {
  return new Response(JSON.stringify({ error: { code, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

/**
 * Middleware auth + rate limit untuk endpoint yang butuh API key.
 * Mengembalikan Response error, atau record key bila lolos.
 */
async function requireKey(c: {
  req: { header: (name: string) => string | undefined; path: string };
}): Promise<ApiKeyRecord | Response> {
  const key = c.req.header("x-api-key");
  if (!key) {
    return err("unauthorized", "Header x-api-key wajib diisi. Daftar di portal untuk mendapatkan API key.", 401);
  }
  const rec = await keyStore.get(key);
  if (!rec) {
    return err("unauthorized", "API key tidak valid.", 401);
  }
  const result = await keyStore.recordHit(rec, c.req.path);
  const usage = await keyStore.usageFor(rec);
  if (!result.allowed) {
    return new Response(
      JSON.stringify({
        error: {
          code: "rate_limited",
          message: `Kuota harian tier ${rec.tier} (${usage.limitPerDay} request/hari) sudah habis. Kuota reset pada ${usage.resetsAt}.`,
        },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(usage.limitPerDay),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": usage.resetsAt,
        },
      },
    );
  }
  return rec;
}

async function rateLimitHeaders(rec: ApiKeyRecord): Promise<Record<string, string>> {
  const usage = await keyStore.usageFor(rec);
  return {
    "X-RateLimit-Limit": String(usage.limitPerDay),
    "X-RateLimit-Remaining": String(usage.remainingToday),
    "X-RateLimit-Reset": usage.resetsAt,
  };
}

// ---------------------------------------------------------------------------
// Root / health
// ---------------------------------------------------------------------------
app.get("/", (c) =>
  json({
    name: "Car Web API",
    version: "0.1.0",
    status: "ok",
    docs: "/v1/docs",
    openapi: "/openapi.json",
    disclaimer: DATA_DISCLAIMER,
  }),
);

// ---------------------------------------------------------------------------
// Meta: dokumentasi + OpenAPI (tanpa auth)
// ---------------------------------------------------------------------------
app.get("/v1/docs", (c) =>
  c.html(docsHtml(new URL(c.req.url).origin, demo.key)),
);
app.get("/openapi.json", (c) => json(OPENAPI_SPEC));

// ---------------------------------------------------------------------------
// Auth: register (tanpa auth)
// ---------------------------------------------------------------------------
app.post("/v1/auth/register", async (c) => {
  let body: { name?: unknown; email?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return err("bad_request", "Body harus JSON dengan field name dan email.", 400);
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return err("bad_request", "Field name dan email (format email valid) wajib diisi.", 400);
  }
  const rec = await keyStore.create(name, email, "free");
  return json(
    {
      apiKey: rec.key,
      name: rec.name,
      email: rec.email,
      tier: rec.tier,
      limitPerDay: keyStore.limitFor(rec.tier),
      message:
        "Simpan API key ini baik-baik — key hanya ditampilkan sekali di sini. Di produksi, key dikirim juga lewat email.",
      dashboard: "Buka developer portal untuk melihat pemakaian dan upgrade tier.",
    },
    201,
  );
});

// ---------------------------------------------------------------------------
// Specs
// ---------------------------------------------------------------------------
app.get("/v1/specs", async (c) => {
  const keyOrErr = await requireKey(c);
  if (keyOrErr instanceof Response) return keyOrErr;

  const brand = c.req.query("brand")?.toLowerCase();
  const powertrain = c.req.query("powertrain");
  const yearRaw = c.req.query("year");
  const search = c.req.query("search")?.toLowerCase();

  if (powertrain && !(POWERTRAINS as readonly string[]).includes(powertrain)) {
    return err(
      "bad_request",
      `powertrain harus salah satu dari: ${POWERTRAINS.join(", ")}.`,
      400,
    );
  }
  const year = yearRaw ? Number(yearRaw) : undefined;
  if (yearRaw && !Number.isInteger(year)) {
    return err("bad_request", "year harus angka tahun, contoh: 2024.", 400);
  }

  const allCars = await carStore.listCars();
  const filtered = allCars.filter((car) => {
    if (brand && !car.brand.toLowerCase().includes(brand)) return false;
    if (powertrain && car.powertrain !== powertrain) return false;
    if (year !== undefined && car.year !== year) return false;
    if (
      search &&
      !`${car.brand} ${car.model} ${car.variant ?? ""}`.toLowerCase().includes(search)
    ) {
      return false;
    }
    return true;
  });

  return json(
    {
      data: filtered,
      meta: {
        count: filtered.length,
        total: allCars.length,
        disclaimer: DATA_DISCLAIMER,
      },
    },
    200,
    await rateLimitHeaders(keyOrErr),
  );
});

app.get("/v1/specs/:id", async (c) => {
  const keyOrErr = await requireKey(c);
  if (keyOrErr instanceof Response) return keyOrErr;

  const car = await carStore.getCar(c.req.param("id"));
  if (!car) {
    return err("not_found", `Mobil dengan id '${c.req.param("id")}' tidak ditemukan.`, 404);
  }
  return json(
    { data: car, meta: { disclaimer: DATA_DISCLAIMER } },
    200,
    await rateLimitHeaders(keyOrErr),
  );
});

app.get("/v1/brands", async (c) => {
  const keyOrErr = await requireKey(c);
  if (keyOrErr instanceof Response) return keyOrErr;

  const allCars = await carStore.listCars();
  const counts = new Map<string, number>();
  for (const car of allCars) counts.set(car.brand, (counts.get(car.brand) ?? 0) + 1);
  const brands = [...counts.entries()]
    .map(([brand, models]) => ({ brand, models }))
    .sort((a, b) => a.brand.localeCompare(b.brand));
  return json({ data: brands, meta: { count: brands.length } }, 200, await rateLimitHeaders(keyOrErr));
});

app.get("/v1/parameters", async (c) => {
  const keyOrErr = await requireKey(c);
  if (keyOrErr instanceof Response) return keyOrErr;

  return json(
    {
      data: {
        groups: PARAMETER_GROUPS,
        parameters: ALL_PARAMETERS,
        powertrains: POWERTRAINS.map((p) => ({ id: p, label: p })),
      },
      meta: {
        totalParameters: ALL_PARAMETERS.length,
        note: "Tiap parameter ditandai berlaku untuk jenis penggerak (powertrain) yang mana. Field yang tidak berlaku dikosongkan (null) pada respons spek.",
      },
    },
    200,
    await rateLimitHeaders(keyOrErr),
  );
});

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------
app.get("/v1/usage", async (c) => {
  const keyOrErr = await requireKey(c);
  if (keyOrErr instanceof Response) return keyOrErr;

  const usage = await keyStore.usageFor(keyOrErr);
  return json(
    {
      data: {
        name: keyOrErr.name,
        email: keyOrErr.email,
        tier: keyOrErr.tier,
        limitPerDay: usage.limitPerDay,
        usedToday: usage.usedToday,
        remainingToday: usage.remainingToday,
        totalHits: usage.totalHits,
        resetsAt: usage.resetsAt,
        tiers: {
          free: { ...TIER_LIMITS.free, price: TIER_PRICES.free },
          pro: { ...TIER_LIMITS.pro, price: TIER_PRICES.pro },
        },
      },
    },
    200,
    await rateLimitHeaders(keyOrErr),
  );
});

// ---------------------------------------------------------------------------
// 404
// ---------------------------------------------------------------------------
app.notFound((c) =>
  err("not_found", `Rute ${c.req.path} tidak ditemukan. Lihat dokumentasi di /v1/docs.`, 404),
);

export { app };
export default app;
