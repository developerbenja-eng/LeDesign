/**
 * Copernicus Emergency Management Service Integration
 *
 * Access historical flood extent maps and emergency mapping data
 * from the European Union's Copernicus program.
 */

import type { BoundingBox } from './triangulation/types';

// ============================================================================
// Types
// ============================================================================

export interface FloodEvent {
  id: string;
  name: string;
  country: string;
  region: string;
  startDate: string;
  endDate?: string;
  type: 'flash_flood' | 'river_flood' | 'coastal_flood' | 'urban_flood';
  severity: 'low' | 'moderate' | 'severe' | 'extreme';
  affectedArea: number; // km²
  products: FloodProduct[];
}

export interface FloodProduct {
  id: string;
  type: 'delineation' | 'grading' | 'reference' | 'first_estimate';
  date: string;
  format: 'vector' | 'raster';
  downloadUrl?: string;
  previewUrl?: string;
  bounds: BoundingBox;
}

export interface FloodExtent {
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  area: number; // km²
  waterDepth?: 'shallow' | 'medium' | 'deep';
  source: string;
  date: string;
  confidence: number;
}

export interface SentinelFloodData {
  acquisitionDate: string;
  satellite: 'Sentinel-1' | 'Sentinel-2';
  cloudCover?: number;
  bounds: BoundingBox;
  waterMask?: string; // Base64 encoded mask
  previewUrl?: string;
}

// ============================================================================
// Copernicus Data Space API (New API - 2024+)
// ============================================================================

const COPERNICUS_DATASPACE_URL = 'https://catalogue.dataspace.copernicus.eu/odata/v1';
const COPERNICUS_STAC_URL = 'https://catalogue.dataspace.copernicus.eu/stac';

/**
 * Search for Sentinel-1 SAR images for flood detection
 * SAR can see through clouds, making it ideal for flood mapping during storms
 */
export async function searchSentinel1ForFlood(
  bounds: BoundingBox,
  startDate: string,
  endDate: string
): Promise<SentinelFloodData[]> {
  try {
    // Build STAC search query
    const bbox = [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY];

    const searchBody = {
      collections: ['SENTINEL-1'],
      bbox,
      datetime: `${startDate}/${endDate}`,
      limit: 20,
      filter: {
        op: 'and',
        args: [
          { op: '=', args: [{ property: 'productType' }, 'GRD'] },
          { op: '=', args: [{ property: 'polarisation' }, 'VV VH'] },
        ],
      },
    };

    const response = await fetch(`${COPERNICUS_STAC_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      console.warn('Copernicus STAC search failed:', response.status);
      return [];
    }

    const data = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature: any) => ({
      acquisitionDate: feature.properties?.datetime || '',
      satellite: 'Sentinel-1' as const,
      bounds: {
        minX: feature.bbox?.[0] || bounds.minX,
        minY: feature.bbox?.[1] || bounds.minY,
        maxX: feature.bbox?.[2] || bounds.maxX,
        maxY: feature.bbox?.[3] || bounds.maxY,
        minZ: 0,
        maxZ: 0,
      },
      previewUrl: feature.assets?.quicklook?.href || null,
    }));
  } catch (error) {
    console.error('Error searching Sentinel-1:', error);
    return [];
  }
}

/**
 * Search for Sentinel-2 optical images
 * Better resolution but affected by clouds
 */
export async function searchSentinel2ForFlood(
  bounds: BoundingBox,
  startDate: string,
  endDate: string,
  maxCloudCover: number = 30
): Promise<SentinelFloodData[]> {
  try {
    const bbox = [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY];

    const searchBody = {
      collections: ['SENTINEL-2'],
      bbox,
      datetime: `${startDate}/${endDate}`,
      limit: 20,
      filter: {
        op: 'and',
        args: [
          { op: '<=', args: [{ property: 'cloudCover' }, maxCloudCover] },
          { op: '=', args: [{ property: 'productType' }, 'S2MSI2A'] },
        ],
      },
    };

    const response = await fetch(`${COPERNICUS_STAC_URL}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchBody),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();

    if (!data.features) {
      return [];
    }

    return data.features.map((feature: any) => ({
      acquisitionDate: feature.properties?.datetime || '',
      satellite: 'Sentinel-2' as const,
      cloudCover: feature.properties?.['eo:cloud_cover'] || 0,
      bounds: {
        minX: feature.bbox?.[0] || bounds.minX,
        minY: feature.bbox?.[1] || bounds.minY,
        maxX: feature.bbox?.[2] || bounds.maxX,
        maxY: feature.bbox?.[3] || bounds.maxY,
        minZ: 0,
        maxZ: 0,
      },
      previewUrl: feature.assets?.quicklook?.href || null,
    }));
  } catch (error) {
    console.error('Error searching Sentinel-2:', error);
    return [];
  }
}

// ============================================================================
// GloFAS Flood Forecast Integration
// ============================================================================

const GLOFAS_URL = 'https://cds.climate.copernicus.eu/api/v2';

/**
 * Get GloFAS river discharge forecast data
 * Note: Requires Copernicus Climate Data Store (CDS) API key
 */
export interface GloFASForecast {
  date: string;
  leadTime: number; // hours
  discharge: number; // m³/s
  returnPeriod?: number; // years
  probability?: number;
}

export async function getGloFASForecast(
  lat: number,
  lon: number,
  apiKey?: string
): Promise<GloFASForecast[]> {
  // GloFAS is also available through Open-Meteo (already integrated!)
  // This is an alternative direct access method

  if (!apiKey) {
    console.log('GloFAS CDS API key not provided. Use Open-Meteo flood API instead.');
    return [];
  }

  // Note: CDS API requires registration at https://cds.climate.copernicus.eu/
  // This is a placeholder for the actual implementation
  return [];
}

// ============================================================================
// Emergency Mapping Service (CEMS)
// ============================================================================

const CEMS_URL = 'https://emergency.copernicus.eu/mapping';

/**
 * Search for historical emergency mapping activations
 * Useful for understanding past flood events in an area
 */
export async function searchCEMSActivations(
  bounds: BoundingBox,
  eventType: 'flood' | 'all' = 'flood'
): Promise<FloodEvent[]> {
  // CEMS data is typically accessed through their portal
  // This function would require web scraping or their API if available

  // For now, return guidance on manual access
  console.log(`
    Copernicus EMS Rapid Mapping portal:
    https://emergency.copernicus.eu/mapping/list-of-components/EMSR

    Filter by:
    - Country: Chile
    - Event type: ${eventType}
    - Area: ${bounds.minY.toFixed(2)}°S to ${bounds.maxY.toFixed(2)}°S

    Historical Chilean activations can be downloaded as shapefiles.
  `);

  return [];
}

// ============================================================================
// Water Index Calculations (for Sentinel-2)
// ============================================================================

/**
 * Calculate Normalized Difference Water Index (NDWI)
 * NDWI = (Green - NIR) / (Green + NIR)
 * Values > 0.3 typically indicate water
 */
export function calculateNDWI(green: number, nir: number): number {
  const denominator = green + nir;
  if (denominator === 0) return 0;
  return (green - nir) / denominator;
}

/**
 * Calculate Modified NDWI (MNDWI)
 * MNDWI = (Green - SWIR) / (Green + SWIR)
 * Better for urban areas and mixed pixels
 */
export function calculateMNDWI(green: number, swir: number): number {
  const denominator = green + swir;
  if (denominator === 0) return 0;
  return (green - swir) / denominator;
}

/**
 * Calculate Automated Water Extraction Index (AWEI)
 * More robust for shadow and dark surfaces
 */
export function calculateAWEI(
  blue: number,
  green: number,
  nir: number,
  swir1: number,
  swir2: number
): number {
  // AWEIsh (shadow) = Blue + 2.5*Green - 1.5*(NIR+SWIR1) - 0.25*SWIR2
  return blue + 2.5 * green - 1.5 * (nir + swir1) - 0.25 * swir2;
}

// ============================================================================
// Flood Analysis Helper Functions
// ============================================================================

export interface FloodRiskAnalysis {
  historicalEvents: number;
  lastFloodDate?: string;
  averageReturnPeriod?: number;
  maxRecordedExtent?: number; // km²
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  dataQuality: 'poor' | 'moderate' | 'good' | 'excellent';
  recommendations: string[];
}

/**
 * Analyze flood risk based on available data
 */
export async function analyzeFloodRisk(
  bounds: BoundingBox,
  options: {
    includeHistorical?: boolean;
    includeForecast?: boolean;
    includeSatellite?: boolean;
  } = {}
): Promise<FloodRiskAnalysis> {
  const recommendations: string[] = [];
  let dataQuality: FloodRiskAnalysis['dataQuality'] = 'moderate';

  // Search for recent satellite imagery
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  let sentinelData: SentinelFloodData[] = [];

  if (options.includeSatellite !== false) {
    const [s1Data, s2Data] = await Promise.all([
      searchSentinel1ForFlood(bounds, startDate, endDate),
      searchSentinel2ForFlood(bounds, startDate, endDate, 20),
    ]);
    sentinelData = [...s1Data, ...s2Data];

    if (sentinelData.length > 0) {
      dataQuality = 'good';
      recommendations.push(
        `${sentinelData.length} imágenes satelitales recientes disponibles para análisis de inundación.`
      );

      // Check for SAR data (can see through clouds)
      const sarImages = sentinelData.filter(s => s.satellite === 'Sentinel-1');
      if (sarImages.length > 0) {
        recommendations.push(
          `${sarImages.length} imágenes SAR (Sentinel-1) disponibles - útiles para detección durante tormentas.`
        );
      }
    }
  }

  // Determine risk level based on geography
  let riskLevel: FloodRiskAnalysis['riskLevel'] = 'moderate';

  // Check if area is in a known flood-prone region
  // (This would be enhanced with actual flood zone data)
  const areaSize = (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);

  if (areaSize > 0.1) {
    recommendations.push(
      'Área grande analizada. Considerar análisis por subcuencas para mayor precisión.'
    );
  }

  // Add general recommendations
  recommendations.push(
    'Consultar DGA para datos históricos de crecidas en estaciones cercanas.'
  );
  recommendations.push(
    'Verificar información de planificación territorial (PRC/PRMS) para zonas de riesgo.'
  );

  return {
    historicalEvents: 0, // Would be populated from CEMS/DGA
    riskLevel,
    dataQuality,
    recommendations,
  };
}
