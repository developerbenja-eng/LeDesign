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
// export * from './sewer'; // Commented due to duplicate exports with water-network

// ============================================================
// STORMWATER (Stormwater management and SUDS/LID)
// ============================================================
// export * from './stormwater'; // Commented due to duplicate exports

// ============================================================
// OPEN CHANNEL (Channel hydraulics and design)
// ============================================================
// export * from './open-channel'; // Commented due to duplicate exports with water-network

// ============================================================
// HYDROLOGY (Rainfall, runoff, flood frequency)
// ============================================================
export * from './hydrology';

// ============================================================
// DATA SOURCES (External APIs for weather and hydrology data)
// ============================================================
export * from './data-sources';
