/**
 * @car-api/shared — tipe + katalog parameter yang dipakai BERSAMA oleh
 * apps/api (Hono) dan apps/portal (Astro).
 *
 * Desain data (sesuai yang dijelaskan ke klien AntekAsing):
 * - Setiap mobil punya penanda jenis penggerak (powertrain) mengikuti
 *   taksonomi: ICE, MHEV, FHEV, PHEV, REEV, BEV, FCEV, PFCEV.
 * - Parameter disimpan dalam katalog fleksibel: tiap parameter ditandai
 *   berlaku untuk jenis penggerak yang mana (appliesTo).
 * - API mengembalikan SATU format spek yang sama untuk semua mobil;
 *   field yang tidak berlaku untuk jenis penggeraknya dikosongkan (null).
 */

// ---------------------------------------------------------------------------
// Taksonomi jenis penggerak (powertrain)
// ---------------------------------------------------------------------------
export const POWERTRAINS = [
  "ICE",
  "MHEV",
  "FHEV",
  "PHEV",
  "REEV",
  "BEV",
  "FCEV",
  "PFCEV",
] as const;

export type Powertrain = (typeof POWERTRAINS)[number];

export const POWERTRAIN_LABELS: Record<Powertrain, string> = {
  ICE: "Mesin bensin/diesel (Internal Combustion Engine)",
  MHEV: "Mild Hybrid (MHEV)",
  FHEV: "Full Hybrid (FHEV)",
  PHEV: "Plug-in Hybrid (PHEV)",
  REEV: "Range-Extended EV (REEV)",
  BEV: "Listrik murni (Battery EV)",
  FCEV: "Sel bahan bakar hidrogen (FCEV)",
  PFCEV: "Plug-in Fuel Cell EV (PFCEV)",
};

/** Jenis penggerak yang memakai mesin pembakaran. */
export const COMBUSTION_POWERTRAINS: Powertrain[] = [
  "ICE",
  "MHEV",
  "FHEV",
  "PHEV",
  "REEV",
];

/** Jenis penggerak yang memakai motor listrik + baterai. */
export const ELECTRIC_POWERTRAINS: Powertrain[] = [
  "MHEV",
  "FHEV",
  "PHEV",
  "REEV",
  "BEV",
  "FCEV",
  "PFCEV",
];

// ---------------------------------------------------------------------------
// Katalog parameter (mengacu pada struktur 7 grup auto-data.net:
// umum, mesin pembakaran, performa, sasis, off-road, drivetrain/rem/
// suspensi, elektrik/hybrid — disederhanakan ke 5 grup di sini).
// ---------------------------------------------------------------------------
export interface ParameterDef {
  id: string;
  label: string;
  unit: string | null;
  group: string;
  /** Jenis penggerak yang parameter ini berlaku. */
  appliesTo: Powertrain[];
}

export interface ParameterGroup {
  id: string;
  label: string;
  parameters: ParameterDef[];
}

const ALL: Powertrain[] = [...POWERTRAINS];

export const PARAMETER_GROUPS: ParameterGroup[] = [
  {
    id: "general",
    label: "Informasi umum",
    parameters: [
      { id: "brand", label: "Merek", unit: null, group: "general", appliesTo: ALL },
      { id: "model", label: "Model", unit: null, group: "general", appliesTo: ALL },
      { id: "year", label: "Tahun produksi", unit: null, group: "general", appliesTo: ALL },
      { id: "bodyType", label: "Tipe bodi", unit: null, group: "general", appliesTo: ALL },
      { id: "seats", label: "Jumlah kursi", unit: "kursi", group: "general", appliesTo: ALL },
      { id: "priceIdr", label: "Harga (OTR Jakarta, contoh)", unit: "IDR", group: "general", appliesTo: ALL },
    ],
  },
  {
    id: "engine",
    label: "Mesin pembakaran",
    parameters: [
      { id: "engineDisplacementCc", label: "Kapasitas mesin", unit: "cc", group: "engine", appliesTo: COMBUSTION_POWERTRAINS },
      { id: "cylinders", label: "Jumlah silinder", unit: null, group: "engine", appliesTo: COMBUSTION_POWERTRAINS },
      { id: "engineType", label: "Tipe mesin", unit: null, group: "engine", appliesTo: COMBUSTION_POWERTRAINS },
      { id: "fuelType", label: "Jenis bahan bakar", unit: null, group: "engine", appliesTo: COMBUSTION_POWERTRAINS },
      { id: "powerHp", label: "Tenaga mesin", unit: "hp", group: "engine", appliesTo: COMBUSTION_POWERTRAINS },
      { id: "torqueNm", label: "Torsi mesin", unit: "Nm", group: "engine", appliesTo: COMBUSTION_POWERTRAINS },
      { id: "fuelConsumptionL100km", label: "Konsumsi BBM", unit: "L/100km", group: "engine", appliesTo: COMBUSTION_POWERTRAINS },
      { id: "fuelTankL", label: "Kapasitas tangki", unit: "L", group: "engine", appliesTo: COMBUSTION_POWERTRAINS },
      { id: "co2Gkm", label: "Emisi CO2", unit: "g/km", group: "engine", appliesTo: COMBUSTION_POWERTRAINS },
    ],
  },
  {
    id: "performance",
    label: "Performa",
    parameters: [
      { id: "topSpeedKmh", label: "Kecepatan maksimum", unit: "km/jam", group: "performance", appliesTo: ALL },
      { id: "acceleration0100S", label: "Akselerasi 0–100 km/jam", unit: "detik", group: "performance", appliesTo: ALL },
    ],
  },
  {
    id: "chassis",
    label: "Sasis & dimensi",
    parameters: [
      { id: "lengthMm", label: "Panjang", unit: "mm", group: "chassis", appliesTo: ALL },
      { id: "widthMm", label: "Lebar", unit: "mm", group: "chassis", appliesTo: ALL },
      { id: "heightMm", label: "Tinggi", unit: "mm", group: "chassis", appliesTo: ALL },
      { id: "wheelbaseMm", label: "Wheelbase", unit: "mm", group: "chassis", appliesTo: ALL },
      { id: "weightKg", label: "Berat kosong", unit: "kg", group: "chassis", appliesTo: ALL },
      { id: "transmission", label: "Transmisi", unit: null, group: "chassis", appliesTo: ALL },
      { id: "drivetrain", label: "Penggerak roda", unit: null, group: "chassis", appliesTo: ALL },
    ],
  },
  {
    id: "electric",
    label: "Elektrik & hybrid",
    parameters: [
      { id: "batteryKwh", label: "Kapasitas baterai", unit: "kWh", group: "electric", appliesTo: ELECTRIC_POWERTRAINS },
      { id: "batteryType", label: "Tipe baterai", unit: null, group: "electric", appliesTo: ELECTRIC_POWERTRAINS },
      { id: "motorPowerKw", label: "Daya motor listrik", unit: "kW", group: "electric", appliesTo: ELECTRIC_POWERTRAINS },
      { id: "motorType", label: "Tipe motor", unit: null, group: "electric", appliesTo: ELECTRIC_POWERTRAINS },
      { id: "rangeWltpKm", label: "Jarak tempuh (WLTP)", unit: "km", group: "electric", appliesTo: ["BEV", "PHEV", "REEV", "FCEV", "PFCEV"] },
      { id: "energyConsumptionKwh100km", label: "Konsumsi energi", unit: "kWh/100km", group: "electric", appliesTo: ["BEV", "PHEV", "REEV"] },
      { id: "chargingAcKw", label: "Daya charging AC", unit: "kW", group: "electric", appliesTo: ["BEV", "PHEV", "REEV"] },
      { id: "chargingDcKw", label: "Daya charging DC", unit: "kW", group: "electric", appliesTo: ["BEV", "PHEV", "REEV"] },
      { id: "chargingTime1080Min", label: "Waktu charging 10–80%", unit: "menit", group: "electric", appliesTo: ["BEV", "PHEV", "REEV"] },
      { id: "systemPowerHp", label: "Tenaga sistem gabungan", unit: "hp", group: "electric", appliesTo: ["MHEV", "FHEV", "PHEV", "REEV"] },
      { id: "electricRangeKm", label: "Jarak tempuh listrik murni", unit: "km", group: "electric", appliesTo: ["PHEV", "REEV", "FHEV"] },
      { id: "combinedRangeKm", label: "Jarak tempuh gabungan", unit: "km", group: "electric", appliesTo: ["PHEV", "REEV"] },
    ],
  },
];

/** Semua parameter dalam satu daftar datar (untuk endpoint /v1/parameters). */
export const ALL_PARAMETERS: ParameterDef[] = PARAMETER_GROUPS.flatMap(
  (g) => g.parameters,
);

// ---------------------------------------------------------------------------
// Tipe spek mobil — SATU format untuk semua jenis penggerak.
// Field yang tidak berlaku untuk powertrain mobil itu bernilai null.
// ---------------------------------------------------------------------------
export interface CarSpec {
  id: string;
  brand: string;
  model: string;
  variant: string | null;
  year: number;
  bodyType: string;
  powertrain: Powertrain;
  seats: number | null;
  priceIdr: number | null;
  dimensions: {
    lengthMm: number | null;
    widthMm: number | null;
    heightMm: number | null;
    wheelbaseMm: number | null;
  };
  weightKg: number | null;
  transmission: string | null;
  drivetrain: string | null; // FWD | RWD | AWD
  topSpeedKmh: number | null;
  acceleration0100S: number | null;
  // Mesin pembakaran (null untuk BEV murni)
  engineDisplacementCc: number | null;
  cylinders: number | null;
  engineType: string | null;
  fuelType: string | null;
  powerHp: number | null;
  torqueNm: number | null;
  fuelConsumptionL100km: number | null;
  fuelTankL: number | null;
  co2Gkm: number | null;
  // Elektrik / hybrid (null untuk ICE murni)
  batteryKwh: number | null;
  batteryType: string | null;
  motorPowerKw: number | null;
  motorType: string | null;
  rangeWltpKm: number | null;
  energyConsumptionKwh100km: number | null;
  chargingAcKw: number | null;
  chargingDcKw: number | null;
  chargingTime1080Min: number | null;
  systemPowerHp: number | null;
  electricRangeKm: number | null;
  combinedRangeKm: number | null;
}

// ---------------------------------------------------------------------------
// Tier & kuota (angka contoh — lihat README)
// ---------------------------------------------------------------------------
export type Tier = "free" | "pro";

export const TIER_LIMITS: Record<Tier, { requestsPerDay: number; label: string }> = {
  free: { requestsPerDay: 100, label: "Free" },
  pro: { requestsPerDay: 10_000, label: "Pro" },
};

export const TIER_PRICES: Record<Tier, { priceIdrPerMonth: number; label: string }> = {
  free: { priceIdrPerMonth: 0, label: "Free — Rp0" },
  pro: { priceIdrPerMonth: 99_000, label: "Pro — Rp99.000/bulan (contoh)" },
};
