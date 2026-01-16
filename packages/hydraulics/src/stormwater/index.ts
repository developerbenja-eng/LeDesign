/**
 * Stormwater Design Module Index
 *
 * Complete toolkit for stormwater management design in Chile
 * Based on MINVU, MOP, and DOH standards for Biobío/Ñuble region
 */

// Regional Data Library
export {
  // Types
  type SoilType,
  type SoilGroup,
  type RunoffCoefficientEntry,
  type DesignStandard,
  type SUDSTechnique,
  type TypicalDuration,
  type VelocityLimit,

  // Data
  SOIL_TYPES,
  RUNOFF_COEFFICIENTS,
  DESIGN_STANDARDS_CHILE,
  SUDS_TECHNIQUES,
  TYPICAL_DURATIONS,
  VELOCITY_LIMITS,

  // Functions
  getSuitableSUDS,
  getRunoffCoefficientsByCategory,
  getDesignStandard,
} from './regional-data';

// Rational Method Calculator
export {
  // Types
  type CatchmentArea,
  type SurfaceArea,
  type RationalMethodInput,
  type RationalMethodResult,
  type ModifiedRationalInput,
  type ModifiedRationalResult,

  // Functions
  calculateTimeOfConcentration,
  getTypicalDuration,
  calculateWeightedC,
  calculateRationalMethod,
  calculateModifiedRational,
  createSimpleCatchment,
  createMixedCatchment,
  formatDischarge,
  getRecommendedPipeDiameter,
} from './rational-method';

// Contributing Area Analysis
export {
  // Types
  type Point2D,
  type Point3D,
  type DEMGridData,
  type ContributingAreaInput,
  type ContributingAreaResult,
  type FlowPath,
  type DischargeCheckInput,
  type DischargeCheckResult,

  // Functions
  calculatePolygonArea,
  calculateCentroid,
  calculatePerimeter,
  pointInPolygon,
  calculateSlopeAtPoint,
  calculateAverageSlope,
  findLongestFlowPath,
  estimateFlowPathLength,
  analyzeContributingArea,
  calculateDischargeFromArea,
} from './contributing-area';

// Infiltration Trench Designer
export {
  // Types
  type InfiltrationTrenchInput,
  type TrenchDimensions,
  type TrenchMaterials,
  type InfiltrationTrenchResult,
  type TrenchDesignOptions,

  // Functions
  designInfiltrationTrench,
  estimateTrenchSize,
  checkInfiltrationSuitability,
  designTrenchSystem,
  formatTrenchDesign,
} from './infiltration-trench';

// Detention/Retention Pond Sizing
export {
  // Types
  type PondType,
  type PondDesignInput,
  type PondGeometry,
  type OutletStructure,
  type EmergencySpillway,
  type PondDesignResult,

  // Functions
  designPond,
  estimatePondSize,
  calculateDevelopmentPeaks,
  designInfiltrationBasin,
  formatPondDesign,
} from './detention-pond';

// SUDS Selection Tool
export {
  // Types
  type SiteConditions,
  type ProjectGoals,
  type Constraints,
  type SUDSRecommendation,
  type SUDSSelectionResult,

  // Functions
  selectSUDS,
  quickSUDSSelection,
  formatSUDSSelection,
} from './suds-selector';

// SCS Curve Number Method
export {
  // Types
  type AntecedentMoistureCondition,
  type LandUseCategory,
  type LandUseArea,
  type CNCalculationInput,
  type CNResult,
  type RunoffCalculationInput,
  type RunoffResult,
  type UnitHydrographInput,
  type UnitHydrographPoint,
  type UnitHydrographResult,
  type TR55Input,
  type TR55Result,

  // Constants
  CURVE_NUMBER_TABLE,
  SCS_UNIT_HYDROGRAPH_ORDINATES,
  RAINFALL_DISTRIBUTION,

  // Core CN Functions
  getCurveNumber,
  adjustCNForAMC,
  calculateCompositeCN,

  // Runoff Calculation
  calculateRunoffDepth,
  quickRunoff,
  calculateThresholdRainfall,

  // Hydrograph Generation
  calculateLagTime,
  generateUnitHydrograph,

  // TR-55 Peak Discharge
  calculateTR55PeakDischarge,

  // Utility Functions
  estimateCNFromImperviousness,
  estimateCNFromEvent,
  calculateConnectedImperviousCN,

  // Formatting
  formatCNResult,
  formatRunoffResult,
  formatHydrographResult,
  formatTR55Result,
} from './scs-curve-number';
