/**
 * Project Data Converter
 *
 * Converts project and infrastructure entity data into document sections.
 * Automatically populates study area, infrastructure summaries, and calculations.
 */

import { generateId } from '@/lib/utils';
import type { Project, ProjectTopography } from '@/types/user';
import type {
  DocumentSection,
  StudyAreaContent,
  DesignCriteriaContent,
  PopulationDemandContent,
  InfrastructureSummaryContent,
  DocumentCaratula,
} from '@/types/documents';

// ============================================================================
// Project Data Interface (extended from user.ts Project)
// ============================================================================

/**
 * Extended project data with computed properties
 */
export interface ProjectDataForDocument {
  project: Project;
  topography?: ProjectTopography;

  // Infrastructure counts (from database queries)
  infrastructure?: {
    pipes?: Array<{
      id: string;
      diameter: number;
      length: number;
      material: string;
      slope?: number;
    }>;
    manholes?: Array<{
      id: string;
      type: string;
      depth?: number;
    }>;
    inlets?: Array<{
      id: string;
      type: string;
    }>;
    channels?: Array<{
      id: string;
      length: number;
      type: string;
    }>;
    detentionPonds?: Array<{
      id: string;
      volume: number;
    }>;
  };

  // Population data (if available)
  population?: {
    current: number;
    projected: number;
    growthRate: number;
    households?: number;
  };

  // Climate/hydrology data (from regional database)
  climate?: {
    annualRainfall?: number;
    climaticZone?: string;
    idfStation?: string;
  };

  // Soil data (from IDE Chile or manual)
  soils?: {
    predominantType?: string;
    hydrologicGroup?: 'A' | 'B' | 'C' | 'D';
    infiltrationRate?: number;
  };

  // Land use percentages
  landUse?: {
    residential?: number;
    commercial?: number;
    industrial?: number;
    greenAreas?: number;
    roads?: number;
    other?: number;
  };
}

// ============================================================================
// Converter Functions
// ============================================================================

/**
 * Generate carátula from project data
 */
export function generateCaratulaFromProject(
  data: ProjectDataForDocument,
  designerInfo?: DocumentCaratula['designer']
): Partial<DocumentCaratula> {
  const { project } = data;

  return {
    projectName: project.name,
    projectCode: project.id.slice(0, 12).toUpperCase(),
    clientName: '', // User needs to fill this
    location: {
      region: project.region || '',
      comuna: project.comuna || '',
      coordinates: project.center_lat && project.center_lon
        ? { lat: project.center_lat, lng: project.center_lon }
        : undefined,
    },
    designer: designerInfo || {
      name: '',
      title: 'Ingeniero Civil',
    },
    date: new Date().toISOString().split('T')[0],
    revisionNumber: 0,
  };
}

/**
 * Generate study area content from project data
 */
export function generateStudyAreaContent(
  data: ProjectDataForDocument
): StudyAreaContent {
  const { project, topography, climate, soils, landUse } = data;

  // Calculate area from bounds if available
  let totalArea = 0;
  if (project.bounds_north && project.bounds_south && project.bounds_east && project.bounds_west) {
    // Approximate area calculation (rough estimate)
    const latDiff = Math.abs(project.bounds_north - project.bounds_south);
    const lonDiff = Math.abs(project.bounds_east - project.bounds_west);
    // Convert to km (approx) then to hectares
    const latKm = latDiff * 111; // ~111 km per degree latitude
    const lonKm = lonDiff * 111 * Math.cos((project.center_lat || 0) * Math.PI / 180);
    totalArea = latKm * lonKm * 100; // km² to hectares
  }

  // Calculate impervious from land use
  let imperviousArea = 0;
  if (landUse && totalArea > 0) {
    const imperviousPercent =
      (landUse.residential || 0) * 0.5 + // 50% impervious for residential
      (landUse.commercial || 0) * 0.85 +
      (landUse.industrial || 0) * 0.85 +
      (landUse.roads || 0) * 1.0;
    imperviousArea = totalArea * (imperviousPercent / 100);
  }

  // Determine slope classification
  const avgSlope = topography?.resolution ? undefined : undefined; // Would need DEM analysis
  let slopeClassification: StudyAreaContent['topography']['slopeClassification'] = undefined;
  if (avgSlope !== undefined) {
    if (avgSlope < 2) slopeClassification = 'plano';
    else if (avgSlope < 5) slopeClassification = 'suave';
    else if (avgSlope < 15) slopeClassification = 'moderado';
    else if (avgSlope < 30) slopeClassification = 'fuerte';
    else slopeClassification = 'muy_fuerte';
  }

  return {
    type: 'study_area',
    description: project.description || `Área de estudio del proyecto ${project.name}, ubicado en la comuna de ${project.comuna || '[comuna]'}, Región de ${project.region || '[región]'}.`,
    boundaries: {
      north: project.bounds_north ? `${project.bounds_north.toFixed(6)}° S` : '',
      south: project.bounds_south ? `${project.bounds_south.toFixed(6)}° S` : '',
      east: project.bounds_east ? `${project.bounds_east.toFixed(6)}° O` : '',
      west: project.bounds_west ? `${project.bounds_west.toFixed(6)}° O` : '',
    },
    totalArea: Math.round(totalArea * 100) / 100,
    imperviousArea: Math.round(imperviousArea * 100) / 100,
    perviousArea: Math.round((totalArea - imperviousArea) * 100) / 100,
    topography: {
      averageSlope: avgSlope,
      slopeClassification,
      terrainDescription: topography?.source
        ? `Datos topográficos obtenidos de ${topography.source === 'copernicus' ? 'Copernicus DEM' : topography.source}`
        : undefined,
    },
    soils: soils ? {
      predominantType: soils.predominantType,
      hydrologicGroup: soils.hydrologicGroup,
      infiltrationRate: soils.infiltrationRate,
    } : {},
    climate: climate ? {
      climaticZone: climate.climaticZone,
      annualRainfall: climate.annualRainfall,
      idfStation: climate.idfStation,
    } : {},
    landUse: landUse || {},
    sourceProjectId: project.id,
    autoGenerated: true,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Generate design criteria content based on project type
 */
export function generateDesignCriteriaContent(
  data: ProjectDataForDocument
): DesignCriteriaContent {
  const { project } = data;

  // Map project_type to design criteria project type
  const projectTypeMap: Record<string, DesignCriteriaContent['projectType']> = {
    sewer: 'alcantarillado',
    drainage: 'aguas_lluvias',
    pavement: 'pavimentacion',
    mixed: 'mixto',
  };

  const projectType = projectTypeMap[project.project_type || 'mixed'] || 'mixto';
  const currentYear = new Date().getFullYear();

  // Default hydraulic criteria based on project type
  const hydraulicCriteria: DesignCriteriaContent['hydraulicCriteria'] = {};
  const applicableNorms: string[] = [];

  switch (projectType) {
    case 'alcantarillado':
      hydraulicCriteria.minVelocity = 0.6;
      hydraulicCriteria.maxVelocity = 5.0;
      hydraulicCriteria.minSlope = 0.3;
      hydraulicCriteria.maxFillRatio = 0.7;
      hydraulicCriteria.manningN = 0.013;
      applicableNorms.push('NCh 1105', 'RIDAA', 'NCh 2472');
      break;

    case 'agua_potable':
      hydraulicCriteria.minPressure = 15;
      hydraulicCriteria.maxPressure = 70;
      hydraulicCriteria.hazenWilliamsC = 140;
      applicableNorms.push('NCh 691', 'NCh 2485', 'RIDAA');
      break;

    case 'aguas_lluvias':
      hydraulicCriteria.returnPeriod = 10;
      hydraulicCriteria.runoffCoefficient = 0.6;
      hydraulicCriteria.manningN = 0.013;
      applicableNorms.push('Manual MINVU Aguas Lluvias', 'NCh 1105');
      break;

    case 'pavimentacion':
      applicableNorms.push('Manual de Carreteras MOP Vol. 3', 'AASHTO 93');
      break;

    case 'mixto':
      hydraulicCriteria.minVelocity = 0.6;
      hydraulicCriteria.maxVelocity = 5.0;
      hydraulicCriteria.returnPeriod = 10;
      applicableNorms.push('NCh 1105', 'NCh 691', 'Manual MINVU');
      break;
  }

  return {
    type: 'design_criteria',
    projectType,
    designPeriod: 20,
    designHorizon: `${currentYear}-${currentYear + 20}`,
    hydraulicCriteria,
    materials: {
      pipeMaterial: 'PVC',
      minDiameter: projectType === 'alcantarillado' ? 200 : projectType === 'agua_potable' ? 75 : 300,
    },
    applicableNorms,
    autoGenerated: true,
  };
}

/**
 * Generate population & demand content
 */
export function generatePopulationDemandContent(
  data: ProjectDataForDocument
): PopulationDemandContent {
  const { project, population } = data;
  const currentYear = new Date().getFullYear();

  const currentPop = population?.current || 0;
  const growthRate = population?.growthRate || 1.5;
  const projectedYear = currentYear + 20;

  // Calculate projected population
  const projectedPop = population?.projected ||
    Math.round(currentPop * Math.pow(1 + growthRate / 100, 20));

  const content: PopulationDemandContent = {
    type: 'population_demand',
    currentPopulation: currentPop,
    currentYear,
    projectedPopulation: projectedPop,
    projectedYear,
    growthRate,
    currentHouseholds: population?.households,
    averageOccupancy: population?.households && currentPop > 0
      ? Math.round((currentPop / population.households) * 10) / 10
      : 4.0,
    autoGenerated: true,
  };

  // Add water demand for water projects
  if (project.project_type === 'sewer' || project.project_type === 'mixed') {
    const dotation = 180; // L/hab/día (typical Chilean value)
    const returnFactor = 0.8;
    const avgFlow = (projectedPop * dotation * returnFactor) / 86400; // L/s

    // Harmon factor
    const pThousands = projectedPop / 1000;
    const harmonFactor = 1 + 14 / (4 + Math.sqrt(pThousands));

    content.sewerFlow = {
      returnFactor,
      averageFlow: Math.round(avgFlow * 100) / 100,
      peakFlow: Math.round(avgFlow * harmonFactor * 100) / 100,
      harmonFactor: Math.round(harmonFactor * 100) / 100,
    };
  }

  return content;
}

/**
 * Generate infrastructure summary from entity data
 */
export function generateInfrastructureSummaryContent(
  data: ProjectDataForDocument
): InfrastructureSummaryContent {
  const { infrastructure } = data;

  const content: InfrastructureSummaryContent = {
    type: 'infrastructure_summary',
    autoGenerated: true,
  };

  if (!infrastructure) return content;

  // Process pipes
  if (infrastructure.pipes && infrastructure.pipes.length > 0) {
    const pipes = infrastructure.pipes;
    const totalLength = pipes.reduce((sum, p) => sum + (p.length || 0), 0);

    const byDiameter: Record<number, number> = {};
    const byMaterial: Record<string, number> = {};
    let minDia = Infinity, maxDia = 0;

    for (const pipe of pipes) {
      const dia = pipe.diameter || 0;
      const len = pipe.length || 0;
      const mat = pipe.material || 'Desconocido';

      byDiameter[dia] = (byDiameter[dia] || 0) + len;
      byMaterial[mat] = (byMaterial[mat] || 0) + len;

      if (dia < minDia) minDia = dia;
      if (dia > maxDia) maxDia = dia;
    }

    content.pipes = {
      totalLength: Math.round(totalLength * 100) / 100,
      byDiameter,
      byMaterial,
      minDiameter: minDia === Infinity ? 0 : minDia,
      maxDiameter: maxDia,
    };
  }

  // Process manholes
  if (infrastructure.manholes && infrastructure.manholes.length > 0) {
    const manholes = infrastructure.manholes;
    const byType: Record<string, number> = {};

    for (const mh of manholes) {
      const type = mh.type || 'Estándar';
      byType[type] = (byType[type] || 0) + 1;
    }

    content.nodes = {
      manholes: manholes.length,
      chambers: 0,
      dropStructures: 0,
      byType,
    };
  }

  // Process stormwater elements
  if (infrastructure.inlets || infrastructure.channels || infrastructure.detentionPonds) {
    const inlets = infrastructure.inlets || [];
    const channels = infrastructure.channels || [];
    const ponds = infrastructure.detentionPonds || [];

    const inletsByType: Record<string, number> = {};
    for (const inlet of inlets) {
      const type = inlet.type || 'Sumidero';
      inletsByType[type] = (inletsByType[type] || 0) + 1;
    }

    const channelLength = channels.reduce((sum, c) => sum + (c.length || 0), 0);
    const totalVolume = ponds.reduce((sum, p) => sum + (p.volume || 0), 0);

    content.stormwater = {
      inlets: inlets.length,
      byType: inletsByType,
      channels: channels.length,
      channelLength: Math.round(channelLength * 100) / 100,
      detentionPonds: ponds.length,
      totalDetentionVolume: Math.round(totalVolume * 100) / 100,
    };
  }

  // Generate quantities summary table
  const quantitiesSummary: InfrastructureSummaryContent['quantitiesSummary'] = [];

  if (content.pipes) {
    for (const [dia, len] of Object.entries(content.pipes.byDiameter)) {
      quantitiesSummary.push({
        item: `TUB-${dia}`,
        description: `Tubería Ø${dia}mm`,
        quantity: Math.round(len * 100) / 100,
        unit: 'm',
      });
    }
  }

  if (content.nodes?.manholes) {
    quantitiesSummary.push({
      item: 'CI',
      description: 'Cámara de Inspección',
      quantity: content.nodes.manholes,
      unit: 'un',
    });
  }

  if (content.stormwater?.inlets) {
    quantitiesSummary.push({
      item: 'SUM',
      description: 'Sumideros',
      quantity: content.stormwater.inlets,
      unit: 'un',
    });
  }

  content.quantitiesSummary = quantitiesSummary;

  return content;
}

/**
 * Update a section's content with project data
 */
export function populateSectionFromProject(
  section: DocumentSection,
  data: ProjectDataForDocument
): DocumentSection {
  switch (section.type) {
    case 'study_area':
      return {
        ...section,
        content: generateStudyAreaContent(data),
      };

    case 'design_criteria':
      return {
        ...section,
        content: generateDesignCriteriaContent(data),
      };

    case 'population_demand':
      return {
        ...section,
        content: generatePopulationDemandContent(data),
      };

    case 'infrastructure_summary':
      return {
        ...section,
        content: generateInfrastructureSummaryContent(data),
      };

    default:
      // Recursively update subsections
      if (section.subsections) {
        return {
          ...section,
          subsections: section.subsections.map((sub) =>
            populateSectionFromProject(sub, data)
          ),
        };
      }
      return section;
  }
}

/**
 * Populate all auto-generated sections in a document
 */
export function populateDocumentSections(
  sections: DocumentSection[],
  data: ProjectDataForDocument
): DocumentSection[] {
  return sections.map((section) => populateSectionFromProject(section, data));
}
