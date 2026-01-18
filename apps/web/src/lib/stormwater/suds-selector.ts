/**
 * SUDS (Sustainable Urban Drainage Systems) Selection Tool
 *
 * Helps engineers select appropriate SUDS techniques based on:
 * - Site conditions (soil, slope, groundwater)
 * - Project goals (infiltration, detention, treatment, amenity)
 * - Constraints (space, cost, maintenance)
 * - Chilean regulatory requirements
 *
 * Based on MINVU Manual de Drenaje Urbano and international best practices
 */

import {
  SOIL_TYPES,
  SUDS_TECHNIQUES,
  DESIGN_STANDARDS_CHILE,
  type SoilType,
  type SoilGroup,
  type SUDSTechnique,
} from './regional-data';

// ============================================
// TYPES
// ============================================

export interface SiteConditions {
  // Soil
  soilGroup: SoilGroup;
  infiltrationRate?: number; // mm/hr (measured)
  soilDepthM?: number; // depth to bedrock/hardpan

  // Topography
  slopePercent: number;
  availableAreaM2: number;
  isLinear?: boolean; // linear site vs. open area

  // Hydrology
  groundwaterDepthM?: number;
  floodRisk?: 'low' | 'medium' | 'high';

  // Context
  landUse: 'residential' | 'commercial' | 'industrial' | 'institutional' | 'road';
  isPublicSpace?: boolean;
  hasExistingDrainage?: boolean;

  // Location
  climateZone?: 'norte' | 'centro' | 'sur' | 'austral';
  annualPrecipitationMm?: number;
}

export interface ProjectGoals {
  // Primary objectives (rank 1-5, 5 = most important)
  peakReduction: number;
  volumeReduction: number;
  waterQuality: number;
  groundwaterRecharge: number;
  amenityValue: number;

  // Specific requirements
  mustInfiltrate?: boolean;
  mustDetain?: boolean;
  mustTreat?: boolean;
  maxDrainTimeHours?: number;
}

export interface Constraints {
  // Budget
  maxBudgetCLP?: number;
  budgetPriority: 'low' | 'medium' | 'high'; // willingness to pay

  // Space
  maxFootprintM2?: number;
  maxDepthM?: number;
  undergroundOk?: boolean;

  // Maintenance
  maintenanceCapacity: 'minimal' | 'moderate' | 'full';

  // Other
  aestheticsImportant?: boolean;
  publicSafetyPriority?: boolean;
  permitRequired?: boolean;
}

export interface SUDSRecommendation {
  technique: SUDSTechnique;
  suitabilityScore: number; // 0-100
  ranking: number;

  // Evaluation breakdown
  evaluation: {
    soilSuitability: number;
    slopeSuitability: number;
    spaceSuitability: number;
    goalAlignment: number;
    constraintFit: number;
    maintenanceFit: number;
  };

  // Sizing estimate
  sizing: {
    footprintM2: number;
    depthM: number;
    storageM3: number;
    estimatedCostCLP: number;
  };

  // Pros and cons
  advantages: string[];
  disadvantages: string[];
  requirements: string[];
}

export interface SUDSSelectionResult {
  // Site assessment
  siteAssessment: {
    infiltrationPotential: 'high' | 'moderate' | 'low' | 'none';
    detentionPotential: 'high' | 'moderate' | 'low';
    spaceConstraint: 'none' | 'moderate' | 'severe';
    overallSuitability: 'excellent' | 'good' | 'fair' | 'challenging';
  };

  // Recommendations
  recommendations: SUDSRecommendation[];

  // Treatment train suggestion
  treatmentTrain?: {
    primary: SUDSTechnique;
    secondary?: SUDSTechnique;
    tertiary?: SUDSTechnique;
    rationale: string;
  };

  // Regulatory notes
  regulatoryNotes: string[];

  // General warnings
  warnings: string[];
}

// ============================================
// SCORING WEIGHTS
// ============================================

const GOAL_WEIGHTS: Record<keyof ProjectGoals, number> = {
  peakReduction: 0.25,
  volumeReduction: 0.20,
  waterQuality: 0.20,
  groundwaterRecharge: 0.15,
  amenityValue: 0.10,
  // Boolean fields not weighted
  mustInfiltrate: 0,
  mustDetain: 0,
  mustTreat: 0,
  maxDrainTimeHours: 0,
};

// Technique capabilities (0-5 scale)
const TECHNIQUE_CAPABILITIES: Record<string, {
  peakReduction: number;
  volumeReduction: number;
  waterQuality: number;
  groundwaterRecharge: number;
  amenityValue: number;
  maintenanceNeed: number; // 1=low, 5=high
  costFactor: number; // relative cost 1=low, 5=high
}> = {
  zanja_infiltracion: {
    peakReduction: 3,
    volumeReduction: 5,
    waterQuality: 3,
    groundwaterRecharge: 5,
    amenityValue: 1,
    maintenanceNeed: 3,
    costFactor: 2,
  },
  pozo_infiltracion: {
    peakReduction: 2,
    volumeReduction: 4,
    waterQuality: 2,
    groundwaterRecharge: 5,
    amenityValue: 0,
    maintenanceNeed: 2,
    costFactor: 2,
  },
  jardin_lluvia: {
    peakReduction: 3,
    volumeReduction: 4,
    waterQuality: 4,
    groundwaterRecharge: 4,
    amenityValue: 5,
    maintenanceNeed: 4,
    costFactor: 3,
  },
  pavimento_permeable: {
    peakReduction: 3,
    volumeReduction: 4,
    waterQuality: 3,
    groundwaterRecharge: 4,
    amenityValue: 2,
    maintenanceNeed: 3,
    costFactor: 4,
  },
  estanque_detencion: {
    peakReduction: 5,
    volumeReduction: 2,
    waterQuality: 2,
    groundwaterRecharge: 1,
    amenityValue: 2,
    maintenanceNeed: 3,
    costFactor: 4,
  },
  estanque_retencion: {
    peakReduction: 5,
    volumeReduction: 3,
    waterQuality: 4,
    groundwaterRecharge: 2,
    amenityValue: 4,
    maintenanceNeed: 4,
    costFactor: 4,
  },
  humedal_construido: {
    peakReduction: 3,
    volumeReduction: 2,
    waterQuality: 5,
    groundwaterRecharge: 2,
    amenityValue: 5,
    maintenanceNeed: 4,
    costFactor: 5,
  },
  cuneta_verde: {
    peakReduction: 2,
    volumeReduction: 3,
    waterQuality: 3,
    groundwaterRecharge: 3,
    amenityValue: 4,
    maintenanceNeed: 3,
    costFactor: 2,
  },
  techo_verde: {
    peakReduction: 2,
    volumeReduction: 3,
    waterQuality: 3,
    groundwaterRecharge: 0,
    amenityValue: 5,
    maintenanceNeed: 4,
    costFactor: 5,
  },
  cisterna: {
    peakReduction: 3,
    volumeReduction: 4,
    waterQuality: 2,
    groundwaterRecharge: 0,
    amenityValue: 1,
    maintenanceNeed: 2,
    costFactor: 3,
  },
  // New technique IDs from regional-data.ts
  infiltration_trench: {
    peakReduction: 3,
    volumeReduction: 5,
    waterQuality: 3,
    groundwaterRecharge: 5,
    amenityValue: 1,
    maintenanceNeed: 3,
    costFactor: 2,
  },
  infiltration_well: {
    peakReduction: 2,
    volumeReduction: 4,
    waterQuality: 2,
    groundwaterRecharge: 5,
    amenityValue: 0,
    maintenanceNeed: 2,
    costFactor: 2,
  },
  permeable_pavement: {
    peakReduction: 3,
    volumeReduction: 4,
    waterQuality: 3,
    groundwaterRecharge: 4,
    amenityValue: 2,
    maintenanceNeed: 3,
    costFactor: 4,
  },
  bioretention: {
    peakReduction: 3,
    volumeReduction: 4,
    waterQuality: 4,
    groundwaterRecharge: 4,
    amenityValue: 5,
    maintenanceNeed: 4,
    costFactor: 3,
  },
  swale: {
    peakReduction: 2,
    volumeReduction: 3,
    waterQuality: 3,
    groundwaterRecharge: 3,
    amenityValue: 4,
    maintenanceNeed: 3,
    costFactor: 2,
  },
  filter_strip: {
    peakReduction: 1,
    volumeReduction: 2,
    waterQuality: 3,
    groundwaterRecharge: 2,
    amenityValue: 3,
    maintenanceNeed: 2,
    costFactor: 1,
  },
  detention_basin: {
    peakReduction: 5,
    volumeReduction: 2,
    waterQuality: 2,
    groundwaterRecharge: 1,
    amenityValue: 2,
    maintenanceNeed: 3,
    costFactor: 4,
  },
  retention_pond: {
    peakReduction: 5,
    volumeReduction: 3,
    waterQuality: 4,
    groundwaterRecharge: 2,
    amenityValue: 4,
    maintenanceNeed: 4,
    costFactor: 4,
  },
  green_roof: {
    peakReduction: 2,
    volumeReduction: 3,
    waterQuality: 3,
    groundwaterRecharge: 0,
    amenityValue: 5,
    maintenanceNeed: 4,
    costFactor: 5,
  },
  rainwater_tank: {
    peakReduction: 3,
    volumeReduction: 4,
    waterQuality: 2,
    groundwaterRecharge: 0,
    amenityValue: 1,
    maintenanceNeed: 2,
    costFactor: 3,
  },
};

// ============================================
// MAIN SELECTION FUNCTION
// ============================================

/**
 * Select appropriate SUDS techniques for site
 */
export function selectSUDS(
  site: SiteConditions,
  goals: ProjectGoals,
  constraints: Constraints,
  runoffVolumeM3?: number
): SUDSSelectionResult {
  const warnings: string[] = [];
  const regulatoryNotes: string[] = [];

  // 1. Assess site
  const siteAssessment = assessSite(site);

  // 2. Filter techniques by hard constraints
  const feasibleTechniques = filterByConstraints(site, constraints);

  // 3. Score remaining techniques
  const recommendations: SUDSRecommendation[] = [];

  for (const technique of feasibleTechniques) {
    const evaluation = evaluateTechnique(technique, site, goals, constraints);
    const sizing = estimateSizing(technique, site, runoffVolumeM3);

    // Check budget constraint
    if (constraints.maxBudgetCLP && sizing.estimatedCostCLP > constraints.maxBudgetCLP) {
      continue;
    }

    const score = calculateOverallScore(evaluation, goals);

    recommendations.push({
      technique,
      suitabilityScore: Math.round(score),
      ranking: 0, // will be set after sorting
      evaluation,
      sizing,
      advantages: getTechniqueAdvantages(technique, site),
      disadvantages: getTechniqueDisadvantages(technique, site),
      requirements: getTechniqueRequirements(technique),
    });
  }

  // 4. Sort and rank
  recommendations.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  recommendations.forEach((r, i) => { r.ranking = i + 1; });

  // 5. Suggest treatment train
  const treatmentTrain = suggestTreatmentTrain(recommendations, goals, site);

  // 6. Add regulatory notes
  addRegulatoryNotes(site, goals, regulatoryNotes);

  // 7. Add warnings
  if (siteAssessment.infiltrationPotential === 'none') {
    warnings.push('Site has no infiltration potential - detention/retention only');
  }
  if (siteAssessment.spaceConstraint === 'severe') {
    warnings.push('Severe space constraints - consider underground or distributed systems');
  }
  if (site.groundwaterDepthM && site.groundwaterDepthM < 1.5) {
    warnings.push('High groundwater - avoid deep infiltration systems');
  }

  return {
    siteAssessment,
    recommendations: recommendations.slice(0, 5), // Top 5
    treatmentTrain,
    regulatoryNotes,
    warnings,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Assess site suitability
 */
function assessSite(site: SiteConditions): SUDSSelectionResult['siteAssessment'] {
  // Infiltration potential
  let infiltrationPotential: 'high' | 'moderate' | 'low' | 'none';
  const soilInfRate = site.infiltrationRate ?? getDefaultInfiltrationRate(site.soilGroup);

  if (soilInfRate >= 50) {
    infiltrationPotential = 'high';
  } else if (soilInfRate >= 15) {
    infiltrationPotential = 'moderate';
  } else if (soilInfRate >= 5) {
    infiltrationPotential = 'low';
  } else {
    infiltrationPotential = 'none';
  }

  // Groundwater check
  if (site.groundwaterDepthM && site.groundwaterDepthM < 1.0) {
    infiltrationPotential = 'none';
  }

  // Detention potential
  let detentionPotential: 'high' | 'moderate' | 'low';
  if (site.slopePercent <= 5 && site.availableAreaM2 >= 100) {
    detentionPotential = 'high';
  } else if (site.slopePercent <= 15 || site.availableAreaM2 >= 50) {
    detentionPotential = 'moderate';
  } else {
    detentionPotential = 'low';
  }

  // Space constraint
  let spaceConstraint: 'none' | 'moderate' | 'severe';
  if (site.availableAreaM2 >= 500) {
    spaceConstraint = 'none';
  } else if (site.availableAreaM2 >= 100) {
    spaceConstraint = 'moderate';
  } else {
    spaceConstraint = 'severe';
  }

  // Overall suitability
  let overallSuitability: 'excellent' | 'good' | 'fair' | 'challenging';
  if (infiltrationPotential === 'high' && detentionPotential === 'high' && spaceConstraint === 'none') {
    overallSuitability = 'excellent';
  } else if (infiltrationPotential !== 'none' && detentionPotential !== 'low') {
    overallSuitability = 'good';
  } else if (detentionPotential !== 'low' || spaceConstraint !== 'severe') {
    overallSuitability = 'fair';
  } else {
    overallSuitability = 'challenging';
  }

  return { infiltrationPotential, detentionPotential, spaceConstraint, overallSuitability };
}

/**
 * Filter techniques by hard constraints
 */
function filterByConstraints(
  site: SiteConditions,
  constraints: Constraints
): SUDSTechnique[] {
  return SUDS_TECHNIQUES.filter(tech => {
    // Soil group check
    if (!tech.suitableSoilGroups.includes(site.soilGroup)) {
      // Allow if it's detention-only technique
      if (tech.category === 'infiltration') return false;
    }

    // Slope check
    const maxSlope = getMaxSlope(tech);
    if (site.slopePercent > maxSlope) {
      return false;
    }

    // Space check
    const minArea = getMinimumArea(tech);
    if (site.availableAreaM2 < minArea) {
      return false;
    }

    // Underground check
    if (!constraints.undergroundOk && (tech.id === 'pozo_infiltracion' || tech.id === 'infiltration_well')) {
      return false;
    }

    // Depth check
    if (constraints.maxDepthM) {
      const typicalDepth = getTypicalDepth(tech);
      if (typicalDepth > constraints.maxDepthM) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Evaluate technique for site
 */
function evaluateTechnique(
  technique: SUDSTechnique,
  site: SiteConditions,
  goals: ProjectGoals,
  constraints: Constraints
): SUDSRecommendation['evaluation'] {
  const caps = TECHNIQUE_CAPABILITIES[technique.id] || {
    peakReduction: 3,
    volumeReduction: 3,
    waterQuality: 3,
    groundwaterRecharge: 3,
    amenityValue: 3,
    maintenanceNeed: 3,
    costFactor: 3,
  };

  // Soil suitability (0-100)
  let soilSuitability = 50;
  if (technique.suitableSoilGroups.includes(site.soilGroup)) {
    soilSuitability = site.soilGroup === 'A' ? 100 :
                      site.soilGroup === 'B' ? 85 :
                      site.soilGroup === 'C' ? 70 : 55;
  }

  // Slope suitability (0-100)
  const maxSlope = getMaxSlope(technique);
  const slopeRatio = site.slopePercent / maxSlope;
  const slopeSuitability = Math.max(0, 100 - slopeRatio * 50);

  // Space suitability (0-100)
  const minArea = getMinimumArea(technique);
  const spaceRatio = site.availableAreaM2 / (minArea * 2);
  const spaceSuitability = Math.min(100, spaceRatio * 50);

  // Goal alignment (0-100)
  const goalAlignment =
    (caps.peakReduction / 5 * goals.peakReduction +
     caps.volumeReduction / 5 * goals.volumeReduction +
     caps.waterQuality / 5 * goals.waterQuality +
     caps.groundwaterRecharge / 5 * goals.groundwaterRecharge +
     caps.amenityValue / 5 * goals.amenityValue) /
    (goals.peakReduction + goals.volumeReduction + goals.waterQuality +
     goals.groundwaterRecharge + goals.amenityValue) * 100;

  // Constraint fit (0-100)
  let constraintFit = 80;
  if (constraints.budgetPriority === 'low' && caps.costFactor >= 4) {
    constraintFit -= 30;
  }
  if (constraints.aestheticsImportant && caps.amenityValue < 3) {
    constraintFit -= 20;
  }

  // Maintenance fit (0-100)
  let maintenanceFit = 80;
  if (constraints.maintenanceCapacity === 'minimal' && caps.maintenanceNeed >= 4) {
    maintenanceFit = 40;
  } else if (constraints.maintenanceCapacity === 'moderate' && caps.maintenanceNeed >= 5) {
    maintenanceFit = 60;
  }

  return {
    soilSuitability: Math.round(soilSuitability),
    slopeSuitability: Math.round(slopeSuitability),
    spaceSuitability: Math.round(spaceSuitability),
    goalAlignment: Math.round(goalAlignment),
    constraintFit: Math.round(constraintFit),
    maintenanceFit: Math.round(maintenanceFit),
  };
}

/**
 * Calculate overall score
 */
function calculateOverallScore(
  evaluation: SUDSRecommendation['evaluation'],
  goals: ProjectGoals
): number {
  // Weighted average
  const weights = {
    soilSuitability: 0.15,
    slopeSuitability: 0.10,
    spaceSuitability: 0.15,
    goalAlignment: 0.35,
    constraintFit: 0.15,
    maintenanceFit: 0.10,
  };

  return (
    evaluation.soilSuitability * weights.soilSuitability +
    evaluation.slopeSuitability * weights.slopeSuitability +
    evaluation.spaceSuitability * weights.spaceSuitability +
    evaluation.goalAlignment * weights.goalAlignment +
    evaluation.constraintFit * weights.constraintFit +
    evaluation.maintenanceFit * weights.maintenanceFit
  );
}

/**
 * Estimate sizing
 */
function estimateSizing(
  technique: SUDSTechnique,
  site: SiteConditions,
  runoffVolumeM3?: number
): SUDSRecommendation['sizing'] {
  const volume = runoffVolumeM3 ?? site.availableAreaM2 * 0.05; // default 50mm retention

  let footprintM2: number;
  let depthM: number;
  let storageM3: number;
  let costPerM2: number;

  switch (technique.category) {
    case 'infiltration':
      depthM = 1.2;
      footprintM2 = volume / (depthM * 0.35); // 35% porosity
      storageM3 = volume;
      costPerM2 = 80000;
      break;
    case 'detention':
      depthM = 1.5;
      footprintM2 = volume / (depthM * 0.7); // shape factor
      storageM3 = volume;
      costPerM2 = 50000;
      break;
    case 'treatment':
      depthM = 0.3;
      footprintM2 = Math.max(50, volume * 2);
      storageM3 = footprintM2 * depthM * 0.5;
      costPerM2 = 40000;
      break;
    case 'conveyance':
      depthM = 0.4;
      footprintM2 = Math.max(50, volume * 1.5);
      storageM3 = footprintM2 * depthM * 0.4;
      costPerM2 = 35000;
      break;
    case 'source_control':
      depthM = 0.2;
      footprintM2 = volume / 0.05; // 50mm retention typical
      storageM3 = volume;
      costPerM2 = 100000;
      break;
    default:
      depthM = 1.0;
      footprintM2 = volume;
      storageM3 = volume * 0.5;
      costPerM2 = 50000;
  }

  // Adjust for specific techniques
  if (technique.id === 'techo_verde') {
    costPerM2 = 120000;
    depthM = 0.15;
  } else if (technique.id === 'pavimento_permeable') {
    costPerM2 = 90000;
    depthM = 0.4;
  }

  return {
    footprintM2: Math.round(footprintM2),
    depthM: Math.round(depthM * 100) / 100,
    storageM3: Math.round(storageM3),
    estimatedCostCLP: Math.round(footprintM2 * costPerM2),
  };
}

/**
 * Get technique advantages for site
 */
function getTechniqueAdvantages(technique: SUDSTechnique, site: SiteConditions): string[] {
  const advantages = [...technique.advantages];
  const caps = TECHNIQUE_CAPABILITIES[technique.id];

  if (caps) {
    if (caps.groundwaterRecharge >= 4 && ['A', 'B'].includes(site.soilGroup)) {
      advantages.push('Excellent groundwater recharge potential in this soil');
    }
    if (caps.amenityValue >= 4) {
      advantages.push('High visual and recreational value');
    }
  }

  return advantages;
}

/**
 * Get technique disadvantages for site
 */
function getTechniqueDisadvantages(technique: SUDSTechnique, site: SiteConditions): string[] {
  const disadvantages = [...technique.disadvantages];
  const caps = TECHNIQUE_CAPABILITIES[technique.id];

  if (caps) {
    if (caps.maintenanceNeed >= 4) {
      disadvantages.push('Requires regular maintenance');
    }
    if (caps.costFactor >= 4) {
      disadvantages.push('Higher initial cost');
    }
  }

  const maxSlope = getMaxSlope(technique);
  if (site.slopePercent > maxSlope * 0.7) {
    disadvantages.push('Site slope near maximum limit');
  }

  return disadvantages;
}

/**
 * Get technique requirements
 */
function getTechniqueRequirements(technique: SUDSTechnique): string[] {
  const requirements: string[] = [];

  if (technique.category === 'infiltration') {
    requirements.push('Soil permeability test required');
    requirements.push('Groundwater depth verification');
    requirements.push('Setback from foundations: 3m minimum');
  }

  if (technique.id === 'estanque_retencion' || technique.id === 'humedal_construido' ||
      technique.id === 'retention_pond') {
    requirements.push('Environmental permit may be required');
    requirements.push('Safety measures (fencing, signage)');
  }

  requirements.push('Construction according to MINVU/MOP standards');

  return requirements;
}

/**
 * Suggest treatment train
 */
function suggestTreatmentTrain(
  recommendations: SUDSRecommendation[],
  goals: ProjectGoals,
  site: SiteConditions
): SUDSSelectionResult['treatmentTrain'] | undefined {
  if (recommendations.length < 2) return undefined;

  // For water quality goals, suggest multi-stage treatment
  if (goals.waterQuality >= 4 || goals.mustTreat) {
    const infiltration = recommendations.find(r => r.technique.category === 'infiltration');
    const detention = recommendations.find(r => r.technique.category === 'detention');
    const treatment = recommendations.find(r => r.technique.category === 'treatment');

    if (treatment && (infiltration || detention)) {
      return {
        primary: treatment.technique,
        secondary: infiltration?.technique || detention?.technique,
        rationale: 'Pre-treatment with bioretention/swale followed by infiltration/detention for volume control',
      };
    }
  }

  // For peak reduction + volume reduction
  if (goals.peakReduction >= 4 && goals.volumeReduction >= 4) {
    const detention = recommendations.find(r => r.technique.category === 'detention');
    const infiltration = recommendations.find(r => r.technique.category === 'infiltration');

    if (detention && infiltration) {
      return {
        primary: detention.technique,
        secondary: infiltration.technique,
        rationale: 'Detention for peak control with downstream infiltration for volume reduction',
      };
    }
  }

  return undefined;
}

/**
 * Add regulatory notes
 */
function addRegulatoryNotes(
  site: SiteConditions,
  goals: ProjectGoals,
  notes: string[]
): void {
  notes.push('Designs must comply with MINVU Manual de Drenaje Urbano');
  notes.push('Peak post-development discharge must not exceed pre-development');

  if (site.landUse === 'industrial') {
    notes.push('Industrial sites require water quality treatment before infiltration');
  }

  if (site.isPublicSpace) {
    notes.push('Public spaces require safety barriers around open water features');
  }

  if (site.climateZone === 'sur' || site.climateZone === 'austral') {
    notes.push('Consider freeze-thaw cycles in design (Biobío/Ñuble region)');
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getDefaultInfiltrationRate(soilGroup: SoilGroup): number {
  const rates: Record<SoilGroup, number> = {
    A: 100,
    B: 50,
    C: 15,
    D: 5,
  };
  return rates[soilGroup];
}

function getMinimumArea(technique: SUDSTechnique): number {
  const minAreas: Record<string, number> = {
    // Legacy Spanish IDs
    zanja_infiltracion: 10,
    pozo_infiltracion: 2,
    jardin_lluvia: 20,
    pavimento_permeable: 50,
    estanque_detencion: 100,
    estanque_retencion: 200,
    humedal_construido: 300,
    cuneta_verde: 15,
    techo_verde: 50,
    cisterna: 5,
    // New technique IDs from regional-data
    infiltration_trench: 10,
    infiltration_well: 1,
    permeable_pavement: 50,
    bioretention: 20,
    swale: 50,
    filter_strip: 30,
    detention_basin: 500,
    retention_pond: 1000,
    green_roof: 20,
    rainwater_tank: 1,
  };
  return minAreas[technique.id] || 50;
}

function getTypicalDepth(technique: SUDSTechnique): number {
  const depths: Record<string, number> = {
    zanja_infiltracion: 1.5,
    pozo_infiltracion: 2.5,
    jardin_lluvia: 0.3,
    pavimento_permeable: 0.5,
    estanque_detencion: 2.0,
    estanque_retencion: 2.5,
    humedal_construido: 1.0,
    cuneta_verde: 0.3,
    techo_verde: 0.15,
    cisterna: 2.0,
    // New technique IDs from regional-data
    infiltration_trench: 1.5,
    infiltration_well: 2.5,
    permeable_pavement: 0.5,
    bioretention: 0.3,
    swale: 0.3,
    filter_strip: 0.1,
    detention_basin: 2.0,
    retention_pond: 2.5,
    green_roof: 0.15,
    rainwater_tank: 2.0,
  };
  return depths[technique.id] || 1.0;
}

/**
 * Get maximum slope for technique (percentage)
 * Since SUDSTechnique doesn't have maxSlope property, we define typical values here
 */
function getMaxSlope(technique: SUDSTechnique): number {
  const maxSlopes: Record<string, number> = {
    // Infiltration techniques - need flat terrain
    zanja_infiltracion: 8,
    pozo_infiltracion: 15,
    infiltration_trench: 8,
    infiltration_well: 15,
    // Treatment/bio techniques
    jardin_lluvia: 12,
    bioretention: 12,
    cuneta_verde: 8,
    swale: 8,
    filter_strip: 6,
    // Pavement
    pavimento_permeable: 5,
    permeable_pavement: 5,
    // Detention/retention - need flat
    estanque_detencion: 5,
    estanque_retencion: 5,
    detention_basin: 5,
    retention_pond: 5,
    humedal_construido: 3,
    // Source control - can work on any slope
    techo_verde: 35,
    green_roof: 35,
    cisterna: 100,
    rainwater_tank: 100,
  };
  return maxSlopes[technique.id] || 10;
}

// ============================================
// QUICK SELECTION
// ============================================

/**
 * Quick SUDS recommendation based on simple inputs
 */
export function quickSUDSSelection(
  soilGroup: SoilGroup,
  availableAreaM2: number,
  mainGoal: 'infiltrate' | 'detain' | 'treat' | 'multi-benefit'
): {
  recommended: string;
  alternatives: string[];
  notes: string[];
} {
  const notes: string[] = [];

  if (mainGoal === 'infiltrate') {
    if (['A', 'B'].includes(soilGroup)) {
      if (availableAreaM2 >= 100) {
        return {
          recommended: 'Zanja de infiltración',
          alternatives: ['Jardín de lluvia', 'Pavimento permeable'],
          notes: ['Excellent soil for infiltration'],
        };
      } else {
        return {
          recommended: 'Pozo de infiltración',
          alternatives: ['Zanja de infiltración compacta'],
          notes: ['Limited space - use concentrated infiltration'],
        };
      }
    } else {
      notes.push('Poor soil for infiltration - consider amended soil or detention');
      return {
        recommended: 'Jardín de lluvia con suelo mejorado',
        alternatives: ['Estanque de detención'],
        notes,
      };
    }
  }

  if (mainGoal === 'detain') {
    if (availableAreaM2 >= 500) {
      return {
        recommended: 'Estanque de detención',
        alternatives: ['Estanque de retención', 'Laguna de retención'],
        notes: ['Adequate space for surface detention'],
      };
    } else {
      return {
        recommended: 'Cisterna subterránea',
        alternatives: ['Sistema modular bajo pavimento'],
        notes: ['Limited space - consider underground storage'],
      };
    }
  }

  if (mainGoal === 'treat') {
    if (availableAreaM2 >= 200) {
      return {
        recommended: 'Humedal construido',
        alternatives: ['Jardín de lluvia', 'Biofiltro'],
        notes: ['High treatment capacity'],
      };
    } else {
      return {
        recommended: 'Jardín de lluvia',
        alternatives: ['Cuneta verde', 'Filtro de arena'],
        notes: ['Compact treatment option'],
      };
    }
  }

  // Multi-benefit
  return {
    recommended: 'Jardín de lluvia + Estanque de retención',
    alternatives: ['Tren de tratamiento completo'],
    notes: ['Combined system for multiple benefits'],
  };
}

// ============================================
// FORMAT FUNCTION
// ============================================

/**
 * Format selection results for display
 */
export function formatSUDSSelection(result: SUDSSelectionResult): string {
  const lines: string[] = [
    '=== SELECCIÓN DE SISTEMAS SUDS ===',
    '',
    '--- EVALUACIÓN DEL SITIO ---',
    `Potencial infiltración: ${result.siteAssessment.infiltrationPotential}`,
    `Potencial detención: ${result.siteAssessment.detentionPotential}`,
    `Restricción de espacio: ${result.siteAssessment.spaceConstraint}`,
    `Aptitud general: ${result.siteAssessment.overallSuitability}`,
    '',
    '--- TÉCNICAS RECOMENDADAS ---',
  ];

  for (const rec of result.recommendations) {
    lines.push('');
    lines.push(`#${rec.ranking} ${rec.technique.name} (${rec.suitabilityScore}%)`);
    lines.push(`   Categoría: ${rec.technique.category}`);
    lines.push(`   Área estimada: ${rec.sizing.footprintM2} m²`);
    lines.push(`   Almacenamiento: ${rec.sizing.storageM3} m³`);
    lines.push(`   Costo estimado: $${rec.sizing.estimatedCostCLP.toLocaleString()} CLP`);

    if (rec.advantages.length > 0) {
      lines.push(`   Ventajas: ${rec.advantages.slice(0, 2).join('; ')}`);
    }
    if (rec.disadvantages.length > 0) {
      lines.push(`   Desventajas: ${rec.disadvantages.slice(0, 2).join('; ')}`);
    }
  }

  if (result.treatmentTrain) {
    lines.push('');
    lines.push('--- TREN DE TRATAMIENTO SUGERIDO ---');
    lines.push(`Primario: ${result.treatmentTrain.primary.name}`);
    if (result.treatmentTrain.secondary) {
      lines.push(`Secundario: ${result.treatmentTrain.secondary.name}`);
    }
    lines.push(`Justificación: ${result.treatmentTrain.rationale}`);
  }

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('--- ADVERTENCIAS ---');
    result.warnings.forEach(w => lines.push(`⚠ ${w}`));
  }

  if (result.regulatoryNotes.length > 0) {
    lines.push('');
    lines.push('--- NOTAS REGULATORIAS ---');
    result.regulatoryNotes.forEach(n => lines.push(`• ${n}`));
  }

  return lines.join('\n');
}
