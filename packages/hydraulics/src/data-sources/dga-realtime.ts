/**
 * DGA Real-Time Water Data Integration
 *
 * Connects to Chile's DGA (Dirección General de Aguas) real-time
 * monitoring network for stream discharge, reservoir levels, and
 * water quality data.
 */

import type { BoundingBox } from '../hydrology/copernicus-flood';

// ============================================================================
// Types
// ============================================================================

export interface DGAStation {
  codigo: string;
  nombre: string;
  tipo: 'fluviometrica' | 'meteorologica' | 'embalse' | 'calidad';
  latitud: number;
  longitud: number;
  altitud?: number;
  cuenca: string;
  subcuenca?: string;
  rio?: string;
  region: string;
  estado: 'activa' | 'suspendida' | 'cerrada';
}

export interface DGAMeasurement {
  estacion: string;
  fecha: string;
  hora: string;
  valor: number;
  unidad: string;
  parametro: string;
  calidad: 'validado' | 'preliminar' | 'sin_validar';
}

export interface DGADischargeData {
  estacion: DGAStation;
  mediciones: DGAMeasurement[];
  estadisticas: {
    qMedio: number;      // Mean discharge m³/s
    qMaximo: number;     // Maximum discharge m³/s
    qMinimo: number;     // Minimum discharge m³/s
    qMediano: number;    // Median discharge m³/s
    periodo: string;     // Data period
  };
}

export interface DGAReservoirData {
  estacion: DGAStation;
  nivel: number;           // Water level (m.s.n.m.)
  volumen: number;         // Current volume (Mm³)
  capacidad: number;       // Total capacity (Mm³)
  porcentajeLleno: number; // Percentage full
  cota: number;            // Dam crest elevation
  fechaMedicion: string;
}

export interface DGAFloodAlert {
  id: string;
  estacion: string;
  tipo: 'crecida' | 'alerta_amarilla' | 'alerta_roja' | 'evacuacion';
  nivel: number;
  umbral: number;
  fecha: string;
  descripcion: string;
  recomendaciones: string[];
}

// ============================================================================
// API Configuration
// ============================================================================

const DGA_BASE_URL = 'https://snia.mop.gob.cl/BNAConsultas';
const DGA_REST_URL = 'https://rest-sit.mop.gob.cl/arcgis/rest/services/DGA';

// Station type mapping
const STATION_LAYERS: Record<string, number> = {
  fluviometrica: 0,    // River discharge stations
  meteorologica: 1,    // Weather stations
  embalse: 2,          // Reservoir stations
  calidad: 3,          // Water quality stations
};

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Fetch DGA monitoring stations within a bounding box
 */
export async function fetchDGAStations(
  bounds: BoundingBox,
  tipo?: DGAStation['tipo']
): Promise<DGAStation[]> {
  try {
    // Use the Red Hidrométrica service
    const serviceUrl = `${DGA_REST_URL}/Red_Hidrometrica/MapServer`;
    const layerId = tipo ? STATION_LAYERS[tipo] : 0;

    // Build query
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

    const response = await fetch(`${serviceUrl}/${layerId}/query?${params}`);

    if (!response.ok) {
      throw new Error(`DGA API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return [];
    }

    return data.features.map((feature: any) => mapToStation(feature, tipo || 'fluviometrica'));
  } catch (error) {
    console.error('Error fetching DGA stations:', error);
    return [];
  }
}

/**
 * Fetch real-time flood alerts for an area
 */
export async function fetchFloodAlerts(
  bounds: BoundingBox
): Promise<DGAFloodAlert[]> {
  try {
    const serviceUrl = `${DGA_REST_URL}/ALERTAS/MapServer/0`;
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
      where: "ESTADO = 'ACTIVA'",
    });

    const response = await fetch(`${serviceUrl}/query?${params}`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature: any) => ({
      id: feature.attributes.OBJECTID?.toString() || '',
      estacion: feature.attributes.ESTACION || '',
      tipo: mapAlertType(feature.attributes.TIPO_ALERTA),
      nivel: feature.attributes.NIVEL || 0,
      umbral: feature.attributes.UMBRAL || 0,
      fecha: feature.attributes.FECHA || '',
      descripcion: feature.attributes.DESCRIPCION || '',
      recomendaciones: parseRecommendations(feature.attributes.RECOMENDACIONES),
    }));
  } catch (error) {
    console.error('Error fetching flood alerts:', error);
    return [];
  }
}

/**
 * Fetch reservoir status data
 */
export async function fetchReservoirData(
  bounds: BoundingBox
): Promise<DGAReservoirData[]> {
  try {
    const serviceUrl = `${DGA_REST_URL}/ESTACION_EMBALSE/MapServer/0`;
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

    const response = await fetch(`${serviceUrl}/query?${params}`);

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature: any) => ({
      estacion: {
        codigo: feature.attributes.COD_ESTACION || '',
        nombre: feature.attributes.NOMBRE || '',
        tipo: 'embalse' as const,
        latitud: feature.geometry?.y || 0,
        longitud: feature.geometry?.x || 0,
        cuenca: feature.attributes.CUENCA || '',
        region: feature.attributes.REGION || '',
        estado: 'activa' as const,
      },
      nivel: feature.attributes.NIVEL || 0,
      volumen: feature.attributes.VOLUMEN || 0,
      capacidad: feature.attributes.CAPACIDAD || 0,
      porcentajeLleno: feature.attributes.PORCENTAJE || 0,
      cota: feature.attributes.COTA || 0,
      fechaMedicion: feature.attributes.FECHA || '',
    }));
  } catch (error) {
    console.error('Error fetching reservoir data:', error);
    return [];
  }
}

/**
 * Fetch water restriction zones (important for project planning)
 */
export async function fetchWaterRestrictions(
  bounds: BoundingBox
): Promise<{
  areasRestriccion: GeoJSON.Feature[];
  zonasProhibicion: GeoJSON.Feature[];
  acuiferosProtegidos: GeoJSON.Feature[];
}> {
  const result = {
    areasRestriccion: [] as GeoJSON.Feature[],
    zonasProhibicion: [] as GeoJSON.Feature[],
    acuiferosProtegidos: [] as GeoJSON.Feature[],
  };

  try {
    const bbox = `${bounds.minX},${bounds.minY},${bounds.maxX},${bounds.maxY}`;
    const baseParams = {
      f: 'geojson',
      geometry: bbox,
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: '*',
      inSR: '4326',
      outSR: '4326',
    };

    // Fetch restriction areas
    const [restriccionRes, acuiferosRes] = await Promise.all([
      fetch(`${DGA_REST_URL}/Areas_de_Restriccion_y_Zonas_de_Prohibicion/MapServer/0/query?${new URLSearchParams(baseParams)}`),
      fetch(`${DGA_REST_URL}/Acuiferos_Protegidos/MapServer/0/query?${new URLSearchParams(baseParams)}`),
    ]);

    if (restriccionRes.ok) {
      const data = await restriccionRes.json();
      if (data.features) {
        result.areasRestriccion = data.features.filter((f: any) =>
          f.properties?.TIPO?.includes('RESTRICCION')
        );
        result.zonasProhibicion = data.features.filter((f: any) =>
          f.properties?.TIPO?.includes('PROHIBICION')
        );
      }
    }

    if (acuiferosRes.ok) {
      const data = await acuiferosRes.json();
      if (data.features) {
        result.acuiferosProtegidos = data.features;
      }
    }
  } catch (error) {
    console.error('Error fetching water restrictions:', error);
  }

  return result;
}

/**
 * Fetch water scarcity decrees (Decretos de Escasez Hídrica)
 */
export async function fetchWaterScarcityDecrees(
  bounds: BoundingBox
): Promise<{
  comunas: string[];
  decretos: Array<{
    numero: string;
    fecha: string;
    comunas: string[];
    estado: string;
  }>;
}> {
  try {
    const serviceUrl = `${DGA_REST_URL}/Decretos_Escasez_Hidrica/MapServer/0`;
    const bbox = `${bounds.minX},${bounds.minY},${bounds.maxX},${bounds.maxY}`;

    const params = new URLSearchParams({
      f: 'json',
      geometry: bbox,
      geometryType: 'esriGeometryEnvelope',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: '*',
      inSR: '4326',
      outSR: '4326',
      where: "ESTADO = 'VIGENTE'",
    });

    const response = await fetch(`${serviceUrl}/query?${params}`);

    if (!response.ok) {
      return { comunas: [], decretos: [] };
    }

    const data = await response.json();

    if (!data.features) {
      return { comunas: [], decretos: [] };
    }

    const comunas = new Set<string>();
    const decretos: Array<{
      numero: string;
      fecha: string;
      comunas: string[];
      estado: string;
    }> = [];

    for (const feature of data.features) {
      const comuna = feature.attributes.COMUNA || '';
      if (comuna) comunas.add(comuna);

      decretos.push({
        numero: feature.attributes.N_DECRETO || '',
        fecha: feature.attributes.FECHA || '',
        comunas: [comuna],
        estado: feature.attributes.ESTADO || '',
      });
    }

    return {
      comunas: Array.from(comunas),
      decretos,
    };
  } catch (error) {
    console.error('Error fetching water scarcity decrees:', error);
    return { comunas: [], decretos: [] };
  }
}

// ============================================================================
// Historical Data Functions
// ============================================================================

/**
 * Get station discharge statistics (requires SNIA access)
 * Note: This is a template - actual SNIA API may require authentication
 */
export async function getStationStatistics(
  codigoEstacion: string,
  yearStart: number = 1990,
  yearEnd: number = new Date().getFullYear()
): Promise<{
  qMedio: number;
  qMax: number;
  qMin: number;
  q5: number;   // 5% exceedance
  q50: number;  // Median
  q95: number;  // 95% exceedance
  dataYears: number;
} | null> {
  // Note: This would connect to DGA's SNIA database
  // The actual implementation depends on their API access
  console.log(`Would fetch statistics for station ${codigoEstacion} (${yearStart}-${yearEnd})`);

  // Return sample structure - actual implementation pending SNIA access
  return null;
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapToStation(feature: any, tipo: DGAStation['tipo']): DGAStation {
  const attrs = feature.attributes || {};
  const geom = feature.geometry || {};

  return {
    codigo: attrs.COD_ESTACION || attrs.CODIGO || '',
    nombre: attrs.NOMBRE || attrs.NOM_ESTACION || '',
    tipo,
    latitud: geom.y || 0,
    longitud: geom.x || 0,
    altitud: attrs.ALTITUD || attrs.COTA || undefined,
    cuenca: attrs.CUENCA || attrs.NOM_CUENCA || '',
    subcuenca: attrs.SUBCUENCA || attrs.NOM_SUBCUENCA || undefined,
    rio: attrs.RIO || attrs.NOM_RIO || undefined,
    region: attrs.REGION || attrs.NOM_REGION || '',
    estado: mapEstado(attrs.ESTADO || attrs.VIGENCIA),
  };
}

function mapEstado(estado: string | undefined): DGAStation['estado'] {
  if (!estado) return 'activa';
  const lower = estado.toLowerCase();
  if (lower.includes('suspendida') || lower.includes('suspensa')) return 'suspendida';
  if (lower.includes('cerrada') || lower.includes('fuera')) return 'cerrada';
  return 'activa';
}

function mapAlertType(tipo: string | undefined): DGAFloodAlert['tipo'] {
  if (!tipo) return 'crecida';
  const lower = tipo.toLowerCase();
  if (lower.includes('roja') || lower.includes('red')) return 'alerta_roja';
  if (lower.includes('amarilla') || lower.includes('yellow')) return 'alerta_amarilla';
  if (lower.includes('evacuacion') || lower.includes('evacu')) return 'evacuacion';
  return 'crecida';
}

function parseRecommendations(text: string | undefined): string[] {
  if (!text) return [];
  return text.split(/[;\n]/).map(s => s.trim()).filter(Boolean);
}

// ============================================================================
// Analysis Integration
// ============================================================================

/**
 * Combine DGA data with project analysis
 */
export interface DGAAnalysisContext {
  stations: DGAStation[];
  alerts: DGAFloodAlert[];
  reservoirs: DGAReservoirData[];
  restrictions: {
    hasRestrictions: boolean;
    hasProhibitions: boolean;
    hasProtectedAquifers: boolean;
    scarcityDecrees: string[];
  };
  riskLevel: 'bajo' | 'medio' | 'alto' | 'muy_alto';
  recommendations: string[];
}

/**
 * Analyze DGA context for a project area
 */
export async function analyzeDGAContext(
  bounds: BoundingBox
): Promise<DGAAnalysisContext> {
  // Fetch all relevant data in parallel
  const [stations, alerts, reservoirs, restrictions, scarcity] = await Promise.all([
    fetchDGAStations(bounds),
    fetchFloodAlerts(bounds),
    fetchReservoirData(bounds),
    fetchWaterRestrictions(bounds),
    fetchWaterScarcityDecrees(bounds),
  ]);

  // Determine risk level
  let riskLevel: DGAAnalysisContext['riskLevel'] = 'bajo';
  const recommendations: string[] = [];

  // Check flood alerts
  if (alerts.some(a => a.tipo === 'evacuacion' || a.tipo === 'alerta_roja')) {
    riskLevel = 'muy_alto';
    recommendations.push('URGENTE: Zona con alerta de crecida activa. Verificar condiciones antes de trabajos en terreno.');
  } else if (alerts.some(a => a.tipo === 'alerta_amarilla')) {
    riskLevel = 'alto';
    recommendations.push('Zona con alerta amarilla activa. Monitorear condiciones meteorológicas.');
  }

  // Check restrictions
  if (restrictions.zonasProhibicion.length > 0) {
    if (riskLevel === 'bajo') riskLevel = 'medio';
    recommendations.push('Área incluye zonas de prohibición DGA. Verificar permisos antes de captaciones.');
  }

  if (restrictions.areasRestriccion.length > 0) {
    recommendations.push('Área con restricciones de extracción de aguas. Consultar DGA para nuevos derechos.');
  }

  if (restrictions.acuiferosProtegidos.length > 0) {
    recommendations.push('Proyecto sobre acuífero protegido. Requiere evaluación de impacto hidrogeológico.');
  }

  // Check scarcity
  if (scarcity.decretos.length > 0) {
    if (riskLevel === 'bajo') riskLevel = 'medio';
    recommendations.push(`Comunas con decreto de escasez hídrica vigente: ${scarcity.comunas.join(', ')}`);
  }

  // Check reservoir levels
  const lowReservoirs = reservoirs.filter(r => r.porcentajeLleno < 30);
  if (lowReservoirs.length > 0) {
    recommendations.push(`${lowReservoirs.length} embalse(s) bajo 30% de capacidad en el área.`);
  }

  // Check station coverage
  if (stations.length === 0) {
    recommendations.push('Sin estaciones de monitoreo DGA cercanas. Considerar instalación de estación temporal para estudios.');
  } else {
    recommendations.push(`${stations.length} estación(es) DGA disponible(s) para calibración hidrológica.`);
  }

  return {
    stations,
    alerts,
    reservoirs,
    restrictions: {
      hasRestrictions: restrictions.areasRestriccion.length > 0,
      hasProhibitions: restrictions.zonasProhibicion.length > 0,
      hasProtectedAquifers: restrictions.acuiferosProtegidos.length > 0,
      scarcityDecrees: scarcity.comunas,
    },
    riskLevel,
    recommendations,
  };
}
