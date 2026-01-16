/**
 * Standard Cross-Section Library
 *
 * Pre-defined cross-sections based on Chilean urban road standards (REDEVU)
 * and MOP Manual de Carreteras for rural highways.
 *
 * References:
 * - REDEVU (Recomendaciones para Diseño de Espacios Viales Urbanos)
 * - OGUC (Ordenanza General de Urbanismo y Construcciones)
 * - MOP Manual de Carreteras Vol. 3
 *
 * @module road-geometry/standard-sections
 */

import {
  CrossSectionInput,
  CrossSectionResult,
  CurbSpec,
  generateCrossSection,
  STANDARD_CURBS,
} from './cross-section';
import { RoadClassificationType } from '../design-tables';

// ============================================================================
// Types
// ============================================================================

export interface StandardSectionDefinition {
  /** Section identifier */
  id: string;
  /** Road classification */
  classification: RoadClassificationType;
  /** Display name */
  name: string;
  /** Description */
  description: string;
  /** Minimum right-of-way width (m) */
  minROW: number;
  /** Typical right-of-way width (m) */
  typicalROW: number;
  /** Cross-section input configuration */
  config: CrossSectionInput;
  /** Design speed range (km/h) */
  designSpeedRange: { min: number; max: number };
  /** Applicable environment */
  environment: 'urban' | 'suburban' | 'rural';
  /** REDEVU or MOP reference */
  reference?: string;
}

// ============================================================================
// REDEVU Urban Standard Sections
// ============================================================================

/**
 * Express Road (Via Expresa) - Highest capacity urban arterial
 */
export const REDEVU_EXPRESS: StandardSectionDefinition = {
  id: 'redevu-express',
  classification: 'express',
  name: 'Vía Expresa',
  description: 'Urban freeway with 3 lanes per direction, divided, no parking',
  minROW: 40,
  typicalROW: 50,
  designSpeedRange: { min: 80, max: 100 },
  environment: 'urban',
  reference: 'REDEVU 2009, Tabla 3.2.1',
  config: {
    classification: 'express',
    lanesPerDirection: 3,
    laneWidth: 3.5,
    parking: 'none',
    bikeLane: 'none',
    median: true,
    medianWidth: 4.0,
    sidewalk: 'both',
    sidewalkWidth: 3.0,
    plantingStrip: true,
    plantingStripWidth: 2.0,
    curb: STANDARD_CURBS.barrier,
    crownSlope: 2.0,
    environment: 'urban',
  },
};

/**
 * Trunk Road (Via Troncal) - Major arterial
 */
export const REDEVU_TRUNK: StandardSectionDefinition = {
  id: 'redevu-trunk',
  classification: 'trunk',
  name: 'Vía Troncal',
  description: 'Major arterial with 2 lanes per direction, divided, no parking',
  minROW: 25,
  typicalROW: 30,
  designSpeedRange: { min: 50, max: 80 },
  environment: 'urban',
  reference: 'REDEVU 2009, Tabla 3.2.2',
  config: {
    classification: 'trunk',
    lanesPerDirection: 2,
    laneWidth: 3.5,
    parking: 'none',
    bikeLane: 'none',
    median: true,
    medianWidth: 2.0,
    sidewalk: 'both',
    sidewalkWidth: 2.5,
    plantingStrip: true,
    plantingStripWidth: 1.5,
    curb: STANDARD_CURBS.barrier,
    crownSlope: 2.0,
    environment: 'urban',
  },
};

/**
 * Collector Road (Via Colectora) - Collector/distributor
 */
export const REDEVU_COLLECTOR: StandardSectionDefinition = {
  id: 'redevu-collector',
  classification: 'collector',
  name: 'Vía Colectora',
  description: 'Collector with 1 lane per direction, parking both sides',
  minROW: 18,
  typicalROW: 22,
  designSpeedRange: { min: 40, max: 60 },
  environment: 'urban',
  reference: 'REDEVU 2009, Tabla 3.2.3',
  config: {
    classification: 'collector',
    lanesPerDirection: 1,
    laneWidth: 3.5,
    parking: 'both',
    parkingWidth: 2.2,
    bikeLane: 'none',
    median: false,
    sidewalk: 'both',
    sidewalkWidth: 2.0,
    plantingStrip: false,
    curb: STANDARD_CURBS.barrier,
    crownSlope: 2.0,
    environment: 'urban',
  },
};

/**
 * Collector with Bike Lanes
 */
export const REDEVU_COLLECTOR_BIKE: StandardSectionDefinition = {
  id: 'redevu-collector-bike',
  classification: 'collector',
  name: 'Vía Colectora con Ciclovía',
  description: 'Collector with bike lanes, parking one side',
  minROW: 20,
  typicalROW: 24,
  designSpeedRange: { min: 40, max: 60 },
  environment: 'urban',
  reference: 'REDEVU 2009, adaptado',
  config: {
    classification: 'collector',
    lanesPerDirection: 1,
    laneWidth: 3.25,
    parking: 'right',
    parkingWidth: 2.2,
    bikeLane: 'both',
    bikeLaneWidth: 1.5,
    median: false,
    sidewalk: 'both',
    sidewalkWidth: 2.0,
    plantingStrip: false,
    curb: STANDARD_CURBS.barrier,
    crownSlope: 2.0,
    environment: 'urban',
  },
};

/**
 * Service Road (Via de Servicio) - Minor arterial/commercial
 */
export const REDEVU_SERVICE: StandardSectionDefinition = {
  id: 'redevu-service',
  classification: 'service',
  name: 'Vía de Servicio',
  description: 'Service road with 1 lane per direction, parking one side',
  minROW: 14,
  typicalROW: 18,
  designSpeedRange: { min: 30, max: 50 },
  environment: 'urban',
  reference: 'REDEVU 2009, Tabla 3.2.4',
  config: {
    classification: 'service',
    lanesPerDirection: 1,
    laneWidth: 3.0,
    parking: 'right',
    parkingWidth: 2.2,
    bikeLane: 'none',
    median: false,
    sidewalk: 'both',
    sidewalkWidth: 1.8,
    plantingStrip: false,
    curb: STANDARD_CURBS.barrier,
    crownSlope: 2.0,
    environment: 'urban',
  },
};

/**
 * Local Road (Via Local) - Residential/neighborhood
 */
export const REDEVU_LOCAL: StandardSectionDefinition = {
  id: 'redevu-local',
  classification: 'local',
  name: 'Vía Local',
  description: 'Local street with 1 lane per direction, parking one side',
  minROW: 11,
  typicalROW: 14,
  designSpeedRange: { min: 30, max: 40 },
  environment: 'urban',
  reference: 'REDEVU 2009, Tabla 3.2.5',
  config: {
    classification: 'local',
    lanesPerDirection: 1,
    laneWidth: 3.0,
    parking: 'right',
    parkingWidth: 2.0,
    bikeLane: 'none',
    median: false,
    sidewalk: 'both',
    sidewalkWidth: 1.5,
    plantingStrip: false,
    curb: STANDARD_CURBS.barrier,
    crownSlope: 2.0,
    environment: 'urban',
  },
};

/**
 * Passage (Pasaje) - Cul-de-sac/pedestrian priority
 */
export const REDEVU_PASSAGE: StandardSectionDefinition = {
  id: 'redevu-passage',
  classification: 'passage',
  name: 'Pasaje',
  description: 'Passage with shared space, minimal width',
  minROW: 8,
  typicalROW: 10,
  designSpeedRange: { min: 20, max: 30 },
  environment: 'urban',
  reference: 'REDEVU 2009, Tabla 3.2.6',
  config: {
    classification: 'passage',
    lanesPerDirection: 1,
    laneWidth: 2.75,
    parking: 'none',
    bikeLane: 'none',
    median: false,
    sidewalk: 'both',
    sidewalkWidth: 1.2,
    plantingStrip: false,
    curb: STANDARD_CURBS.rolled,
    crownSlope: 2.0,
    environment: 'urban',
  },
};

/**
 * Passage with parking bays
 */
export const REDEVU_PASSAGE_PARKING: StandardSectionDefinition = {
  id: 'redevu-passage-parking',
  classification: 'passage',
  name: 'Pasaje con Estacionamiento',
  description: 'Passage with parking bays in alternating pattern',
  minROW: 10,
  typicalROW: 12,
  designSpeedRange: { min: 20, max: 30 },
  environment: 'urban',
  reference: 'REDEVU 2009, adaptado',
  config: {
    classification: 'passage',
    lanesPerDirection: 1,
    laneWidth: 3.0,
    parking: 'right', // Alternating bays represented as one side
    parkingWidth: 2.0,
    bikeLane: 'none',
    median: false,
    sidewalk: 'both',
    sidewalkWidth: 1.5,
    plantingStrip: false,
    curb: STANDARD_CURBS.rolled,
    crownSlope: 2.0,
    environment: 'urban',
  },
};

// ============================================================================
// Rural Highway Standard Sections (MOP)
// ============================================================================

/**
 * Rural Highway Primary (Autopista)
 */
export const MOP_HIGHWAY_PRIMARY: StandardSectionDefinition = {
  id: 'mop-highway-primary',
  classification: 'express',
  name: 'Autopista',
  description: 'Rural freeway, 2 lanes per direction with shoulders',
  minROW: 40,
  typicalROW: 50,
  designSpeedRange: { min: 100, max: 120 },
  environment: 'rural',
  reference: 'MOP Vol. 3, Tabla 3.402.2',
  config: {
    classification: 'express',
    lanesPerDirection: 2,
    laneWidth: 3.65,
    parking: 'none',
    bikeLane: 'none',
    median: true,
    medianWidth: 6.0,
    sidewalk: 'none',
    curb: { type: 'none', height: 0, width: 0, gutterWidth: 0, gutterDepth: 0 },
    crownSlope: 2.0,
    environment: 'rural',
  },
};

/**
 * Rural Highway Secondary
 */
export const MOP_HIGHWAY_SECONDARY: StandardSectionDefinition = {
  id: 'mop-highway-secondary',
  classification: 'trunk',
  name: 'Carretera Principal',
  description: 'Rural primary road, 1 lane per direction with shoulders',
  minROW: 20,
  typicalROW: 25,
  designSpeedRange: { min: 80, max: 100 },
  environment: 'rural',
  reference: 'MOP Vol. 3, Tabla 3.402.2',
  config: {
    classification: 'trunk',
    lanesPerDirection: 1,
    laneWidth: 3.5,
    parking: 'none',
    bikeLane: 'none',
    median: false,
    sidewalk: 'none',
    curb: { type: 'none', height: 0, width: 0, gutterWidth: 0, gutterDepth: 0 },
    crownSlope: 2.5,
    environment: 'rural',
  },
};

/**
 * Rural Road Collector
 */
export const MOP_ROAD_COLLECTOR: StandardSectionDefinition = {
  id: 'mop-road-collector',
  classification: 'collector',
  name: 'Camino Colector',
  description: 'Rural collector road with minimal shoulders',
  minROW: 15,
  typicalROW: 20,
  designSpeedRange: { min: 60, max: 80 },
  environment: 'rural',
  reference: 'MOP Vol. 3',
  config: {
    classification: 'collector',
    lanesPerDirection: 1,
    laneWidth: 3.25,
    parking: 'none',
    bikeLane: 'none',
    median: false,
    sidewalk: 'none',
    curb: { type: 'none', height: 0, width: 0, gutterWidth: 0, gutterDepth: 0 },
    crownSlope: 3.0,
    environment: 'rural',
  },
};

/**
 * Rural Road Local
 */
export const MOP_ROAD_LOCAL: StandardSectionDefinition = {
  id: 'mop-road-local',
  classification: 'local',
  name: 'Camino Local',
  description: 'Rural local road, basic standard',
  minROW: 10,
  typicalROW: 15,
  designSpeedRange: { min: 40, max: 60 },
  environment: 'rural',
  reference: 'MOP Vol. 3',
  config: {
    classification: 'local',
    lanesPerDirection: 1,
    laneWidth: 3.0,
    parking: 'none',
    bikeLane: 'none',
    median: false,
    sidewalk: 'none',
    curb: { type: 'none', height: 0, width: 0, gutterWidth: 0, gutterDepth: 0 },
    crownSlope: 3.0,
    environment: 'rural',
  },
};

// ============================================================================
// Special Sections
// ============================================================================

/**
 * Pedestrian Street (Calle Peatonal)
 */
export const SPECIAL_PEDESTRIAN_STREET: StandardSectionDefinition = {
  id: 'special-pedestrian',
  classification: 'passage',
  name: 'Calle Peatonal',
  description: 'Pedestrian-only street with emergency vehicle access',
  minROW: 6,
  typicalROW: 10,
  designSpeedRange: { min: 0, max: 10 },
  environment: 'urban',
  reference: 'REDEVU adaptado',
  config: {
    classification: 'passage',
    lanesPerDirection: 1,
    laneWidth: 4.0, // Emergency access width
    parking: 'none',
    bikeLane: 'none',
    median: false,
    sidewalk: 'none', // Entire surface is pedestrian
    curb: { type: 'none', height: 0, width: 0, gutterWidth: 0, gutterDepth: 0 },
    crownSlope: 1.5,
    environment: 'urban',
  },
};

/**
 * Shared Space / Woonerf
 */
export const SPECIAL_SHARED_SPACE: StandardSectionDefinition = {
  id: 'special-shared-space',
  classification: 'passage',
  name: 'Espacio Compartido',
  description: 'Shared space with minimal separation between modes',
  minROW: 8,
  typicalROW: 12,
  designSpeedRange: { min: 10, max: 20 },
  environment: 'urban',
  reference: 'European woonerf standards',
  config: {
    classification: 'passage',
    lanesPerDirection: 1,
    laneWidth: 3.0,
    parking: 'none',
    bikeLane: 'none',
    median: false,
    sidewalk: 'both',
    sidewalkWidth: 2.0,
    plantingStrip: true,
    plantingStripWidth: 1.0,
    curb: STANDARD_CURBS.rolled,
    crownSlope: 1.5,
    environment: 'urban',
  },
};

/**
 * Complete Street with All Modes
 */
export const SPECIAL_COMPLETE_STREET: StandardSectionDefinition = {
  id: 'special-complete-street',
  classification: 'collector',
  name: 'Calle Completa',
  description: 'Complete street with all modes: vehicles, bikes, pedestrians, transit',
  minROW: 28,
  typicalROW: 32,
  designSpeedRange: { min: 40, max: 50 },
  environment: 'urban',
  reference: 'Complete Streets principles',
  config: {
    classification: 'collector',
    lanesPerDirection: 1,
    laneWidth: 3.25,
    parking: 'both',
    parkingWidth: 2.2,
    bikeLane: 'both',
    bikeLaneWidth: 2.0, // Buffered bike lane
    median: false,
    sidewalk: 'both',
    sidewalkWidth: 2.5,
    plantingStrip: true,
    plantingStripWidth: 1.5,
    curb: STANDARD_CURBS.barrier,
    crownSlope: 2.0,
    environment: 'urban',
  },
};

// ============================================================================
// Standard Sections Registry
// ============================================================================

/**
 * All standard sections indexed by ID
 */
export const STANDARD_SECTIONS: Record<string, StandardSectionDefinition> = {
  // REDEVU Urban
  [REDEVU_EXPRESS.id]: REDEVU_EXPRESS,
  [REDEVU_TRUNK.id]: REDEVU_TRUNK,
  [REDEVU_COLLECTOR.id]: REDEVU_COLLECTOR,
  [REDEVU_COLLECTOR_BIKE.id]: REDEVU_COLLECTOR_BIKE,
  [REDEVU_SERVICE.id]: REDEVU_SERVICE,
  [REDEVU_LOCAL.id]: REDEVU_LOCAL,
  [REDEVU_PASSAGE.id]: REDEVU_PASSAGE,
  [REDEVU_PASSAGE_PARKING.id]: REDEVU_PASSAGE_PARKING,
  // MOP Rural
  [MOP_HIGHWAY_PRIMARY.id]: MOP_HIGHWAY_PRIMARY,
  [MOP_HIGHWAY_SECONDARY.id]: MOP_HIGHWAY_SECONDARY,
  [MOP_ROAD_COLLECTOR.id]: MOP_ROAD_COLLECTOR,
  [MOP_ROAD_LOCAL.id]: MOP_ROAD_LOCAL,
  // Special
  [SPECIAL_PEDESTRIAN_STREET.id]: SPECIAL_PEDESTRIAN_STREET,
  [SPECIAL_SHARED_SPACE.id]: SPECIAL_SHARED_SPACE,
  [SPECIAL_COMPLETE_STREET.id]: SPECIAL_COMPLETE_STREET,
};

// ============================================================================
// Lookup Functions
// ============================================================================

/**
 * Get standard section by ID
 */
export function getStandardSection(id: string): StandardSectionDefinition | undefined {
  return STANDARD_SECTIONS[id];
}

/**
 * Get standard sections by classification
 */
export function getSectionsByClassification(
  classification: RoadClassificationType
): StandardSectionDefinition[] {
  return Object.values(STANDARD_SECTIONS).filter(
    (s) => s.classification === classification
  );
}

/**
 * Get standard sections by environment
 */
export function getSectionsByEnvironment(
  environment: 'urban' | 'suburban' | 'rural'
): StandardSectionDefinition[] {
  return Object.values(STANDARD_SECTIONS).filter(
    (s) => s.environment === environment
  );
}

/**
 * Get recommended section for classification and environment
 */
export function getRecommendedSection(
  classification: RoadClassificationType,
  environment: 'urban' | 'suburban' | 'rural' = 'urban'
): StandardSectionDefinition {
  // Find matching sections
  const matching = Object.values(STANDARD_SECTIONS).filter(
    (s) => s.classification === classification && s.environment === environment
  );

  if (matching.length > 0) {
    // Return first match (typically the standard variant)
    return matching[0];
  }

  // Fallback: find by classification only
  const byClassification = getSectionsByClassification(classification);
  if (byClassification.length > 0) {
    return byClassification[0];
  }

  // Ultimate fallback: local street
  return REDEVU_LOCAL;
}

/**
 * Generate cross-section from standard section definition
 */
export function generateStandardCrossSection(
  sectionId: string
): CrossSectionResult | undefined {
  const definition = getStandardSection(sectionId);
  if (!definition) return undefined;

  return generateCrossSection(definition.config);
}

/**
 * Get all standard section IDs
 */
export function getStandardSectionIds(): string[] {
  return Object.keys(STANDARD_SECTIONS);
}

/**
 * Search sections by design speed
 */
export function getSectionsByDesignSpeed(
  designSpeed: number
): StandardSectionDefinition[] {
  return Object.values(STANDARD_SECTIONS).filter(
    (s) =>
      designSpeed >= s.designSpeedRange.min && designSpeed <= s.designSpeedRange.max
  );
}

/**
 * Find section that fits within given ROW
 */
export function getSectionsByROW(
  availableROW: number,
  environment: 'urban' | 'suburban' | 'rural' = 'urban'
): StandardSectionDefinition[] {
  return Object.values(STANDARD_SECTIONS)
    .filter((s) => s.environment === environment && s.minROW <= availableROW)
    .sort((a, b) => b.typicalROW - a.typicalROW); // Largest first
}

// ============================================================================
// Summary Table Generation
// ============================================================================

/**
 * Generate summary table of all standard sections
 */
export function generateSectionSummaryTable(): {
  id: string;
  name: string;
  classification: string;
  environment: string;
  minROW: number;
  typicalROW: number;
  lanes: number;
  parking: string;
  bikeLane: boolean;
  sidewalk: boolean;
}[] {
  return Object.values(STANDARD_SECTIONS).map((s) => ({
    id: s.id,
    name: s.name,
    classification: s.classification,
    environment: s.environment,
    minROW: s.minROW,
    typicalROW: s.typicalROW,
    lanes: s.config.lanesPerDirection * 2,
    parking: s.config.parking || 'none',
    bikeLane: s.config.bikeLane !== 'none' && s.config.bikeLane !== undefined,
    sidewalk: s.config.sidewalk !== 'none' && s.config.sidewalk !== undefined,
  }));
}
