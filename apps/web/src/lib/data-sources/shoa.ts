/**
 * SHOA Integration
 * Servicio Hidrográfico y Oceanográfico de la Armada - Chile
 *
 * Provides tidal data, tsunami hazard zones, coastal elevation,
 * and nautical chart information.
 */

import type { BoundingBox } from '../triangulation/types';

// ============================================================================
// Types
// ============================================================================

export interface TideStation {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  region: string;
  tipoMarea: 'semidiurna' | 'diurna' | 'mixta';
  nivelReferencia: string;
  datosDisponibles: boolean;
}

export interface TidePrediction {
  estacion: string;
  fecha: string;
  predicciones: Array<{
    hora: string;
    altura: number; // meters above reference
    tipo: 'pleamar' | 'bajamar' | 'intermedio';
  }>;
  nivelMedio: number;
  pleamarMaxima: number;
  bajamarMinima: number;
}

export interface TidalDatum {
  estacion: string;
  NRS: number;    // Nivel de Reducción de Sondas
  MLLW: number;   // Mean Lower Low Water
  MLW: number;    // Mean Low Water
  MSL: number;    // Mean Sea Level
  MHW: number;    // Mean High Water
  MHHW: number;   // Mean Higher High Water
  HAT: number;    // Highest Astronomical Tide
  LAT: number;    // Lowest Astronomical Tide
}

export interface TsunamiHazardZone {
  id: string;
  nivel: 'inundacion' | 'seguridad' | 'evacuacion';
  cotaMaxima: number; // Maximum flooding elevation (m)
  tiempoLlegada?: number; // Minutes from earthquake
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface CoastalErosionZone {
  id: string;
  riesgo: 'bajo' | 'medio' | 'alto' | 'muy_alto';
  tasaRetroceso?: number; // m/year
  causas: string[];
  geometry: GeoJSON.LineString | GeoJSON.Polygon;
}

export interface PortInfo {
  id: string;
  nombre: string;
  tipo: 'comercial' | 'pesquero' | 'deportivo' | 'militar';
  latitud: number;
  longitud: number;
  calado: number; // Draft in meters
  muelles: number;
}

// ============================================================================
// API Configuration
// ============================================================================

// SHOA doesn't have a public REST API, but data can be accessed through:
// 1. SHOA Tablas de Marea (PDF/static)
// 2. ONEMI/SENAPRED hazard maps
// 3. IDE Chile tsunami layers

const ONEMI_TSUNAMI_URL = 'https://ide.onemi.gov.cl/geoserver';
const IDE_SHOA_URL = 'https://geoportal.shoa.cl/geoserver';

// Tide stations database (official SHOA stations)
export const TIDE_STATIONS: TideStation[] = [
  { id: 'AR', nombre: 'Arica', latitud: -18.4746, longitud: -70.3230, region: 'Arica y Parinacota', tipoMarea: 'semidiurna', nivelReferencia: 'NRS SHOA', datosDisponibles: true },
  { id: 'IQ', nombre: 'Iquique', latitud: -20.2132, longitud: -70.1519, region: 'Tarapacá', tipoMarea: 'semidiurna', nivelReferencia: 'NRS SHOA', datosDisponibles: true },
  { id: 'AN', nombre: 'Antofagasta', latitud: -23.6509, longitud: -70.4028, region: 'Antofagasta', tipoMarea: 'semidiurna', nivelReferencia: 'NRS SHOA', datosDisponibles: true },
  { id: 'CQ', nombre: 'Coquimbo', latitud: -29.9533, longitud: -71.3436, region: 'Coquimbo', tipoMarea: 'semidiurna', nivelReferencia: 'NRS SHOA', datosDisponibles: true },
  { id: 'VA', nombre: 'Valparaíso', latitud: -33.0246, longitud: -71.6263, region: 'Valparaíso', tipoMarea: 'semidiurna', nivelReferencia: 'NRS SHOA', datosDisponibles: true },
  { id: 'SA', nombre: 'San Antonio', latitud: -33.5920, longitud: -71.6177, region: 'Valparaíso', tipoMarea: 'semidiurna', nivelReferencia: 'NRS SHOA', datosDisponibles: true },
  { id: 'TC', nombre: 'Talcahuano', latitud: -36.7142, longitud: -73.1087, region: 'Biobío', tipoMarea: 'semidiurna', nivelReferencia: 'NRS SHOA', datosDisponibles: true },
  { id: 'CO', nombre: 'Corral', latitud: -39.8696, longitud: -73.4334, region: 'Los Ríos', tipoMarea: 'semidiurna', nivelReferencia: 'NRS SHOA', datosDisponibles: true },
  { id: 'PM', nombre: 'Puerto Montt', latitud: -41.4693, longitud: -72.9424, region: 'Los Lagos', tipoMarea: 'mixta', nivelReferencia: 'NRS SHOA', datosDisponibles: true },
  { id: 'CH', nombre: 'Chacabuco', latitud: -45.4655, longitud: -72.8308, region: 'Aysén', tipoMarea: 'mixta', nivelReferencia: 'NRS SHOA', datosDisponibles: true },
  { id: 'PA', nombre: 'Punta Arenas', latitud: -53.1638, longitud: -70.9171, region: 'Magallanes', tipoMarea: 'semidiurna', nivelReferencia: 'NRS SHOA', datosDisponibles: true },
  { id: 'PW', nombre: 'Puerto Williams', latitud: -54.9333, longitud: -67.6167, region: 'Magallanes', tipoMarea: 'semidiurna', nivelReferencia: 'NRS SHOA', datosDisponibles: true },
  { id: 'IP', nombre: 'Isla de Pascua', latitud: -27.1500, longitud: -109.4333, region: 'Valparaíso', tipoMarea: 'semidiurna', nivelReferencia: 'NRS SHOA', datosDisponibles: true },
  { id: 'JF', nombre: 'Juan Fernández', latitud: -33.6167, longitud: -78.8333, region: 'Valparaíso', tipoMarea: 'semidiurna', nivelReferencia: 'NRS SHOA', datosDisponibles: true },
];

// Tidal datums for major ports (meters relative to NRS)
const TIDAL_DATUMS: Record<string, TidalDatum> = {
  'VA': { estacion: 'Valparaíso', NRS: 0, LAT: 0.02, MLLW: 0.15, MLW: 0.35, MSL: 0.81, MHW: 1.27, MHHW: 1.47, HAT: 1.85 },
  'SA': { estacion: 'San Antonio', NRS: 0, LAT: 0.01, MLLW: 0.14, MLW: 0.34, MSL: 0.79, MHW: 1.24, MHHW: 1.44, HAT: 1.82 },
  'TC': { estacion: 'Talcahuano', NRS: 0, LAT: 0.03, MLLW: 0.16, MLW: 0.38, MSL: 0.89, MHW: 1.40, MHHW: 1.62, HAT: 2.05 },
  'PM': { estacion: 'Puerto Montt', NRS: 0, LAT: 0.10, MLLW: 0.85, MLW: 1.55, MSL: 3.45, MHW: 5.35, MHHW: 6.05, HAT: 7.30 },
  'PA': { estacion: 'Punta Arenas', NRS: 0, LAT: 0.05, MLLW: 0.25, MLW: 0.45, MSL: 0.73, MHW: 1.01, MHHW: 1.21, HAT: 1.55 },
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Find nearest tide station to a location
 */
export function findNearestTideStation(lat: number, lon: number): TideStation | null {
  let nearest: TideStation | null = null;
  let minDistance = Infinity;

  for (const station of TIDE_STATIONS) {
    const distance = haversineDistance(lat, lon, station.latitud, station.longitud);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  }

  return nearest;
}

/**
 * Get all tide stations within a radius (km)
 */
export function getTideStationsInRadius(
  lat: number,
  lon: number,
  radiusKm: number
): TideStation[] {
  return TIDE_STATIONS.filter(station => {
    const distance = haversineDistance(lat, lon, station.latitud, station.longitud);
    return distance <= radiusKm;
  });
}

/**
 * Get tidal datums for a station
 */
export function getTidalDatums(stationId: string): TidalDatum | null {
  return TIDAL_DATUMS[stationId] || null;
}

/**
 * Estimate tidal range for a location
 */
export function estimateTidalRange(lat: number, lon: number): {
  rangoMedio: number;
  rangoMaximo: number;
  tipoMarea: 'micro' | 'meso' | 'macro';
  estacionReferencia: string;
} {
  const station = findNearestTideStation(lat, lon);

  if (!station) {
    return {
      rangoMedio: 1.5,
      rangoMaximo: 2.0,
      tipoMarea: 'micro',
      estacionReferencia: 'Estimado',
    };
  }

  const datums = TIDAL_DATUMS[station.id];

  if (datums) {
    const rangoMedio = datums.MHW - datums.MLW;
    const rangoMaximo = datums.HAT - datums.LAT;

    let tipoMarea: 'micro' | 'meso' | 'macro';
    if (rangoMedio < 2) tipoMarea = 'micro';
    else if (rangoMedio < 4) tipoMarea = 'meso';
    else tipoMarea = 'macro';

    return {
      rangoMedio,
      rangoMaximo,
      tipoMarea,
      estacionReferencia: station.nombre,
    };
  }

  // Estimate based on latitude (Chilean coast patterns)
  let rangoMedio: number;
  let rangoMaximo: number;

  if (lat > -35) {
    // Northern-Central Chile - micro tidal
    rangoMedio = 1.3;
    rangoMaximo = 1.8;
  } else if (lat > -42) {
    // Central-South Chile - meso tidal
    rangoMedio = 1.8;
    rangoMaximo = 2.5;
  } else if (lat > -47) {
    // Channels region - macro tidal
    rangoMedio = 5.0;
    rangoMaximo = 7.5;
  } else {
    // Austral region
    rangoMedio = 1.5;
    rangoMaximo = 2.0;
  }

  return {
    rangoMedio,
    rangoMaximo,
    tipoMarea: rangoMedio < 2 ? 'micro' : rangoMedio < 4 ? 'meso' : 'macro',
    estacionReferencia: station.nombre,
  };
}

/**
 * Fetch tsunami hazard zones from ONEMI/SENAPRED
 */
export async function fetchTsunamiZones(
  bounds: BoundingBox
): Promise<TsunamiHazardZone[]> {
  try {
    const bbox = `${bounds.minY},${bounds.minX},${bounds.maxY},${bounds.maxX}`;

    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'tsunami:zona_inundacion',
      bbox,
      srsName: 'EPSG:4326',
      outputFormat: 'application/json',
    });

    const response = await fetch(`${ONEMI_TSUNAMI_URL}/wfs?${params}`);

    if (!response.ok) {
      // Return estimated tsunami zone based on elevation
      return estimateTsunamiZone(bounds);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return estimateTsunamiZone(bounds);
    }

    return data.features.map((feature: any) => ({
      id: feature.id || '',
      nivel: mapTsunamiLevel(feature.properties?.NIVEL),
      cotaMaxima: feature.properties?.COTA_MAX || feature.properties?.ALTURA || 30,
      tiempoLlegada: feature.properties?.TIEMPO_LLEGADA || undefined,
      geometry: feature.geometry,
    }));
  } catch (error) {
    console.error('Error fetching tsunami zones:', error);
    return estimateTsunamiZone(bounds);
  }
}

/**
 * Check if a point is in a tsunami hazard zone
 */
export async function checkTsunamiRisk(
  lat: number,
  lon: number,
  elevation?: number
): Promise<{
  enZonaRiesgo: boolean;
  cotaSegura: number;
  distanciaCosta: number;
  tiempoEvacuacion?: number;
  recomendaciones: string[];
}> {
  const recomendaciones: string[] = [];

  // Estimate distance to coast (rough approximation)
  const distanciaCosta = estimateDistanceToCoast(lat, lon);

  // Default safe elevation for Chile (varies by region)
  // Northern Chile: ~30m, Central Chile: ~20-25m, Southern Chile: ~15-20m
  let cotaSegura = 30;
  if (lat < -38) cotaSegura = 20;
  if (lat < -45) cotaSegura = 15;

  const enZonaRiesgo = distanciaCosta < 5 && (!elevation || elevation < cotaSegura);

  if (enZonaRiesgo) {
    recomendaciones.push(`Ubicación dentro de zona de inundación por tsunami (cota < ${cotaSegura}m)`);
    recomendaciones.push('Conocer rutas de evacuación hacia zonas altas');
    recomendaciones.push('Tiempo de evacuación estimado: 15-20 minutos después de sismo fuerte');

    if (distanciaCosta < 1) {
      recomendaciones.push('CRÍTICO: A menos de 1km de la costa - alto riesgo de tsunami');
    }
  } else if (distanciaCosta < 10) {
    recomendaciones.push('Zona costera - mantenerse informado sobre alertas de tsunami');
  }

  return {
    enZonaRiesgo,
    cotaSegura,
    distanciaCosta,
    tiempoEvacuacion: enZonaRiesgo ? 20 : undefined,
    recomendaciones,
  };
}

/**
 * Get storm surge estimates for coastal design
 */
export function estimateStormSurge(
  lat: number,
  returnPeriod: number = 100
): {
  sobreelevacion: number; // meters
  oleaje: number; // significant wave height
  periodo: number; // wave period
  direccion: string;
} {
  // Storm surge estimates for Chilean coast
  // These are approximations - actual values require detailed studies

  let sobreelevacion: number;
  let oleaje: number;
  let periodo: number;
  let direccion: string;

  if (lat > -30) {
    // Northern Chile - lower storm surge
    sobreelevacion = returnPeriod >= 100 ? 0.8 : 0.5;
    oleaje = returnPeriod >= 100 ? 5.0 : 3.5;
    periodo = 14;
    direccion = 'SW';
  } else if (lat > -40) {
    // Central Chile
    sobreelevacion = returnPeriod >= 100 ? 1.2 : 0.8;
    oleaje = returnPeriod >= 100 ? 7.0 : 5.0;
    periodo = 16;
    direccion = 'W-SW';
  } else {
    // Southern Chile - higher storm surge
    sobreelevacion = returnPeriod >= 100 ? 1.5 : 1.0;
    oleaje = returnPeriod >= 100 ? 9.0 : 6.5;
    periodo = 18;
    direccion = 'W-NW';
  }

  return {
    sobreelevacion,
    oleaje,
    periodo,
    direccion,
  };
}

/**
 * Calculate design water level for coastal structures
 */
export function calculateDesignWaterLevel(
  lat: number,
  lon: number,
  returnPeriod: number = 100,
  includeTsunami: boolean = false
): {
  nivelDiseno: number; // meters above NRS
  componentes: {
    marea: number;
    stormSurge: number;
    oleaje: number;
    tsunami?: number;
    cambioClimatico: number;
  };
  recomendaciones: string[];
} {
  const tidalRange = estimateTidalRange(lat, lon);
  const stormSurge = estimateStormSurge(lat, returnPeriod);
  const recomendaciones: string[] = [];

  // Components
  const marea = tidalRange.rangoMaximo / 2 + 0.3; // MHHW + margin
  const stormSurgeValue = stormSurge.sobreelevacion;
  const oleajeRunup = stormSurge.oleaje * 0.3; // Simplified runup estimate
  const cambioClimatico = 0.5; // Sea level rise to 2100 (conservative)

  let tsunami = 0;
  if (includeTsunami) {
    // Simplified tsunami runup based on location
    tsunami = lat > -35 ? 8 : lat > -42 ? 6 : 4;
    recomendaciones.push(`Componente tsunami basado en estudios regionales (${tsunami}m)`);
  }

  const nivelDiseno = marea + stormSurgeValue + oleajeRunup + cambioClimatico + (includeTsunami ? tsunami : 0);

  recomendaciones.push(`Período de retorno: ${returnPeriod} años`);
  recomendaciones.push(`Estación de referencia mareal: ${tidalRange.estacionReferencia}`);
  recomendaciones.push('Incluye proyección de cambio climático a 2100');

  if (!includeTsunami) {
    recomendaciones.push('NOTA: No incluye componente de tsunami - evaluar según uso de estructura');
  }

  return {
    nivelDiseno,
    componentes: {
      marea,
      stormSurge: stormSurgeValue,
      oleaje: oleajeRunup,
      tsunami: includeTsunami ? tsunami : undefined,
      cambioClimatico,
    },
    recomendaciones,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function mapTsunamiLevel(nivel: string | undefined): TsunamiHazardZone['nivel'] {
  if (!nivel) return 'inundacion';
  const lower = nivel.toLowerCase();
  if (lower.includes('seguridad') || lower.includes('safe')) return 'seguridad';
  if (lower.includes('evacuacion') || lower.includes('evacuation')) return 'evacuacion';
  return 'inundacion';
}

function estimateTsunamiZone(bounds: BoundingBox): TsunamiHazardZone[] {
  // Create estimated tsunami zone based on typical Chilean coast patterns
  // Most coastal areas below 30m are considered at risk

  return [{
    id: 'estimated_tsunami_zone',
    nivel: 'inundacion',
    cotaMaxima: 30,
    tiempoLlegada: 20, // Average for near-field tsunami
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

function estimateDistanceToCoast(lat: number, lon: number): number {
  // Rough estimate based on Chilean coastline
  // The coast roughly follows longitude -71 to -73 depending on latitude

  let coastLon: number;

  if (lat > -30) {
    coastLon = -70.5;
  } else if (lat > -35) {
    coastLon = -71.5;
  } else if (lat > -42) {
    coastLon = -73.0;
  } else {
    coastLon = -73.5;
  }

  // Simple east-west distance
  const distanceDegrees = Math.abs(lon - coastLon);
  const distanceKm = distanceDegrees * 111 * Math.cos(lat * Math.PI / 180);

  return Math.max(0, distanceKm);
}

