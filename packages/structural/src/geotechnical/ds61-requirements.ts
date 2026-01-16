// ============================================================
// DS61 - Geotechnical Study Requirements
// Decreto Supremo 61 - Requisitos de Estudios de Suelo
// ============================================================
// Reference: Decreto Supremo N°61 (2011) MINVU
// Related: NCh433.Of96 Mod 2009 - Diseño Sísmico de Edificios
// Sources:
// - https://www.minvu.gob.cl/wp-content/uploads/2019/05/DECRETO-61-2011-DISEN%CC%83O-SISMICO-DE-EDIFICIOS.pdf
// - https://www.bcn.cl/leychile/Navegar?idNorma=1034101
// ============================================================

// ============================================================
// BUILDING CATEGORIES (Categorías de Ocupación)
// ============================================================

export type OccupancyCategory = 'I' | 'II' | 'III' | 'IV';

export interface OccupancyCategoryData {
  category: OccupancyCategory;
  description: string;
  descriptionEs: string;
  examples: string[];
  exemplosEs: string[];
  requiresFieldStudy: boolean;
  fieldStudyDepth: number;           // Minimum depth (m)
  requiresVs30: boolean;
  requiresLiquefactionStudy: boolean;
}

/**
 * Building occupancy categories per NCh433
 * Categorías de ocupación según NCh433
 */
export const OCCUPANCY_CATEGORIES: Record<OccupancyCategory, OccupancyCategoryData> = {
  I: {
    category: 'I',
    description: 'Low hazard to human life',
    descriptionEs: 'Edificios de bajo riesgo para la vida humana',
    examples: [
      'Agricultural buildings',
      'Temporary structures',
      'Minor storage facilities',
      'Isolated structures',
    ],
    exemplosEs: [
      'Edificaciones agrícolas',
      'Estructuras temporales',
      'Instalaciones de almacenaje menor',
      'Estructuras aisladas',
    ],
    requiresFieldStudy: false,
    fieldStudyDepth: 15,
    requiresVs30: false,
    requiresLiquefactionStudy: false,
  },
  II: {
    category: 'II',
    description: 'Standard occupancy structures',
    descriptionEs: 'Edificios de ocupación normal',
    examples: [
      'Residential buildings',
      'Commercial buildings',
      'Industrial facilities',
      'Hotels and motels',
      'Office buildings',
    ],
    exemplosEs: [
      'Edificios residenciales',
      'Edificios comerciales',
      'Instalaciones industriales',
      'Hoteles y moteles',
      'Edificios de oficinas',
    ],
    requiresFieldStudy: true,
    fieldStudyDepth: 30,
    requiresVs30: true,
    requiresLiquefactionStudy: true,
  },
  III: {
    category: 'III',
    description: 'High occupancy or hazardous materials',
    descriptionEs: 'Alta ocupación o materiales peligrosos',
    examples: [
      'Schools and universities',
      'Churches and assembly halls',
      'Theaters and cinemas',
      'Shopping centers',
      'Sports facilities',
      'Buildings with hazardous materials',
    ],
    exemplosEs: [
      'Colegios y universidades',
      'Iglesias y salones de reunión',
      'Teatros y cines',
      'Centros comerciales',
      'Instalaciones deportivas',
      'Edificios con materiales peligrosos',
    ],
    requiresFieldStudy: true,
    fieldStudyDepth: 30,
    requiresVs30: true,
    requiresLiquefactionStudy: true,
  },
  IV: {
    category: 'IV',
    description: 'Essential facilities',
    descriptionEs: 'Instalaciones esenciales',
    examples: [
      'Hospitals and medical facilities',
      'Fire stations',
      'Police stations',
      'Emergency response centers',
      'Power plants',
      'Water treatment facilities',
      'Air traffic control towers',
      'Communication centers',
    ],
    exemplosEs: [
      'Hospitales e instalaciones médicas',
      'Estaciones de bomberos',
      'Estaciones de policía',
      'Centros de respuesta de emergencia',
      'Plantas de energía',
      'Plantas de tratamiento de agua',
      'Torres de control de tráfico aéreo',
      'Centros de comunicaciones',
    ],
    requiresFieldStudy: true,
    fieldStudyDepth: 30,
    requiresVs30: true,
    requiresLiquefactionStudy: true,
  },
};

// ============================================================
// SOIL CLASSIFICATION REQUIREMENTS (DS61)
// ============================================================

export type SoilType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface SoilClassificationRequirements {
  type: SoilType;
  description: string;
  descriptionEs: string;
  Vs30_range: { min?: number; max?: number };
  N1_60_range?: { min?: number; max?: number };
  Su_range?: { min?: number; max?: number };
  RQD_required?: boolean;
  qu_required?: boolean;
  specialStudy: boolean;
  specialStudyReasons?: string[];
}

/**
 * Soil classification requirements per DS61 Artículo 6
 * Requisitos de clasificación sísmica de suelos
 */
export const SOIL_CLASSIFICATION_REQUIREMENTS: Record<SoilType, SoilClassificationRequirements> = {
  A: {
    type: 'A',
    description: 'Rock or cemented soil',
    descriptionEs: 'Roca o suelo cementado',
    Vs30_range: { min: 900 },
    RQD_required: true,
    qu_required: true,
    specialStudy: false,
  },
  B: {
    type: 'B',
    description: 'Soft rock or very dense soil',
    descriptionEs: 'Roca blanda o suelo muy denso o muy firme',
    Vs30_range: { min: 500, max: 900 },
    N1_60_range: { min: 50 },
    Su_range: { min: 100 },  // kPa
    specialStudy: false,
  },
  C: {
    type: 'C',
    description: 'Dense or firm soil',
    descriptionEs: 'Suelo denso o firme',
    Vs30_range: { min: 350, max: 500 },
    N1_60_range: { min: 40, max: 50 },
    Su_range: { min: 50, max: 100 },
    specialStudy: false,
  },
  D: {
    type: 'D',
    description: 'Moderately dense or stiff soil',
    descriptionEs: 'Suelo medianamente denso o medianamente firme',
    Vs30_range: { min: 180, max: 350 },
    N1_60_range: { min: 15, max: 40 },
    Su_range: { min: 25, max: 50 },
    specialStudy: false,
  },
  E: {
    type: 'E',
    description: 'Soft or loose soil',
    descriptionEs: 'Suelo de compacidad/consistencia media a baja',
    Vs30_range: { max: 180 },
    N1_60_range: { max: 15 },
    Su_range: { max: 25 },
    specialStudy: true,
    specialStudyReasons: [
      'Required elastic displacement spectrum study',
      'Enhanced geotechnical investigation',
    ],
  },
  F: {
    type: 'F',
    description: 'Special soils requiring site-specific study',
    descriptionEs: 'Suelos especiales que requieren estudio específico',
    Vs30_range: {},
    specialStudy: true,
    specialStudyReasons: [
      'Liquefiable soils',
      'Collapsible soils',
      'Organic soils',
      'Sensitive clays',
      'Peat',
      'High plasticity clays (PI > 75)',
      'Very soft clays (H > 3m with Su < 25 kPa)',
    ],
  },
};

// ============================================================
// FIELD STUDY REQUIREMENTS
// ============================================================

export type MeasurementMethod =
  | 'downhole'
  | 'crosshole'
  | 'suspension_logging'
  | 'sasw'
  | 'masw'
  | 'remi';

export interface FieldStudyMethod {
  method: MeasurementMethod;
  name: string;
  nameEs: string;
  type: 'invasive' | 'surface_wave';
  description: string;
  requirements: string[];
  requiresActiveSource?: boolean;
}

/**
 * Approved methods for Vs30 measurement per DS61
 * Métodos aprobados para medición de Vs30
 */
export const VS30_MEASUREMENT_METHODS: Record<MeasurementMethod, FieldStudyMethod> = {
  downhole: {
    method: 'downhole',
    name: 'Down-Hole',
    nameEs: 'Down-Hole (Pozo abajo)',
    type: 'invasive',
    description: 'Seismic source at surface, geophones in borehole',
    requirements: [
      'Borehole to 30m depth minimum',
      'PVC casing grouted to soil',
      'Triaxial geophone at multiple depths',
    ],
  },
  crosshole: {
    method: 'crosshole',
    name: 'Cross-Hole',
    nameEs: 'Cross-Hole (Entre pozos)',
    type: 'invasive',
    description: 'Seismic source and receiver in separate boreholes',
    requirements: [
      'Two or more boreholes',
      'Borehole deviation survey required',
      'Source and receiver at same depth',
    ],
  },
  suspension_logging: {
    method: 'suspension_logging',
    name: 'Suspension Logging',
    nameEs: 'Sonda de Suspensión',
    type: 'invasive',
    description: 'Self-contained probe in single borehole',
    requirements: [
      'Single uncased borehole',
      'Fluid-filled borehole',
      'Suitable for deep measurements',
    ],
  },
  sasw: {
    method: 'sasw',
    name: 'SASW',
    nameEs: 'SASW (Análisis Espectral de Ondas Superficiales)',
    type: 'surface_wave',
    description: 'Spectral Analysis of Surface Waves',
    requirements: [
      'Two orthogonal measurement lines',
      'Dispersion curves required',
      'Velocity profile to depth',
    ],
  },
  masw: {
    method: 'masw',
    name: 'MASW',
    nameEs: 'MASW (Análisis Multicanal de Ondas Superficiales)',
    type: 'surface_wave',
    description: 'Multi-channel Analysis of Surface Waves',
    requirements: [
      'Two orthogonal measurement lines',
      'Dispersion curves required',
      'Active source with known location',
    ],
  },
  remi: {
    method: 'remi',
    name: 'ReMi',
    nameEs: 'ReMi (Microtremores)',
    type: 'surface_wave',
    description: 'Refraction Microtremor',
    requirements: [
      'Two orthogonal measurement lines',
      'Dispersion curves required',
      'Must include active source measurement',
      'Passive noise recording',
    ],
    requiresActiveSource: true,
  },
};

// ============================================================
// BUILDING CRITERIA FOR FIELD STUDY
// ============================================================

export interface BuildingCriteria {
  stories: number;                   // Number of stories above ground
  footprintArea: number;             // Building footprint (m²)
  occupancyCategory: OccupancyCategory;
  hasBasement: boolean;
  basementDepth?: number;            // Depth below ground (m)
  isHousingProject: boolean;         // Conjunto habitacional
  terrainArea?: number;              // Total terrain area (m²)
}

export interface FieldStudyRequirements {
  required: boolean;
  depth: number;                      // Required exploration depth (m)
  vs30Required: boolean;
  methods: MeasurementMethod[];       // Allowed methods
  additionalTests: string[];
  liquefactionStudy: boolean;
  siteResponse: boolean;              // Site-specific response study
  reason: string;
}

/**
 * Determine field study requirements based on building criteria
 * DS61 Artículo 5
 */
export function determineFieldStudyRequirements(
  criteria: BuildingCriteria
): FieldStudyRequirements {
  const {
    stories,
    footprintArea,
    occupancyCategory,
    hasBasement,
    basementDepth = 0,
    isHousingProject,
    terrainArea = 0,
  } = criteria;

  const category = OCCUPANCY_CATEGORIES[occupancyCategory];

  // Basic result
  const result: FieldStudyRequirements = {
    required: false,
    depth: 15,
    vs30Required: false,
    methods: [],
    additionalTests: [],
    liquefactionStudy: false,
    siteResponse: false,
    reason: '',
  };

  // Category I buildings may not require field study
  if (occupancyCategory === 'I') {
    result.reason = 'Category I building - reduced requirements';
    return result;
  }

  // Buildings ≥ 5 stories require 30m study
  if (stories >= 5) {
    result.required = true;
    result.depth = 30;
    result.vs30Required = true;
    result.liquefactionStudy = true;
    result.reason = 'Building with 5 or more stories';
  }

  // Category III and IV always require full study
  if (occupancyCategory === 'III' || occupancyCategory === 'IV') {
    result.required = true;
    result.depth = 30;
    result.vs30Required = true;
    result.liquefactionStudy = true;
    result.reason = `Occupancy Category ${occupancyCategory}`;
  }

  // Housing projects > 8 m² terrain require full study
  if (isHousingProject && terrainArea > 8) {
    result.required = true;
    result.depth = 30;
    result.vs30Required = true;
    result.reason = 'Housing project with terrain > 8 m²';
  }

  // Buildings with basements
  if (hasBasement && basementDepth > 0) {
    // Exploration must extend 15m below foundation level
    const foundationDepth = basementDepth;
    const requiredDepth = foundationDepth + 15;

    if (requiredDepth > 30) {
      result.depth = requiredDepth;
      result.reason = `Basement at ${basementDepth}m - exploration to Df+15m`;
    }
  }

  // Set allowed methods
  if (result.vs30Required) {
    result.methods = ['downhole', 'crosshole', 'suspension_logging', 'sasw', 'masw', 'remi'];
  }

  // Additional tests based on requirements
  if (result.required) {
    result.additionalTests = [
      'SPT (Standard Penetration Test)',
      'Soil sampling for classification',
      'Groundwater level determination',
    ];

    if (result.liquefactionStudy) {
      result.additionalTests.push('Liquefaction potential assessment');
    }
  }

  return result;
}

// ============================================================
// SOIL TYPE F SPECIAL CONDITIONS
// ============================================================

export interface SpecialSoilCondition {
  condition: string;
  conditionEs: string;
  description: string;
  requiredStudies: string[];
}

/**
 * Special soil conditions requiring Type F classification
 * DS61 Artículo 6
 */
export const SPECIAL_SOIL_CONDITIONS: SpecialSoilCondition[] = [
  {
    condition: 'liquefiable',
    conditionEs: 'Suelos licuables',
    description: 'Soils susceptible to liquefaction during seismic events',
    requiredStudies: [
      'Liquefaction susceptibility analysis',
      'Cyclic resistance ratio (CRR)',
      'Post-liquefaction settlement',
      'Mitigation measures if required',
    ],
  },
  {
    condition: 'collapsible',
    conditionEs: 'Suelos colapsables',
    description: 'Soils that undergo significant settlement when saturated',
    requiredStudies: [
      'Collapse potential testing',
      'Oedometer with saturation',
      'Settlement prediction',
    ],
  },
  {
    condition: 'organic',
    conditionEs: 'Suelos orgánicos',
    description: 'Soils with high organic content (peat, organic clays)',
    requiredStudies: [
      'Organic content determination',
      'Long-term settlement analysis',
      'Ground improvement evaluation',
    ],
  },
  {
    condition: 'sensitive_clay',
    conditionEs: 'Arcillas sensitivas',
    description: 'Clays with high sensitivity ratio',
    requiredStudies: [
      'Sensitivity testing (vane shear)',
      'Undisturbed sampling',
      'Cyclic behavior assessment',
    ],
  },
  {
    condition: 'high_plasticity_clay',
    conditionEs: 'Arcillas de alta plasticidad',
    description: 'Clays with plasticity index > 75',
    requiredStudies: [
      'Atterberg limits',
      'Consolidation testing',
      'Swelling potential',
    ],
  },
  {
    condition: 'very_soft_clay',
    conditionEs: 'Arcillas muy blandas',
    description: 'Soft clay layer > 3m with Su < 25 kPa',
    requiredStudies: [
      'Undrained shear strength profile',
      'Settlement analysis',
      'Slope stability if applicable',
    ],
  },
];

// ============================================================
// COMPLIANCE CHECK
// ============================================================

export interface Vs30MeasurementData {
  method: MeasurementMethod;
  Vs30: number;                       // m/s
  hasOrthogonalMeasurements: boolean;
  hasDispersionCurves: boolean;
  hasActiveSource?: boolean;          // For ReMi
}

export interface GeotechnicalData {
  N1_60?: number;                     // Corrected SPT N-value
  Su?: number;                        // Undrained shear strength (kPa)
  qu?: number;                        // Unconfined compression (kPa)
  RQD?: number;                       // Rock Quality Designation (%)
  PI?: number;                        // Plasticity Index
  organicContent?: number;            // Organic content (%)
  groundwaterDepth?: number;          // m
}

export interface ComplianceResult {
  compliant: boolean;
  soilType: SoilType;
  issues: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Check compliance with DS61 requirements
 */
export function checkDS61Compliance(
  buildingCriteria: BuildingCriteria,
  vs30Data: Vs30MeasurementData,
  geoData: GeotechnicalData,
  explorationDepth: number
): ComplianceResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  const requirements = determineFieldStudyRequirements(buildingCriteria);
  const methodInfo = VS30_MEASUREMENT_METHODS[vs30Data.method];

  // Check exploration depth
  if (explorationDepth < requirements.depth) {
    issues.push(
      `Exploration depth ${explorationDepth}m is less than required ${requirements.depth}m`
    );
  }

  // Check Vs30 measurement method requirements
  if (methodInfo.type === 'surface_wave') {
    if (!vs30Data.hasOrthogonalMeasurements) {
      issues.push('Two orthogonal measurement lines required for surface wave methods');
    }
    if (!vs30Data.hasDispersionCurves) {
      issues.push('Dispersion curves must be reported');
    }
    if (vs30Data.method === 'remi' && !vs30Data.hasActiveSource) {
      issues.push('ReMi method requires active source measurement');
    }
  }

  // Classify soil based on Vs30
  let soilType: SoilType = 'D'; // Default
  const Vs30 = vs30Data.Vs30;

  if (Vs30 >= 900) soilType = 'A';
  else if (Vs30 >= 500) soilType = 'B';
  else if (Vs30 >= 350) soilType = 'C';
  else if (Vs30 >= 180) soilType = 'D';
  else soilType = 'E';

  // Check for Type F conditions
  const typeF = SOIL_CLASSIFICATION_REQUIREMENTS.F;
  if (geoData.PI && geoData.PI > 75) {
    soilType = 'F';
    warnings.push('High plasticity clay (PI > 75) - Type F classification');
  }
  if (geoData.organicContent && geoData.organicContent > 10) {
    soilType = 'F';
    warnings.push('High organic content - Type F classification');
  }

  // Verify with geotechnical data
  const soilReq = SOIL_CLASSIFICATION_REQUIREMENTS[soilType];
  if (soilReq.N1_60_range && geoData.N1_60 !== undefined) {
    const { min, max } = soilReq.N1_60_range;
    if ((min && geoData.N1_60 < min) || (max && geoData.N1_60 > max)) {
      warnings.push(`N1_60 value ${geoData.N1_60} inconsistent with Vs30 classification`);
      recommendations.push('Verify soil classification with additional testing');
    }
  }

  // Type E and F require special studies
  if (soilType === 'E') {
    recommendations.push('Elastic displacement spectrum study required for Type E soil');
  }
  if (soilType === 'F') {
    recommendations.push('Site-specific seismic response study required for Type F soil');
  }

  // Liquefaction check for sandy soils below water table
  if (
    requirements.liquefactionStudy &&
    geoData.groundwaterDepth !== undefined &&
    geoData.N1_60 !== undefined &&
    geoData.N1_60 < 30 &&
    geoData.groundwaterDepth < 15
  ) {
    recommendations.push('Liquefaction analysis recommended for loose sands below water table');
  }

  return {
    compliant: issues.length === 0,
    soilType,
    issues,
    warnings,
    recommendations,
  };
}

// ============================================================
// REPORT GENERATION HELPERS
// ============================================================

export interface FieldStudyReportData {
  projectName: string;
  location: string;
  buildingCriteria: BuildingCriteria;
  requirements: FieldStudyRequirements;
  vs30Data?: Vs30MeasurementData;
  geoData?: GeotechnicalData;
  compliance?: ComplianceResult;
}

/**
 * Generate field study requirements summary
 */
export function generateRequirementsSummary(data: FieldStudyReportData): string {
  const { buildingCriteria, requirements } = data;
  const category = OCCUPANCY_CATEGORIES[buildingCriteria.occupancyCategory];

  let summary = `# Field Study Requirements Summary\n\n`;
  summary += `## Building Information\n`;
  summary += `- Stories: ${buildingCriteria.stories}\n`;
  summary += `- Occupancy Category: ${buildingCriteria.occupancyCategory} - ${category.descriptionEs}\n`;
  summary += `- Has Basement: ${buildingCriteria.hasBasement ? 'Yes' : 'No'}\n`;

  if (buildingCriteria.hasBasement && buildingCriteria.basementDepth) {
    summary += `- Basement Depth: ${buildingCriteria.basementDepth}m\n`;
  }

  summary += `\n## Requirements\n`;
  summary += `- Field Study Required: ${requirements.required ? 'Yes' : 'No'}\n`;
  summary += `- Exploration Depth: ${requirements.depth}m\n`;
  summary += `- Vs30 Measurement: ${requirements.vs30Required ? 'Required' : 'Not required'}\n`;
  summary += `- Liquefaction Study: ${requirements.liquefactionStudy ? 'Required' : 'Not required'}\n`;

  if (requirements.methods.length > 0) {
    summary += `\n## Approved Vs30 Methods\n`;
    requirements.methods.forEach(method => {
      const info = VS30_MEASUREMENT_METHODS[method];
      summary += `- ${info.nameEs}\n`;
    });
  }

  if (requirements.additionalTests.length > 0) {
    summary += `\n## Additional Required Tests\n`;
    requirements.additionalTests.forEach(test => {
      summary += `- ${test}\n`;
    });
  }

  summary += `\n## Reference: DS61 + NCh433\n`;
  summary += `Reason: ${requirements.reason}\n`;

  return summary;
}
