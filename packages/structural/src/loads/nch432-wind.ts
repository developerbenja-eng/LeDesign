// ============================================================
// NCh432:2025 - Chilean Wind Design Code
// Diseño Estructural - Cargas de Viento
// ============================================================
// Reference: NCh432:2025 (based on ASCE 7-22)
// Previous: NCh432:2010 (based on ASCE 7-05)
// Sources:
// - https://ecommerce.inn.cl/nch432202588539
// - https://icha.cl/inn-aprueba-nueva-norma-nch-432-diseno-estructural-y-cargas-de-viento/
// ============================================================

// ============================================================
// WIND SPEED ZONES (Zonas de Velocidad de Viento)
// ============================================================

export type ChileanWindZone = 1 | 2 | 3 | 4 | 5;

export interface WindZoneData {
  zone: ChileanWindZone;
  V: number;           // Basic wind speed (m/s) - 3-second gust at 10m height
  description: string;
  regions: string[];   // Approximate regions covered
}

/**
 * Chilean wind speed zones per NCh432:2010/2025
 * Tabla 6 - Velocidad básica del viento
 */
export const CHILEAN_WIND_ZONES: Record<ChileanWindZone, WindZoneData> = {
  1: {
    zone: 1,
    V: 30,
    description: 'Zona 1 - Velocidad básica 30 m/s',
    regions: ['Interior centro-norte', 'Valles protegidos'],
  },
  2: {
    zone: 2,
    V: 35,
    description: 'Zona 2 - Velocidad básica 35 m/s',
    regions: ['Valle central', 'Santiago', 'Valparaíso interior'],
  },
  3: {
    zone: 3,
    V: 45,
    description: 'Zona 3 - Velocidad básica 45 m/s',
    regions: ['Costa central', 'Coquimbo', 'Antofagasta'],
  },
  4: {
    zone: 4,
    V: 50,
    description: 'Zona 4 - Velocidad básica 50 m/s',
    regions: ['Costa sur', 'Araucanía', 'Los Ríos'],
  },
  5: {
    zone: 5,
    V: 55,
    description: 'Zona 5 - Velocidad básica 55 m/s',
    regions: ['Magallanes', 'Aysén', 'Zona austral'],
  },
};

// ============================================================
// EXPOSURE CATEGORIES (Categorías de Exposición)
// ============================================================

export type ExposureCategory = 'B' | 'C' | 'D';

export interface ExposureCategoryData {
  category: ExposureCategory;
  alpha: number;        // Power law exponent
  zg: number;           // Gradient height (m)
  description: string;
  descriptionEs: string;
  terrain: string;
}

/**
 * Exposure categories per NCh432 Art. 7.6.4
 * Based on ASCE 7 classifications
 */
export const EXPOSURE_CATEGORIES: Record<ExposureCategory, ExposureCategoryData> = {
  B: {
    category: 'B',
    alpha: 7.0,
    zg: 365.76,
    description: 'Urban and suburban areas with obstructions',
    descriptionEs: 'Áreas urbanas y suburbanas con obstrucciones',
    terrain: 'Buildings, trees, or other obstructions ≥ 6m height within 792m',
  },
  C: {
    category: 'C',
    alpha: 9.5,
    zg: 274.32,
    description: 'Open terrain with scattered obstructions',
    descriptionEs: 'Terreno abierto con obstrucciones dispersas',
    terrain: 'Flat, open country with obstructions < 9m height',
  },
  D: {
    category: 'D',
    alpha: 11.5,
    zg: 213.36,
    description: 'Flat, unobstructed coastal areas',
    descriptionEs: 'Áreas costeras planas y sin obstrucciones',
    terrain: 'Flat, unobstructed surfaces including smooth water and ice',
  },
};

// ============================================================
// RISK CATEGORIES AND IMPORTANCE FACTORS
// ============================================================

export type WindRiskCategory = 'I' | 'II' | 'III' | 'IV';

export interface WindRiskCategoryData {
  category: WindRiskCategory;
  Iw: number;           // Wind importance factor
  mri: number;          // Mean recurrence interval (years)
  description: string;
  examples: string[];
}

/**
 * Risk categories and wind importance factors
 * Similar to seismic occupancy categories
 */
export const WIND_RISK_CATEGORIES: Record<WindRiskCategory, WindRiskCategoryData> = {
  I: {
    category: 'I',
    Iw: 0.87,
    mri: 300,
    description: 'Low risk to human life',
    examples: ['Agricultural facilities', 'Minor storage', 'Temporary structures'],
  },
  II: {
    category: 'II',
    Iw: 1.00,
    mri: 700,
    description: 'Standard occupancy',
    examples: ['Residential', 'Commercial', 'Industrial'],
  },
  III: {
    category: 'III',
    Iw: 1.15,
    mri: 1700,
    description: 'High occupancy or hazardous contents',
    examples: ['Schools', 'Theaters', 'Assembly halls', 'Hazardous storage'],
  },
  IV: {
    category: 'IV',
    Iw: 1.15,
    mri: 1700,
    description: 'Essential facilities',
    examples: ['Hospitals', 'Fire stations', 'Emergency shelters', 'Power plants'],
  },
};

// ============================================================
// TOPOGRAPHIC FACTORS (Kzt)
// ============================================================

export type TopographicFeature = 'flat' | 'escarpment' | 'ridge' | 'hill';

export interface TopographicParams {
  feature: TopographicFeature;
  H: number;            // Height of hill or escarpment (m)
  Lh: number;           // Distance from crest to half-height (m)
  x: number;            // Distance from crest (m)
  z: number;            // Height above ground (m)
}

/**
 * Topographic multiplier factors K1, K2, K3
 * NCh432 Art. 7.7 / ASCE 7 Table 26.8-1
 */
export function calculateKzt(params: TopographicParams): number {
  const { feature, H, Lh, x, z } = params;

  if (feature === 'flat' || H / Lh < 0.05) {
    return 1.0;
  }

  // K1 factors based on H/Lh ratio
  let K1: number;
  const slope = H / Lh;

  if (feature === 'ridge' || feature === 'escarpment') {
    if (slope <= 0.1) K1 = 0.29;
    else if (slope <= 0.2) K1 = 0.36;
    else if (slope <= 0.25) K1 = 0.43;
    else if (slope <= 0.3) K1 = 0.51;
    else if (slope <= 0.35) K1 = 0.58;
    else if (slope <= 0.4) K1 = 0.65;
    else if (slope <= 0.45) K1 = 0.72;
    else K1 = 0.80;
  } else {
    // Hill
    if (slope <= 0.1) K1 = 0.17;
    else if (slope <= 0.2) K1 = 0.21;
    else if (slope <= 0.25) K1 = 0.26;
    else if (slope <= 0.3) K1 = 0.30;
    else if (slope <= 0.35) K1 = 0.34;
    else if (slope <= 0.4) K1 = 0.38;
    else if (slope <= 0.45) K1 = 0.43;
    else K1 = 0.47;
  }

  // K2 factor (horizontal attenuation)
  const mu = feature === 'escarpment' ? 1.5 : 1.0;
  const K2 = 1 - Math.abs(x) / (mu * Lh);

  // K3 factor (vertical attenuation)
  const gamma = feature === 'escarpment' ? 2.5 : 3.0;
  const K3 = Math.exp(-gamma * z / Lh);

  // Combined topographic factor
  const Kzt = Math.pow(1 + K1 * K2 * K3, 2);

  return Math.max(1.0, Kzt);
}

// ============================================================
// VELOCITY PRESSURE CALCULATION
// ============================================================

export interface WindLoadParams {
  zone: ChileanWindZone;
  exposure: ExposureCategory;
  riskCategory: WindRiskCategory;
  height: number;                   // Building height (m)
  topographic?: TopographicParams;
  enclosure?: EnclosureClass;
}

export interface VelocityPressureResult {
  V: number;            // Basic wind speed (m/s)
  Kz: number;           // Velocity pressure coefficient
  Kzt: number;          // Topographic factor
  Kd: number;           // Directionality factor (default 0.85)
  Ke: number;           // Ground elevation factor
  qz: number;           // Velocity pressure at height z (kN/m²)
  qh: number;           // Velocity pressure at mean roof height (kN/m²)
}

/**
 * Calculate velocity pressure exposure coefficient Kz
 * NCh432 Table 2 / ASCE 7 Table 26.10-1
 */
export function calculateKz(
  z: number,
  exposure: ExposureCategory
): number {
  const exp = EXPOSURE_CATEGORIES[exposure];
  const zg = exp.zg;
  const alpha = exp.alpha;

  // Minimum height = 4.57m (15 ft)
  const zEff = Math.max(z, 4.57);
  // Maximum height = zg
  const zCapped = Math.min(zEff, zg);

  return 2.01 * Math.pow(zCapped / zg, 2 / alpha);
}

/**
 * Calculate ground elevation factor Ke
 * Based on altitude above sea level
 */
export function calculateKe(altitude: number = 0): number {
  // Ke = e^(-0.0000362 * altitude)
  return Math.exp(-0.0000362 * altitude);
}

/**
 * Calculate velocity pressure qz
 * qz = 0.613 * Kz * Kzt * Kd * Ke * V² (N/m²)
 */
export function calculateVelocityPressure(
  params: WindLoadParams,
  altitude: number = 0
): VelocityPressureResult {
  const zone = CHILEAN_WIND_ZONES[params.zone];
  const V = zone.V;

  const Kz = calculateKz(params.height, params.exposure);
  const Kzt = params.topographic
    ? calculateKzt(params.topographic)
    : 1.0;
  const Kd = 0.85; // Directionality factor (buildings)
  const Ke = calculateKe(altitude);

  // Velocity pressure in N/m² = 0.613 * Kz * Kzt * Kd * Ke * V²
  const qz_Nm2 = 0.613 * Kz * Kzt * Kd * Ke * Math.pow(V, 2);
  const qz = qz_Nm2 / 1000; // Convert to kN/m²

  // At mean roof height
  const Kh = calculateKz(params.height, params.exposure);
  const qh_Nm2 = 0.613 * Kh * Kzt * Kd * Ke * Math.pow(V, 2);
  const qh = qh_Nm2 / 1000;

  return { V, Kz, Kzt, Kd, Ke, qz, qh };
}

// ============================================================
// ENCLOSURE CLASSIFICATION
// ============================================================

export type EnclosureClass = 'enclosed' | 'partially_enclosed' | 'partially_open' | 'open';

export interface EnclosureData {
  class: EnclosureClass;
  GCpi_positive: number;  // Internal pressure coefficient (+)
  GCpi_negative: number;  // Internal pressure coefficient (-)
  description: string;
}

/**
 * Enclosure classifications and internal pressure coefficients
 * NCh432 / ASCE 7 Table 26.13-1
 */
export const ENCLOSURE_CLASSIFICATIONS: Record<EnclosureClass, EnclosureData> = {
  enclosed: {
    class: 'enclosed',
    GCpi_positive: 0.18,
    GCpi_negative: -0.18,
    description: 'Enclosed building - openings < 1% of wall area',
  },
  partially_enclosed: {
    class: 'partially_enclosed',
    GCpi_positive: 0.55,
    GCpi_negative: -0.55,
    description: 'Partially enclosed - openings exceed 1% in one wall',
  },
  partially_open: {
    class: 'partially_open',
    GCpi_positive: 0.55,
    GCpi_negative: -0.55,
    description: 'Partially open structure',
  },
  open: {
    class: 'open',
    GCpi_positive: 0.0,
    GCpi_negative: 0.0,
    description: 'Open building - ≥ 80% of walls open',
  },
};

// ============================================================
// GUST EFFECT FACTOR
// ============================================================

export interface GustEffectParams {
  height: number;           // Mean roof height (m)
  buildingWidth: number;    // Building width (m)
  buildingDepth: number;    // Building depth (m)
  naturalFrequency?: number; // Fundamental frequency (Hz)
  damping?: number;          // Damping ratio (default 0.02)
  exposure: ExposureCategory;
}

/**
 * Calculate gust effect factor G
 * For rigid buildings (f1 > 1 Hz): G = 0.85
 * For flexible buildings: calculated per ASCE 7 Section 26.11
 */
export function calculateGustEffectFactor(params: GustEffectParams): number {
  const { height, naturalFrequency = 1.0, exposure } = params;

  // For rigid buildings (natural frequency > 1 Hz)
  if (naturalFrequency >= 1.0) {
    return 0.85;
  }

  // For flexible buildings - simplified calculation
  const exp = EXPOSURE_CATEGORIES[exposure];
  const zbar = 0.6 * height;
  const Iz = 0.3 * Math.pow(10 / zbar, 1 / 6); // Turbulence intensity

  // Background response factor
  const Lz = Math.pow(zbar / 10, 0.2) * 97.5; // Integral length scale
  const Q = Math.sqrt(1 / (1 + 0.63 * Math.pow((params.buildingWidth + height) / Lz, 0.63)));

  // Gust effect factor for flexible buildings
  const gq = 3.4;
  const gv = 3.4;
  const G = 0.925 * (1 + 1.7 * gq * Iz * Q) / (1 + 1.7 * gv * Iz);

  return Math.max(0.85, G);
}

// ============================================================
// EXTERNAL PRESSURE COEFFICIENTS
// ============================================================

export interface WallPressureCoefficients {
  windward: number;
  leeward: number;
  side: number;
}

export interface RoofPressureCoefficients {
  windward: number;
  leeward: number;
  parallel: number;
}

/**
 * Get wall pressure coefficients Cp
 * ASCE 7 Figure 27.3-1
 */
export function getWallCp(L_over_B: number): WallPressureCoefficients {
  // Windward wall
  const windward = 0.8;

  // Leeward wall depends on L/B ratio
  let leeward: number;
  if (L_over_B <= 1) leeward = -0.5;
  else if (L_over_B <= 2) leeward = -0.3;
  else leeward = -0.2;

  // Side walls
  const side = -0.7;

  return { windward, leeward, side };
}

/**
 * Get roof pressure coefficients Cp for flat/low-slope roofs
 * ASCE 7 Figure 27.3-1
 */
export function getFlatRoofCp(
  h_over_L: number,
  windwardDistance: number,
  roofLength: number
): number {
  const x_over_h = windwardDistance / (h_over_L * roofLength);

  if (h_over_L <= 0.25) {
    return x_over_h < 0.5 ? -0.9 : -0.5;
  } else if (h_over_L <= 0.5) {
    return x_over_h < 0.5 ? -0.9 : -0.5;
  } else {
    return x_over_h < 0.5 ? -1.3 : -0.7;
  }
}

// ============================================================
// DESIGN WIND PRESSURE
// ============================================================

export interface DesignWindPressure {
  p_windward_wall: number;    // kN/m²
  p_leeward_wall: number;     // kN/m²
  p_side_walls: number;       // kN/m²
  p_roof_zone1: number;       // kN/m² (near windward edge)
  p_roof_zone2: number;       // kN/m² (interior)
  p_total_mwfrs: number;      // Total for MWFRS (kN/m²)
}

/**
 * Calculate design wind pressures for MWFRS
 * p = q * G * Cp - qi * (GCpi)
 */
export function calculateDesignPressures(
  params: WindLoadParams,
  buildingDimensions: { width: number; depth: number; height: number },
  altitude: number = 0
): DesignWindPressure {
  const vp = calculateVelocityPressure(params, altitude);
  const G = calculateGustEffectFactor({
    height: buildingDimensions.height,
    buildingWidth: buildingDimensions.width,
    buildingDepth: buildingDimensions.depth,
    exposure: params.exposure,
  });

  const L_over_B = buildingDimensions.depth / buildingDimensions.width;
  const wallCp = getWallCp(L_over_B);

  const enclosure = params.enclosure || 'enclosed';
  const GCpi = ENCLOSURE_CLASSIFICATIONS[enclosure].GCpi_positive;

  // External pressures
  const p_windward = vp.qz * G * wallCp.windward;
  const p_leeward = vp.qh * G * wallCp.leeward;
  const p_side = vp.qh * G * wallCp.side;

  // Internal pressure
  const p_internal = vp.qh * GCpi;

  // Net pressures (positive = inward)
  const p_windward_wall = p_windward - (-p_internal);
  const p_leeward_wall = p_leeward - p_internal;
  const p_side_walls = p_side - p_internal;

  // Roof pressures (flat roof)
  const h_over_L = buildingDimensions.height / buildingDimensions.depth;
  const Cp_roof1 = getFlatRoofCp(h_over_L, 0, buildingDimensions.depth);
  const Cp_roof2 = getFlatRoofCp(h_over_L, buildingDimensions.depth, buildingDimensions.depth);

  const p_roof_zone1 = vp.qh * G * Cp_roof1 - p_internal;
  const p_roof_zone2 = vp.qh * G * Cp_roof2 - p_internal;

  // Total horizontal pressure for MWFRS
  const p_total_mwfrs = Math.abs(p_windward_wall) + Math.abs(p_leeward_wall);

  return {
    p_windward_wall,
    p_leeward_wall,
    p_side_walls,
    p_roof_zone1,
    p_roof_zone2,
    p_total_mwfrs,
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Estimate wind zone from latitude (simplified)
 * For accurate determination, use official zone maps
 */
export function estimateWindZoneFromLatitude(latitude: number): ChileanWindZone {
  const absLat = Math.abs(latitude);

  if (absLat >= 50) return 5;      // Magallanes
  if (absLat >= 43) return 4;      // Aysén, Los Lagos sur
  if (absLat >= 33) return 3;      // Costa central a sur
  if (absLat >= 27) return 2;      // Valle central
  return 1;                         // Norte interior
}

/**
 * Get wind load summary for a building
 */
export function getWindLoadSummary(
  params: WindLoadParams,
  building: { width: number; depth: number; height: number },
  altitude: number = 0
): {
  zone: WindZoneData;
  exposure: ExposureCategoryData;
  riskCategory: WindRiskCategoryData;
  velocityPressure: VelocityPressureResult;
  pressures: DesignWindPressure;
} {
  const zone = CHILEAN_WIND_ZONES[params.zone];
  const exposure = EXPOSURE_CATEGORIES[params.exposure];
  const riskCategory = WIND_RISK_CATEGORIES[params.riskCategory];
  const velocityPressure = calculateVelocityPressure(params, altitude);
  const pressures = calculateDesignPressures(params, building, altitude);

  return { zone, exposure, riskCategory, velocityPressure, pressures };
}

// ============================================================
// EXPORT TYPES
// ============================================================

export interface NCh432WindParameters {
  code: 'NCh432';
  version: '2025' | '2010';
  zone: ChileanWindZone;
  basicWindSpeed: number;       // V (m/s)
  exposure: ExposureCategory;
  riskCategory: WindRiskCategory;
  enclosure: EnclosureClass;
  topographicFactor: number;    // Kzt
  importanceFactor: number;     // Iw
}

/**
 * Create complete NCh432 wind parameters object
 */
export function createNCh432WindParameters(
  zone: ChileanWindZone,
  exposure: ExposureCategory,
  riskCategory: WindRiskCategory,
  enclosure: EnclosureClass = 'enclosed',
  topographicParams?: TopographicParams
): NCh432WindParameters {
  const zoneData = CHILEAN_WIND_ZONES[zone];
  const riskData = WIND_RISK_CATEGORIES[riskCategory];
  const Kzt = topographicParams ? calculateKzt(topographicParams) : 1.0;

  return {
    code: 'NCh432',
    version: '2025',
    zone,
    basicWindSpeed: zoneData.V,
    exposure,
    riskCategory,
    enclosure,
    topographicFactor: Kzt,
    importanceFactor: riskData.Iw,
  };
}
