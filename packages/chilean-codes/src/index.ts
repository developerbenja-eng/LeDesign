// ============================================================
// CHILEAN ENGINEERING CODES - UNIFIED EXPORTS
// ============================================================
// Complete library of Chilean engineering standards (NCh)
// ============================================================

// ============================================================
// STRUCTURAL CODES
// ============================================================

// NCh433 - Seismic Design
export * from './nch433';

// NCh432 - Wind Loads
export * from './nch432';

// NCh431 - Snow Loads
export * from './nch431';

// NCh1537 - Live Loads
export * from './nch1537';

// NCh3171 - Load Combinations and Structural Design Provisions
export * from './nch3171';

// ============================================================
// HYDRAULIC CODES
// ============================================================

// NCh691 - Water Distribution Systems
export * from './nch691';

// NCh1105 - Sewer Systems
export * from './nch1105';

// ============================================================
// VERSION AND METADATA
// ============================================================

export const CHILEAN_CODES_VERSION = '1.0.0';

export const IMPLEMENTED_CODES = [
  'NCh433 - Seismic Design',
  'NCh432 - Wind Loads',
  'NCh431 - Snow Loads',
  'NCh1537 - Live Loads',
  'NCh3171 - Load Combinations',
  'NCh691 - Water Distribution',
  'NCh1105 - Sewer Systems',
] as const;

export const CODE_DISCIPLINES = {
  structural: ['NCh433', 'NCh432', 'NCh431', 'NCh1537', 'NCh3171'],
  hydraulic: ['NCh691', 'NCh1105'],
  geotechnical: [],
  pavement: [],
  road: [],
} as const;
