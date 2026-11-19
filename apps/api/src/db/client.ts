/**
 * client.ts — klien PostgreSQL (Drizzle ORM + driver postgres.js).
 *
 * - DATABASE_URL dibaca dari environment variable (atau apps/api/.env,
 *   dimuat oleh ./env.js).
 * - `isDbEnabled` false bila DATABASE_URL kosong → API memakai mode
 *   in-memory seperti semula.
 * - `prepare: false` WAJIB untuk Neon pooled connection string
 *   (PgBouncer mode transaksi tidak mendukung prepared statement),
 *   dan aman untuk PostgreSQL lokal.
 */
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import "./env.js";
import * as schema from "./schema.js";

export const DATABASE_URL = process.env.DATABASE_URL?.trim() ?? "";
export const isDbEnabled = DATABASE_URL.length > 0;

export type Db = PostgresJsDatabase<typeof schema>;

let sql: ReturnType<typeof postgres> | null = null;
let dbInstance: Db | null = null;

export function getDb(): Db {
  if (!isDbEnabled) {
    throw new Error(
      "DATABASE_URL tidak diisi — mode in-memory aktif. Isi DATABASE_URL untuk memakai PostgreSQL.",
    );
  }
  if (!dbInstance) {
    sql = postgres(DATABASE_URL, { prepare: false, max: 5 });
    dbInstance = drizzle(sql, { schema });
  }
  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
    dbInstance = null;
  }
}
