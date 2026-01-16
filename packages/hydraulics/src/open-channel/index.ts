/**
 * Open Channel Hydraulics Module
 *
 * HEC-RAS style open channel flow analysis for streams, rivers, and engineered channels.
 *
 * Features:
 * - Prismatic and irregular cross-section geometry
 * - Manning's equation flow calculations
 * - Normal and critical depth solvers
 * - Gradually varied flow (Standard Step & Direct Step methods)
 * - Hydraulic structures (culverts, weirs, bridges)
 * - Channel design tools
 * - Multi-reach stream analysis
 *
 * @module open-channel
 */

// ============================================================================
// Channel Geometry Module
// ============================================================================
export {
  // Types - Prismatic Sections
  type PrismaticShape,
  type RectangularSection,
  type TrapezoidalSection,
  type TriangularSection,
  type CircularSection,
  type ParabolicSection,
  type PrismaticSection,

  // Types - Irregular Sections
  type StationElevation,
  type FlowZone,
  type BankStations,
  type IneffectiveArea,
  type Levee,
  type Obstruction,
  type IrregularCrossSection,

  // Types - Results
  type ZoneGeometry,
  type CrossSectionGeometry,

  // Prismatic Functions
  calculatePrismaticArea,
  calculatePrismaticWettedPerimeter,
  calculatePrismaticTopWidth,
  calculatePrismaticHydraulicRadius,
  calculatePrismaticHydraulicDepth,

  // Irregular Functions
  calculateIrregularGeometry,
  getMinimumElevation,
  getMaximumElevation,
  interpolateElevation,
  interpolateCrossSection,
  validateCrossSection,

  // Utility Functions
  createTrapezoidalSection,
  createRectangularSection,
  createTriangularSection,
  createCircularSection,
  depthToWSEL,
  wselToDepth,
} from './channel-geometry';

// ============================================================================
// Channel Hydraulics Module
// ============================================================================
export {
  // Types
  type FlowRegime,
  type ChannelMaterial,
  type PrismaticFlowResult,
  type IrregularFlowResult,

  // Constants
  MANNING_N_CHANNELS,
  PERMISSIBLE_VELOCITY,
  PERMISSIBLE_SHEAR,
  SIDE_SLOPES,
  FREEBOARD_REQUIREMENTS,
  LOSS_COEFFICIENTS,

  // Core Functions - Prismatic
  calculateManningFlowPrismatic,
  calculateVelocityPrismatic,
  calculateCriticalDepthPrismatic,
  calculateNormalDepthPrismatic,
  calculateCriticalSlopePrismatic,
  analyzePrismaticFlow,
  calculateFlowAtDepth,

  // Core Functions - Irregular
  calculateManningFlowIrregular,
  calculateCriticalWSEL,
  calculateNormalWSEL,
  calculateFroudeIrregular,
  analyzeIrregularFlow,

  // Shared Functions
  calculateFroudeNumber,
  classifyFlowRegime,
  calculateSpecificEnergy,
  calculateShearStress,
  calculateConveyance,
  calculateMomentum,
  calculateConjugateDepth,
  calculateJumpEnergyLoss,
  getManningsN,

  // Formatting
  formatPrismaticResult,
  formatIrregularResult,
} from './channel-hydraulics';

// ============================================================================
// Gradually Varied Flow Module
// ============================================================================
export {
  // Types
  type SlopeClassification,
  type ProfileType,
  type ComputationDirection,
  type FrictionSlopeMethod,
  type BoundaryCondition,
  type ProfilePoint,
  type WaterSurfaceProfile,
  type DirectStepResult,

  // Classification Functions
  classifyChannelSlope,
  classifyProfileType,
  determineComputationDirection,
  getProfileCharacteristics,

  // Friction Slope Functions
  calculateFrictionSlope,
  calculateFrictionSlopePrismatic,
  calculateFrictionSlopeIrregular,
  calculateAverageFrictionSlope,

  // Standard Step Method
  computeStandardStep,

  // Direct Step Method
  computeDirectStep,
  computePrismaticProfile,

  // Mixed Flow
  findControlSection,
  computeMixedFlowProfile,

  // Utilities
  generateRatingCurve,
  formatProfileResult,
} from './gradually-varied-flow';

// ============================================================================
// Hydraulic Structures Module
// ============================================================================
export {
  // Types - Culverts
  type CulvertShape,
  type CulvertMaterial,
  type InletType,
  type CulvertControlType,
  type CulvertFlowType,
  type CulvertGeometry,
  type Culvert,
  type CulvertResult,

  // Types - Weirs
  type WeirType,
  type Weir,
  type WeirResult,

  // Types - Bridges
  type BridgeFlowType,
  type BridgeMethod,
  type PierShape,
  type AbutmentType,
  type BridgePier,
  type BridgeAbutment,
  type BridgeDeck,
  type Bridge,
  type BridgeResult,

  // Culvert Constants
  INLET_CONTROL_COEFFICIENTS,
  ENTRANCE_LOSS_COEFFICIENTS,
  CULVERT_MANNING_N,

  // Weir Constants
  WEIR_COEFFICIENTS,

  // Bridge Constants
  PIER_DRAG_COEFFICIENTS,
  PIER_SHAPE_FACTORS,

  // Culvert Functions
  calculateCulvertArea,
  getCulvertRise,
  getCulvertSpan,
  calculateCulvertWettedPerimeter,
  calculateInletControlHeadwater,
  calculateOutletControlHeadwater,
  calculateCulvertFullFlowCapacity,
  analyzeCulvert,
  sizeCulvert,

  // Weir Functions
  calculateWeirFlow,
  calculateWeirHead,

  // Bridge Functions
  calculateBridgeOpeningArea,
  calculatePierLoss,
  calculatePressureFlow,
  calculateDeckOvertoppingFlow,
  analyzeBridge,

  // Formatting
  formatCulvertResult,
  formatWeirResult,
  formatBridgeResult,
} from './hydraulic-structures';

// ============================================================================
// Channel Design Module
// ============================================================================
export {
  // Types
  type ChannelType,
  type SoilType,
  type LiningType,
  type ChannelDesignInput,
  type BestSectionResult,
  type FreeboardResult,
  type LiningRecommendation,
  type ErosionAnalysis,
  type ChannelDesignResult,
  type TransitionDesign,

  // Constants
  OPTIMAL_SIDE_SLOPES,
  FREEBOARD_FACTORS,
  MINIMUM_FREEBOARD_BY_FLOW,

  // Best Hydraulic Section
  designBestHydraulicSection,
  compareChannelShapes,

  // Freeboard
  calculateFreeboard,
  getFreeboardRequirement,

  // Lining Selection
  recommendLining,

  // Erosion Analysis
  analyzeErosionStability,

  // Side Slopes
  getRecommendedSideSlopes,
  checkSideSlope,

  // Channel Sizing
  sizeChannel,

  // Transitions
  designTransition,
  calculateSuperelevation,

  // Formatting
  formatChannelDesign,
  formatSectionComparison,
} from './channel-design';

// ============================================================================
// Stream Analysis Module
// ============================================================================
export {
  // Types
  type JunctionMethod,
  type RiverReach,
  type LateralWeir,
  type LateralDivert,
  type Junction,
  type RiverSystem,
  type FlowProfile,
  type ReachAnalysisResult,
  type FloodplainMapping,
  type FloodVolume,
  type RatingPoint,

  // Reach Analysis
  analyzeReach,
  analyzeRiverSystem,

  // Floodplain Analysis
  delineateFloodplain,
  calculateFloodVolume,

  // Rating Curves
  generateStageDischarge,
  computeVelocityDistribution,
  computeShearDistribution,

  // Export Functions
  exportProfileData,
  exportCrossSectionData,

  // Formatting
  formatReachAnalysis,
  formatFloodVolume,
} from './stream-analysis';

// ============================================================================
// Hydraulic Jump Module
// ============================================================================
export {
  // Types
  type JumpType,
  type HydraulicJumpResult,
  type StillingBasinDesign,
  type JumpLocationResult,

  // Classification Functions
  classifyJumpType,

  // Sequent Depth Calculations
  calculateSequentDepthRectangular,
  calculateSequentDepthTrapezoidal,
  calculateSequentDepthCircular,
  calculateSequentDepth,

  // Jump Geometry
  calculateJumpLength,
  calculateRollerLength,

  // Energy Analysis
  calculateEnergyLoss,
  calculateEnergyLossRectangular,
  calculatePowerDissipated,

  // Complete Analysis
  analyzeHydraulicJump,
  quickJumpAnalysis,

  // Stilling Basin Design
  designStillingBasin,

  // Jump Location
  analyzeJumpLocation,

  // Formatting
  formatJumpResult,
  formatBasinDesign,
} from './hydraulic-jump';

// ============================================================================
// Sediment Transport Module
// ============================================================================
export {
  // Types
  type SedimentShape,
  type TransportMode,
  type SedimentProperties,
  type FlowConditions,
  type ShieldsResult,
  type BedLoadResult,
  type SuspendedLoadResult,
  type TotalLoadResult,
  type ScourResult,
  type ChannelStabilityResult,

  // Constants
  PERMISSIBLE_VELOCITIES,

  // Utility Functions
  getKinematicViscosity,
  calculateSettlingVelocity,
  calculateDimensionlessDiameter,

  // Shields Analysis
  calculateCriticalShields,
  analyzeShields,

  // Bed Load Transport
  calculateBedLoadMPM,
  calculateBedLoadEinsteinBrown,

  // Suspended Load Transport
  calculateRouseNumber,
  classifySuspension,
  calculateSuspendedLoad,

  // Total Load
  calculateTotalLoad,

  // Scour Analysis
  calculatePierScour,
  calculateContractionScour,
  calculateCriticalVelocity,

  // Channel Stability
  assessChannelStability,

  // Formatting
  formatShieldsResult,
  formatTotalLoadResult,
  formatScourResult,
} from './sediment-transport';
