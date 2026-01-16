// ============================================================
// NCh691 - WATER DISTRIBUTION SYSTEMS
// ============================================================
// Chilean water supply design standard
// Includes demand calculations, pipe sizing, pressure requirements

// Re-export from hydraulics module (will be populated during migration)
// This module defines constants and types used by the hydraulics package

export interface NCh691Constants {
  // Velocity limits (m/s)
  MIN_VELOCITY: number;
  MAX_VELOCITY: number;

  // Pressure limits (m.c.a.)
  MIN_PRESSURE: number;
  MAX_PRESSURE: number;

  // Demand factors
  SIMULTANEOUS_USE_FACTORS: Record<string, number>;
  PEAK_FACTORS: Record<string, number>;
}

export const NCh691_CONSTANTS: NCh691Constants = {
  MIN_VELOCITY: 0.6,
  MAX_VELOCITY: 3.0,
  MIN_PRESSURE: 15,
  MAX_PRESSURE: 50,
  SIMULTANEOUS_USE_FACTORS: {
    residential: 0.6,
    commercial: 0.7,
    industrial: 0.8,
    public: 0.75,
  },
  PEAK_FACTORS: {
    residential: 2.5,
    commercial: 2.0,
    industrial: 1.5,
    public: 2.0,
  },
};

// Fire flow requirements by building type (L/s)
export const NCh691_FIRE_FLOW: Record<string, number> = {
  'single-family': 10,
  'multi-family': 15,
  'commercial': 25,
  'industrial': 30,
  'high-rise': 40,
};

// Storage tank requirements (% of daily demand)
export const NCh691_STORAGE_REQUIREMENTS = {
  MIN_STORAGE_PERCENT: 20,
  MAX_STORAGE_PERCENT: 40,
  EMERGENCY_STORAGE_HOURS: 12,
};
