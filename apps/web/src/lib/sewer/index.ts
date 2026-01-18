/**
 * Sewer Design Module Index
 *
 * Complete toolkit for storm and sanitary sewer design in Chile
 * Based on NCh 1105, NCh 2472, MINVU, MOP, and SISS standards
 */

// ============================================================================
// Pipe Hydraulics (Core calculations)
// ============================================================================
export {
  // Types
  type PipeMaterial,
  type PipeShape,
  type PipeProperties,
  type FlowConditions,
  type HydraulicResult,
  type PipeSizingResult,

  // Constants
  MANNING_N,
  STANDARD_DIAMETERS,
  VELOCITY_LIMITS,
  MINIMUM_SLOPES,
  FILL_RATIOS,

  // Functions
  calculateCircularPipeFlow,
  calculateFullCapacity,
  getMinimumSlope,
  sizePipe,
  convertSlope,
  calculateRequiredSlope,
  calculateTravelTime,
  calculateHeadLoss,
  checkSurchargeCapacity,
  formatHydraulicResult,
} from './pipe-hydraulics';

// ============================================================================
// Storm Sewer Design
// ============================================================================
export {
  // Types
  type DrainageSubarea,
  type Inlet,
  type StormPipeReach,
  type StormSewerInput,
  type ReachDesignResult,
  type StormSewerResult,

  // Functions
  designStormSewer,
  quickStormPipeSize,
  checkInletCapacity,
  designCatchBasin,
  formatStormSewerResult,
} from './storm-sewer';

// ============================================================================
// Sanitary Sewer Design
// ============================================================================
export {
  // Types
  type LandUseType,
  type ServiceArea,
  type SanitaryPipeReach,
  type ManholeNode,
  type SanitarySewerInput,
  type FlowCalculation,
  type SanitaryReachResult,
  type SanitarySewerResult,

  // Functions
  designSanitarySewer,
  calculateSanitaryFlows,
  quickSanitaryPipeSize,
  calculatePopulationEquivalent,
  designHouseConnection,
  formatSanitarySewerResult,
} from './sanitary-sewer';

// ============================================================================
// Network Layout (Manholes, Profiles)
// ============================================================================
export {
  // Types
  type ManholeType,
  type ManholeShape,
  type ManholeSpecs,
  type ManholePosition,
  type ManholeDesign,
  type PipeConnection,
  type NetworkNode,
  type NetworkLink,
  type NetworkLayout,
  type ProfilePoint,
  type ProfileData,
  type ManholeLayoutInput,
  type ManholeLayoutResult,
  type ManholeUnitCosts,
  type ManholeCostResult,

  // Constants
  MANHOLE_SPECS,
  MAX_MANHOLE_SPACING,
  MIN_COVER_DEPTHS,
  DROP_MANHOLE_CRITERIA,
  DEFAULT_MANHOLE_COSTS,

  // Functions
  selectManholeType,
  designManhole,
  getMaxManholeSpacing,
  layoutManholes,
  generateProfile,
  generateNetworkProfile,
  estimateManholeCosts,
  formatManholeLayout,
  formatProfile,
  formatManholeCosts,
} from './network-layout';

// ============================================================================
// Pump Station Design
// ============================================================================
export {
  // Types
  type PumpType,
  type PumpConfiguration,
  type ControlType,
  type FlowPattern,
  type StaticHeadConditions,
  type ForcemainProperties,
  type MinorLoss,
  type SystemCurveInput,
  type SystemCurvePoint,
  type PumpCurve,
  type PumpSelection,
  type WetWellDesign,
  type PumpStationDesign,

  // Constants
  HAZEN_WILLIAMS_C,
  MINOR_LOSS_K,
  DESIGN_CRITERIA,
  UNIT_COSTS,

  // System Curve Functions
  calculateFrictionLoss,
  calculateForcemainVelocity,
  calculateMinorLosses,
  calculateStaticHead,
  generateSystemCurve,

  // Wet Well Functions
  calculateMinimumWetWellVolume,
  designWetWell,

  // Pump Functions
  generateTypicalPumpCurve,
  findOperatingPoint,
  calculateNPSHAvailable,
  selectPump,

  // Power and Energy Functions
  calculatePumpPower,
  calculateAnnualEnergy,

  // Complete Design
  designPumpStation,

  // VFD Analysis
  analyzeVFD,

  // Formatting
  formatPumpStationDesign,
  formatSystemCurve,
} from './pump-station';
