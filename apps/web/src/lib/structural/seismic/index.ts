// ============================================================
// SEISMIC DESIGN CODES INDEX
// ============================================================

// Chilean codes
export * from './nch433';
export * from './nch433-spectrum';
export * from './nch433-loads';

// Re-export types
export type {
  ChileanSeismicZone,
  ChileanSoilType,
  OccupancyCategory,
  StructuralSystemType,
  NCh433Parameters,
  NCh433SeismicParameters,
  SpectralAccelerationResult,
  BaseShearResult,
} from './nch433';
