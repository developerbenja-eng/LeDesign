// ============================================================
// HYDRAULIC ENGINEERING MODULE - UNIFIED EXPORTS
// ============================================================
// Complete hydraulic engineering library for water systems design
// Based on Chilean standards: NCh 691, NCh 1105, NCh 2485
// ============================================================

// ============================================================
// CHILEAN CODES (Re-exported from @ledesign/chilean-codes)
// NCh691 (Water Distribution), NCh1105 (Sewer Systems)
// ============================================================
export * from '@ledesign/chilean-codes/nch691';
export * from '@ledesign/chilean-codes/nch1105';

// ============================================================
// WATER NETWORK (Potable water distribution systems)
// ============================================================
export * from './water-network';

// ============================================================
// SEWER (Sanitary and storm sewer systems)
// ============================================================
export * from './sewer';

// ============================================================
// STORMWATER (Stormwater management and SUDS/LID)
// ============================================================
export * from './stormwater';

// ============================================================
// OPEN CHANNEL (Channel hydraulics and design)
// ============================================================
export * from './open-channel';

// ============================================================
// HYDROLOGY (Rainfall, runoff, flood frequency)
// ============================================================
export * from './hydrology';
