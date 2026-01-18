/**
 * Structural Design Module
 *
 * Exports design check functions for various codes:
 * - AISC 360: Steel design
 * - AISC Connections: Bolted and welded connections
 * - ACI 318: Concrete design
 * - NDS: Wood design
 * - TMS 402: Masonry design
 * - AISI S100: Cold-formed steel design
 * - Foundation: Shallow and deep foundation design
 */

// ============================================================
// AISC 360 - STEEL DESIGN
// ============================================================
export { runAISCDesignChecks } from './aisc-steel';

// ============================================================
// AISC CONNECTIONS
// ============================================================
export {
  // Bolt specifications
  BOLT_SPECS,
  BOLT_SIZES,
  HOLE_DIMENSIONS,
  SLIP_COEFFICIENTS,
  // Weld specifications
  WELD_ELECTRODES,
  // Bolt calculations
  calculateBoltShearCapacity,
  calculateBoltBearingCapacity,
  calculateSlipResistance,
  checkCombinedTensionShear,
  calculateBlockShear,
  // Weld calculations
  calculateFilletWeldCapacity,
  calculateCJPWeldCapacity,
  getMinFilletWeldSize,
  getMaxFilletWeldSize,
  // Connection design
  checkConnection,
  createConnectionDesignResult,
} from './aisc-connections';

export type {
  BoltSpecification,
  BoltedConnectionInput,
  BoltedConnectionResult,
  FilletWeldInput,
  FilletWeldResult,
  ConnectionDesignInput,
  ConnectionDesignResult,
} from './aisc-connections';

// ============================================================
// ACI 318 - CONCRETE DESIGN
// ============================================================
export {
  // Constants
  REBAR_DATABASE,
  // Material calculations
  calculateModulusOfRupture,
  calculateConcreteModulus,
  calculateBeta1,
  calculatePhi,
  // Flexure
  calculateFlexuralCapacitySingly,
  calculateFlexuralCapacityDoubly,
  // Shear
  calculateVc,
  calculateVs,
  calculateVsMax,
  calculateShearCapacity as calculateConcreteShearCapacity,
  // Column
  calculateColumnAxialCapacity,
  calculateColumnInteractionPoint,
  generateInteractionDiagram,
  // Development length
  calculateDevelopmentLengthTension,
  calculateDevelopmentLengthCompression,
  // Minimum reinforcement
  calculateMinFlexuralReinforcement,
  calculateMaxReinforcementRatio,
  calculateMinShearReinforcement,
  calculateMaxStirrupSpacing,
  // Design runner
  runACIDesignChecks,
} from './aci-concrete';

// ============================================================
// NDS 2018 - TIMBER DESIGN
// ============================================================
export {
  // Timber grades
  TIMBER_GRADES,
  // Adjustment factors
  getDefaultAdjustmentFactors,
  calculateSizeFactor,
  calculateVolumeFactor,
  calculateBeamStabilityFactor,
  calculateColumnStabilityFactor,
  // Design values
  calculateAdjustedDesignValuesLRFD,
  calculateAdjustedDesignValuesASD,
  // Capacity calculations
  calculateBendingCapacity as calculateTimberBendingCapacity,
  calculateShearCapacity as calculateTimberShearCapacity,
  calculateCompressionCapacity as calculateTimberCompressionCapacity,
  // Combined loading
  checkCombinedBendingCompression as checkTimberCombinedBendingCompression,
  checkCombinedBendingTension as checkTimberCombinedBendingTension,
  // Design runner
  runNDSDesignChecks,
} from './nds-timber';

export type {
  TimberGrade,
  AdjustmentFactors,
  AdjustedDesignValues,
  BendingCapacity as TimberBendingCapacity,
  ShearCapacity as TimberShearCapacity,
  CompressionCapacity as TimberCompressionCapacity,
  CombinedLoadingResult as TimberCombinedLoadingResult,
} from './nds-timber';

// ============================================================
// TMS 402 - MASONRY DESIGN
// ============================================================
export {
  // Material properties
  getMasonryModulus,
  getMasonryShearModulus,
  getModulusOfRupture,
  GROUT_GRADES,
  STANDARD_CMU,
  // Section properties
  calculateSectionProperties as calculateMasonrySectionProperties,
  // Capacity calculations
  calculateAxialCapacity as calculateMasonryAxialCapacity,
  calculateFlexuralCapacity as calculateMasonryFlexuralCapacity,
  calculateShearCapacity as calculateMasonryShearCapacity,
  checkCombinedAxialFlexure as checkMasonryCombinedAxialFlexure,
  // Minimum reinforcement
  getMinimumReinforcement as getMasonryMinimumReinforcement,
  // Design runner
  checkMasonryWall,
  createMasonryDesignResult,
} from './tms-masonry';

export type {
  MasonrySpecification,
  MasonryUnit,
  GroutProperties,
  MasonryReinforcement,
  MasonrySectionProperties,
  AxialCapacity as MasonryAxialCapacity,
  FlexuralCapacity as MasonryFlexuralCapacity,
  ShearCapacity as MasonryShearCapacity,
  CombinedCapacity as MasonryCombinedCapacity,
  MasonryDesignInput,
  MasonryDesignResult,
} from './tms-masonry';

// ============================================================
// AISI S100 - COLD-FORMED STEEL DESIGN
// ============================================================
export {
  // Materials
  CFS_MATERIALS,
  // Section property calculator
  calculateCsectionProperties,
  calculateTrackProperties,
  calculateZsectionProperties,
  calculateSectionProperties as calculateCFSSectionProperties,
  // Effective width
  calculateEffectiveWidthStiffened,
  calculateEffectiveWidthUnstiffened,
  calculateEffectiveWidthGradient,
  // Distortional buckling
  calculateElasticDistortionalStress,
  calculateDistortionalBuckling,
  // Direct Strength Method (DSM)
  calculateDSMCompression,
  calculateDSMFlexure,
  // Elastic buckling calculations
  calculateFlexuralBucklingStress,
  calculateTorsionalBucklingStress,
  calculateFlexuralTorsionalBucklingStress,
  calculateCb,
  calculateLTBStress,
  // Member capacities
  calculateTensionCapacity as calculateCFSTensionCapacity,
  calculateCompressionCapacityFlexural as calculateCFSCompressionCapacity,
  calculateCompressionCapacityComplete as calculateCFSCompressionCapacityComplete,
  calculateFlexuralCapacity as calculateCFSFlexuralCapacity,
  calculateFlexuralCapacityComplete as calculateCFSFlexuralCapacityComplete,
  calculateShearCapacity as calculateCFSShearCapacity,
  calculateWebCripplingCapacity,
  // Web holes provisions
  calculateWebHoleReduction,
  // Combined loading
  checkCombinedBendingCompression as checkCFSCombinedBendingCompression,
  checkCombinedBendingTension as checkCFSCombinedBendingTension,
  checkCombinedBendingShear as checkCFSCombinedBendingShear,
  checkCombinedWebCripplingBending,
  // Second-order analysis (P-Delta)
  calculateB1,
  calculateB2,
  calculateCm,
  // Serviceability
  calculateBeamDeflection,
  checkDeflection,
  // Connection design
  calculateScrewCapacity,
  calculateBoltCapacity as calculateCFSBoltCapacity,
  calculateWeldCapacity as calculateCFSWeldCapacity,
  // Built-up sections
  calculateBuiltUpModification,
  // SSMA sections
  parseSSMADesignation,
  getStandardSSMASections,
  // Design runner
  checkCFSMember,
  createCFSDesignResult,
} from './aisi-coldformed';

export type {
  DesignMethod as CFSDesignMethod,
  ColdFormedSteelMaterial,
  CFSectionType,
  CFSectionDimensions,
  CFSectionProperties,
  TensionCapacity as CFSTensionCapacity,
  CompressionCapacity as CFSCompressionCapacity,
  FlexuralCapacity as CFSFlexuralCapacity,
  ShearCapacity as CFSShearCapacity,
  WebCripplingCapacity,
  WebCripplingLoadCase,
  WebHoleReduction,
  CombinedLoadingResult as CFSCombinedLoadingResult,
  DSMResult,
  DeflectionResult,
  ScrewCapacity,
  BoltCapacity as CFSBoltCapacity,
  WeldCapacity as CFSWeldCapacity,
  SSMASection,
  CFSDesignInput,
  CFSDesignResult,
  DistortionalBucklingResult,
} from './aisi-coldformed';

// ============================================================
// FOUNDATION DESIGN
// ============================================================
export {
  // Soil properties
  SOIL_TYPES,
  // Bearing capacity
  calculateTerzaghiFactors,
  calculateMeyerhofFactors,
  calculateBearingCapacityTerzaghi,
  calculateFootingPressure,
  // Stability checks
  checkSlidingResistance,
  checkOverturning,
  // Structural checks
  calculateFootingFlexure,
  checkOneWayShear,
  checkTwoWayShear,
  // Pile foundations
  calculatePileCapacityAlpha,
  calculatePileCapacityBeta,
  calculatePileGroupCapacity,
  // Design runner
  checkSpreadFooting,
  createFoundationDesignResult,
} from './foundation';

export type {
  SoilProperties,
  SpreadFootingInput,
  BearingCapacityResult,
  PileProperties,
  PileCapacityResult,
  FoundationDesignResult,
} from './foundation';

// ============================================================
// DESIGN CODES CONSTANTS
// ============================================================

export const DESIGN_CODES = {
  AISC_360: 'AISC 360-22',
  ACI_318: 'ACI 318-19',
  NDS: 'NDS 2018',
  AISI: 'AISI S100-16',
  TMS: 'TMS 402-16',
  FOUNDATION: 'ACI 318-19 / Terzaghi',
} as const;

export const CHECK_TYPES = {
  LRFD: 'LRFD',
  ASD: 'ASD',
} as const;

export type DesignCode = typeof DESIGN_CODES[keyof typeof DESIGN_CODES];
export type CheckType = typeof CHECK_TYPES[keyof typeof CHECK_TYPES];
