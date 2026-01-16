/**
 * CONAF Integration
 * Corporación Nacional Forestal - Chile
 *
 * Provides vegetation data, forest types, protected areas (SNASPE),
 * fire history, and land use data.
 */

import type { BoundingBox } from '../hydrology/copernicus-flood';

// ============================================================================
// Types
// ============================================================================

export interface VegetationUnit {
  id: string;
  tipo: string;
  formacion: 'bosque_nativo' | 'plantacion' | 'matorral' | 'pradera' | 'humedal' | 'sin_vegetacion';
  cobertura: number; // percentage
  especies: string[];
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface ProtectedArea {
  id: string;
  nombre: string;
  categoria: 'parque_nacional' | 'reserva_nacional' | 'monumento_natural' | 'santuario_naturaleza' | 'reserva_biosfera';
  superficie: number; // hectares
  region: string;
  fechaCreacion?: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface FireEvent {
  id: string;
  fecha: string;
  superficie: number; // hectares
  causa?: 'intencional' | 'negligencia' | 'natural' | 'desconocida';
  tipoVegetacion?: string;
  comuna: string;
  region: string;
  geometry?: GeoJSON.Polygon | GeoJSON.Point;
}

export interface FireRiskZone {
  nivel: 'bajo' | 'moderado' | 'alto' | 'muy_alto' | 'extremo';
  factores: string[];
  temporadaAlta: string[]; // months
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface LandUse {
  id: string;
  uso: 'agricola' | 'forestal' | 'urbano' | 'industrial' | 'minero' | 'humedal' | 'cuerpo_agua' | 'sin_uso';
  subtipo?: string;
  superficie: number; // hectares
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface NativeForest {
  id: string;
  tipoForestal: string;
  estadoConservacion: 'primario' | 'secundario' | 'degradado' | 'en_regeneracion';
  especieDominante: string;
  coberturaDosel: number; // percentage
  alturaPromedio?: number; // meters
  edad?: 'joven' | 'maduro' | 'sobremaduor';
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

// ============================================================================
// API Configuration
// ============================================================================

// CONAF GeoPortal and IDE Chile services
const CONAF_BASE = 'https://ide.conaf.cl/geoserver';
const IDE_MOP_BASE = 'https://rest-sit.mop.gob.cl/arcgis/rest/services';

const SERVICES = {
  // Vegetation cover (Catastro Vegetacional)
  catastroVegetacional: `${CONAF_BASE}/catastro/wfs`,

  // SNASPE (Protected Areas) - via IDE MOP
  snaspe: `${IDE_MOP_BASE}/MAPA_BASE/SNASPE/MapServer`,

  // Fire data
  incendios: `${CONAF_BASE}/incendios/wfs`,

  // Land use
  usoDeSuelo: `${CONAF_BASE}/uso_suelo/wfs`,

  // Native forest
  bosqueNativo: `${CONAF_BASE}/bosque_nativo/wfs`,
};

// Alternative NASA FIRMS for active fires
const NASA_FIRMS_URL = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Fetch protected areas (SNASPE) for an area
 */
export async function fetchProtectedAreas(
  bounds: BoundingBox
): Promise<ProtectedArea[]> {
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

    const response = await fetch(`${SERVICES.snaspe}/0/query?${params}`);

    if (!response.ok) {
      console.warn('SNASPE fetch failed:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature: any) => ({
      id: feature.attributes.OBJECTID?.toString() || '',
      nombre: feature.attributes.NOMBRE || feature.attributes.NOM_ASP || '',
      categoria: mapProtectedCategory(feature.attributes.CATEGORIA || feature.attributes.CAT_ASP),
      superficie: feature.attributes.SUPERFICIE || feature.attributes.SUP_HA || 0,
      region: feature.attributes.REGION || feature.attributes.NOM_REGION || '',
      fechaCreacion: feature.attributes.FECHA_CREACION || undefined,
      geometry: esriToGeoJSON(feature.geometry),
    }));
  } catch (error) {
    console.error('Error fetching protected areas:', error);
    return [];
  }
}

/**
 * Fetch vegetation data using WFS
 */
export async function fetchVegetation(
  bounds: BoundingBox
): Promise<VegetationUnit[]> {
  try {
    // Try WFS request
    const bbox = `${bounds.minY},${bounds.minX},${bounds.maxY},${bounds.maxX}`;

    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'catastro:vegetacion',
      bbox,
      srsName: 'EPSG:4326',
      outputFormat: 'application/json',
      count: '1000',
    });

    const response = await fetch(`${SERVICES.catastroVegetacional}?${params}`);

    if (!response.ok) {
      // Return sample vegetation classification based on coordinates
      return getEstimatedVegetation(bounds);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return getEstimatedVegetation(bounds);
    }

    return data.features.map((feature: any) => ({
      id: feature.id || '',
      tipo: feature.properties?.TIPO || feature.properties?.FORMACION || '',
      formacion: mapVegetationType(feature.properties?.FORMACION),
      cobertura: feature.properties?.COBERTURA || feature.properties?.COB || 0,
      especies: parseSpecies(feature.properties?.ESPECIES),
      geometry: feature.geometry,
    }));
  } catch (error) {
    console.error('Error fetching vegetation:', error);
    return getEstimatedVegetation(bounds);
  }
}

/**
 * Fetch active fires from NASA FIRMS (last 24-48 hours)
 */
export async function fetchActiveFires(
  bounds: BoundingBox,
  apiKey?: string
): Promise<FireEvent[]> {
  try {
    // NASA FIRMS API for VIIRS data
    const key = apiKey || process.env.NASA_FIRMS_API_KEY;

    if (!key) {
      console.log('NASA FIRMS API key not provided. Register at https://firms.modaps.eosdis.nasa.gov/api/area/');
      return [];
    }

    // Format: west,south,east,north
    const area = `${bounds.minX},${bounds.minY},${bounds.maxX},${bounds.maxY}`;

    const response = await fetch(
      `${NASA_FIRMS_URL}/${key}/VIIRS_SNPP_NRT/${area}/1`
    );

    if (!response.ok) {
      return [];
    }

    const text = await response.text();
    const lines = text.trim().split('\n');

    if (lines.length <= 1) {
      return [];
    }

    const fires: FireEvent[] = [];
    const headers = lines[0].split(',');

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const record: Record<string, string> = {};

      headers.forEach((h, idx) => {
        record[h] = values[idx];
      });

      fires.push({
        id: `FIRMS_${i}`,
        fecha: `${record.acq_date} ${record.acq_time}`,
        superficie: parseFloat(record.scan || '0') * parseFloat(record.track || '0') * 100, // Approximate
        comuna: '',
        region: '',
        geometry: {
          type: 'Point',
          coordinates: [parseFloat(record.longitude), parseFloat(record.latitude)],
        },
      });
    }

    return fires;
  } catch (error) {
    console.error('Error fetching active fires:', error);
    return [];
  }
}

/**
 * Get historical fire events (requires CONAF data or alternative)
 */
export async function fetchHistoricalFires(
  bounds: BoundingBox,
  yearStart?: number,
  yearEnd?: number
): Promise<{
  events: FireEvent[];
  totalArea: number;
  averagePerYear: number;
}> {
  // Note: Historical fire data typically requires CONAF data access
  // This returns estimated statistics based on regional patterns

  const startYear = yearStart || 2015;
  const endYear = yearEnd || new Date().getFullYear();
  const years = endYear - startYear + 1;

  // Chile fire statistics by region (approximate annual averages)
  // Based on CONAF historical data
  const regionalFireRates: Record<string, number> = {
    'Valparaíso': 15000, // ha/year average
    'O\'Higgins': 8000,
    'Maule': 20000,
    'Ñuble': 15000,
    'Biobío': 40000, // Highest fire incidence
    'La Araucanía': 25000,
    'Los Ríos': 5000,
    'Los Lagos': 3000,
    'Aysén': 1000,
    'Magallanes': 500,
    'Metropolitana': 2000,
    'Coquimbo': 3000,
    'Atacama': 100,
  };

  // Estimate based on latitude
  const centerLat = (bounds.minY + bounds.maxY) / 2;
  let estimatedRate = 5000; // Default

  if (centerLat > -30 && centerLat < -33) {
    estimatedRate = regionalFireRates['Valparaíso'] || 10000;
  } else if (centerLat >= -33 && centerLat < -36) {
    estimatedRate = regionalFireRates['O\'Higgins'] || 8000;
  } else if (centerLat >= -36 && centerLat < -38) {
    estimatedRate = regionalFireRates['Biobío'] || 40000;
  } else if (centerLat >= -38 && centerLat < -40) {
    estimatedRate = regionalFireRates['La Araucanía'] || 25000;
  } else if (centerLat >= -40 && centerLat < -43) {
    estimatedRate = regionalFireRates['Los Lagos'] || 3000;
  }

  // Scale by area fraction of region (rough estimate)
  const areaKm2 = (bounds.maxX - bounds.minX) * 111 * (bounds.maxY - bounds.minY) * 111 * Math.cos(centerLat * Math.PI / 180);
  const regionAreaKm2 = 30000; // Average region size
  const scaleFactor = Math.min(1, areaKm2 / regionAreaKm2);

  const totalArea = estimatedRate * scaleFactor * years;

  return {
    events: [], // Would need actual CONAF API access for specific events
    totalArea,
    averagePerYear: totalArea / years,
  };
}

/**
 * Assess fire risk for an area
 */
export function assessFireRisk(
  bounds: BoundingBox,
  vegetation?: VegetationUnit[],
  month?: number
): FireRiskZone {
  const centerLat = (bounds.minY + bounds.maxY) / 2;
  const currentMonth = month || new Date().getMonth() + 1;

  // Fire season in Chile is roughly December-March
  const isFireSeason = currentMonth >= 11 || currentMonth <= 3;

  let nivel: FireRiskZone['nivel'] = 'moderado';
  const factores: string[] = [];

  // Latitude-based risk (Central Chile has highest fire risk)
  if (centerLat > -38 && centerLat < -33) {
    nivel = 'alto';
    factores.push('Zona con alto historial de incendios forestales');
  }

  // Seasonal factor
  if (isFireSeason) {
    factores.push('Temporada de incendios activa (Nov-Mar)');
    if (nivel === 'moderado') nivel = 'alto';
    else if (nivel === 'alto') nivel = 'muy_alto';
  }

  // Vegetation type factor
  if (vegetation) {
    const hasPlantations = vegetation.some(v => v.formacion === 'plantacion');
    const hasNativeForest = vegetation.some(v => v.formacion === 'bosque_nativo');
    const hasShrubland = vegetation.some(v => v.formacion === 'matorral');

    if (hasPlantations) {
      factores.push('Presencia de plantaciones forestales (pino/eucalipto) - alto riesgo');
      if (nivel !== 'muy_alto') nivel = 'alto';
    }

    if (hasShrubland) {
      factores.push('Matorral presente - combustible fino');
    }

    if (hasNativeForest) {
      factores.push('Bosque nativo presente - valor de conservación');
    }
  }

  return {
    nivel,
    factores,
    temporadaAlta: ['Noviembre', 'Diciembre', 'Enero', 'Febrero', 'Marzo'],
    geometry: { type: 'Polygon', coordinates: [] }, // Would be filled with actual zone geometry
  };
}

/**
 * Fetch native forest classification
 */
export async function fetchNativeForest(
  bounds: BoundingBox
): Promise<NativeForest[]> {
  try {
    const bbox = `${bounds.minY},${bounds.minX},${bounds.maxY},${bounds.maxX}`;

    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'bosque_nativo:tipo_forestal',
      bbox,
      srsName: 'EPSG:4326',
      outputFormat: 'application/json',
      count: '500',
    });

    const response = await fetch(`${SERVICES.bosqueNativo}?${params}`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature: any) => ({
      id: feature.id || '',
      tipoForestal: feature.properties?.TIPO_FORESTAL || '',
      estadoConservacion: mapConservationStatus(feature.properties?.ESTADO),
      especieDominante: feature.properties?.ESPECIE_DOM || '',
      coberturaDosel: feature.properties?.COBERTURA || 0,
      alturaPromedio: feature.properties?.ALTURA || undefined,
      edad: mapForestAge(feature.properties?.EDAD),
      geometry: feature.geometry,
    }));
  } catch (error) {
    console.error('Error fetching native forest:', error);
    return [];
  }
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
      return { type: 'Polygon', coordinates: geometry.rings };
    } else {
      return { type: 'MultiPolygon', coordinates: geometry.rings.map((ring: any) => [ring]) };
    }
  }

  return { type: 'Polygon', coordinates: [] };
}

function mapProtectedCategory(cat: string | undefined): ProtectedArea['categoria'] {
  if (!cat) return 'reserva_nacional';
  const lower = cat.toLowerCase();
  if (lower.includes('parque') && lower.includes('nacional')) return 'parque_nacional';
  if (lower.includes('monumento')) return 'monumento_natural';
  if (lower.includes('santuario')) return 'santuario_naturaleza';
  if (lower.includes('biosfera')) return 'reserva_biosfera';
  return 'reserva_nacional';
}

function mapVegetationType(tipo: string | undefined): VegetationUnit['formacion'] {
  if (!tipo) return 'sin_vegetacion';
  const lower = tipo.toLowerCase();
  if (lower.includes('bosque') && lower.includes('nativo')) return 'bosque_nativo';
  if (lower.includes('plantacion') || lower.includes('pino') || lower.includes('eucalipto')) return 'plantacion';
  if (lower.includes('matorral') || lower.includes('arbusto')) return 'matorral';
  if (lower.includes('pradera') || lower.includes('pasto')) return 'pradera';
  if (lower.includes('humedal') || lower.includes('pantano')) return 'humedal';
  return 'sin_vegetacion';
}

function parseSpecies(especies: string | undefined): string[] {
  if (!especies) return [];
  return especies.split(/[,;]/).map(s => s.trim()).filter(Boolean);
}

function mapConservationStatus(estado: string | undefined): NativeForest['estadoConservacion'] {
  if (!estado) return 'secundario';
  const lower = estado.toLowerCase();
  if (lower.includes('primario') || lower.includes('virgen')) return 'primario';
  if (lower.includes('degradado')) return 'degradado';
  if (lower.includes('regeneracion')) return 'en_regeneracion';
  return 'secundario';
}

function mapForestAge(edad: string | number | undefined): NativeForest['edad'] {
  if (!edad) return undefined;
  if (typeof edad === 'number') {
    if (edad < 50) return 'joven';
    if (edad < 150) return 'maduro';
    return 'sobremaduor';
  }
  const lower = edad.toString().toLowerCase();
  if (lower.includes('joven')) return 'joven';
  if (lower.includes('sobremaduro') || lower.includes('viejo')) return 'sobremaduor';
  return 'maduro';
}

/**
 * Generate estimated vegetation based on location (fallback)
 */
function getEstimatedVegetation(bounds: BoundingBox): VegetationUnit[] {
  const centerLat = (bounds.minY + bounds.maxY) / 2;

  // Simplified vegetation zones for Chile
  let formacion: VegetationUnit['formacion'];
  let tipo: string;

  if (centerLat > -27) {
    // Norte Grande - Desert
    formacion = 'sin_vegetacion';
    tipo = 'Desierto';
  } else if (centerLat > -32) {
    // Norte Chico - Shrubland
    formacion = 'matorral';
    tipo = 'Matorral esclerófilo';
  } else if (centerLat > -38) {
    // Central - Mixed agriculture/plantations
    formacion = 'plantacion';
    tipo = 'Zona agrícola-forestal mixta';
  } else if (centerLat > -43) {
    // Sur - Native forest
    formacion = 'bosque_nativo';
    tipo = 'Bosque templado lluvioso';
  } else {
    // Austral - Subantarctic forest/steppe
    formacion = 'bosque_nativo';
    tipo = 'Bosque siempreverde/Estepa';
  }

  return [{
    id: 'estimated_1',
    tipo,
    formacion,
    cobertura: 50,
    especies: [],
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [bounds.minX, bounds.minY],
        [bounds.maxX, bounds.minY],
        [bounds.maxX, bounds.maxY],
        [bounds.minX, bounds.maxY],
        [bounds.minX, bounds.minY],
      ]],
    },
  }];
}

