/**
 * store.ts — penyimpanan API key, tier, dan pemakaian (IN-MEMORY, contoh).
 *
 * Di produksi ini diganti PostgreSQL:
 *   tabel api_keys (key hash, user_id, tier, created_at)
 *   tabel api_usage (key_id, tanggal, jumlah_hit)
 * Rate limit dihitung per key per hari kalender.
 */
import { randomBytes } from "node:crypto";
import { TIER_LIMITS, type Tier } from "@car-api/shared";

export interface ApiKeyRecord {
  key: string;
  name: string;
  email: string;
  tier: Tier;
  createdAt: string;
  totalHits: number;
  /** hit per tanggal (YYYY-MM-DD) */
  dailyHits: Map<string, number>;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function nextMidnightIso(): string {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.toISOString();
}

export class KeyStore {
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

  create(name: string, email: string, tier: Tier = "free"): ApiKeyRecord {
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
  seedDemoKey(): ApiKeyRecord {
    const demoKey = "carapi_demo_9f2e7a1b4c5d6e7f";
    const existing = this.keys.get(demoKey);
    if (existing) return existing;
    const rec: ApiKeyRecord = {
      key: demoKey,
      name: "Demo publik",
      email: "demo@carapi.example",
      tier: "free",
      createdAt: new Date().toISOString(),
      totalHits: 0,
      dailyHits: new Map(),
    };
    this.keys.set(demoKey, rec);
    return rec;
  }

  get(key: string): ApiKeyRecord | undefined {
    return this.keys.get(key);
  }

  usageFor(rec: ApiKeyRecord) {
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
   * Catat 1 hit. Mengembalikan null bila kuota hari ini sudah habis.
   * Dipanggil SETELAH key tervalidasi, SEBELUM handler endpoint jalan —
   * jadi hit yang ditolak rate limit tetap tercatat sebagai pemakaian.
   */
  recordHit(rec: ApiKeyRecord): { allowed: boolean; remaining: number } {
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
