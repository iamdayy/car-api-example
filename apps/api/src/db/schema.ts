/**
 * schema.ts — skema PostgreSQL (Drizzle ORM).
 *
 * Mengikuti docs/Software_Requirement_Specification.md bagian 5
 * (9 tabel: brands, cars, parameters, car_parameter_values,
 * developers, api_keys, usage_logs, plans, payments).
 *
 * Catatan desain:
 * - Tabel `cars` menyimpan SEMUA field spek (kolom lebar, cerminan
 *   tipe CarSpec di packages/shared) — ini yang dibaca API.
 * - Tabel `car_parameter_values` menyimpan JEJAK KURASI per nilai
 *   (source_url + verified_at + reviewed_by, FR-19/FR-20); nilainya
 *   disimpan sebagai teks.
 * - `api_keys.key_hash` menyimpan SHA-256 dari API key, BUKAN key
 *   plaintext (NFR-03). `developers.password_hash` juga hash.
 */
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const brands = pgTable("brands", {
  id: text("id").primaryKey(), // slug, mis. "toyota"
  name: text("name").notNull().unique(),
  country: text("country"), // mis. "Jepang"
  logoUrl: text("logo_url"),
});

export const cars = pgTable(
  "cars",
  {
    id: text("id").primaryKey(), // mis. "toyota-avanza-15-g-2024"
    brandId: text("brand_id")
      .notNull()
      .references(() => brands.id),
    model: text("model").notNull(),
    variant: text("variant"),
    year: integer("year").notNull(),
    bodyType: text("body_type").notNull(),
    powertrain: text("powertrain").notNull(), // ICE | MHEV | FHEV | PHEV | REEV | BEV | FCEV | PFCEV
    seats: integer("seats"),
    priceIdr: integer("price_idr"),
    status: text("status").notNull().default("published"), // draft | in_review | published
    // Dimensi
    lengthMm: integer("length_mm"),
    widthMm: integer("width_mm"),
    heightMm: integer("height_mm"),
    wheelbaseMm: integer("wheelbase_mm"),
    weightKg: integer("weight_kg"),
    transmission: text("transmission"),
    drivetrain: text("drivetrain"), // FWD | RWD | AWD
    // Performa
    topSpeedKmh: integer("top_speed_kmh"),
    acceleration0100S: real("acceleration_0_100_s"),
    // Mesin pembakaran (null untuk BEV murni)
    engineDisplacementCc: integer("engine_displacement_cc"),
    cylinders: integer("cylinders"),
    engineType: text("engine_type"),
    fuelType: text("fuel_type"),
    powerHp: integer("power_hp"),
    torqueNm: integer("torque_nm"),
    fuelConsumptionL100km: real("fuel_consumption_l_100_km"),
    fuelTankL: integer("fuel_tank_l"),
    co2Gkm: integer("co2_g_km"),
    // Elektrik / hybrid (null untuk ICE murni)
    batteryKwh: real("battery_kwh"),
    batteryType: text("battery_type"),
    motorPowerKw: integer("motor_power_kw"),
    motorType: text("motor_type"),
    rangeWltpKm: integer("range_wltp_km"),
    energyConsumptionKwh100km: real("energy_consumption_kwh_100_km"),
    chargingAcKw: integer("charging_ac_kw"),
    chargingDcKw: integer("charging_dc_kw"),
    chargingTime1080Min: integer("charging_time_10_80_min"),
    systemPowerHp: integer("system_power_hp"),
    electricRangeKm: integer("electric_range_km"),
    combinedRangeKm: integer("combined_range_km"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("cars_brand_id_idx").on(t.brandId),
    index("cars_powertrain_idx").on(t.powertrain),
    index("cars_year_idx").on(t.year),
    index("cars_status_idx").on(t.status),
  ],
);

export const parameters = pgTable("parameters", {
  id: text("id").primaryKey(), // kunci parameter, mis. "engineDisplacementCc"
  key: text("key").notNull().unique(), // sama dengan id (sesuai SRS bagian 5)
  label: text("label").notNull(),
  group: text("group").notNull(), // general | engine | performance | chassis | electric
  unit: text("unit"), // mis. "cc", "kWh", null bila tanpa satuan
  applicablePowertrains: text("applicable_powertrains")
    .array()
    .notNull()
    .default([]),
});

export const carParameterValues = pgTable(
  "car_parameter_values",
  {
    carId: text("car_id")
      .notNull()
      .references(() => cars.id, { onDelete: "cascade" }),
    parameterId: text("parameter_id")
      .notNull()
      .references(() => parameters.id, { onDelete: "cascade" }),
    value: text("value").notNull(), // nilai sebagai teks
    sourceUrl: text("source_url"), // URL situs resmi pabrikan / dokumen resmi
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
  },
  (t) => [primaryKey({ columns: [t.carId, t.parameterId] })],
);

export const developers = pgTable("developers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // null bila daftar via API (tanpa password)
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  developerId: uuid("developer_id")
    .notNull()
    .references(() => developers.id, { onDelete: "cascade" }),
  keyHash: text("key_hash").notNull().unique(), // SHA-256 hex dari API key
  tier: text("tier").notNull().default("free"), // free | pro
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

export const usageLogs = pgTable(
  "usage_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    apiKeyId: uuid("api_key_id")
      .notNull()
      .references(() => apiKeys.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(), // path yang dipanggil, mis. "/v1/specs"
    statusCode: integer("status_code").notNull(), // 200 = hit diterima (dihitung kuota)
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("usage_logs_key_created_idx").on(t.apiKeyId, t.createdAt)],
);

export const plans = pgTable("plans", {
  id: text("id").primaryKey(), // "free" | "pro"
  name: text("name").notNull(),
  priceIdr: integer("price_idr").notNull().default(0),
  dailyLimit: integer("daily_limit").notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  developerId: uuid("developer_id")
    .notNull()
    .references(() => developers.id, { onDelete: "cascade" }),
  planId: text("plan_id")
    .notNull()
    .references(() => plans.id),
  amountIdr: integer("amount_idr").notNull(),
  midtransOrderId: text("midtrans_order_id").unique(),
  status: text("status").notNull().default("pending"), // pending | settlement | failed | ...
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
