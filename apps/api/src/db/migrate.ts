/**
 * migrate.ts — jalankan migrasi Drizzle ke database.
 *
 * Dipakai: pnpm --filter @car-api/api db:migrate
 * Butuh DATABASE_URL (env atau apps/api/.env).
 */
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { fileURLToPath } from "node:url";
import { closeDb, getDb, isDbEnabled } from "./client.js";

if (!isDbEnabled) {
  console.error(
    "DATABASE_URL tidak diisi. Isi DATABASE_URL (lihat apps/api/.env.example) lalu jalankan lagi.",
  );
  process.exit(1);
}

await migrate(getDb(), {
  migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)),
});
console.log("Migrasi selesai.");
await closeDb();
