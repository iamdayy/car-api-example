/**
 * vercel.ts — entrypoint Vercel Services untuk service `api`.
 *
 * Vercel memuat file ini sebagai function dan memakai default export
 * sebagai handler (objek dengan method fetch, gaya Web-standard —
 * sama seperti `export default app` pada template Hono Vercel).
 * File ini TIDAK menjalankan serve() — di serverless tidak ada
 * server yang perlu di-listen.
 *
 * Soal path: rewrite di vercel.json meneruskan request `/api/...` ke
 * service ini. Tergantung konfigurasi, path bisa sampai lengkap
 * (/api/v1/specs) atau sudah dipotong (/v1/specs). Wrapper ini
 * memotong prefix /api bila masih ada, supaya rute Hono
 * (yang didefinisikan tanpa prefix) selalu cocok di kedua kasus.
 */
import { app } from "./app.js";

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      url.pathname = url.pathname.slice(4) || "/";
      request = new Request(url, request);
    }
    return app.fetch(request);
  },
};
