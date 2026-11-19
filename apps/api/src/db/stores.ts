/**
 * stores.ts — lapisan repository: API key, pemakaian, dan data mobil.
 *
 * Dua implementasi dengan kontrak yang sama:
 * - `MemoryKeyStore` / `MemoryCarStore` — in-memory (dipakai bila
 *   DATABASE_URL tidak diisi; perilaku persis seperti sebelumnya).
 * - `DbKeyStore` / `DbCarStore` — PostgreSQL via Drizzle (dipakai bila
 *   DATABASE_URL diisi).
 *
 * Kontrak perilaku (SAMA di kedua mode): respons endpoint, status code
 * 401/400/404/429, dan header X-RateLimit-* tidak berubah.
 *
 * Catatan kejujuran: usage_logs mencatat hit yang DITERIMA (status 200)
 * beserta path endpoint-nya. Hit yang ditolak rate limit (429) tidak
 * dicatat — sama seperti mode in-memory yang tidak menambah hitungan
 * saat kuota habis.
 */
import { randomBytes, createHash } from "node:crypto";
import { and, count, eq, gte } from "drizzle-orm";
import { TIER_LIMITS, type CarSpec, type Powertrain } from "@car-api/shared";
import { SEED_CARS } from "../data.js";
import { getDb, type Db } from "./client.js";
import {
  apiKeys,
  brands,
  cars,
  developers,
  plans,
  usageLogs,
} from "./schema.js";
import {
  DEMO_API_KEY,
  nextMidnightIso,
  type ApiKeyRecord,
  type KeyStoreLike,
  type UsageInfo,
} from "../store.js";

/** SHA-256 hex dari API key — yang disimpan di kolom key_hash. */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

function todayStartUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ---------------------------------------------------------------------------
// Data mobil
// ---------------------------------------------------------------------------
export interface CarStoreLike {
  listCars(): Promise<CarSpec[]>;
  getCar(id: string): Promise<CarSpec | undefined>;
}

/** Ubah satu baris tabel cars (+ nama merek) menjadi CarSpec. */
export function toCarSpec(
  row: typeof cars.$inferSelect,
  brandName: string,
): CarSpec {
  return {
    id: row.id,
    brand: brandName,
    model: row.model,
    variant: row.variant,
    year: row.year,
    bodyType: row.bodyType,
    powertrain: row.powertrain as Powertrain,
    seats: row.seats,
    priceIdr: row.priceIdr,
    dimensions: {
      lengthMm: row.lengthMm,
      widthMm: row.widthMm,
      heightMm: row.heightMm,
      wheelbaseMm: row.wheelbaseMm,
    },
    weightKg: row.weightKg,
    transmission: row.transmission,
    drivetrain: row.drivetrain,
    topSpeedKmh: row.topSpeedKmh,
    acceleration0100S: row.acceleration0100S,
    engineDisplacementCc: row.engineDisplacementCc,
    cylinders: row.cylinders,
    engineType: row.engineType,
    fuelType: row.fuelType,
    powerHp: row.powerHp,
    torqueNm: row.torqueNm,
    fuelConsumptionL100km: row.fuelConsumptionL100km,
    fuelTankL: row.fuelTankL,
    co2Gkm: row.co2Gkm,
    batteryKwh: row.batteryKwh,
    batteryType: row.batteryType,
    motorPowerKw: row.motorPowerKw,
    motorType: row.motorType,
    rangeWltpKm: row.rangeWltpKm,
    energyConsumptionKwh100km: row.energyConsumptionKwh100km,
    chargingAcKw: row.chargingAcKw,
    chargingDcKw: row.chargingDcKw,
    chargingTime1080Min: row.chargingTime1080Min,
    systemPowerHp: row.systemPowerHp,
    electricRangeKm: row.electricRangeKm,
    combinedRangeKm: row.combinedRangeKm,
  };
}

/** Implementasi in-memory: baca dari SEED_CARS (data.ts). */
export class MemoryCarStore implements CarStoreLike {
  async listCars(): Promise<CarSpec[]> {
    return [...SEED_CARS];
  }
  async getCar(id: string): Promise<CarSpec | undefined> {
    return SEED_CARS.find((c) => c.id === id);
  }
}

/** Implementasi PostgreSQL: baca dari tabel cars (hanya status published). */
export class DbCarStore implements CarStoreLike {
  constructor(private db: Db) {}

  async listCars(): Promise<CarSpec[]> {
    const rows = await this.db
      .select({ car: cars, brandName: brands.name })
      .from(cars)
      .innerJoin(brands, eq(cars.brandId, brands.id))
      .where(eq(cars.status, "published"))
      .orderBy(brands.name, cars.model, cars.variant);
    return rows.map(({ car, brandName }) => toCarSpec(car, brandName));
  }

  async getCar(id: string): Promise<CarSpec | undefined> {
    const rows = await this.db
      .select({ car: cars, brandName: brands.name })
      .from(cars)
      .innerJoin(brands, eq(cars.brandId, brands.id))
      .where(and(eq(cars.id, id), eq(cars.status, "published")));
    if (rows.length === 0) return undefined;
    return toCarSpec(rows[0].car, rows[0].brandName);
  }
}

export function getDbCarStore(): DbCarStore {
  return new DbCarStore(getDb());
}

// ---------------------------------------------------------------------------
// API key + pemakaian
// ---------------------------------------------------------------------------
function toKeyRecord(
  keyRow: typeof apiKeys.$inferSelect,
  dev: typeof developers.$inferSelect,
  plainKey: string,
): ApiKeyRecord {
  return {
    id: keyRow.id,
    key: plainKey,
    name: dev.name,
    email: dev.email,
    tier: keyRow.tier as ApiKeyRecord["tier"],
    createdAt: keyRow.createdAt.toISOString(),
    totalHits: 0, // dihitung ulang oleh usageFor dari usage_logs
    dailyHits: new Map(),
  };
}

/**
 * Pastikan developer + API key demo ada (idempotent).
 * Dipakai DbKeyStore.seedDemoKey() dan script seed.
 */
export async function ensureDemoKey(db: Db): Promise<ApiKeyRecord> {
  const [dev] = await db
    .insert(developers)
    .values({ name: "Demo publik", email: "demo@carapi.example" })
    .onConflictDoUpdate({
      target: developers.email,
      set: { name: "Demo publik" },
    })
    .returning();
  const [row] = await db
    .insert(apiKeys)
    .values({
      developerId: dev.id,
      keyHash: hashApiKey(DEMO_API_KEY),
      tier: "free",
    })
    .onConflictDoNothing({ target: apiKeys.keyHash })
    .returning();
  if (row) return toKeyRecord(row, dev, DEMO_API_KEY);
  // Key sudah ada (mis. seed dijalankan ulang) — ambil yang ada.
  const existing = await db
    .select({ apiKey: apiKeys, developer: developers })
    .from(apiKeys)
    .innerJoin(developers, eq(apiKeys.developerId, developers.id))
    .where(eq(apiKeys.keyHash, hashApiKey(DEMO_API_KEY)));
  if (existing.length === 0) throw new Error("Gagal memastikan API key demo.");
  return toKeyRecord(existing[0].apiKey, existing[0].developer, DEMO_API_KEY);
}

/** Implementasi PostgreSQL untuk API key + rate limit + usage. */
export class DbKeyStore implements KeyStoreLike {
  readonly freeLimit: number;
  readonly proLimit: number;

  private constructor(
    private db: Db,
    freeLimit: number,
    proLimit: number,
  ) {
    this.freeLimit = freeLimit;
    this.proLimit = proLimit;
  }

  /**
   * Batas harian diambil dari (urutan prioritas):
   * env CARAPI_*_DAILY_LIMIT → tabel plans → TIER_LIMITS (shared).
   */
  static async create(): Promise<DbKeyStore> {
    const db = getDb();
    const planRows = await db.select().from(plans);
    const byId = new Map(planRows.map((p) => [p.id, p.dailyLimit]));
    const freeLimit =
      Number(process.env.CARAPI_FREE_DAILY_LIMIT) ||
      byId.get("free") ||
      TIER_LIMITS.free.requestsPerDay;
    const proLimit =
      Number(process.env.CARAPI_PRO_DAILY_LIMIT) ||
      byId.get("pro") ||
      TIER_LIMITS.pro.requestsPerDay;
    return new DbKeyStore(db, freeLimit, proLimit);
  }

  limitFor(tier: ApiKeyRecord["tier"]): number {
    return tier === "pro" ? this.proLimit : this.freeLimit;
  }

  async get(key: string): Promise<ApiKeyRecord | undefined> {
    const rows = await this.db
      .select({ apiKey: apiKeys, developer: developers })
      .from(apiKeys)
      .innerJoin(developers, eq(apiKeys.developerId, developers.id))
      .where(
        and(
          eq(apiKeys.keyHash, hashApiKey(key)),
          eq(apiKeys.isActive, true),
        ),
      );
    if (rows.length === 0) return undefined;
    return toKeyRecord(rows[0].apiKey, rows[0].developer, key);
  }

  async create(
    name: string,
    email: string,
    tier: ApiKeyRecord["tier"] = "free",
  ): Promise<ApiKeyRecord> {
    const key = `carapi_${randomBytes(24).toString("hex")}`;
    const [dev] = await this.db
      .insert(developers)
      .values({ name, email })
      .onConflictDoUpdate({ target: developers.email, set: { name } })
      .returning();
    const [row] = await this.db
      .insert(apiKeys)
      .values({
        developerId: dev.id,
        keyHash: hashApiKey(key),
        tier,
      })
      .returning();
    return toKeyRecord(row, dev, key);
  }

  async seedDemoKey(): Promise<ApiKeyRecord> {
    return ensureDemoKey(this.db);
  }

  async usageFor(rec: ApiKeyRecord): Promise<UsageInfo> {
    if (!rec.id) throw new Error("ApiKeyRecord tanpa id (mode DB).");
    const [usedRow] = await this.db
      .select({ n: count() })
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.apiKeyId, rec.id),
          gte(usageLogs.createdAt, todayStartUtc()),
        ),
      );
    const [totalRow] = await this.db
      .select({ n: count() })
      .from(usageLogs)
      .where(eq(usageLogs.apiKeyId, rec.id));
    const used = usedRow?.n ?? 0;
    const total = totalRow?.n ?? 0;
    const limit = this.limitFor(rec.tier);
    return {
      tier: rec.tier,
      limitPerDay: limit,
      usedToday: used,
      remainingToday: Math.max(0, limit - used),
      totalHits: total,
      resetsAt: nextMidnightIso(),
    };
  }

  async recordHit(
    rec: ApiKeyRecord,
    endpoint = "/v1/specs",
  ): Promise<{ allowed: boolean; remaining: number }> {
    if (!rec.id) return { allowed: false, remaining: 0 };
    const usage = await this.usageFor(rec);
    if (usage.remainingToday <= 0) {
      return { allowed: false, remaining: 0 };
    }
    await this.db.insert(usageLogs).values({
      apiKeyId: rec.id,
      endpoint,
      statusCode: 200,
    });
    await this.db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, rec.id));
    return { allowed: true, remaining: usage.remainingToday - 1 };
  }
}

export async function createDbKeyStore(): Promise<DbKeyStore> {
  return DbKeyStore.create();
}
