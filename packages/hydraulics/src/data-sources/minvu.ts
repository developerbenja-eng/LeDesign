/**
 * MINVU Integration
 * Ministerio de Vivienda y Urbanismo - Chile
 *
 * Provides urban planning instruments (PRC, PRI, PRMS), zoning data,
 * building regulations, and urban development information.
 */

import type { BoundingBox } from '../hydrology/copernicus-flood';

// ============================================================================
// Types
// ============================================================================

export interface ZoningUnit {
  id: string;
  zona: string;
  uso: string;
  densidad?: number; // hab/ha
  coeficienteOcupacion?: number; // COS
  coeficienteConstructibilidad?: number; // CC
  alturaMaxima?: number; // meters or floors
  antejardín?: number; // meters
  rasante?: number; // degrees
  restricciones: string[];
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface PlanningInstrument {
  id: string;
  nombre: string;
  tipo: 'PRC' | 'PRI' | 'PRMS' | 'PROT' | 'SECCIONAL';
  comuna: string;
  region: string;
  fechaAprobacion?: string;
  vigente: boolean;
  url?: string;
}

export interface LandUseZone {
  codigo: string;
  nombre: string;
  descripcion: string;
  usosPermitidos: string[];
  usosProhibidos: string[];
  condicionantes: string[];
}

export interface BuildingNorm {
  zona: string;
  densidadBruta?: number;
  densidadNeta?: number;
  coeficienteOcupacionSuelo: number; // 0-1
  coeficienteConstructibilidad: number;
  alturaMaxima?: number;
  pisoMinimo?: number;
  pisoMaximo?: number;
  distanciamientos: {
    frontal?: number;
    lateral?: number;
    fondo?: number;
  };
  rasante: {
    angulo: number; // degrees
    altura: number; // meters
  };
  estacionamientos?: {
    vivienda?: string; // e.g., "1/2 viv" or "1/50m2"
    comercio?: string;
    oficina?: string;
  };
}

export interface RiskZone {
  id: string;
  tipo: 'inundacion' | 'remocion_masa' | 'tsunami' | 'incendio' | 'sismico' | 'volcanico';
  nivel: 'bajo' | 'medio' | 'alto' | 'muy_alto';
  fuente: string;
  restricciones: string[];
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface ProtectedPatrimony {
  id: string;
  nombre: string;
  tipo: 'zona_tipica' | 'monumento_historico' | 'zona_conservacion' | 'inmueble_conservacion';
  decreto?: string;
  restricciones: string[];
  geometry: GeoJSON.Polygon | GeoJSON.Point;
}

// ============================================================================
// API Configuration
// ============================================================================

const MINVU_IDE_BASE = 'https://ide.minvu.cl/geoserver';
const OBSERVATORIO_BASE = 'https://observatoriourbano.minvu.cl';

// WFS services
const SERVICES = {
  prc: `${MINVU_IDE_BASE}/prc/wfs`,
  zonificacion: `${MINVU_IDE_BASE}/zonificacion/wfs`,
  zonaRiesgo: `${MINVU_IDE_BASE}/riesgo/wfs`,
  patrimonio: `${MINVU_IDE_BASE}/patrimonio/wfs`,
  limitesUrbanos: `${MINVU_IDE_BASE}/limites/wfs`,
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Fetch zoning data for an area
 */
export async function fetchZoning(
  bounds: BoundingBox
): Promise<ZoningUnit[]> {
  try {
    const bbox = `${bounds.minY},${bounds.minX},${bounds.maxY},${bounds.maxX}`;

    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'zonificacion:zona_uso_suelo',
      bbox,
      srsName: 'EPSG:4326',
      outputFormat: 'application/json',
      count: '500',
    });

    const response = await fetch(`${SERVICES.zonificacion}?${params}`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature: any) => ({
      id: feature.id || '',
      zona: feature.properties?.ZONA || feature.properties?.COD_ZONA || '',
      uso: feature.properties?.USO || feature.properties?.USO_SUELO || '',
      densidad: feature.properties?.DENSIDAD || undefined,
      coeficienteOcupacion: feature.properties?.COS || undefined,
      coeficienteConstructibilidad: feature.properties?.CC || undefined,
      alturaMaxima: feature.properties?.ALTURA_MAX || undefined,
      antejardín: feature.properties?.ANTEJARDIN || undefined,
      restricciones: parseRestrictions(feature.properties?.RESTRICCIONES),
      geometry: feature.geometry,
    }));
  } catch (error) {
    console.error('Error fetching zoning:', error);
    return [];
  }
}

/**
 * Fetch risk zones from planning instruments
 */
export async function fetchRiskZones(
  bounds: BoundingBox
): Promise<RiskZone[]> {
  try {
    const bbox = `${bounds.minY},${bounds.minX},${bounds.maxY},${bounds.maxX}`;

    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'riesgo:zona_riesgo',
      bbox,
      srsName: 'EPSG:4326',
      outputFormat: 'application/json',
      count: '500',
    });

    const response = await fetch(`${SERVICES.zonaRiesgo}?${params}`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature: any) => ({
      id: feature.id || '',
      tipo: mapRiskType(feature.properties?.TIPO),
      nivel: mapRiskLevel(feature.properties?.NIVEL),
      fuente: feature.properties?.FUENTE || feature.properties?.INSTRUMENTO || '',
      restricciones: parseRestrictions(feature.properties?.RESTRICCIONES),
      geometry: feature.geometry,
    }));
  } catch (error) {
    console.error('Error fetching risk zones:', error);
    return [];
  }
}

/**
 * Fetch protected patrimony zones
 */
export async function fetchPatrimony(
  bounds: BoundingBox
): Promise<ProtectedPatrimony[]> {
  try {
    const bbox = `${bounds.minY},${bounds.minX},${bounds.maxY},${bounds.maxX}`;

    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'patrimonio:zona_protegida',
      bbox,
      srsName: 'EPSG:4326',
      outputFormat: 'application/json',
      count: '500',
    });

    const response = await fetch(`${SERVICES.patrimonio}?${params}`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature: any) => ({
      id: feature.id || '',
      nombre: feature.properties?.NOMBRE || '',
      tipo: mapPatrimonyType(feature.properties?.TIPO),
      decreto: feature.properties?.DECRETO || undefined,
      restricciones: parseRestrictions(feature.properties?.RESTRICCIONES),
      geometry: feature.geometry,
    }));
  } catch (error) {
    console.error('Error fetching patrimony:', error);
    return [];
  }
}

/**
 * Get standard land use zones (OGUC)
 */
export function getStandardZones(): Record<string, LandUseZone> {
  // Standard zones according to OGUC (Ordenanza General de Urbanismo y Construcciones)
  return {
    ZH: {
      codigo: 'ZH',
      nombre: 'Zona Habitacional',
      descripcion: 'Uso residencial exclusivo o preferente',
      usosPermitidos: ['vivienda', 'equipamiento menor', 'áreas verdes'],
      usosProhibidos: ['industria', 'bodegaje', 'comercio mayorista'],
      condicionantes: ['Densidad según PRC local', 'Altura según rasante'],
    },
    ZHM: {
      codigo: 'ZHM',
      nombre: 'Zona Habitacional Mixta',
      descripcion: 'Residencial con comercio y servicios compatibles',
      usosPermitidos: ['vivienda', 'comercio menor', 'oficinas', 'equipamiento'],
      usosProhibidos: ['industria molesta', 'bodegaje mayor'],
      condicionantes: ['Comercio solo en primer piso', 'Estacionamientos requeridos'],
    },
    ZC: {
      codigo: 'ZC',
      nombre: 'Zona de Actividades Productivas',
      descripcion: 'Comercio, servicios y oficinas',
      usosPermitidos: ['comercio', 'oficinas', 'servicios', 'equipamiento'],
      usosProhibidos: ['industria pesada', 'vivienda social'],
      condicionantes: ['Sin emisiones molestas'],
    },
    ZI: {
      codigo: 'ZI',
      nombre: 'Zona Industrial',
      descripcion: 'Actividades productivas e industriales',
      usosPermitidos: ['industria', 'bodegaje', 'servicios industriales'],
      usosProhibidos: ['vivienda', 'educación', 'salud'],
      condicionantes: ['Buffer de protección', 'Evaluación ambiental'],
    },
    ZE: {
      codigo: 'ZE',
      nombre: 'Zona de Equipamiento',
      descripcion: 'Equipamiento urbano de escala comunal o mayor',
      usosPermitidos: ['equipamiento', 'áreas verdes', 'servicios públicos'],
      usosProhibidos: ['vivienda', 'industria'],
      condicionantes: ['Según tipo de equipamiento'],
    },
    ZAV: {
      codigo: 'ZAV',
      nombre: 'Zona de Áreas Verdes',
      descripcion: 'Parques, plazas y espacios públicos',
      usosPermitidos: ['áreas verdes', 'equipamiento deportivo', 'recreación'],
      usosProhibidos: ['construcciones permanentes', 'vivienda', 'comercio'],
      condicionantes: ['Mantener permeabilidad', 'Sin ocupación de suelo mayor a 20%'],
    },
    ZR: {
      codigo: 'ZR',
      nombre: 'Zona de Riesgo',
      descripcion: 'Área con restricciones por riesgo natural',
      usosPermitidos: ['según estudio de riesgo'],
      usosProhibidos: ['vivienda', 'equipamiento crítico'],
      condicionantes: ['Requiere estudio específico', 'Obras de mitigación'],
    },
    ZP: {
      codigo: 'ZP',
      nombre: 'Zona de Protección',
      descripcion: 'Área de protección de recursos naturales o patrimonio',
      usosPermitidos: ['conservación', 'turismo controlado'],
      usosProhibidos: ['urbanización', 'industria'],
      condicionantes: ['Autorización especial requerida'],
    },
  };
}

/**
 * Get building norms for common zones (OGUC default)
 */
export function getDefaultBuildingNorms(): Record<string, BuildingNorm> {
  return {
    ZH1: {
      zona: 'ZH1 - Residencial Baja Densidad',
      densidadBruta: 100,
      coeficienteOcupacionSuelo: 0.4,
      coeficienteConstructibilidad: 0.8,
      alturaMaxima: 9,
      pisoMaximo: 2,
      distanciamientos: { frontal: 5, lateral: 3, fondo: 3 },
      rasante: { angulo: 70, altura: 3.5 },
      estacionamientos: { vivienda: '1/vivienda' },
    },
    ZH2: {
      zona: 'ZH2 - Residencial Media Densidad',
      densidadBruta: 300,
      coeficienteOcupacionSuelo: 0.5,
      coeficienteConstructibilidad: 1.5,
      alturaMaxima: 14,
      pisoMaximo: 4,
      distanciamientos: { frontal: 5, lateral: 2 },
      rasante: { angulo: 70, altura: 3.5 },
      estacionamientos: { vivienda: '1/vivienda' },
    },
    ZH3: {
      zona: 'ZH3 - Residencial Alta Densidad',
      densidadBruta: 800,
      coeficienteOcupacionSuelo: 0.6,
      coeficienteConstructibilidad: 4.0,
      pisoMaximo: 12,
      distanciamientos: { frontal: 5 },
      rasante: { angulo: 70, altura: 3.5 },
      estacionamientos: { vivienda: '1/50m2' },
    },
    ZC: {
      zona: 'ZC - Comercial',
      coeficienteOcupacionSuelo: 0.7,
      coeficienteConstructibilidad: 3.0,
      pisoMaximo: 8,
      distanciamientos: { frontal: 0 },
      rasante: { angulo: 70, altura: 0 },
      estacionamientos: { comercio: '1/50m2', oficina: '1/40m2' },
    },
    ZI: {
      zona: 'ZI - Industrial',
      coeficienteOcupacionSuelo: 0.6,
      coeficienteConstructibilidad: 1.2,
      alturaMaxima: 15,
      distanciamientos: { frontal: 10, lateral: 5, fondo: 5 },
      rasante: { angulo: 90, altura: 0 },
    },
  };
}

/**
 * Calculate building envelope for a lot
 */
export function calculateBuildingEnvelope(
  lotArea: number, // m²
  lotFrontage: number, // m
  lotDepth: number, // m
  norms: BuildingNorm
): {
  superficieMaximaOcupacion: number; // m²
  superficieMaximaConstruccion: number; // m²
  alturaMaxima: number; // m
  retiros: { frontal: number; lateral: number; fondo: number };
  superficieEdificable: number; // m² after setbacks
  rasanteAltura: (distancia: number) => number;
} {
  const retiros = {
    frontal: norms.distanciamientos.frontal || 5,
    lateral: norms.distanciamientos.lateral || 0,
    fondo: norms.distanciamientos.fondo || 0,
  };

  // Buildable area after setbacks
  const anchoEdificable = lotFrontage - 2 * retiros.lateral;
  const profundidadEdificable = lotDepth - retiros.frontal - retiros.fondo;
  const superficieEdificable = Math.max(0, anchoEdificable * profundidadEdificable);

  // Maximum occupation
  const superficieMaximaOcupacion = lotArea * norms.coeficienteOcupacionSuelo;

  // Maximum construction
  const superficieMaximaConstruccion = lotArea * norms.coeficienteConstructibilidad;

  // Maximum height
  let alturaMaxima = norms.alturaMaxima || 35;
  if (norms.pisoMaximo) {
    alturaMaxima = Math.min(alturaMaxima, norms.pisoMaximo * 3.0);
  }

  // Rasante function (height limit based on distance from property line)
  const rasanteAltura = (distancia: number): number => {
    const baseHeight = norms.rasante.altura;
    const angle = norms.rasante.angulo * Math.PI / 180;
    return baseHeight + distancia * Math.tan(angle);
  };

  return {
    superficieMaximaOcupacion,
    superficieMaximaConstruccion,
    alturaMaxima,
    retiros,
    superficieEdificable,
    rasanteAltura,
  };
}

/**
 * Check urban/rural classification
 */
export async function checkUrbanLimit(
  lat: number,
  lon: number
): Promise<{
  dentroDeLimiteUrbano: boolean;
  comuna?: string;
  instrumento?: string;
}> {
  try {
    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'limites:limite_urbano',
      cql_filter: `INTERSECTS(geom, POINT(${lon} ${lat}))`,
      outputFormat: 'application/json',
      count: '1',
    });

    const response = await fetch(`${SERVICES.limitesUrbanos}?${params}`);

    if (!response.ok) {
      return { dentroDeLimiteUrbano: false };
    }

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      return {
        dentroDeLimiteUrbano: true,
        comuna: data.features[0].properties?.COMUNA || undefined,
        instrumento: data.features[0].properties?.INSTRUMENTO || undefined,
      };
    }

    return { dentroDeLimiteUrbano: false };
  } catch (error) {
    console.error('Error checking urban limit:', error);
    return { dentroDeLimiteUrbano: false };
  }
}

// ============================================================================
// Analysis Functions
// ============================================================================

export interface UrbanAnalysis {
  zonificacion: ZoningUnit[];
  zonasRiesgo: RiskZone[];
  patrimonio: ProtectedPatrimony[];
  restriccionesGenerales: string[];
  normativaAplicable: BuildingNorm | null;
  recomendaciones: string[];
}

/**
 * Analyze urban planning context for a project
 */
export async function analyzeUrbanContext(
  bounds: BoundingBox,
  centerLat: number,
  centerLon: number
): Promise<UrbanAnalysis> {
  const [zonificacion, zonasRiesgo, patrimonio, urbanCheck] = await Promise.all([
    fetchZoning(bounds),
    fetchRiskZones(bounds),
    fetchPatrimony(bounds),
    checkUrbanLimit(centerLat, centerLon),
  ]);

  const restriccionesGenerales: string[] = [];
  const recomendaciones: string[] = [];

  // Check urban limit
  if (!urbanCheck.dentroDeLimiteUrbano) {
    restriccionesGenerales.push('Ubicación fuera del límite urbano - aplica normativa rural');
    recomendaciones.push('Verificar uso permitido según PRMS/PRI o normativa rural');
  }

  // Check risk zones
  for (const zona of zonasRiesgo) {
    if (zona.nivel === 'alto' || zona.nivel === 'muy_alto') {
      restriccionesGenerales.push(`Zona de riesgo ${zona.tipo} nivel ${zona.nivel}`);
      restriccionesGenerales.push(...zona.restricciones);
    }
  }

  // Check patrimony
  if (patrimonio.length > 0) {
    restriccionesGenerales.push('Área con protección patrimonial');
    recomendaciones.push('Consultar CMN o SEREMI MINVU para intervenciones');
  }

  // Get applicable norms
  let normativaAplicable: BuildingNorm | null = null;
  if (zonificacion.length > 0) {
    const defaultNorms = getDefaultBuildingNorms();
    const zonaCode = zonificacion[0].zona.substring(0, 2).toUpperCase();
    normativaAplicable = defaultNorms[zonaCode] || defaultNorms['ZH1'];
  }

  return {
    zonificacion,
    zonasRiesgo,
    patrimonio,
    restriccionesGenerales,
    normativaAplicable,
    recomendaciones,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseRestrictions(text: string | undefined): string[] {
  if (!text) return [];
  return text.split(/[;,\n]/).map(s => s.trim()).filter(Boolean);
}

function mapRiskType(tipo: string | undefined): RiskZone['tipo'] {
  if (!tipo) return 'sismico';
  const lower = tipo.toLowerCase();
  if (lower.includes('inundacion') || lower.includes('flood')) return 'inundacion';
  if (lower.includes('remocion') || lower.includes('landslide')) return 'remocion_masa';
  if (lower.includes('tsunami')) return 'tsunami';
  if (lower.includes('incendio') || lower.includes('fire')) return 'incendio';
  if (lower.includes('volcan')) return 'volcanico';
  return 'sismico';
}

function mapRiskLevel(nivel: string | undefined): RiskZone['nivel'] {
  if (!nivel) return 'medio';
  const lower = nivel.toLowerCase();
  if (lower.includes('muy alto') || lower.includes('very high')) return 'muy_alto';
  if (lower.includes('alto') || lower.includes('high')) return 'alto';
  if (lower.includes('bajo') || lower.includes('low')) return 'bajo';
  return 'medio';
}

function mapPatrimonyType(tipo: string | undefined): ProtectedPatrimony['tipo'] {
  if (!tipo) return 'zona_conservacion';
  const lower = tipo.toLowerCase();
  if (lower.includes('tipica')) return 'zona_tipica';
  if (lower.includes('monumento')) return 'monumento_historico';
  if (lower.includes('inmueble')) return 'inmueble_conservacion';
  return 'zona_conservacion';
}

