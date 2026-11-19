/**
 * store.ts — penyimpanan API key, tier, dan pemakaian IN-MEMORY.
 *
 * Dipakai bila DATABASE_URL tidak diisi. Implementasi PostgreSQL-nya
 * ada di ./db/stores.ts (DbKeyStore) dengan kontrak yang sama
 * (KeyStoreLike) — perilaku endpoint tidak berubah di kedua mode.
 *
 * Rate limit dihitung per key per hari kalender (UTC).
 */
import { randomBytes } from "node:crypto";
import { TIER_LIMITS, type Tier } from "@car-api/shared";

/** API key demo publik untuk dokumentasi & portal (tier free). */
export const DEMO_API_KEY = "carapi_demo_9f2e7a1b4c5d6e7f";

export interface ApiKeyRecord {
  /** UUID baris api_keys (mode DB saja). */
  id?: string;
  /** API key plaintext (hanya diketahui saat dibuat / key demo). */
  key: string;
  name: string;
  email: string;
  tier: Tier;
  createdAt: string;
  totalHits: number;
  /** hit per tanggal (YYYY-MM-DD) — hanya dipakai mode in-memory. */
  dailyHits: Map<string, number>;
}

export interface UsageInfo {
  tier: Tier;
  limitPerDay: number;
  usedToday: number;
  remainingToday: number;
  totalHits: number;
  resetsAt: string;
}

/** Kontrak store API key — diimplementasi mode in-memory dan PostgreSQL. */
export interface KeyStoreLike {
  readonly freeLimit: number;
  readonly proLimit: number;
  limitFor(tier: Tier): number;
  create(name: string, email: string, tier?: Tier): Promise<ApiKeyRecord>;
  seedDemoKey(): Promise<ApiKeyRecord>;
  get(key: string): Promise<ApiKeyRecord | undefined>;
  usageFor(rec: ApiKeyRecord): Promise<UsageInfo>;
  recordHit(rec: ApiKeyRecord, endpoint?: string): Promise<{ allowed: boolean; remaining: number }>;
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function nextMidnightIso(): string {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.toISOString();
}

export class KeyStore implements KeyStoreLike {
  private keys = new Map<string, ApiKeyRecord>();

  /** Limit harian per tier — bisa diubah lewat env untuk pengujian. */
  readonly freeLimit: number;
  readonly proLimit: number;

  constructor() {
    this.freeLimit =
      Number(process.env.CARAPI_FREE_DAILY_LIMIT) ||
      TIER_LIMITS.free.requestsPerDay;
    this.proLimit =
      Number(process.env.CARAPI_PRO_DAILY_LIMIT) ||
      TIER_LIMITS.pro.requestsPerDay;
  }

  limitFor(tier: Tier): number {
    return tier === "pro" ? this.proLimit : this.freeLimit;
  }

  async create(name: string, email: string, tier: Tier = "free"): Promise<ApiKeyRecord> {
    const key = `carapi_${randomBytes(24).toString("hex")}`;
    const rec: ApiKeyRecord = {
      key,
      name,
      email,
      tier,
      createdAt: new Date().toISOString(),
      totalHits: 0,
      dailyHits: new Map(),
    };
    this.keys.set(key, rec);
    return rec;
  }

  /** Key demo publik untuk dokumentasi & portal (tier free). */
  async seedDemoKey(): Promise<ApiKeyRecord> {
    const existing = this.keys.get(DEMO_API_KEY);
    if (existing) return existing;
    const rec: ApiKeyRecord = {
      key: DEMO_API_KEY,
      name: "Demo publik",
      email: "demo@carapi.example",
      tier: "free",
      createdAt: new Date().toISOString(),
      totalHits: 0,
      dailyHits: new Map(),
    };
    this.keys.set(DEMO_API_KEY, rec);
    return rec;
  }

  async get(key: string): Promise<ApiKeyRecord | undefined> {
    return this.keys.get(key);
  }

  async usageFor(rec: ApiKeyRecord): Promise<UsageInfo> {
    const today = todayKey();
    const used = rec.dailyHits.get(today) ?? 0;
    const limit = this.limitFor(rec.tier);
    return {
      tier: rec.tier,
      limitPerDay: limit,
      usedToday: used,
      remainingToday: Math.max(0, limit - used),
      totalHits: rec.totalHits,
      resetsAt: nextMidnightIso(),
    };
  }

  /**
   * Catat 1 hit. Mengembalikan allowed:false bila kuota hari ini sudah
   * habis (hit yang ditolak TIDAK menambah hitungan).
   * Dipanggil SETELAH key tervalidasi, SEBELUM handler endpoint jalan —
   * jadi request yang lolos auth tetap dihitung meskipun handler
   * kemudian mengembalikan 404.
   * (Parameter endpoint diabaikan di mode in-memory; dipakai mode DB
   * untuk kolom endpoint di usage_logs.)
   */
  async recordHit(
    rec: ApiKeyRecord,
    _endpoint = "/v1/specs",
  ): Promise<{ allowed: boolean; remaining: number }> {
    const today = todayKey();
    const used = rec.dailyHits.get(today) ?? 0;
    const limit = this.limitFor(rec.tier);
    if (used >= limit) {
      return { allowed: false, remaining: 0 };
    }
    rec.dailyHits.set(today, used + 1);
    rec.totalHits += 1;
    return { allowed: true, remaining: limit - (used + 1) };
  }
}

export const store = new KeyStore();
