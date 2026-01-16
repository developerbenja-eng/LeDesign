/**
 * Water Distribution Network Module Index
 *
 * Complete toolkit for water distribution network analysis
 * Similar to EPANET functionality
 *
 * Based on Chilean standards: NCh 691, NCh 2485, NCh 409, SISS regulations
 */

// ============================================================================
// Pipe Hydraulics (Hazen-Williams, Darcy-Weisbach)
// ============================================================================
export {
  // Types
  type FrictionFormula,
  type WaterPipeMaterial,
  type PipeFrictionCoefficients,
  type WaterPipeProperties,
  type PipeFlowResult,
  type HeadLossResult,
  type PipeSizingInput,
  type PipeSizingResult,
  type MinorLossType,

  // Constants
  HAZEN_WILLIAMS_C,
  DARCY_ROUGHNESS,
  MANNING_N_WATER,
  STANDARD_DIAMETERS_WATER,
  VELOCITY_LIMITS_WATER,
  PRESSURE_LIMITS,
  HEAD_LOSS_LIMITS,
  WATER_PROPERTIES,
  MINOR_LOSS_K,

  // Functions
  getFrictionCoefficients,
  calculateHeadLossHazenWilliams,
  calculateHeadLossDarcyWeisbach,
  calculateHeadLossManning,
  calculateHeadLoss,
  calculateDarcyFrictionFactor,
  calculateFlowHazenWilliams,
  sizePipeForFlow,
  calculateMinorLoss,
  calculateTotalMinorLosses,
  getEquivalentLength,
  convertPressure,
  calculatePipeCapacity,
  formatHeadLossResult,
  formatPipeSizingResult,
} from './pipe-hydraulics';

// ============================================================================
// Network Elements (Nodes, Links, Patterns)
// ============================================================================
export {
  // Types - Nodes
  type NodeType,
  type BaseNode,
  type Junction,
  type Tank,
  type Reservoir,
  type NetworkNode,

  // Types - Links
  type LinkType,
  type LinkStatus,
  type Pipe,
  type PumpType,
  type PumpCurvePoint,
  type Pump,
  type ValveType,
  type Valve,
  type NetworkLink,

  // Types - Patterns & Curves
  type Pattern,
  type PumpCurve,
  type VolumeCurve,
  type EfficiencyCurve,
  type HeadLossCurve,

  // Types - Controls
  type ControlType,
  type SimpleControl,
  type RuleControl,
  type NetworkControl,

  // Types - Network
  type NetworkOptions,
  type WaterNetwork,
  type ValidationResult,
  type NetworkStatistics,

  // Node creation functions
  createJunction,
  createTank,
  createReservoir,

  // Link creation functions
  createPipe,
  createPumpPowerFunc,
  createPumpThreePoint,
  createValve,

  // Tank calculations
  calculateTankVolume,
  calculateTankLevel,
  getTankVolumeFromCurve,

  // Pump calculations
  calculatePumpHead,
  calculatePumpPower,
  findPumpOperatingPoint,

  // Valve calculations
  calculatePRVHeadLoss,
  calculatePSVHeadLoss,
  calculateFCVHeadLoss,
  calculateTCVHeadLoss,

  // Network functions
  validateNetwork,
  getNetworkStatistics,
  getDefaultNetworkOptions,
  createEmptyNetwork,
} from './network-elements';

// ============================================================================
// Network Solver (Gradient Method)
// ============================================================================
export {
  // Types
  type SolverOptions,
  type SolverResult,
  type TimeStepResult,
  type NodeResult,
  type LinkResult,
  type SimulationResult,
  type FireFlowResult,

  // Functions
  solveNetwork,
  runSimulation,
  analyzeFireFlow,
  formatSolverResult,
  formatSimulationSummary,
} from './network-solver';

// ============================================================================
// Demand Analysis (Population, Patterns, Fire Flow)
// ============================================================================
export {
  // Types
  type LandUseCategory,
  type ClimateZone,
  type DemandFactors,
  type PopulationDemand,
  type ServiceConnection,
  type FireFlowRequirement,
  type DemandAllocation,

  // Constants
  BASE_CONSUMPTION,
  CLIMATE_FACTORS,
  LOSS_PERCENTAGES,
  FIRE_FLOW_REQUIREMENTS,
  POPULATION_DENSITY,
  RESIDENTIAL_PATTERN,
  COMMERCIAL_PATTERN,
  INDUSTRIAL_PATTERN,

  // Functions
  getPeakHourFactor,
  getPeakDayFactor,
  calculateAreaDemand,
  calculateConnectionDemand,
  calculateStorageRequirements,
  createPattern,
  getStandardPatterns,
  getPatternValue,
  allocateDemandToNodes,
  formatPopulationDemand,
  formatStorageRequirements,
} from './demand-analysis';

// ============================================================================
// Water Quality (Chlorine Decay, Age, Tracing)
// ============================================================================
export {
  // Types
  type QualityModel,
  type QualityOptions,
  type QualitySource,
  type QualityResult,
  type ChlorineAnalysisResult,
  type TankQualityResult,

  // Constants
  CHILEAN_WATER_STANDARDS,
  BULK_DECAY_COEFFICIENTS,
  WALL_DECAY_COEFFICIENTS,

  // Functions
  temperatureCorrectedDecay,
  calculateBulkDecay,
  calculateWallDecayRate,
  calculatePipeDecay,
  calculateChlorineResidual,
  calculateJunctionAge,
  calculatePipeAge,
  calculateTankAge,
  calculateSourceFraction,
  analyzeChlorineDistribution,
  calculateRequiredChlorineDose,
  identifyStagnationZones,
  analyzeTankQuality,
  formatChlorineAnalysis,
  formatTankQuality,
  formatQualityStandards,
} from './water-quality';
