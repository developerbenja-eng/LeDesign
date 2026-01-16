// ============================================================
// NCh1105 - SEWER SYSTEMS
// ============================================================
// Chilean sanitary sewer design standard
// Includes flow calculations, pipe sizing, slope requirements

// Re-export from hydraulics module (will be populated during migration)
// This module defines constants and types used by the sewer package

export interface NCh1105Constants {
  // Minimum pipe diameters (mm)
  MIN_DIAMETER_SANITARY: number;
  MIN_DIAMETER_STORM: number;

  // Minimum slopes (%)
  MIN_SLOPE_150MM: number;
  MIN_SLOPE_200MM: number;
  MIN_SLOPE_250MM: number;

  // Velocity limits (m/s)
  MIN_VELOCITY: number;
  MAX_VELOCITY: number;

  // Manning roughness coefficients
  MANNING_N: Record<string, number>;
}

export const NCh1105_CONSTANTS: NCh1105Constants = {
  MIN_DIAMETER_SANITARY: 150,
  MIN_DIAMETER_STORM: 200,
  MIN_SLOPE_150MM: 0.5,
  MIN_SLOPE_200MM: 0.4,
  MIN_SLOPE_250MM: 0.35,
  MIN_VELOCITY: 0.6,
  MAX_VELOCITY: 3.0,
  MANNING_N: {
    pvc: 0.010,
    hdpe: 0.011,
    concrete: 0.013,
    'vitrified-clay': 0.012,
  },
};

// Per capita flow rates (L/person/day)
export const NCh1105_PERCAPITA_FLOWS = {
  DOMESTIC_WASTEWATER: 200,
  INFILTRATION_ALLOWANCE: 0.2, // L/s/km
  CONNECTION_ALLOWANCE: 0.1, // L/s per connection
};

// Peak factors by population
export function getNCh1105PeakFactor(population: number): number {
  if (population < 1000) return 4.0;
  if (population < 10000) return 3.5;
  if (population < 50000) return 3.0;
  if (population < 100000) return 2.5;
  return 2.0;
}

// Minimum cover depths (m)
export const NCh1105_COVER_DEPTHS = {
  MIN_COVER_NORMAL: 1.0,
  MIN_COVER_ROADWAY: 1.2,
  MAX_COVER: 5.0,
};
