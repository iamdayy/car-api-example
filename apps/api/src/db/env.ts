/**
 * env.ts — pemuat file .env TANPA dependensi.
 *
 * Membaca `apps/api/.env` (bila ada) ke `process.env`, tanpa menimpa
 * variabel yang sudah ada di environment. Dipakai oleh client.ts
 * (API, migrate, seed) sehingga `DATABASE_URL` bisa diisi lewat file
 * .env saat pengembangan lokal. Di produksi, isi DATABASE_URL lewat
 * environment variable platform (Vercel/Neon/dll).
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function loadEnvFile(): void {
  // src/db/ -> ../../.env  (apps/api/.env)
  const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", "..", ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();
