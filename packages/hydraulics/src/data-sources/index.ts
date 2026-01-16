/**
 * External Data Sources for Hydraulic and Hydrological Analysis
 *
 * This module provides integration with Chilean government APIs and
 * international weather/hydrology services.
 */

// Open-Meteo - Free weather and hydrological forecasts
export * from './open-meteo';

// DGA Real-Time - Chilean government hydrology data
export * from './dga-realtime';

// MINVU - Ministry of Housing and Urban Planning
export * from './minvu';

// CONAF - National Forestry Corporation
export * from './conaf';

// SERNAGEOMIN - Geological and Mining Service
export * from './sernageomin';

// SHOA - Hydrographic and Oceanographic Service
export * from './shoa';

// Soil and Geotechnical Data
export * from './soil';

// ============================================================================
// Unified Analysis - Import all data sources for comprehensive site analysis
// ============================================================================

import type { BoundingBox } from '@ledesign/terrain/triangulation';

// Import for unified analysis
import {
  fetchGeology,
  fetchFaults,
  fetchVolcanoes,
  fetchLandslideZones,
  getSeismicZone,
  assessGeologicalRisks,
  type GeologicalUnit,
  type Fault,
  type Volcano,
  type LandslideZone,
  type SeismicZone,
  type GeologicalRiskAssessment,
} from './sernageomin';

import {
  fetchProtectedAreas,
  fetchVegetation,
  fetchActiveFires,
  assessFireRisk,
  type ProtectedArea,
  type VegetationUnit,
  type FireRiskZone,
} from './conaf';

import {
  findNearestTideStation,
  estimateTidalRange,
  fetchTsunamiZones,
  checkTsunamiRisk,
  calculateDesignWaterLevel,
  type TideStation,
  type TsunamiHazardZone,
} from './shoa';

import {
  fetchZoning,
  fetchRiskZones,
  fetchPatrimony,
  checkUrbanLimit,
  analyzeUrbanContext,
  type ZoningUnit,
  type RiskZone,
  type ProtectedPatrimony,
  type UrbanAnalysis,
} from './minvu';

import {
  estimateSoilType,
  getNCh433Classification,
  recommendFoundation,
  estimateGroundwater,
  type GeotechnicalZone,
  type FoundationRecommendation,
  type GroundwaterData,
} from './soil';

// ============================================================================
// Unified Types
// ============================================================================

export interface ProjectSiteAnalysis {
  // Location info
  location: {
    center: { lat: number; lon: number };
    bounds: BoundingBox;
    isCoastal: boolean;
    isUrban: boolean;
    comuna?: string;
    region?: string;
  };

  // Geological analysis
  geology: {
    units: GeologicalUnit[];
    faults: Fault[];
    volcanoes: Volcano[];
    landslideZones: LandslideZone[];
    seismicZone: SeismicZone;
    riskAssessment: GeologicalRiskAssessment;
  };

  // Environmental analysis
  environment: {
    vegetation: VegetationUnit[];
    protectedAreas: ProtectedArea[];
    fireRisk: FireRiskZone;
  };

  // Coastal analysis (if applicable)
  coastal?: {
    nearestTideStation: TideStation | null;
    tidalRange: { rangoMedio: number; rangoMaximo: number; tipoMarea: string };
    tsunamiZones: TsunamiHazardZone[];
    tsunamiRisk: { enZonaRiesgo: boolean; cotaSegura: number };
    designWaterLevel?: { nivelDiseno: number };
  };

  // Urban planning analysis
  urban: UrbanAnalysis;

  // Geotechnical analysis
  geotechnical: {
    soilType: ReturnType<typeof estimateSoilType>;
    nch433Class: GeotechnicalZone;
    foundationRecommendation: FoundationRecommendation;
    groundwater: GroundwaterData;
  };

  // Hydrological context (from DGA - existing integration)
  hydrology?: {
    stations: number;
    alerts: number;
    restrictions: boolean;
  };

  // Summary
  summary: {
    overallRisk: 'bajo' | 'moderado' | 'alto' | 'muy_alto' | 'critico';
    criticalIssues: string[];
    recommendations: string[];
    dataQuality: 'pobre' | 'moderada' | 'buena' | 'excelente';
    sourcesUsed: string[];
  };

  // Metadata
  metadata: {
    timestamp: string;
    processingTimeMs: number;
    servicesQueried: string[];
    errors: string[];
  };
}

export interface AnalysisOptions {
  includeGeology?: boolean;
  includeEnvironment?: boolean;
  includeCoastal?: boolean;
  includeUrban?: boolean;
  includeHydrology?: boolean;
  includeSoil?: boolean;
  forceRefresh?: boolean;
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Run comprehensive site analysis combining all data sources
 */
export async function analyzeProjectSite(
  bounds: BoundingBox,
  options: AnalysisOptions = {}
): Promise<ProjectSiteAnalysis> {
  const startTime = performance.now();
  const errors: string[] = [];
  const sourcesUsed: string[] = [];

  const centerLat = (bounds.minY + bounds.maxY) / 2;
  const centerLon = (bounds.minX + bounds.maxX) / 2;

  // Determine if coastal (rough check based on distance to coast)
  const isCoastal = Math.abs(centerLon + 71.5) < 2; // Within ~200km of Chilean coast

  // Initialize results
  const result: ProjectSiteAnalysis = {
    location: {
      center: { lat: centerLat, lon: centerLon },
      bounds,
      isCoastal,
      isUrban: false,
    },
    geology: {
      units: [],
      faults: [],
      volcanoes: [],
      landslideZones: [],
      seismicZone: getSeismicZone(centerLat, centerLon),
      riskAssessment: {
        seismicZone: getSeismicZone(centerLat, centerLon),
        faultsNearby: [],
        volcanoesNearby: [],
        landslideRisk: 'muy_baja',
        overallRisk: 'bajo',
        recommendations: [],
      },
    },
    environment: {
      vegetation: [],
      protectedAreas: [],
      fireRisk: {
        nivel: 'moderado',
        factores: [],
        temporadaAlta: [],
        geometry: { type: 'Polygon', coordinates: [] },
      },
    },
    urban: {
      zonificacion: [],
      zonasRiesgo: [],
      patrimonio: [],
      restriccionesGenerales: [],
      normativaAplicable: null,
      recomendaciones: [],
    },
    geotechnical: {
      soilType: estimateSoilType(centerLat, centerLon),
      nch433Class: getNCh433Classification(centerLat, centerLon),
      foundationRecommendation: recommendFoundation(centerLat, centerLon, 'vivienda'),
      groundwater: estimateGroundwater(centerLat, centerLon),
    },
    summary: {
      overallRisk: 'bajo',
      criticalIssues: [],
      recommendations: [],
      dataQuality: 'moderada',
      sourcesUsed: [],
    },
    metadata: {
      timestamp: new Date().toISOString(),
      processingTimeMs: 0,
      servicesQueried: [],
      errors: [],
    },
  };

  // Run analyses in parallel
  const analyses: Promise<void>[] = [];

  // Geological analysis
  if (options.includeGeology !== false) {
    analyses.push(
      assessGeologicalRisks(bounds, centerLat, centerLon)
        .then(assessment => {
          result.geology.riskAssessment = assessment;
          result.geology.faults = assessment.faultsNearby;
          result.geology.volcanoes = assessment.volcanoesNearby;
          sourcesUsed.push('SERNAGEOMIN');
        })
        .catch(err => {
          errors.push(`Geology: ${err.message}`);
        })
    );

    analyses.push(
      Promise.all([
        fetchGeology(bounds),
        fetchLandslideZones(bounds),
      ]).then(([geology, landslides]) => {
        result.geology.units = geology;
        result.geology.landslideZones = landslides;
      }).catch(err => {
        errors.push(`Geology details: ${err.message}`);
      })
    );
  }

  // Environmental analysis
  if (options.includeEnvironment !== false) {
    analyses.push(
      Promise.all([
        fetchVegetation(bounds),
        fetchProtectedAreas(bounds),
      ]).then(([vegetation, protectedAreas]) => {
        result.environment.vegetation = vegetation;
        result.environment.protectedAreas = protectedAreas;
        result.environment.fireRisk = assessFireRisk(bounds, vegetation);
        sourcesUsed.push('CONAF');
      }).catch(err => {
        errors.push(`Environment: ${err.message}`);
      })
    );
  }

  // Coastal analysis
  if ((options.includeCoastal !== false) && isCoastal) {
    analyses.push(
      Promise.all([
        fetchTsunamiZones(bounds),
        checkTsunamiRisk(centerLat, centerLon),
      ]).then(([tsunamiZones, tsunamiRisk]) => {
        const nearestStation = findNearestTideStation(centerLat, centerLon);
        const tidalRange = estimateTidalRange(centerLat, centerLon);

        result.coastal = {
          nearestTideStation: nearestStation,
          tidalRange: {
            rangoMedio: tidalRange.rangoMedio,
            rangoMaximo: tidalRange.rangoMaximo,
            tipoMarea: tidalRange.tipoMarea,
          },
          tsunamiZones,
          tsunamiRisk: {
            enZonaRiesgo: tsunamiRisk.enZonaRiesgo,
            cotaSegura: tsunamiRisk.cotaSegura,
          },
        };

        // Add design water level if in coastal risk zone
        if (tsunamiRisk.enZonaRiesgo) {
          const designLevel = calculateDesignWaterLevel(centerLat, centerLon, 100, true);
          result.coastal.designWaterLevel = { nivelDiseno: designLevel.nivelDiseno };
        }

        sourcesUsed.push('SHOA');
      }).catch(err => {
        errors.push(`Coastal: ${err.message}`);
      })
    );
  }

  // Urban analysis
  if (options.includeUrban !== false) {
    analyses.push(
      analyzeUrbanContext(bounds, centerLat, centerLon)
        .then(urban => {
          result.urban = urban;
          result.location.isUrban = true; // Will be refined by checkUrbanLimit
          sourcesUsed.push('MINVU');
        })
        .catch(err => {
          errors.push(`Urban: ${err.message}`);
        })
    );

    analyses.push(
      checkUrbanLimit(centerLat, centerLon)
        .then(urbanCheck => {
          result.location.isUrban = urbanCheck.dentroDeLimiteUrbano;
          result.location.comuna = urbanCheck.comuna;
        })
        .catch(() => {})
    );
  }

  // Soil/geotechnical analysis (synchronous but we track it as a source)
  if (options.includeSoil !== false) {
    result.geotechnical = {
      soilType: estimateSoilType(centerLat, centerLon),
      nch433Class: getNCh433Classification(centerLat, centerLon),
      foundationRecommendation: recommendFoundation(centerLat, centerLon, 'vivienda'),
      groundwater: estimateGroundwater(centerLat, centerLon),
    };
    sourcesUsed.push('SOIL_DB');
  }

  // Wait for all analyses
  await Promise.all(analyses);

  // Compute overall risk and recommendations
  const { overallRisk, criticalIssues, recommendations } = computeOverallRisk(result);
  result.summary.overallRisk = overallRisk;
  result.summary.criticalIssues = criticalIssues;
  result.summary.recommendations = recommendations;
  result.summary.sourcesUsed = sourcesUsed;
  result.summary.dataQuality = computeDataQuality(sourcesUsed, errors);

  // Metadata
  result.metadata.processingTimeMs = performance.now() - startTime;
  result.metadata.servicesQueried = sourcesUsed;
  result.metadata.errors = errors;

  return result;
}

// ============================================================================
// Risk Computation
// ============================================================================

function computeOverallRisk(analysis: ProjectSiteAnalysis): {
  overallRisk: ProjectSiteAnalysis['summary']['overallRisk'];
  criticalIssues: string[];
  recommendations: string[];
} {
  const criticalIssues: string[] = [];
  const recommendations: string[] = [];
  let riskScore = 0;

  // Geological risks
  if (analysis.geology.riskAssessment.overallRisk === 'muy_alto') {
    riskScore += 4;
    criticalIssues.push('Alto riesgo geológico identificado');
  } else if (analysis.geology.riskAssessment.overallRisk === 'alto') {
    riskScore += 3;
  }
  recommendations.push(...analysis.geology.riskAssessment.recommendations);

  // Seismic zone
  if (analysis.geology.seismicZone.zona === 3) {
    riskScore += 1;
    recommendations.push('Zona sísmica 3 - diseño estructural según NCh433');
  }

  // Landslide risk
  const highLandslide = analysis.geology.landslideZones.some(
    z => z.susceptibilidad === 'alta' || z.susceptibilidad === 'muy_alta'
  );
  if (highLandslide) {
    riskScore += 2;
    criticalIssues.push('Alta susceptibilidad a remociones en masa');
    recommendations.push('Requiere estudio geotécnico detallado');
  }

  // Fire risk
  if (analysis.environment.fireRisk.nivel === 'muy_alto' || analysis.environment.fireRisk.nivel === 'extremo') {
    riskScore += 2;
    criticalIssues.push('Alto riesgo de incendios forestales');
  }
  recommendations.push(...analysis.environment.fireRisk.factores);

  // Protected areas
  if (analysis.environment.protectedAreas.length > 0) {
    recommendations.push('Área incluye zonas protegidas (SNASPE) - verificar restricciones');
  }

  // Coastal/tsunami risk
  if (analysis.coastal?.tsunamiRisk.enZonaRiesgo) {
    riskScore += 3;
    criticalIssues.push(`Zona de riesgo de tsunami (cota segura: ${analysis.coastal.tsunamiRisk.cotaSegura}m)`);
    recommendations.push('Plan de evacuación requerido para infraestructura crítica');
  }

  // Urban planning risks
  const highUrbanRisk = analysis.urban.zonasRiesgo.some(
    z => z.nivel === 'alto' || z.nivel === 'muy_alto'
  );
  if (highUrbanRisk) {
    riskScore += 2;
    criticalIssues.push('Zona de riesgo en instrumento de planificación');
  }
  recommendations.push(...analysis.urban.restriccionesGenerales);
  recommendations.push(...analysis.urban.recomendaciones);

  // Patrimony
  if (analysis.urban.patrimonio.length > 0) {
    recommendations.push('Zona con protección patrimonial - consultar CMN');
  }

  // Geotechnical risks
  if (analysis.geotechnical) {
    // Soil class risk
    const soilClass = analysis.geotechnical.nch433Class.tipoSueloNCh433;
    if (soilClass === 'E' || soilClass === 'F') {
      riskScore += 3;
      criticalIssues.push(`Suelo tipo ${soilClass} - requiere estudio geotécnico especializado`);
      recommendations.push('Suelo con potencial de licuefacción o amplificación sísmica significativa');
    } else if (soilClass === 'D') {
      riskScore += 1;
      recommendations.push('Suelo tipo D - diseño sísmico intermedio requerido');
    }

    // Groundwater risk
    const gwLevel = analysis.geotechnical.groundwater.nivelFreatico;
    if (gwLevel !== undefined && gwLevel <= 2) {
      riskScore += 2;
      criticalIssues.push('Napa freática superficial detectada');
      recommendations.push('Considerar sistema de drenaje o fundación especial');
    }

    // Foundation recommendations
    if (analysis.geotechnical.foundationRecommendation.advertencias.length > 0) {
      recommendations.push(...analysis.geotechnical.foundationRecommendation.advertencias);
    }
  }

  // Determine overall risk level
  let overallRisk: ProjectSiteAnalysis['summary']['overallRisk'];
  if (riskScore >= 8) {
    overallRisk = 'critico';
  } else if (riskScore >= 6) {
    overallRisk = 'muy_alto';
  } else if (riskScore >= 4) {
    overallRisk = 'alto';
  } else if (riskScore >= 2) {
    overallRisk = 'moderado';
  } else {
    overallRisk = 'bajo';
  }

  // Remove duplicates
  const uniqueRecommendations = [...new Set(recommendations)].slice(0, 15);

  return {
    overallRisk,
    criticalIssues,
    recommendations: uniqueRecommendations,
  };
}

function computeDataQuality(
  sourcesUsed: string[],
  errors: string[]
): ProjectSiteAnalysis['summary']['dataQuality'] {
  const expectedSources = ['SERNAGEOMIN', 'CONAF', 'SHOA', 'MINVU', 'SOIL_DB'];
  const successRate = sourcesUsed.length / expectedSources.length;
  const errorRate = errors.length / (expectedSources.length + 1);

  if (successRate >= 0.9 && errorRate < 0.1) return 'excelente';
  if (successRate >= 0.7 && errorRate < 0.3) return 'buena';
  if (successRate >= 0.5) return 'moderada';
  return 'pobre';
}

// ============================================================================
// Quick Analysis Functions
// ============================================================================

/**
 * Quick risk check for a point location
 */
export async function quickRiskCheck(
  lat: number,
  lon: number
): Promise<{
  riskLevel: 'bajo' | 'moderado' | 'alto' | 'muy_alto';
  mainRisks: string[];
  seismicZone: number;
  isCoastal: boolean;
  isUrban: boolean;
}> {
  const seismicZone = getSeismicZone(lat, lon);
  const isCoastal = Math.abs(lon + 71.5) < 1.5;
  const mainRisks: string[] = [];

  let riskLevel: 'bajo' | 'moderado' | 'alto' | 'muy_alto' = 'bajo';

  // Seismic
  if (seismicZone.zona === 3) {
    mainRisks.push('Zona sísmica 3 (alta sismicidad)');
    riskLevel = 'moderado';
  }

  // Coastal/tsunami
  if (isCoastal) {
    const tsunamiRisk = await checkTsunamiRisk(lat, lon);
    if (tsunamiRisk.enZonaRiesgo) {
      mainRisks.push('Zona de riesgo de tsunami');
      riskLevel = 'alto';
    }
  }

  // Fire risk (seasonal check)
  const month = new Date().getMonth() + 1;
  if (lat > -38 && lat < -33 && (month >= 11 || month <= 3)) {
    mainRisks.push('Temporada de incendios activa');
    if (riskLevel === 'bajo') riskLevel = 'moderado';
  }

  // Urban check
  const urbanCheck = await checkUrbanLimit(lat, lon);

  return {
    riskLevel,
    mainRisks,
    seismicZone: seismicZone.zona,
    isCoastal,
    isUrban: urbanCheck.dentroDeLimiteUrbano,
  };
}

/**
 * List all available data layers
 */
export function getAvailableDataLayers(): Array<{
  id: string;
  name: string;
  source: string;
  description: string;
  type: 'vector' | 'raster' | 'point';
  coverage: 'national' | 'regional' | 'local';
}> {
  return [
    // SERNAGEOMIN
    { id: 'geology', name: 'Geología Regional', source: 'SERNAGEOMIN', description: 'Unidades geológicas y litología', type: 'vector', coverage: 'national' },
    { id: 'faults', name: 'Fallas Geológicas', source: 'SERNAGEOMIN', description: 'Fallas activas y potencialmente activas', type: 'vector', coverage: 'national' },
    { id: 'volcanoes', name: 'Volcanes', source: 'SERNAGEOMIN', description: 'Red Nacional de Vigilancia Volcánica', type: 'point', coverage: 'national' },
    { id: 'landslides', name: 'Remociones en Masa', source: 'SERNAGEOMIN', description: 'Susceptibilidad a deslizamientos', type: 'vector', coverage: 'national' },
    { id: 'mining', name: 'Catastro Minero', source: 'SERNAGEOMIN', description: 'Concesiones y pasivos ambientales mineros', type: 'vector', coverage: 'national' },

    // CONAF
    { id: 'vegetation', name: 'Catastro Vegetacional', source: 'CONAF', description: 'Cobertura vegetal y tipos forestales', type: 'vector', coverage: 'national' },
    { id: 'snaspe', name: 'SNASPE', source: 'CONAF', description: 'Áreas Silvestres Protegidas del Estado', type: 'vector', coverage: 'national' },
    { id: 'fires', name: 'Incendios Forestales', source: 'CONAF/NASA FIRMS', description: 'Histórico y activos (satelital)', type: 'point', coverage: 'national' },
    { id: 'native_forest', name: 'Bosque Nativo', source: 'CONAF', description: 'Tipos forestales nativos', type: 'vector', coverage: 'national' },

    // SHOA
    { id: 'tide_stations', name: 'Estaciones Mareográficas', source: 'SHOA', description: 'Red de medición de mareas', type: 'point', coverage: 'national' },
    { id: 'tsunami', name: 'Zonas Tsunami', source: 'SHOA/ONEMI', description: 'Cartas de inundación por tsunami', type: 'vector', coverage: 'regional' },

    // MINVU
    { id: 'zoning', name: 'Zonificación', source: 'MINVU', description: 'Uso de suelo según PRC/PRI', type: 'vector', coverage: 'local' },
    { id: 'urban_risk', name: 'Zonas de Riesgo', source: 'MINVU', description: 'Riesgos en instrumentos de planificación', type: 'vector', coverage: 'local' },
    { id: 'patrimony', name: 'Patrimonio', source: 'MINVU/CMN', description: 'Zonas típicas y monumentos', type: 'vector', coverage: 'national' },
    { id: 'urban_limit', name: 'Límite Urbano', source: 'MINVU', description: 'Límites urbanos comunales', type: 'vector', coverage: 'national' },

    // DGA (existing integration)
    { id: 'dga_stations', name: 'Estaciones DGA', source: 'DGA', description: 'Red hidrométrica y meteorológica', type: 'point', coverage: 'national' },
    { id: 'dga_alerts', name: 'Alertas de Crecida', source: 'DGA', description: 'Alertas en tiempo real', type: 'point', coverage: 'national' },
    { id: 'water_restrictions', name: 'Restricciones Hídricas', source: 'DGA', description: 'Zonas de prohibición y restricción', type: 'vector', coverage: 'national' },

    // Copernicus (existing + new)
    { id: 'dem_30m', name: 'DEM Copernicus 30m', source: 'Copernicus', description: 'Modelo de elevación digital', type: 'raster', coverage: 'national' },
    { id: 'sentinel1', name: 'Sentinel-1 SAR', source: 'Copernicus', description: 'Imágenes radar para detección de inundaciones', type: 'raster', coverage: 'national' },
    { id: 'sentinel2', name: 'Sentinel-2 Óptico', source: 'Copernicus', description: 'Imágenes ópticas multiespectrales', type: 'raster', coverage: 'national' },

    // Soil/Geotechnical
    { id: 'soil_type', name: 'Tipo de Suelo', source: 'SOIL_DB', description: 'Clasificación de suelos por región', type: 'vector', coverage: 'national' },
    { id: 'nch433_soil', name: 'Clasificación NCh433', source: 'SOIL_DB', description: 'Clasificación sísmica de suelos (A-F)', type: 'vector', coverage: 'national' },
    { id: 'groundwater', name: 'Nivel Freático', source: 'SOIL_DB', description: 'Estimación de profundidad de napa', type: 'vector', coverage: 'national' },
    { id: 'foundation', name: 'Recomendación Fundación', source: 'SOIL_DB', description: 'Tipos de fundación recomendados', type: 'vector', coverage: 'national' },
  ];
}
