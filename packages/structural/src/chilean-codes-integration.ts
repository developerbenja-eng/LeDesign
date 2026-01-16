// ============================================================
// CHILEAN STRUCTURAL CODES - UNIFIED INTEGRATION
// ============================================================
// This module integrates all Chilean structural design codes:
// - NCh433:2012 - Seismic Design for Buildings
// - NCh2369:2003 - Seismic Design for Industrial Structures
// - NCh432:2025 - Wind Loads
// - NCh431:2010 - Snow Loads
// - NCh1537:2009 - Live Loads
// - NCh3171:2017 - Load Combinations
// - DS61 - Field Study Requirements
// ============================================================

import {
  calculateVelocityPressure,
  calculateDesignPressures,
  CHILEAN_WIND_ZONES,
  type WindLoadParams,
  type DesignWindPressure,
  type NCh432WindParameters,
} from '../loads/nch432-wind';

import {
  calculateGroundSnowLoad,
  analyzeSnowLoads,
  type SnowLoadParams,
  type SnowLoadAnalysisResult,
  type NCh431SnowParameters,
} from '../loads/nch431-snow';

import {
  LIVE_LOADS,
  calculateLiveLoadReduction,
  calculateFloorDeadLoad,
  createNCh1537Parameters,
  type OccupancyType,
  type LiveLoadData,
  type NCh1537LoadParameters,
} from '../loads/nch1537-live';

import {
  calculateLRFDCombinations,
  calculateASDCombinations,
  getGoverningCombination,
  calculateEnvelope,
  LRFD_COMBINATIONS,
  ASD_COMBINATIONS,
  DRIFT_LIMITS,
  type LoadValues,
  type CombinationResult,
  type NCh3171Parameters,
} from './nch3171-combinations';

import {
  determineFieldStudyRequirements,
  checkDS61Compliance,
  OCCUPANCY_CATEGORIES,
  SOIL_CLASSIFICATION_REQUIREMENTS,
  type OccupancyCategory,
  type BuildingCriteria,
  type FieldStudyRequirements,
  type ComplianceResult,
} from '../geotechnical/ds61-requirements';

import {
  determineAllZones,
  getRegionFromCoordinates,
  type GeoCoordinates,
  type AllZonesResult,
} from '../geolocation/chilean-zones';

// ============================================================
// UNIFIED BUILDING PARAMETERS
// ============================================================

export interface ChileanBuildingLocation {
  // Location identifiers
  region?: string;
  city?: string;
  latitude?: number;
  longitude: number;          // Required for snow calculations

  // Elevation
  altitude: number;           // m above sea level

  // Seismic zone (NCh433)
  seismicZone: 1 | 2 | 3;

  // Wind zone (NCh432)
  windZone: 1 | 2 | 3 | 4 | 5;

  // Soil classification (DS61)
  soilType: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

  // Measured Vs30 (optional, used if available)
  vs30?: number;
}

export interface ChileanBuildingGeometry {
  // Overall dimensions
  height: number;             // m - total building height
  width: number;              // m - perpendicular to wind
  depth: number;              // m - parallel to wind
  numStories: number;
  typicalStoryHeight: number; // m

  // Roof
  roofSlope: number;          // degrees
  isRoofAccessible: boolean;

  // Areas
  typicalFloorArea: number;   // m²
  tributaryAreaColumn: number; // m² - for live load reduction
}

export interface ChileanBuildingClassification {
  // Occupancy (NCh433 / DS61)
  occupancyCategory: OccupancyCategory;

  // Primary use type (NCh1537)
  primaryOccupancy: OccupancyType;

  // Structural system (NCh433)
  structuralSystem: string;

  // Has fragile non-structural elements
  hasFragileElements: boolean;

  // Wind enclosure
  enclosure: 'enclosed' | 'partially_enclosed' | 'open';

  // Exposure categories
  windExposure: 'B' | 'C' | 'D';
  snowExposure: 'fully_exposed' | 'partially_exposed' | 'sheltered';
  thermalCondition: 'heated' | 'unheated_enclosed' | 'open';
}

export interface ChileanBuildingParams {
  location: ChileanBuildingLocation;
  geometry: ChileanBuildingGeometry;
  classification: ChileanBuildingClassification;
}

// ============================================================
// UNIFIED LOAD ANALYSIS
// ============================================================

export interface ChileanLoadAnalysis {
  // Code references
  codes: {
    seismic: 'NCh433' | 'NCh2369';
    wind: 'NCh432';
    snow: 'NCh431';
    live: 'NCh1537';
    combinations: 'NCh3171';
    geotechnical: 'DS61';
  };

  // Individual load results
  deadLoad: {
    selfWeight: number;       // kN/m² - estimated structural
    superimposed: number;     // kN/m² - finishes, MEP
    partitions: number;       // kN/m² - equivalent uniform
    total: number;            // kN/m²
  };

  liveLoad: {
    data: LiveLoadData;
    unreduced: number;        // kN/m²
    reduced: number;          // kN/m² - after area reduction
    reductionFactor: number;
    roofLive: number;         // kN/m²
  };

  windLoad: {
    basicSpeed: number;       // m/s
    velocityPressure: number; // kN/m²
    pressures: DesignWindPressure;
    parameters: NCh432WindParameters;
  };

  snowLoad: {
    groundSnow: number;       // kN/m²
    roofSnow: number;         // kN/m²
    analysis: SnowLoadAnalysisResult;
    parameters: NCh431SnowParameters;
  };

  // Combined loads for combinations
  loadValues: LoadValues;

  // Load combinations
  combinations: {
    lrfd: CombinationResult[];
    asd: CombinationResult[];
    governing: CombinationResult;
    envelope: { max: CombinationResult; min: CombinationResult };
  };

  // Drift limits
  driftLimit: number;

  // Field study requirements
  fieldStudy: FieldStudyRequirements;
}

// ============================================================
// MAIN ANALYSIS FUNCTION
// ============================================================

/**
 * Perform complete Chilean code load analysis for a building
 */
export function analyzeChileanBuilding(
  params: ChileanBuildingParams,
  deadLoadEstimate?: {
    selfWeight?: number;
    superimposed?: number;
    partitions?: number;
  }
): ChileanLoadAnalysis {
  const { location, geometry, classification } = params;

  // ============================================================
  // 1. DEAD LOAD ESTIMATE
  // ============================================================
  const deadLoad = {
    selfWeight: deadLoadEstimate?.selfWeight ?? 4.0,      // Default for RC
    superimposed: deadLoadEstimate?.superimposed ?? 1.5,  // Finishes, MEP
    partitions: deadLoadEstimate?.partitions ?? 1.0,      // Medium partitions
    total: 0,
  };
  deadLoad.total = deadLoad.selfWeight + deadLoad.superimposed + deadLoad.partitions;

  // ============================================================
  // 2. LIVE LOAD (NCh1537)
  // ============================================================
  const liveLoadData = LIVE_LOADS[classification.primaryOccupancy];
  const liveLoadReduction = calculateLiveLoadReduction({
    qk: liveLoadData.qk,
    tributaryArea: geometry.tributaryAreaColumn,
    numFloors: geometry.numStories,
  });

  const roofLiveLoad = geometry.isRoofAccessible
    ? LIVE_LOADS.roofs_accessible.qk
    : LIVE_LOADS.roofs_inaccessible.qk;

  const liveLoad = {
    data: liveLoadData,
    unreduced: liveLoadData.qk,
    reduced: liveLoadData.reducible
      ? liveLoadReduction.reducedLoad
      : liveLoadData.qk,
    reductionFactor: liveLoadData.reducible
      ? liveLoadReduction.reductionFactor
      : 1.0,
    roofLive: roofLiveLoad,
  };

  // ============================================================
  // 3. WIND LOAD (NCh432)
  // ============================================================
  const windZoneData = CHILEAN_WIND_ZONES[location.windZone];
  const windParams: WindLoadParams = {
    zone: location.windZone,
    exposure: classification.windExposure,
    height: geometry.height,
    enclosure: classification.enclosure,
    riskCategory: categoryToRisk(classification.occupancyCategory),
  };

  const velocityPressure = calculateVelocityPressure(windParams, location.altitude);
  const windPressures = calculateDesignPressures(
    windParams,
    {
      width: geometry.width,
      depth: geometry.depth,
      height: geometry.height,
    },
    location.altitude
  );

  const windLoad = {
    basicSpeed: windZoneData.V,
    velocityPressure: velocityPressure.qh,
    pressures: windPressures,
    parameters: {
      code: 'NCh432' as const,
      version: '2025' as const,
      zone: location.windZone,
      basicWindSpeed: windZoneData.V,
      exposure: classification.windExposure,
      riskCategory: categoryToRisk(classification.occupancyCategory),
      enclosure: classification.enclosure,
      topographicFactor: 1.0, // Flat terrain default
      importanceFactor: 1.0,
    },
  };

  // ============================================================
  // 4. SNOW LOAD (NCh431)
  // ============================================================
  const groundSnow = calculateGroundSnowLoad(location.altitude, location.longitude);
  const snowParams: SnowLoadParams = {
    altitude: location.altitude,
    longitude: location.longitude,
    exposure: classification.snowExposure,
    terrain: 'C', // Default terrain category
    thermalCondition: classification.thermalCondition,
    riskCategory: categoryToRisk(classification.occupancyCategory),
    roofSlope: geometry.roofSlope,
    roofSurface: 'non_slippery',
  };
  const snowAnalysis = analyzeSnowLoads(snowParams);

  const snowLoad = {
    groundSnow,
    roofSnow: snowAnalysis.flatRoofLoad,
    analysis: snowAnalysis,
    parameters: {
      code: 'NCh431' as const,
      version: '2010' as const,
      altitude: location.altitude,
      longitude: location.longitude,
      groundSnowLoad: groundSnow,
      exposure: classification.snowExposure,
      terrain: 'C' as const,
      thermalCondition: classification.thermalCondition,
      riskCategory: categoryToRisk(classification.occupancyCategory),
      exposureFactor: snowAnalysis.factors.Ce,
      thermalFactor: snowAnalysis.factors.Ct,
      importanceFactor: snowAnalysis.factors.Is,
      slopeFactor: snowAnalysis.factors.Cs,
      flatRoofLoad: snowAnalysis.flatRoofLoad,
      slopedRoofLoad: snowAnalysis.slopedRoofLoad,
    },
  };

  // ============================================================
  // 5. LOAD VALUES FOR COMBINATIONS
  // ============================================================
  // Convert to equivalent uniform loads for a typical floor
  const loadValues: LoadValues = {
    D: deadLoad.total,
    L: liveLoad.reduced,
    Lr: roofLiveLoad,
    S: snowLoad.roofSnow,
    R: 0, // Rain load - calculate separately if ponding possible
    W: windPressures.p_total_mwfrs, // Use total MWFRS wind pressure
    E: 0, // Seismic - requires separate analysis
  };

  // ============================================================
  // 6. LOAD COMBINATIONS (NCh3171)
  // ============================================================
  const lrfdResults = calculateLRFDCombinations(loadValues);
  const asdResults = calculateASDCombinations(loadValues);
  const governing = getGoverningCombination(lrfdResults);
  const envelope = calculateEnvelope(lrfdResults);

  const combinations = {
    lrfd: lrfdResults,
    asd: asdResults,
    governing,
    envelope,
  };

  // ============================================================
  // 7. DRIFT LIMITS
  // ============================================================
  const driftLimit = classification.hasFragileElements ? 0.010 : 0.015;

  // ============================================================
  // 8. FIELD STUDY REQUIREMENTS (DS61)
  // ============================================================
  const buildingCriteria: BuildingCriteria = {
    occupancyCategory: classification.occupancyCategory,
    stories: geometry.numStories,
    footprintArea: geometry.typicalFloorArea,
    hasBasement: false, // Add to params if needed
    basementDepth: 0,
    isHousingProject: false,
    terrainArea: geometry.typicalFloorArea * geometry.numStories,
  };
  const fieldStudy = determineFieldStudyRequirements(buildingCriteria);

  // ============================================================
  // COMPILE RESULTS
  // ============================================================
  return {
    codes: {
      seismic: 'NCh433',
      wind: 'NCh432',
      snow: 'NCh431',
      live: 'NCh1537',
      combinations: 'NCh3171',
      geotechnical: 'DS61',
    },
    deadLoad,
    liveLoad,
    windLoad,
    snowLoad,
    loadValues,
    combinations,
    driftLimit,
    fieldStudy,
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function categoryToRisk(
  category: OccupancyCategory
): 'I' | 'II' | 'III' | 'IV' {
  const mapping: Record<OccupancyCategory, 'I' | 'II' | 'III' | 'IV'> = {
    I: 'I',
    II: 'II',
    III: 'III',
    IV: 'IV',
  };
  return mapping[category];
}

// ============================================================
// QUICK LOAD ESTIMATE FUNCTIONS
// ============================================================

/**
 * Quick estimate of total gravity load for preliminary design
 */
export function estimateGravityLoad(
  occupancy: OccupancyType,
  slabThickness: number = 0.15, // m
  includePartitions: boolean = true
): number {
  const deadLoad = calculateFloorDeadLoad({
    slabThickness,
    slabMaterial: 'reinforced_concrete',
    finishType: 'ceramic_tile',
    partitionType: includePartitions ? 'medium' : 'none',
    ceilingLoad: 0.2,
    mepLoad: 0.3,
  });

  const liveLoad = LIVE_LOADS[occupancy].qk;

  return deadLoad + liveLoad;
}

/**
 * Quick wind pressure estimate for preliminary design
 */
export function estimateWindPressure(
  zone: 1 | 2 | 3 | 4 | 5,
  height: number,
  exposure: 'B' | 'C' | 'D' = 'C'
): number {
  const params: WindLoadParams = {
    zone,
    exposure,
    height,
    enclosure: 'enclosed',
    riskCategory: 'II',
  };
  const result = calculateVelocityPressure(params);
  return result.qh;
}

/**
 * Quick snow load estimate for preliminary design
 */
export function estimateSnowLoad(
  altitude: number,
  longitude: number = -70.6 // Default to Santiago longitude
): number {
  return calculateGroundSnowLoad(altitude, longitude);
}

// ============================================================
// SUMMARY REPORT GENERATOR
// ============================================================

export interface LoadSummaryReport {
  title: string;
  location: string;
  codes: string[];
  loads: {
    type: string;
    value: number;
    unit: string;
    code: string;
  }[];
  governingCombination: string;
  maxLoad: number;
  fieldStudyRequired: boolean;
  fieldStudyMethods: string[];
}

/**
 * Generate a summary report of the load analysis
 */
export function generateLoadSummary(
  analysis: ChileanLoadAnalysis,
  projectName: string = 'Project'
): LoadSummaryReport {
  return {
    title: `Load Analysis Summary - ${projectName}`,
    location: `Zone: Seismic ${analysis.codes.seismic}, Wind ${analysis.windLoad.parameters.zone}`,
    codes: Object.values(analysis.codes),
    loads: [
      {
        type: 'Dead Load (D)',
        value: analysis.deadLoad.total,
        unit: 'kN/m²',
        code: '-',
      },
      {
        type: 'Live Load (L)',
        value: analysis.liveLoad.reduced,
        unit: 'kN/m²',
        code: 'NCh1537',
      },
      {
        type: 'Roof Live (Lr)',
        value: analysis.liveLoad.roofLive,
        unit: 'kN/m²',
        code: 'NCh1537',
      },
      {
        type: 'Wind Pressure (W)',
        value: analysis.windLoad.velocityPressure,
        unit: 'kN/m²',
        code: 'NCh432',
      },
      {
        type: 'Snow Load (S)',
        value: analysis.snowLoad.roofSnow,
        unit: 'kN/m²',
        code: 'NCh431',
      },
    ],
    governingCombination: `${analysis.combinations.governing.combination.id}: ${analysis.combinations.governing.combination.formula}`,
    maxLoad: analysis.combinations.governing.value,
    fieldStudyRequired: analysis.fieldStudy.required,
    fieldStudyMethods: analysis.fieldStudy.methods,
  };
}

// ============================================================
// GEOLOCATION BRIDGE FUNCTIONS
// ============================================================

/**
 * Create a ChileanBuildingLocation from geographic coordinates
 * Automatically determines seismic zone, wind zone, and soil type
 */
export function createLocationFromCoordinates(
  coords: GeoCoordinates,
  options?: {
    region?: string;
    city?: string;
    vs30Override?: number;
    soilTypeOverride?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  }
): ChileanBuildingLocation {
  const zones = determineAllZones(coords);
  const regionData = getRegionFromCoordinates(coords);

  return {
    region: options?.region ?? regionData?.name ?? undefined,
    city: options?.city,
    latitude: coords.latitude,
    longitude: coords.longitude,
    altitude: coords.altitude ?? 0,
    seismicZone: zones.seismic.zone,
    windZone: zones.wind.zone,
    soilType: options?.soilTypeOverride ?? zones.soil.soilType,
    vs30: options?.vs30Override ?? zones.soil.vs30,
  };
}

/**
 * Analyze a Chilean building using just coordinates + geometry + classification
 * Automatically determines zones from coordinates
 */
export function analyzeChileanBuildingFromCoordinates(
  coords: GeoCoordinates,
  geometry: ChileanBuildingGeometry,
  classification: ChileanBuildingClassification,
  options?: {
    region?: string;
    city?: string;
    vs30Override?: number;
    soilTypeOverride?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
    deadLoadEstimate?: {
      selfWeight?: number;
      superimposed?: number;
      partitions?: number;
    };
  }
): ChileanLoadAnalysis & { zonesResult: AllZonesResult } {
  const location = createLocationFromCoordinates(coords, options);
  const zones = determineAllZones(coords);

  const analysis = analyzeChileanBuilding(
    { location, geometry, classification },
    options?.deadLoadEstimate
  );

  return {
    ...analysis,
    zonesResult: zones,
  };
}

/**
 * Get zone summary from coordinates for display purposes
 */
export function getZoneSummaryFromCoordinates(
  coords: GeoCoordinates
): {
  location: string;
  seismicZone: { zone: 1 | 2 | 3; A0: number; description: string };
  windZone: { zone: 1 | 2 | 3 | 4 | 5; speed: number; description: string };
  soilType: { type: string; vs30: number | undefined; description: string };
  region: string | null;
} {
  const zones = determineAllZones(coords);
  const regionData = getRegionFromCoordinates(coords);

  // Seismic zone descriptions
  const seismicDescriptions: Record<1 | 2 | 3, string> = {
    1: 'Low seismic hazard (A0 = 0.20g)',
    2: 'Moderate seismic hazard (A0 = 0.30g)',
    3: 'High seismic hazard (A0 = 0.40g)',
  };

  // Wind zone descriptions
  const windDescriptions: Record<1 | 2 | 3 | 4 | 5, string> = {
    1: 'V = 30 m/s - Low wind region',
    2: 'V = 35 m/s - Moderate wind region',
    3: 'V = 45 m/s - High wind region',
    4: 'V = 50 m/s - Very high wind region',
    5: 'V = 55 m/s - Extreme wind region',
  };

  // Soil type descriptions
  const soilDescriptions: Record<string, string> = {
    A: 'Rock (Vs30 > 900 m/s)',
    B: 'Very dense soil or soft rock (Vs30 = 500-900 m/s)',
    C: 'Dense soil (Vs30 = 350-500 m/s)',
    D: 'Stiff soil (Vs30 = 180-350 m/s)',
    E: 'Soft soil (Vs30 < 180 m/s)',
    F: 'Special study required',
  };

  return {
    location: `${coords.latitude.toFixed(4)}°, ${coords.longitude.toFixed(4)}° @ ${coords.altitude ?? 0}m`,
    seismicZone: {
      zone: zones.seismic.zone,
      A0: zones.seismic.A0,
      description: seismicDescriptions[zones.seismic.zone],
    },
    windZone: {
      zone: zones.wind.zone,
      speed: zones.wind.V,
      description: windDescriptions[zones.wind.zone],
    },
    soilType: {
      type: zones.soil.soilType,
      vs30: zones.soil.vs30 ?? zones.soil.vs30Estimated,
      description: soilDescriptions[zones.soil.soilType] ?? 'Unknown soil type',
    },
    region: regionData?.name ?? null,
  };
}

// ============================================================
// RE-EXPORTS FOR CONVENIENCE
// ============================================================

export {
  // NCh432 Wind
  calculateVelocityPressure,
  calculateDesignPressures,
  CHILEAN_WIND_ZONES,
  // NCh431 Snow
  calculateGroundSnowLoad,
  analyzeSnowLoads,
  // NCh1537 Live
  LIVE_LOADS,
  calculateLiveLoadReduction,
  calculateFloorDeadLoad,
  createNCh1537Parameters,
  // NCh3171 Combinations
  calculateLRFDCombinations,
  calculateASDCombinations,
  getGoverningCombination,
  calculateEnvelope,
  LRFD_COMBINATIONS,
  ASD_COMBINATIONS,
  DRIFT_LIMITS,
  // DS61 Geotechnical
  determineFieldStudyRequirements,
  checkDS61Compliance,
  OCCUPANCY_CATEGORIES,
  SOIL_CLASSIFICATION_REQUIREMENTS,
};

// Re-export types
export type {
  WindLoadParams,
  DesignWindPressure,
  NCh432WindParameters,
  SnowLoadParams,
  SnowLoadAnalysisResult,
  NCh431SnowParameters,
  OccupancyType,
  LiveLoadData,
  NCh1537LoadParameters,
  LoadValues,
  CombinationResult,
  NCh3171Parameters,
  OccupancyCategory,
  BuildingCriteria,
  FieldStudyRequirements,
  ComplianceResult,
};
