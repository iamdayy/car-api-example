/**
 * index.ts — entrypoint pengembangan lokal (Node.js).
 *
 * Menjalankan aplikasi dari ./app.ts sebagai server HTTP biasa
 * di http://localhost:3001 (atau PORT). JANGAN dipakai sebagai
 * entrypoint Vercel — serverless tidak boleh menjalankan serve();
 * untuk Vercel pakai ./vercel.ts.
 */
import { serve } from "@hono/node-server";
import { app, demo } from "./app.js";
import { isDbEnabled } from "./db/client.js";

const PORT = Number(process.env.PORT) || 3001;
const API_BASE = process.env.CARAPI_PUBLIC_URL || `http://localhost:${PORT}`;

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Car Web API berjalan di ${API_BASE}`);
  console.log(
    isDbEnabled
      ? "Penyimpanan: PostgreSQL (DATABASE_URL)"
      : "Penyimpanan: in-memory (DATABASE_URL tidak diisi)",
  );
  console.log(`Dokumentasi: ${API_BASE}/v1/docs`);
  console.log(`Key demo (free): ${demo.key}`);
});
