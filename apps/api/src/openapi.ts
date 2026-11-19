/**
 * openapi.ts — spesifikasi OpenAPI 3.0 untuk Car Web API.
 * Disajikan di GET /openapi.json (dipakai juga oleh halaman /v1/docs).
 */
export const OPENAPI_SPEC = {
  openapi: "3.0.3",
  info: {
    title: "Car Web API — API Spesifikasi Mobil Indonesia",
    version: "0.1.0",
    description:
      "API spesifikasi mobil yang beredar di Indonesia. Satu API key untuk semua endpoint. " +
      "Data pada contoh ini adalah DATA CONTOH dan harus diverifikasi dari situs resmi pabrikan sebelum tayang.",
  },
  servers: [{ url: "http://localhost:3001", description: "Contoh lokal" }],
  tags: [
    { name: "specs", description: "Data spesifikasi mobil" },
    { name: "auth", description: "Pendaftaran & API key" },
    { name: "usage", description: "Statistik pemakaian" },
    { name: "meta", description: "Katalog & dokumentasi" },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: "apiKey",
        in: "header",
        name: "x-api-key",
      },
    },
    schemas: {
      CarSpec: {
        type: "object",
        properties: {
          id: { type: "string", example: "toyota-avanza-15-g-2024" },
          brand: { type: "string", example: "Toyota" },
          model: { type: "string", example: "Avanza" },
          variant: { type: "string", nullable: true, example: "1.5 G CVT" },
          year: { type: "integer", example: 2024 },
          bodyType: { type: "string", example: "MPV" },
          powertrain: {
            type: "string",
            enum: ["ICE", "MHEV", "FHEV", "PHEV", "REEV", "BEV", "FCEV", "PFCEV"],
          },
          seats: { type: "integer", nullable: true, example: 7 },
          priceIdr: { type: "integer", nullable: true, example: 272000000 },
          dimensions: {
            type: "object",
            properties: {
              lengthMm: { type: "integer", nullable: true },
              widthMm: { type: "integer", nullable: true },
              heightMm: { type: "integer", nullable: true },
              wheelbaseMm: { type: "integer", nullable: true },
            },
          },
          weightKg: { type: "integer", nullable: true },
          transmission: { type: "string", nullable: true, example: "CVT" },
          drivetrain: { type: "string", nullable: true, example: "FWD" },
          topSpeedKmh: { type: "integer", nullable: true },
          acceleration0100S: { type: "number", nullable: true },
          engineDisplacementCc: { type: "integer", nullable: true, example: 1496 },
          cylinders: { type: "integer", nullable: true, example: 4 },
          engineType: { type: "string", nullable: true },
          fuelType: { type: "string", nullable: true, example: "Bensin" },
          powerHp: { type: "integer", nullable: true, example: 106 },
          torqueNm: { type: "integer", nullable: true, example: 138 },
          fuelConsumptionL100km: { type: "number", nullable: true },
          fuelTankL: { type: "integer", nullable: true, example: 43 },
          co2Gkm: { type: "integer", nullable: true },
          batteryKwh: { type: "number", nullable: true, example: 60.48 },
          batteryType: { type: "string", nullable: true, example: "Blade LFP" },
          motorPowerKw: { type: "number", nullable: true, example: 150 },
          motorType: { type: "string", nullable: true },
          rangeWltpKm: { type: "integer", nullable: true, example: 420 },
          energyConsumptionKwh100km: { type: "number", nullable: true },
          chargingAcKw: { type: "number", nullable: true },
          chargingDcKw: { type: "number", nullable: true },
          chargingTime1080Min: { type: "integer", nullable: true },
          systemPowerHp: { type: "integer", nullable: true, example: 186 },
          electricRangeKm: { type: "integer", nullable: true },
          combinedRangeKm: { type: "integer", nullable: true },
        },
      },
      ApiError: {
        type: "object",
        properties: {
          error: {
            type: "object",
            properties: {
              code: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
  },
  security: [{ ApiKeyAuth: [] }],
  paths: {
    "/v1/specs": {
      get: {
        tags: ["specs"],
        summary: "Daftar spesifikasi mobil",
        parameters: [
          { name: "brand", in: "query", schema: { type: "string" }, description: "Filter merek (cocok sebagian, tanpa huruf besar-kecil)" },
          { name: "powertrain", in: "query", schema: { type: "string", enum: ["ICE", "MHEV", "FHEV", "PHEV", "REEV", "BEV", "FCEV", "PFCEV"] } },
          { name: "year", in: "query", schema: { type: "integer" }, description: "Filter tahun produksi" },
          { name: "search", in: "query", schema: { type: "string" }, description: "Cari di merek, model, dan varian" },
        ],
        responses: {
          "200": { description: "Daftar spek", content: { "application/json": { schema: { type: "object", properties: { data: { type: "array", items: { $ref: "#/components/schemas/CarSpec" } }, meta: { type: "object" } } } } } },
          "401": { description: "API key tidak ada / tidak valid", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
          "429": { description: "Kuota harian habis", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
    },
    "/v1/specs/{id}": {
      get: {
        tags: ["specs"],
        summary: "Satu spesifikasi mobil berdasarkan id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Satu spek", content: { "application/json": { schema: { $ref: "#/components/schemas/CarSpec" } } } },
          "404": { description: "Mobil tidak ditemukan", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } } },
        },
      },
    },
    "/v1/brands": {
      get: {
        tags: ["specs"],
        summary: "Daftar merek + jumlah model",
        responses: { "200": { description: "Daftar merek" } },
      },
    },
    "/v1/parameters": {
      get: {
        tags: ["meta"],
        summary: "Katalog parameter + jenis penggerak yang berlaku",
        responses: { "200": { description: "Katalog parameter per grup" } },
      },
    },
    "/v1/auth/register": {
      post: {
        tags: ["auth"],
        summary: "Daftar dan dapatkan API key baru (tier Free)",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email"],
                properties: {
                  name: { type: "string", example: "Budi Santoso" },
                  email: { type: "string", format: "email", example: "budi@contoh.id" },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "API key baru dibuat" },
          "400": { description: "Nama/email tidak valid" },
        },
      },
    },
    "/v1/usage": {
      get: {
        tags: ["usage"],
        summary: "Statistik pemakaian API key Anda (hit hari ini, sisa kuota)",
        responses: { "200": { description: "Statistik pemakaian" } },
      },
    },
    "/v1/docs": {
      get: {
        tags: ["meta"],
        summary: "Dokumentasi API (HTML)",
        security: [],
        responses: { "200": { description: "Halaman dokumentasi" } },
      },
    },
    "/openapi.json": {
      get: {
        tags: ["meta"],
        summary: "Spesifikasi OpenAPI 3.0 (JSON)",
        security: [],
        responses: { "200": { description: "Dokumen OpenAPI" } },
      },
    },
  },
};
