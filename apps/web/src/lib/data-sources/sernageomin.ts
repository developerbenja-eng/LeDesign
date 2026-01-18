/**
 * SERNAGEOMIN Integration
 * Servicio Nacional de Geología y Minería - Chile
 *
 * Provides geological hazard data, fault lines, volcanoes,
 * landslide susceptibility, and geological maps.
 */

import type { BoundingBox } from '../triangulation/types';

// ============================================================================
// Types
// ============================================================================

export interface GeologicalUnit {
  id: string;
  codigo: string;
  nombre: string;
  era: string;
  periodo: string;
  litologia: string;
  descripcion: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface Fault {
  id: string;
  nombre: string;
  tipo: 'normal' | 'inversa' | 'transcurrente' | 'indeterminada';
  actividad: 'activa' | 'potencialmente_activa' | 'inactiva' | 'sin_datos';
  longitud: number; // km
  geometry: GeoJSON.LineString | GeoJSON.MultiLineString;
  referencia?: string;
}

export interface Volcano {
  id: string;
  nombre: string;
  tipo: 'estratovolcan' | 'caldera' | 'domo' | 'cono' | 'campo_volcanico';
  altitud: number;
  estado: 'activo' | 'latente' | 'dormido' | 'extinto';
  ultimaErupcion?: string;
  indiceExplosividad?: number; // VEI
  nivelAlerta?: 'verde' | 'amarillo' | 'naranja' | 'rojo';
  latitud: number;
  longitud: number;
  region: string;
}

export interface LandslideZone {
  id: string;
  tipo: 'remocion_masa' | 'flujo_detritos' | 'deslizamiento' | 'caida_rocas';
  susceptibilidad: 'muy_baja' | 'baja' | 'media' | 'alta' | 'muy_alta';
  factores: string[];
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface SeismicZone {
  zona: 1 | 2 | 3; // NCh433 seismic zones
  aceleracionBase: number; // g
  factorSuelo: Record<string, number>;
}

export interface MineralDeposit {
  id: string;
  nombre: string;
  tipo: string;
  mineral: string;
  estado: 'activo' | 'abandonado' | 'en_exploracion';
  latitud: number;
  longitud: number;
}

// ============================================================================
// API Configuration
// ============================================================================

const SERNAGEOMIN_BASE = 'https://portalgeomin.sernageomin.cl/arcgis/rest/services';

// Available services
const SERVICES = {
  // Geological maps
  geologiaRegional: `${SERNAGEOMIN_BASE}/Geologia/Geologia_Regional/MapServer`,
  cartaGeologica: `${SERNAGEOMIN_BASE}/Geologia/Carta_Geologica/MapServer`,

  // Hazards
  peligrosGeologicos: `${SERNAGEOMIN_BASE}/Geologia/Peligros_Geologicos/MapServer`,
  remocionesMasa: `${SERNAGEOMIN_BASE}/Geologia/Remociones_en_Masa/MapServer`,

  // Volcanoes
  volcanes: `${SERNAGEOMIN_BASE}/Geologia/Red_Nacional_Vigilancia_Volcanica/MapServer`,

  // Faults
  fallas: `${SERNAGEOMIN_BASE}/Geologia/Fallas/MapServer`,

  // Mining
  catastroMinero: `${SERNAGEOMIN_BASE}/Mineria/Catastro_Minero/MapServer`,
  pasivosMineros: `${SERNAGEOMIN_BASE}/Mineria/Pasivos_Ambientales_Mineros/MapServer`,
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Fetch geological units (lithology) for an area
 */
export async function fetchGeology(
  bounds: BoundingBox
): Promise<GeologicalUnit[]> {
  try {
    const bbox = `${bounds.minX},${bounds.minY},${bounds.maxX},${bounds.maxY}`;

    const params = new URLSearchParams({
      f: 'json',
      geometry: bbox,
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: '*',
      returnGeometry: 'true',
      inSR: '4326',
      outSR: '4326',
    });

    const response = await fetch(`${SERVICES.geologiaRegional}/0/query?${params}`);

    if (!response.ok) {
      console.warn('SERNAGEOMIN geology fetch failed:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature: any) => ({
      id: feature.attributes.OBJECTID?.toString() || '',
      codigo: feature.attributes.CODIGO || feature.attributes.COD_UNIDAD || '',
      nombre: feature.attributes.NOMBRE || feature.attributes.NOM_UNIDAD || '',
      era: feature.attributes.ERA || '',
      periodo: feature.attributes.PERIODO || '',
      litologia: feature.attributes.LITOLOGIA || feature.attributes.LITO || '',
      descripcion: feature.attributes.DESCRIPCION || '',
      geometry: esriToGeoJSON(feature.geometry),
    }));
  } catch (error) {
    console.error('Error fetching geology:', error);
    return [];
  }
}

/**
 * Fetch fault lines in an area
 */
export async function fetchFaults(
  bounds: BoundingBox
): Promise<Fault[]> {
  try {
    const bbox = `${bounds.minX},${bounds.minY},${bounds.maxX},${bounds.maxY}`;

    const params = new URLSearchParams({
      f: 'json',
      geometry: bbox,
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: '*',
      returnGeometry: 'true',
      inSR: '4326',
      outSR: '4326',
    });

    const response = await fetch(`${SERVICES.fallas}/0/query?${params}`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature: any) => ({
      id: feature.attributes.OBJECTID?.toString() || '',
      nombre: feature.attributes.NOMBRE || 'Sin nombre',
      tipo: mapFaultType(feature.attributes.TIPO),
      actividad: mapFaultActivity(feature.attributes.ACTIVIDAD),
      longitud: feature.attributes.LONGITUD || 0,
      geometry: esriToGeoJSONLine(feature.geometry),
      referencia: feature.attributes.REFERENCIA || undefined,
    }));
  } catch (error) {
    console.error('Error fetching faults:', error);
    return [];
  }
}

/**
 * Fetch active volcanoes in Chile
 */
export async function fetchVolcanoes(
  bounds?: BoundingBox
): Promise<Volcano[]> {
  try {
    const params = new URLSearchParams({
      f: 'json',
      where: '1=1',
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326',
    });

    if (bounds) {
      params.set('geometry', `${bounds.minX},${bounds.minY},${bounds.maxX},${bounds.maxY}`);
      params.set('geometryType', 'esriGeometryEnvelope');
      params.set('spatialRel', 'esriSpatialRelIntersects');
      params.set('inSR', '4326');
    }

    const response = await fetch(`${SERVICES.volcanes}/0/query?${params}`);

    if (!response.ok) {
      return getStaticVolcanoList(bounds);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return getStaticVolcanoList(bounds);
    }

    return data.features.map((feature: any) => ({
      id: feature.attributes.OBJECTID?.toString() || '',
      nombre: feature.attributes.NOMBRE || '',
      tipo: mapVolcanoType(feature.attributes.TIPO),
      altitud: feature.attributes.ALTITUD || feature.attributes.ALTURA || 0,
      estado: mapVolcanoStatus(feature.attributes.ESTADO),
      ultimaErupcion: feature.attributes.ULT_ERUPCION || undefined,
      indiceExplosividad: feature.attributes.VEI || undefined,
      nivelAlerta: mapAlertLevel(feature.attributes.NIVEL_ALERTA),
      latitud: feature.geometry?.y || 0,
      longitud: feature.geometry?.x || 0,
      region: feature.attributes.REGION || '',
    }));
  } catch (error) {
    console.error('Error fetching volcanoes:', error);
    return getStaticVolcanoList(bounds);
  }
}

/**
 * Fetch landslide susceptibility zones
 */
export async function fetchLandslideZones(
  bounds: BoundingBox
): Promise<LandslideZone[]> {
  try {
    const bbox = `${bounds.minX},${bounds.minY},${bounds.maxX},${bounds.maxY}`;

    const params = new URLSearchParams({
      f: 'json',
      geometry: bbox,
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: '*',
      returnGeometry: 'true',
      inSR: '4326',
      outSR: '4326',
    });

    const response = await fetch(`${SERVICES.remocionesMasa}/0/query?${params}`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature: any) => ({
      id: feature.attributes.OBJECTID?.toString() || '',
      tipo: mapLandslideType(feature.attributes.TIPO),
      susceptibilidad: mapSusceptibility(feature.attributes.SUSCEPTIBILIDAD),
      factores: parseFactors(feature.attributes.FACTORES),
      geometry: esriToGeoJSON(feature.geometry),
    }));
  } catch (error) {
    console.error('Error fetching landslide zones:', error);
    return [];
  }
}

/**
 * Get seismic zone for a location (NCh433)
 */
export function getSeismicZone(lat: number, lon: number): SeismicZone {
  // Chile seismic zonification (simplified)
  // Zone 1: Low seismicity (interior)
  // Zone 2: Moderate seismicity
  // Zone 3: High seismicity (coast)

  // Approximate based on distance from coast
  // This is simplified - actual zonification uses specific boundaries

  // Most of Chile's populated areas are Zone 2 or 3
  let zona: 1 | 2 | 3;

  // Rough approximation based on longitude
  if (lon > -70.0) {
    zona = 1; // Interior (eastern Chile)
  } else if (lon > -71.5) {
    zona = 2; // Central valley
  } else {
    zona = 3; // Coast
  }

  // Base acceleration (NCh433:2009)
  const aceleracionBase = zona === 1 ? 0.20 : zona === 2 ? 0.30 : 0.40;

  // Soil factors (Table 6.3 NCh433)
  const factorSuelo = {
    A: zona === 1 ? 0.90 : zona === 2 ? 0.90 : 0.80,
    B: zona === 1 ? 1.00 : zona === 2 ? 1.00 : 1.00,
    C: zona === 1 ? 1.05 : zona === 2 ? 1.05 : 1.05,
    D: zona === 1 ? 1.20 : zona === 2 ? 1.20 : 1.20,
    E: zona === 1 ? 1.30 : zona === 2 ? 1.30 : 1.30,
  };

  return { zona, aceleracionBase, factorSuelo };
}

/**
 * Fetch mining claims and deposits
 */
export async function fetchMiningData(
  bounds: BoundingBox
): Promise<{
  depositos: MineralDeposit[];
  pasivosAmbientales: Array<{ id: string; nombre: string; tipo: string; lat: number; lon: number }>;
}> {
  const depositos: MineralDeposit[] = [];
  const pasivosAmbientales: Array<{ id: string; nombre: string; tipo: string; lat: number; lon: number }> = [];

  try {
    const bbox = `${bounds.minX},${bounds.minY},${bounds.maxX},${bounds.maxY}`;
    const baseParams = {
      f: 'json',
      geometry: bbox,
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: '*',
      returnGeometry: 'true',
      inSR: '4326',
      outSR: '4326',
    };

    // Fetch environmental liabilities (pasivos ambientales mineros)
    const pasivosRes = await fetch(`${SERVICES.pasivosMineros}/0/query?${new URLSearchParams(baseParams)}`);
    if (pasivosRes.ok) {
      const data = await pasivosRes.json();
      if (data.features) {
        for (const feature of data.features) {
          pasivosAmbientales.push({
            id: feature.attributes.OBJECTID?.toString() || '',
            nombre: feature.attributes.NOMBRE || 'Sin nombre',
            tipo: feature.attributes.TIPO || 'Desconocido',
            lat: feature.geometry?.y || 0,
            lon: feature.geometry?.x || 0,
          });
        }
      }
    }
  } catch (error) {
    console.error('Error fetching mining data:', error);
  }

  return { depositos, pasivosAmbientales };
}

// ============================================================================
// Helper Functions
// ============================================================================

function esriToGeoJSON(geometry: any): GeoJSON.Polygon | GeoJSON.MultiPolygon {
  if (!geometry) {
    return { type: 'Polygon', coordinates: [] };
  }

  if (geometry.rings) {
    if (geometry.rings.length === 1) {
      return {
        type: 'Polygon',
        coordinates: geometry.rings,
      };
    } else {
      return {
        type: 'MultiPolygon',
        coordinates: geometry.rings.map((ring: any) => [ring]),
      };
    }
  }

  return { type: 'Polygon', coordinates: [] };
}

function esriToGeoJSONLine(geometry: any): GeoJSON.LineString | GeoJSON.MultiLineString {
  if (!geometry) {
    return { type: 'LineString', coordinates: [] };
  }

  if (geometry.paths) {
    if (geometry.paths.length === 1) {
      return {
        type: 'LineString',
        coordinates: geometry.paths[0],
      };
    } else {
      return {
        type: 'MultiLineString',
        coordinates: geometry.paths,
      };
    }
  }

  return { type: 'LineString', coordinates: [] };
}

function mapFaultType(tipo: string | undefined): Fault['tipo'] {
  if (!tipo) return 'indeterminada';
  const lower = tipo.toLowerCase();
  if (lower.includes('normal')) return 'normal';
  if (lower.includes('inversa') || lower.includes('thrust')) return 'inversa';
  if (lower.includes('transcurrente') || lower.includes('strike')) return 'transcurrente';
  return 'indeterminada';
}

function mapFaultActivity(actividad: string | undefined): Fault['actividad'] {
  if (!actividad) return 'sin_datos';
  const lower = actividad.toLowerCase();
  if (lower.includes('activa') && !lower.includes('potencial')) return 'activa';
  if (lower.includes('potencial')) return 'potencialmente_activa';
  if (lower.includes('inactiva')) return 'inactiva';
  return 'sin_datos';
}

function mapVolcanoType(tipo: string | undefined): Volcano['tipo'] {
  if (!tipo) return 'estratovolcan';
  const lower = tipo.toLowerCase();
  if (lower.includes('caldera')) return 'caldera';
  if (lower.includes('domo')) return 'domo';
  if (lower.includes('cono')) return 'cono';
  if (lower.includes('campo')) return 'campo_volcanico';
  return 'estratovolcan';
}

function mapVolcanoStatus(estado: string | undefined): Volcano['estado'] {
  if (!estado) return 'latente';
  const lower = estado.toLowerCase();
  if (lower.includes('activo')) return 'activo';
  if (lower.includes('dormido')) return 'dormido';
  if (lower.includes('extinto')) return 'extinto';
  return 'latente';
}

function mapAlertLevel(nivel: string | undefined): Volcano['nivelAlerta'] {
  if (!nivel) return undefined;
  const lower = nivel.toLowerCase();
  if (lower.includes('rojo')) return 'rojo';
  if (lower.includes('naranja')) return 'naranja';
  if (lower.includes('amarillo')) return 'amarillo';
  return 'verde';
}

function mapLandslideType(tipo: string | undefined): LandslideZone['tipo'] {
  if (!tipo) return 'remocion_masa';
  const lower = tipo.toLowerCase();
  if (lower.includes('flujo') || lower.includes('debris')) return 'flujo_detritos';
  if (lower.includes('deslizamiento') || lower.includes('slide')) return 'deslizamiento';
  if (lower.includes('caida') || lower.includes('rock')) return 'caida_rocas';
  return 'remocion_masa';
}

function mapSusceptibility(susc: string | number | undefined): LandslideZone['susceptibilidad'] {
  if (typeof susc === 'number') {
    if (susc <= 1) return 'muy_baja';
    if (susc <= 2) return 'baja';
    if (susc <= 3) return 'media';
    if (susc <= 4) return 'alta';
    return 'muy_alta';
  }

  if (!susc) return 'media';
  const lower = susc.toString().toLowerCase();
  if (lower.includes('muy alta') || lower.includes('very high')) return 'muy_alta';
  if (lower.includes('alta') || lower.includes('high')) return 'alta';
  if (lower.includes('media') || lower.includes('moderate')) return 'media';
  if (lower.includes('muy baja') || lower.includes('very low')) return 'muy_baja';
  if (lower.includes('baja') || lower.includes('low')) return 'baja';
  return 'media';
}

function parseFactors(factors: string | undefined): string[] {
  if (!factors) return [];
  return factors.split(/[,;]/).map(f => f.trim()).filter(Boolean);
}

/**
 * Static list of major Chilean volcanoes (fallback)
 */
function getStaticVolcanoList(bounds?: BoundingBox): Volcano[] {
  const volcanoes: Volcano[] = [
    { id: '1', nombre: 'Villarrica', tipo: 'estratovolcan', altitud: 2847, estado: 'activo', latitud: -39.42, longitud: -71.93, region: 'La Araucanía', nivelAlerta: 'amarillo' },
    { id: '2', nombre: 'Llaima', tipo: 'estratovolcan', altitud: 3125, estado: 'activo', latitud: -38.69, longitud: -71.73, region: 'La Araucanía', nivelAlerta: 'verde' },
    { id: '3', nombre: 'Chaitén', tipo: 'caldera', altitud: 1122, estado: 'activo', latitud: -42.83, longitud: -72.65, region: 'Los Lagos', nivelAlerta: 'verde' },
    { id: '4', nombre: 'Calbuco', tipo: 'estratovolcan', altitud: 2003, estado: 'activo', latitud: -41.33, longitud: -72.61, region: 'Los Lagos', nivelAlerta: 'verde' },
    { id: '5', nombre: 'Osorno', tipo: 'estratovolcan', altitud: 2652, estado: 'latente', latitud: -41.10, longitud: -72.49, region: 'Los Lagos', nivelAlerta: 'verde' },
    { id: '6', nombre: 'Puyehue-Cordón Caulle', tipo: 'campo_volcanico', altitud: 2236, estado: 'activo', latitud: -40.59, longitud: -72.12, region: 'Los Ríos', nivelAlerta: 'verde' },
    { id: '7', nombre: 'Lonquimay', tipo: 'estratovolcan', altitud: 2865, estado: 'activo', latitud: -38.38, longitud: -71.58, region: 'La Araucanía', nivelAlerta: 'verde' },
    { id: '8', nombre: 'Copahue', tipo: 'estratovolcan', altitud: 2965, estado: 'activo', latitud: -37.85, longitud: -71.17, region: 'Biobío', nivelAlerta: 'amarillo' },
    { id: '9', nombre: 'Nevados de Chillán', tipo: 'campo_volcanico', altitud: 3212, estado: 'activo', latitud: -36.86, longitud: -71.38, region: 'Ñuble', nivelAlerta: 'amarillo' },
    { id: '10', nombre: 'Laguna del Maule', tipo: 'caldera', altitud: 2160, estado: 'latente', latitud: -36.02, longitud: -70.49, region: 'Maule', nivelAlerta: 'verde' },
  ];

  if (!bounds) return volcanoes;

  return volcanoes.filter(v =>
    v.latitud >= bounds.minY &&
    v.latitud <= bounds.maxY &&
    v.longitud >= bounds.minX &&
    v.longitud <= bounds.maxX
  );
}

// ============================================================================
// Analysis Functions
// ============================================================================

export interface GeologicalRiskAssessment {
  seismicZone: SeismicZone;
  faultsNearby: Fault[];
  volcanoesNearby: Volcano[];
  landslideRisk: LandslideZone['susceptibilidad'];
  overallRisk: 'bajo' | 'moderado' | 'alto' | 'muy_alto';
  recommendations: string[];
}

/**
 * Assess geological risks for a project area
 */
export async function assessGeologicalRisks(
  bounds: BoundingBox,
  centerLat: number,
  centerLon: number
): Promise<GeologicalRiskAssessment> {
  const [faults, volcanoes, landslides] = await Promise.all([
    fetchFaults(bounds),
    fetchVolcanoes(bounds),
    fetchLandslideZones(bounds),
  ]);

  const seismicZone = getSeismicZone(centerLat, centerLon);
  const recommendations: string[] = [];
  let overallRisk: GeologicalRiskAssessment['overallRisk'] = 'bajo';

  // Seismic analysis
  if (seismicZone.zona === 3) {
    recommendations.push('Zona sísmica 3 (alta sismicidad). Diseño estructural debe cumplir NCh433.');
    overallRisk = 'moderado';
  }

  // Fault analysis
  const activeFaults = faults.filter(f => f.actividad === 'activa');
  if (activeFaults.length > 0) {
    recommendations.push(`${activeFaults.length} falla(s) activa(s) en el área. Realizar estudio de paleosismicidad.`);
    overallRisk = 'alto';
  }

  // Volcano analysis
  const alertVolcanoes = volcanoes.filter(v => v.nivelAlerta && v.nivelAlerta !== 'verde');
  if (alertVolcanoes.length > 0) {
    recommendations.push(`${alertVolcanoes.length} volcán(es) con alerta activa: ${alertVolcanoes.map(v => v.nombre).join(', ')}`);
    overallRisk = 'alto';
  }

  // Landslide analysis
  let maxLandslideRisk: LandslideZone['susceptibilidad'] = 'muy_baja';
  for (const zone of landslides) {
    if (compareSusceptibility(zone.susceptibilidad, maxLandslideRisk) > 0) {
      maxLandslideRisk = zone.susceptibilidad;
    }
  }

  if (maxLandslideRisk === 'alta' || maxLandslideRisk === 'muy_alta') {
    recommendations.push(`Susceptibilidad ${maxLandslideRisk} a remociones en masa. Requiere estudio geotécnico.`);
    overallRisk = maxLandslideRisk === 'muy_alta' ? 'muy_alto' : 'alto';
  }

  // Nearby active volcanoes (expand search)
  if (volcanoes.length === 0) {
    const expandedBounds: BoundingBox = {
      minX: bounds.minX - 1,
      maxX: bounds.maxX + 1,
      minY: bounds.minY - 1,
      maxY: bounds.maxY + 1,
      minZ: 0,
      maxZ: 0,
    };
    const nearbyVolcanoes = await fetchVolcanoes(expandedBounds);
    if (nearbyVolcanoes.some(v => v.nivelAlerta && v.nivelAlerta !== 'verde')) {
      recommendations.push('Volcán con alerta activa dentro de 100km. Considerar planes de evacuación.');
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Sin riesgos geológicos significativos identificados.');
  }

  return {
    seismicZone,
    faultsNearby: faults,
    volcanoesNearby: volcanoes,
    landslideRisk: maxLandslideRisk,
    overallRisk,
    recommendations,
  };
}

function compareSusceptibility(a: LandslideZone['susceptibilidad'], b: LandslideZone['susceptibilidad']): number {
  const order = ['muy_baja', 'baja', 'media', 'alta', 'muy_alta'];
  return order.indexOf(a) - order.indexOf(b);
}
