// ============================================================
// NCh433 RESPONSE SPECTRUM GENERATOR
// Chilean seismic design code (NCh433.Of1996 Mod.2009)
// ============================================================

import { SpectrumPoint, CodeBasedSpectrumParams } from '@/types/structural/loads';

// ============================================================
// ZONE PARAMETERS
// ============================================================

/**
 * Seismic zone parameters for Chile
 * Based on NCh433 zoning map
 */
export const NCh433_ZONES = {
  1: { A0: 0.20, name: 'Baja (Zona 1)' }, // Low seismicity
  2: { A0: 0.30, name: 'Intermedia (Zona 2)' }, // Intermediate
  3: { A0: 0.40, name: 'Alta (Zona 3)' }, // High seismicity
} as const;

/**
 * Soil classification factors
 */
export const NCh433_SOIL_TYPES = {
  A: { S: 0.90, T0: 0.15, Tp: 0.20, n: 1.0, name: 'Roca' },
  B: { S: 1.00, T0: 0.30, Tp: 0.35, n: 1.33, name: 'Suelo tipo I' },
  C: { S: 1.05, T0: 0.40, Tp: 0.45, n: 1.40, name: 'Suelo tipo II' },
  D: { S: 1.20, T0: 0.75, Tp: 0.85, n: 1.80, name: 'Suelo tipo III' },
  E: { S: 1.30, T0: 1.20, Tp: 1.35, n: 1.80, name: 'Suelo tipo IV' },
  F: { S: 1.00, T0: 0.15, Tp: 0.20, n: 1.00, name: 'Especial (requiere estudio)' },
} as const;

/**
 * Occupancy categories (Importance factor)
 */
export const NCh433_OCCUPANCY = {
  I: { I: 1.0, name: 'Edificios de importancia normal' },
  II: { I: 1.2, name: 'Edificios de ocupación especial' },
  III: { I: 1.4, name: 'Edificios de ocupación importante' },
  IV: { I: 1.6, name: 'Edificios de ocupación esencial' },
} as const;

/**
 * Structural system response modification factors
 */
export const NCh433_STRUCTURAL_SYSTEMS = {
  'reinforced-concrete-moment-frame': {
    R0: 11,
    name: 'Marcos arriostrados de hormigón armado',
  },
  'steel-moment-frame': {
    R0: 11,
    name: 'Marcos arriostrados de acero',
  },
  'concrete-shear-wall': {
    R0: 11,
    name: 'Muros de hormigón armado',
  },
  'dual-system': {
    R0: 11,
    name: 'Sistema dual',
  },
  'braced-frame': {
    R0: 9,
    name: 'Marcos con diagonales',
  },
  'light-wood-frame': {
    R0: 8,
    name: 'Tabiquería de madera',
  },
  'masonry-wall': {
    R0: 7,
    name: 'Muros de mampostería',
  },
  'unreinforced-masonry': {
    R0: 3,
    name: 'Mampostería no reforzada',
  },
} as const;

// ============================================================
// SPECTRUM GENERATION
// ============================================================

/**
 * Generate NCh433 design response spectrum
 */
export function generateNCh433DesignSpectrum(params: {
  zone: 1 | 2 | 3;
  soilType: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  occupancy: 'I' | 'II' | 'III' | 'IV';
  structuralSystem?: keyof typeof NCh433_STRUCTURAL_SYSTEMS;
  R0?: number; // Override R0 if custom system
  numPoints?: number;
}): { points: SpectrumPoint[]; params: CodeBasedSpectrumParams } {
  const { zone, soilType, occupancy, structuralSystem, numPoints = 100 } = params;

  // Get zone parameters
  const zoneParams = NCh433_ZONES[zone];
  const soilParams = NCh433_SOIL_TYPES[soilType];
  const occupancyParams = NCh433_OCCUPANCY[occupancy];

  // Get R0 (response modification factor)
  let R0: number;
  if (params.R0) {
    R0 = params.R0;
  } else if (structuralSystem) {
    R0 = NCh433_STRUCTURAL_SYSTEMS[structuralSystem].R0;
  } else {
    R0 = 7; // Default to intermediate value
  }

  const A0 = zoneParams.A0;
  const S = soilParams.S;
  const T0 = soilParams.T0;
  const Tp = soilParams.Tp;
  const n = soilParams.n;
  const I = occupancyParams.I;

  // Generate spectrum points
  const points: SpectrumPoint[] = [];
  const Tmax = 6.0; // Maximum period (seconds)

  for (let i = 0; i <= numPoints; i++) {
    const T = (i / numPoints) * Tmax;

    let Sa: number;

    if (T <= T0) {
      // Ascending branch
      Sa = A0 * S * (1 + 1.5 * (T / T0));
    } else if (T <= Tp) {
      // Plateau
      Sa = 2.5 * A0 * S;
    } else {
      // Descending branch
      Sa = 2.5 * A0 * S * Math.pow(Tp / T, n);
    }

    // Apply importance and response modification factors
    // R* = 0.9 * R0 (seismic reduction factor)
    Sa = (Sa * I) / (0.9 * R0);

    points.push({
      period: T,
      acceleration: Sa,
    });
  }

  // Build code params for storage
  const codeParams: CodeBasedSpectrumParams = {
    code: 'NCh433',
    nch433_zone: zone,
    nch433_soil_type: soilType,
    nch433_occupancy: occupancy,
    nch433_system: structuralSystem || 'custom',
    nch433_A0: A0,
    nch433_S: S,
    nch433_T0: T0,
    nch433_Tp: Tp,
    nch433_n: n,
    nch433_I: I,
    nch433_R0: R0,
  };

  return { points, params: codeParams };
}

/**
 * Get recommended number of modes for response spectrum analysis
 * Based on building height and period
 */
export function getRecommendedModes(params: {
  numStories?: number;
  approximatePeriod?: number;
}): number {
  const { numStories, approximatePeriod } = params;

  // Rule of thumb: 3 modes per story, minimum 12, maximum 50
  if (numStories) {
    return Math.max(12, Math.min(50, numStories * 3));
  }

  // Based on period
  if (approximatePeriod) {
    // Longer periods need more modes
    if (approximatePeriod > 2.0) return 30;
    if (approximatePeriod > 1.0) return 20;
    return 12;
  }

  return 12; // Default
}

/**
 * Calculate approximate fundamental period using NCh433 formula
 * T1 = Ct * H^0.75
 * where H is height in meters
 */
export function calculateApproximatePeriod(params: {
  height: number; // meters
  structuralSystem: keyof typeof NCh433_STRUCTURAL_SYSTEMS;
}): number {
  const { height, structuralSystem } = params;

  // Ct coefficient depends on structural system
  let Ct: number;

  switch (structuralSystem) {
    case 'steel-moment-frame':
      Ct = 0.085;
      break;
    case 'reinforced-concrete-moment-frame':
      Ct = 0.075;
      break;
    case 'concrete-shear-wall':
    case 'dual-system':
      Ct = 0.050;
      break;
    case 'braced-frame':
      Ct = 0.049;
      break;
    default:
      Ct = 0.060; // Conservative default
  }

  return Ct * Math.pow(height, 0.75);
}

/**
 * Get description for NCh433 parameters (useful for UI)
 */
export function getNCh433Description(params: {
  zone: 1 | 2 | 3;
  soilType: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  occupancy: 'I' | 'II' | 'III' | 'IV';
}): string {
  const zoneDesc = NCh433_ZONES[params.zone].name;
  const soilDesc = NCh433_SOIL_TYPES[params.soilType].name;
  const occDesc = NCh433_OCCUPANCY[params.occupancy].name;

  return `${zoneDesc}, ${soilDesc}, ${occDesc}`;
}
