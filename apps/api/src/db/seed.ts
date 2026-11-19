/**
 * seed.ts — isi database dengan data contoh (idempotent, aman dijalankan ulang).
 *
 * Dipakai: pnpm --filter @car-api/api db:seed
 * Butuh DATABASE_URL (env atau apps/api/.env). Jalankan SETELAH db:migrate.
 *
 * Yang diisi:
 * - brands (8 merek dari seed) + cars (10 mobil dari apps/api/src/data.ts)
 * - parameters (36 parameter dari katalog packages/shared)
 * - car_parameter_values (nilai non-null per mobil; source_url +
 *   verified_at dikosongkan — data contoh BELUM terverifikasi, sesuai
 *   janji kurasi ke klien)
 * - plans: Free (100/hari, Rp0) + Pro (10.000/hari, Rp99.000/bulan, contoh)
 * - API key demo yang sama seperti mode in-memory (carapi_demo_...)
 *
 * Idempotency: brands/parameters/values pakai onConflictDoNothing;
 * cars/plans pakai onConflictDoUpdate (nilai diperbarui bila seed berubah).
 */
import { ALL_PARAMETERS, TIER_LIMITS, TIER_PRICES } from "@car-api/shared";
import type { CarSpec } from "@car-api/shared";
import { SEED_CARS } from "../data.js";
import { closeDb, getDb, isDbEnabled, type Db } from "./client.js";
import {
  apiKeys,
  brands,
  carParameterValues,
  cars,
  developers,
  parameters,
  plans,
} from "./schema.js";
import { ensureDemoKey } from "./stores.js";

const BRAND_COUNTRY: Record<string, string> = {
  Toyota: "Jepang",
  Honda: "Jepang",
  Daihatsu: "Jepang",
  Mitsubishi: "Jepang",
  Suzuki: "Jepang",
  Hyundai: "Korea Selatan",
  Wuling: "Tiongkok",
  BYD: "Tiongkok",
};

function brandSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

/**
 * Petakan field CarSpec ke entri (parameterId, nilai).
 * Catatan: seed data memakai electricRangeKm untuk BEV (Air ev, Atto 3)
 * dan torqueNm untuk BEV — meskipun katalog menandai parameter itu
 * untuk powertrain lain. Nilai di-seed apa adanya dari data.ts.
 */
function specToParamEntries(car: CarSpec): Array<{ parameterId: string; value: string }> {
  const entries: Array<{ parameterId: string; value: string }> = [];
  const put = (parameterId: string, value: string | number | null | undefined) => {
    if (value !== null && value !== undefined) {
      entries.push({ parameterId, value: String(value) });
    }
  };
  put("brand", car.brand);
  put("model", car.model);
  put("year", car.year);
  put("bodyType", car.bodyType);
  put("seats", car.seats);
  put("priceIdr", car.priceIdr);
  put("lengthMm", car.dimensions.lengthMm);
  put("widthMm", car.dimensions.widthMm);
  put("heightMm", car.dimensions.heightMm);
  put("wheelbaseMm", car.dimensions.wheelbaseMm);
  put("weightKg", car.weightKg);
  put("transmission", car.transmission);
  put("drivetrain", car.drivetrain);
  put("topSpeedKmh", car.topSpeedKmh);
  put("acceleration0100S", car.acceleration0100S);
  put("engineDisplacementCc", car.engineDisplacementCc);
  put("cylinders", car.cylinders);
  put("engineType", car.engineType);
  put("fuelType", car.fuelType);
  put("powerHp", car.powerHp);
  put("torqueNm", car.torqueNm);
  put("fuelConsumptionL100km", car.fuelConsumptionL100km);
  put("fuelTankL", car.fuelTankL);
  put("co2Gkm", car.co2Gkm);
  put("batteryKwh", car.batteryKwh);
  put("batteryType", car.batteryType);
  put("motorPowerKw", car.motorPowerKw);
  put("motorType", car.motorType);
  put("rangeWltpKm", car.rangeWltpKm);
  put("energyConsumptionKwh100km", car.energyConsumptionKwh100km);
  put("chargingAcKw", car.chargingAcKw);
  put("chargingDcKw", car.chargingDcKw);
  put("chargingTime1080Min", car.chargingTime1080Min);
  put("systemPowerHp", car.systemPowerHp);
  put("electricRangeKm", car.electricRangeKm);
  put("combinedRangeKm", car.combinedRangeKm);
  return entries;
}

async function seed(db: Db): Promise<void> {
  // 1. Brands
  const brandNames = [...new Set(SEED_CARS.map((c) => c.brand))];
  for (const name of brandNames) {
    await db
      .insert(brands)
      .values({
        id: brandSlug(name),
        name,
        country: BRAND_COUNTRY[name] ?? null,
      })
      .onConflictDoNothing();
  }

  // 2. Cars (upsert — nilai diperbarui bila seed berubah)
  for (const car of SEED_CARS) {
    await db
      .insert(cars)
      .values({
        id: car.id,
        brandId: brandSlug(car.brand),
        model: car.model,
        variant: car.variant,
        year: car.year,
        bodyType: car.bodyType,
        powertrain: car.powertrain,
        seats: car.seats,
        priceIdr: car.priceIdr,
        status: "published",
        lengthMm: car.dimensions.lengthMm,
        widthMm: car.dimensions.widthMm,
        heightMm: car.dimensions.heightMm,
        wheelbaseMm: car.dimensions.wheelbaseMm,
        weightKg: car.weightKg,
        transmission: car.transmission,
        drivetrain: car.drivetrain,
        topSpeedKmh: car.topSpeedKmh,
        acceleration0100S: car.acceleration0100S,
        engineDisplacementCc: car.engineDisplacementCc,
        cylinders: car.cylinders,
        engineType: car.engineType,
        fuelType: car.fuelType,
        powerHp: car.powerHp,
        torqueNm: car.torqueNm,
        fuelConsumptionL100km: car.fuelConsumptionL100km,
        fuelTankL: car.fuelTankL,
        co2Gkm: car.co2Gkm,
        batteryKwh: car.batteryKwh,
        batteryType: car.batteryType,
        motorPowerKw: car.motorPowerKw,
        motorType: car.motorType,
        rangeWltpKm: car.rangeWltpKm,
        energyConsumptionKwh100km: car.energyConsumptionKwh100km,
        chargingAcKw: car.chargingAcKw,
        chargingDcKw: car.chargingDcKw,
        chargingTime1080Min: car.chargingTime1080Min,
        systemPowerHp: car.systemPowerHp,
        electricRangeKm: car.electricRangeKm,
        combinedRangeKm: car.combinedRangeKm,
      })
      .onConflictDoUpdate({
        target: cars.id,
        set: {
          brandId: brandSlug(car.brand),
          model: car.model,
          variant: car.variant,
          year: car.year,
          bodyType: car.bodyType,
          powertrain: car.powertrain,
          seats: car.seats,
          priceIdr: car.priceIdr,
          status: "published",
          lengthMm: car.dimensions.lengthMm,
          widthMm: car.dimensions.widthMm,
          heightMm: car.dimensions.heightMm,
          wheelbaseMm: car.dimensions.wheelbaseMm,
          weightKg: car.weightKg,
          transmission: car.transmission,
          drivetrain: car.drivetrain,
          topSpeedKmh: car.topSpeedKmh,
          acceleration0100S: car.acceleration0100S,
          engineDisplacementCc: car.engineDisplacementCc,
          cylinders: car.cylinders,
          engineType: car.engineType,
          fuelType: car.fuelType,
          powerHp: car.powerHp,
          torqueNm: car.torqueNm,
          fuelConsumptionL100km: car.fuelConsumptionL100km,
          fuelTankL: car.fuelTankL,
          co2Gkm: car.co2Gkm,
          batteryKwh: car.batteryKwh,
          batteryType: car.batteryType,
          motorPowerKw: car.motorPowerKw,
          motorType: car.motorType,
          rangeWltpKm: car.rangeWltpKm,
          energyConsumptionKwh100km: car.energyConsumptionKwh100km,
          chargingAcKw: car.chargingAcKw,
          chargingDcKw: car.chargingDcKw,
          chargingTime1080Min: car.chargingTime1080Min,
          systemPowerHp: car.systemPowerHp,
          electricRangeKm: car.electricRangeKm,
          combinedRangeKm: car.combinedRangeKm,
          updatedAt: new Date(),
        },
      });
  }

  // 3. Parameters (katalog dari packages/shared)
  for (const p of ALL_PARAMETERS) {
    await db
      .insert(parameters)
      .values({
        id: p.id,
        key: p.id,
        label: p.label,
        group: p.group,
        unit: p.unit,
        applicablePowertrains: [...p.appliesTo],
      })
      .onConflictDoNothing();
  }

  // 4. Nilai parameter per mobil (jejak kurasi — source belum terverifikasi)
  for (const car of SEED_CARS) {
    for (const entry of specToParamEntries(car)) {
      await db
        .insert(carParameterValues)
        .values({
          carId: car.id,
          parameterId: entry.parameterId,
          value: entry.value,
          sourceUrl: null,
          verifiedAt: null,
          reviewedBy: null,
        })
        .onConflictDoNothing();
    }
  }

  // 5. Plans
  for (const tier of ["free", "pro"] as const) {
    await db
      .insert(plans)
      .values({
        id: tier,
        name: tier === "free" ? "Free" : "Pro",
        priceIdr: TIER_PRICES[tier].priceIdrPerMonth,
        dailyLimit: TIER_LIMITS[tier].requestsPerDay,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: plans.id,
        set: {
          name: tier === "free" ? "Free" : "Pro",
          priceIdr: TIER_PRICES[tier].priceIdrPerMonth,
          dailyLimit: TIER_LIMITS[tier].requestsPerDay,
          isActive: true,
        },
      });
  }

  // 6. API key demo (sama seperti mode in-memory)
  const demo = await ensureDemoKey(db);
  console.log(`Seed selesai: ${brandNames.length} merek, ${SEED_CARS.length} mobil, ${ALL_PARAMETERS.length} parameter, 2 paket.`);
  console.log(`Key demo: ${demo.key} (tier ${demo.tier})`);
}

if (!isDbEnabled) {
  console.error(
    "DATABASE_URL tidak diisi. Isi DATABASE_URL (lihat apps/api/.env.example) lalu jalankan lagi.",
  );
  process.exit(1);
}

await seed(getDb());
await closeDb();
