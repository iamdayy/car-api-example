/** Halaman dokumentasi HTML sederhana di GET /v1/docs. */

const CSS = `
  body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;max-width:880px;margin:0 auto;padding:32px 20px;color:#111827;background:#fff;line-height:1.6}
  h1{font-size:28px;margin:0 0 4px} h2{font-size:20px;margin-top:36px;border-bottom:1px solid #e5e7eb;padding-bottom:6px}
  code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:13px}
  pre{background:#111827;color:#f9fafb;padding:16px;border-radius:8px;overflow-x:auto;font-size:13px}
  pre code{background:transparent;color:inherit;padding:0}
  .badge{display:inline-block;background:#fef3c7;color:#92400e;font-size:12px;padding:2px 8px;border-radius:999px;margin-bottom:12px}
  table{border-collapse:collapse;width:100%;font-size:14px}
  th,td{border:1px solid #e5e7eb;padding:8px 10px;text-align:left;vertical-align:top}
  th{background:#f9fafb}
  .muted{color:#6b7280;font-size:14px}
`;

function endpointRow(
  method: string,
  path: string,
  desc: string,
  example?: string,
): string {
  return `<tr><td><code>${method}</code></td><td><code>${path}</code></td><td>${desc}${example ? `<pre><code>${example}</code></pre>` : ""}</td></tr>`;
}

export function docsHtml(apiBase: string, demoKey: string): string {
  return `<!doctype html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Car Web API — Dokumentasi</title><style>${CSS}</style></head>
<body>
<h1>Car Web API</h1>
<p class="muted">API spesifikasi mobil yang beredar di Indonesia. Satu API key untuk semua endpoint.</p>
<p><span class="badge">DATA CONTOH — nilai spek harus diverifikasi dari situs resmi pabrikan sebelum tayang.</span></p>

<h2>Memulai</h2>
<ol>
  <li>Daftar di developer portal untuk mendapatkan API key, atau coba key demo di bawah.</li>
  <li>Kirim API key di header <code>x-api-key</code> pada setiap request.</li>
  <li>Kuota tier Free: 100 request/hari. Tier Pro: 10.000 request/hari.</li>
</ol>
<pre><code>curl ${apiBase}/v1/specs?brand=Toyota \\
  -H "x-api-key: ${demoKey}"</code></pre>
<p>Key demo (tier Free, untuk mencoba): <code>${demoKey}</code></p>
<p>Spesifikasi OpenAPI: <a href="/openapi.json"><code>/openapi.json</code></a></p>

<h2>Endpoint</h2>
<table>
<tr><th>Method</th><th>Path</th><th>Keterangan</th></tr>
${endpointRow("GET", "/v1/specs", "Daftar spek. Filter: <code>?brand=</code>, <code>?powertrain=ICE|MHEV|FHEV|PHEV|REEV|BEV|FCEV|PFCEV</code>, <code>?year=</code>, <code>?search=</code>.", `curl ${apiBase}/v1/specs?powertrain=BEV -H "x-api-key: ${demoKey}"`)}
${endpointRow("GET", "/v1/specs/:id", "Satu spek berdasarkan id.", `curl ${apiBase}/v1/specs/byd-atto-3-superior-2024 -H "x-api-key: ${demoKey}"`)}
${endpointRow("GET", "/v1/brands", "Daftar merek + jumlah model.")}
${endpointRow("GET", "/v1/parameters", "Katalog parameter + jenis penggerak yang berlaku untuk tiap parameter.")}
${endpointRow("POST", "/v1/auth/register", "Daftar dan dapatkan API key baru (tier Free). Body JSON: <code>{&quot;name&quot;, &quot;email&quot;}</code>.", `curl -X POST ${apiBase}/v1/auth/register -H "Content-Type: application/json" -d '{"name":"Budi","email":"budi@contoh.id"}'`)}
${endpointRow("GET", "/v1/usage", "Statistik pemakaian API key Anda: hit hari ini, sisa kuota, total hit.")}
${endpointRow("GET", "/v1/docs", "Halaman ini.")}
${endpointRow("GET", "/openapi.json", "Spesifikasi OpenAPI 3.0 (JSON).")}
</table>

<h2>Autentikasi</h2>
<p>Semua endpoint <code>/v1/*</code> kecuali <code>/v1/auth/register</code>, <code>/v1/docs</code>, dan <code>/openapi.json</code> membutuhkan header <code>x-api-key</code>.</p>
<pre><code>x-api-key: ${demoKey}</code></pre>
<p>Tanpa key atau key tidak valid → <code>401 Unauthorized</code>. Kuota harian habis → <code>429 Too Many Requests</code> dengan header <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>, dan <code>X-RateLimit-Reset</code>.</p>

<h2>Format spek</h2>
<p>Semua mobil memakai satu format yang sama. Field yang tidak berlaku untuk jenis penggeraknya bernilai <code>null</code> — misalnya mobil bensin tidak punya <code>batteryKwh</code>, dan mobil listrik tidak punya <code>engineDisplacementCc</code>. Taksonomi jenis penggerak: ICE, MHEV, FHEV, PHEV, REEV, BEV, FCEV, PFCEV.</p>
</body>
</html>`;
}
