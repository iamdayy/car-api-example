/**
 * Konfigurasi drizzle-kit untuk generate migrasi.
 *
 * Dipakai: pnpm --filter @car-api/api db:generate
 * URL di bawah hanya placeholder agar `generate` bisa jalan tanpa
 * DATABASE_URL (generate tidak pernah konek ke database).
 * Untuk migrate/seed, DATABASE_URL dibaca dari env / apps/api/.env.
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/car_api",
  },
});
