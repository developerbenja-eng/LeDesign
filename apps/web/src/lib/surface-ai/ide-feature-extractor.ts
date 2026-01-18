/**
 * Smart Surface Generation - IDE Chile Feature Extractor
 *
 * Automatically fetches and converts IDE Chile features
 * (roads, rivers, water bodies) into breaklines for surface generation.
 */

import {
  IDE_SERVICES,
  buildQueryUrl,
  type IDEService,
  type IDEQueryParams,
  type GeoJSONFeature,
} from '@/types/ide-chile';
import type { BoundingBox } from '../triangulation/types';
import type { DetectedFeature, FeatureDetectionResult } from './types';

// ============================================================================
// Types
// ============================================================================

export interface Breakline {
  id: string;
  type: 'hard' | 'soft';
  source: string;
  sourceLayer: string;
  points: Array<{ x: number; y: number; z?: number }>;
  properties?: Record<string, unknown>;
}

export interface FlatConstraint {
  id: string;
  source: string;
  polygon: Array<{ x: number; y: number }>;
  elevationHint?: number;
  properties?: Record<string, unknown>;
}

export interface IDEExtractionResult {
  success: boolean;
  breaklines: Breakline[];
  flatConstraints: FlatConstraint[];
  features: DetectedFeature[];
  summary: {
    totalFeatures: number;
    roadCount: number;
    riverCount: number;
    lakeCount: number;
    otherCount: number;
    processingTime: number;
  };
  errors: string[];
  warnings: string[];
}

export interface IDEExtractionOptions {
  /** Include road network (soft breaklines) */
  includeRoads?: boolean;
  /** Include rivers and streams (hard breaklines) */
  includeRivers?: boolean;
  /** Include lakes and water bodies (flat constraints) */
  includeLakes?: boolean;
  /** Include stormwater infrastructure */
  includeStormwater?: boolean;
  /** Maximum features per layer */
  maxFeaturesPerLayer?: number;
  /** Buffer distance to expand bbox (meters, converted to degrees) */
  bufferDistance?: number;
  /** Target coordinate system (default: WGS84) */
  targetCRS?: 'EPSG:4326' | 'EPSG:32719' | 'EPSG:32718';
}

const DEFAULT_OPTIONS: Required<IDEExtractionOptions> = {
  includeRoads: true,
  includeRivers: true,
  includeLakes: true,
  includeStormwater: false,
  maxFeaturesPerLayer: 500,
  bufferDistance: 100,
  targetCRS: 'EPSG:4326',
};

// ============================================================================
// Main Extraction Function
// ============================================================================

/**
 * Extract features from IDE Chile services for surface generation
 */
export async function extractIDEFeatures(
  bounds: BoundingBox,
  options: IDEExtractionOptions = {}
): Promise<IDEExtractionResult> {
  const startTime = performance.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const breaklines: Breakline[] = [];
  const flatConstraints: FlatConstraint[] = [];
  const features: DetectedFeature[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  let roadCount = 0;
  let riverCount = 0;
  let lakeCount = 0;
  let otherCount = 0;

  // Convert bounds to WGS84 bbox with buffer
  const bbox = convertBoundsToWGS84(bounds, opts.bufferDistance, opts.targetCRS);

  // Fetch road features
  if (opts.includeRoads) {
    try {
      const roadResult = await fetchRoadFeatures(bbox, opts.maxFeaturesPerLayer);
      breaklines.push(...roadResult.breaklines);
      features.push(...roadResult.features);
      roadCount = roadResult.breaklines.length;

      if (roadResult.warning) {
        warnings.push(roadResult.warning);
      }
    } catch (error) {
      errors.push(`Road extraction failed: ${(error as Error).message}`);
    }
  }

  // Fetch river features
  if (opts.includeRivers) {
    try {
      const riverResult = await fetchRiverFeatures(bbox, opts.maxFeaturesPerLayer);
      breaklines.push(...riverResult.breaklines);
      features.push(...riverResult.features);
      riverCount = riverResult.breaklines.length;

      if (riverResult.warning) {
        warnings.push(riverResult.warning);
      }
    } catch (error) {
      errors.push(`River extraction failed: ${(error as Error).message}`);
    }
  }

  // Fetch lake/water body features
  if (opts.includeLakes) {
    try {
      const lakeResult = await fetchLakeFeatures(bbox, opts.maxFeaturesPerLayer);
      flatConstraints.push(...lakeResult.flatConstraints);
      features.push(...lakeResult.features);
      lakeCount = lakeResult.flatConstraints.length;

      if (lakeResult.warning) {
        warnings.push(lakeResult.warning);
      }
    } catch (error) {
      errors.push(`Lake extraction failed: ${(error as Error).message}`);
    }
  }

  // Fetch stormwater infrastructure
  if (opts.includeStormwater) {
    try {
      const stormResult = await fetchStormwaterFeatures(bbox, opts.maxFeaturesPerLayer);
      breaklines.push(...stormResult.breaklines);
      features.push(...stormResult.features);
      otherCount = stormResult.breaklines.length;

      if (stormResult.warning) {
        warnings.push(stormResult.warning);
      }
    } catch (error) {
      errors.push(`Stormwater extraction failed: ${(error as Error).message}`);
    }
  }

  const processingTime = performance.now() - startTime;

  return {
    success: errors.length === 0,
    breaklines,
    flatConstraints,
    features,
    summary: {
      totalFeatures: breaklines.length + flatConstraints.length,
      roadCount,
      riverCount,
      lakeCount,
      otherCount,
      processingTime,
    },
    errors,
    warnings,
  };
}

// ============================================================================
// Feature Fetchers
// ============================================================================

/**
 * Fetch road features from IDE Chile
 */
async function fetchRoadFeatures(
  bbox: { west: number; south: number; east: number; north: number },
  maxRecords: number
): Promise<{ breaklines: Breakline[]; features: DetectedFeature[]; warning?: string }> {
  const breaklines: Breakline[] = [];
  const features: DetectedFeature[] = [];
  let warning: string | undefined;

  // Try red-vial-chile service first (layer 3 is most detailed)
  const roadService = IDE_SERVICES.find((s) => s.id === 'red-vial-chile');
  if (!roadService) {
    return { breaklines, features, warning: 'Road service not found in catalog' };
  }

  const queryParams: IDEQueryParams = {
    bbox,
    outFields: ['*'],
    returnGeometry: true,
    maxRecords,
    format: 'geojson',
  };

  // Query layer 3 (most detailed scale)
  const queryUrl = buildQueryUrl(roadService, 3, queryParams);

  try {
    const response = await fetch(queryUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const featureCollection = data.features || [];

    if (featureCollection.length >= maxRecords) {
      warning = `Road features limited to ${maxRecords} (area may contain more)`;
    }

    for (let i = 0; i < featureCollection.length; i++) {
      const feature = featureCollection[i] as GeoJSONFeature;
      const geometry = feature.geometry;

      if (geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
        const lines = geometry.type === 'LineString'
          ? [geometry.coordinates as Array<[number, number]>]
          : (geometry.coordinates as Array<Array<[number, number]>>);

        for (let j = 0; j < lines.length; j++) {
          const coords = lines[j];
          const points = coords.map(([x, y]) => ({ x, y }));

          breaklines.push({
            id: `road_${i}_${j}`,
            type: 'soft', // Roads are soft breaklines
            source: 'IDE Chile - Red Vial',
            sourceLayer: 'red-vial-chile/3',
            points,
            properties: feature.properties,
          });

          features.push({
            type: 'road',
            geometry: { type: 'LineString', coordinates: coords },
            confidence: 0.9,
            source: 'ide_chile',
            useAsBreakline: true,
            useAsFlatConstraint: false,
          });
        }
      }
    }
  } catch (error) {
    // Return empty result with warning
    warning = `Road query failed: ${(error as Error).message}`;
  }

  return { breaklines, features, warning };
}

/**
 * Fetch river and stream features from IDE Chile
 */
async function fetchRiverFeatures(
  bbox: { west: number; south: number; east: number; north: number },
  maxRecords: number
): Promise<{ breaklines: Breakline[]; features: DetectedFeature[]; warning?: string }> {
  const breaklines: Breakline[] = [];
  const features: DetectedFeature[] = [];
  let warning: string | undefined;

  // Use red-hidrografica service
  const hydroService = IDE_SERVICES.find((s) => s.id === 'red-hidrografica');
  if (!hydroService) {
    return { breaklines, features, warning: 'Hydrographic service not found in catalog' };
  }

  const queryParams: IDEQueryParams = {
    bbox,
    outFields: ['*'],
    returnGeometry: true,
    maxRecords,
    format: 'geojson',
  };

  // Query layer 0 (rivers and streams)
  const queryUrl = buildQueryUrl(hydroService, 0, queryParams);

  try {
    const response = await fetch(queryUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const featureCollection = data.features || [];

    if (featureCollection.length >= maxRecords) {
      warning = `River features limited to ${maxRecords} (area may contain more)`;
    }

    for (let i = 0; i < featureCollection.length; i++) {
      const feature = featureCollection[i] as GeoJSONFeature;
      const geometry = feature.geometry;

      if (geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
        const lines = geometry.type === 'LineString'
          ? [geometry.coordinates as Array<[number, number]>]
          : (geometry.coordinates as Array<Array<[number, number]>>);

        for (let j = 0; j < lines.length; j++) {
          const coords = lines[j];
          const points = coords.map(([x, y]) => ({ x, y }));

          // Determine if it's a major river or stream based on properties
          const name = (feature.properties?.NOMBRE || feature.properties?.nombre || '') as string;
          const isRiver = name.toLowerCase().includes('río') || name.toLowerCase().includes('rio');

          breaklines.push({
            id: `river_${i}_${j}`,
            type: 'hard', // Rivers are hard breaklines (elevation discontinuity)
            source: `IDE Chile - ${isRiver ? 'Río' : 'Estero'}`,
            sourceLayer: 'red-hidrografica/0',
            points,
            properties: feature.properties,
          });

          features.push({
            type: isRiver ? 'river' : 'stream',
            geometry: { type: 'LineString', coordinates: coords },
            confidence: 0.85,
            source: 'ide_chile',
            useAsBreakline: true,
            useAsFlatConstraint: false,
          });
        }
      }
    }
  } catch (error) {
    warning = `River query failed: ${(error as Error).message}`;
  }

  return { breaklines, features, warning };
}

/**
 * Fetch lake and water body features from IDE Chile
 */
async function fetchLakeFeatures(
  bbox: { west: number; south: number; east: number; north: number },
  maxRecords: number
): Promise<{ flatConstraints: FlatConstraint[]; features: DetectedFeature[]; warning?: string }> {
  const flatConstraints: FlatConstraint[] = [];
  const features: DetectedFeature[] = [];
  let warning: string | undefined;

  // Use embalses service for reservoirs/lakes
  const embalseService = IDE_SERVICES.find((s) => s.id === 'embalses');
  if (!embalseService) {
    return { flatConstraints, features, warning: 'Reservoir service not found in catalog' };
  }

  // Note: embalses service returns point data, not polygons
  // For actual water body polygons, we'd need a different source
  // For now, we'll just return what we can query

  const queryParams: IDEQueryParams = {
    bbox,
    outFields: ['*'],
    returnGeometry: true,
    maxRecords,
    format: 'geojson',
  };

  const queryUrl = buildQueryUrl(embalseService, 0, queryParams);

  try {
    const response = await fetch(queryUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const featureCollection = data.features || [];

    // Since embalses returns points, we create small circular buffers as flat constraints
    for (let i = 0; i < featureCollection.length; i++) {
      const feature = featureCollection[i] as GeoJSONFeature;
      const geometry = feature.geometry;

      if (geometry.type === 'Point') {
        const [x, y] = geometry.coordinates as [number, number];

        // Create a small hexagonal buffer around the point
        const bufferRadius = 0.001; // ~100m in degrees
        const polygon = createHexagonBuffer(x, y, bufferRadius);

        flatConstraints.push({
          id: `lake_${i}`,
          source: 'IDE Chile - Embalse',
          polygon,
          properties: feature.properties,
        });

        features.push({
          type: 'lake',
          geometry: { type: 'Polygon', coordinates: polygon.map(p => [p.x, p.y]) },
          confidence: 0.7,
          source: 'ide_chile',
          useAsBreakline: false,
          useAsFlatConstraint: true,
        });
      } else if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
        const rings = geometry.type === 'Polygon'
          ? [geometry.coordinates[0] as Array<[number, number]>]
          : (geometry.coordinates as Array<Array<Array<[number, number]>>>).map(poly => poly[0]);

        for (let j = 0; j < rings.length; j++) {
          const coords = rings[j];
          const polygon = coords.map(([x, y]) => ({ x, y }));

          flatConstraints.push({
            id: `lake_${i}_${j}`,
            source: 'IDE Chile - Cuerpo de agua',
            polygon,
            properties: feature.properties,
          });

          features.push({
            type: 'lake',
            geometry: { type: 'Polygon', coordinates: coords },
            confidence: 0.9,
            source: 'ide_chile',
            useAsBreakline: false,
            useAsFlatConstraint: true,
          });
        }
      }
    }
  } catch (error) {
    warning = `Lake query failed: ${(error as Error).message}`;
  }

  return { flatConstraints, features, warning };
}

/**
 * Fetch stormwater infrastructure from IDE Chile SIALL service
 */
async function fetchStormwaterFeatures(
  bbox: { west: number; south: number; east: number; north: number },
  maxRecords: number
): Promise<{ breaklines: Breakline[]; features: DetectedFeature[]; warning?: string }> {
  const breaklines: Breakline[] = [];
  const features: DetectedFeature[] = [];
  let warning: string | undefined;

  // Use SIALL service (layer 0 is collectors)
  const siallService = IDE_SERVICES.find((s) => s.id === 'siall');
  if (!siallService) {
    return { breaklines, features, warning: 'SIALL service not found in catalog' };
  }

  const queryParams: IDEQueryParams = {
    bbox,
    outFields: ['*'],
    returnGeometry: true,
    maxRecords,
    format: 'geojson',
  };

  // Query layer 0 (collectors)
  const queryUrl = buildQueryUrl(siallService, 0, queryParams);

  try {
    const response = await fetch(queryUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const featureCollection = data.features || [];

    for (let i = 0; i < featureCollection.length; i++) {
      const feature = featureCollection[i] as GeoJSONFeature;
      const geometry = feature.geometry;

      if (geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
        const lines = geometry.type === 'LineString'
          ? [geometry.coordinates as Array<[number, number]>]
          : (geometry.coordinates as Array<Array<[number, number]>>);

        for (let j = 0; j < lines.length; j++) {
          const coords = lines[j];
          const points = coords.map(([x, y]) => ({ x, y }));

          breaklines.push({
            id: `stormwater_${i}_${j}`,
            type: 'soft', // Stormwater collectors are soft breaklines
            source: 'IDE Chile - SIALL Colector',
            sourceLayer: 'siall/0',
            points,
            properties: feature.properties,
          });

          features.push({
            type: 'breakline',
            geometry: { type: 'LineString', coordinates: coords },
            confidence: 0.8,
            source: 'ide_chile',
            useAsBreakline: true,
            useAsFlatConstraint: false,
          });
        }
      }
    }
  } catch (error) {
    warning = `Stormwater query failed: ${(error as Error).message}`;
  }

  return { breaklines, features, warning };
}

// ============================================================================
// Coordinate Conversion
// ============================================================================

/**
 * Convert local bounds to WGS84 bbox for IDE queries
 */
function convertBoundsToWGS84(
  bounds: BoundingBox,
  bufferDistance: number,
  sourceCRS: string
): { west: number; south: number; east: number; north: number } {
  // If bounds are already in WGS84 (longitude/latitude range)
  const isWGS84 =
    bounds.minX >= -180 &&
    bounds.maxX <= 180 &&
    bounds.minY >= -90 &&
    bounds.maxY <= 90;

  if (isWGS84) {
    // Add buffer in degrees (~0.00001 per meter at equator)
    const bufferDegrees = bufferDistance * 0.00001;
    return {
      west: bounds.minX - bufferDegrees,
      south: bounds.minY - bufferDegrees,
      east: bounds.maxX + bufferDegrees,
      north: bounds.maxY + bufferDegrees,
    };
  }

  // Assume UTM zone 19S (EPSG:32719) for central Chile
  // Convert to approximate WGS84
  // This is a simplified conversion - for production use proj4
  const utmToWgs84 = (x: number, y: number): [number, number] => {
    // Approximate conversion for UTM 19S
    // Central meridian: -69°
    const k0 = 0.9996;
    const e0 = 500000; // False easting
    const n0 = 10000000; // False northing for southern hemisphere

    // Simplified inverse UTM
    const lon = -69 + (x - e0) / (k0 * 111320 * Math.cos((y - n0) / 111320 * Math.PI / 180));
    const lat = (y - n0) / 111320;

    return [lon, lat];
  };

  const [west, south] = utmToWgs84(bounds.minX - bufferDistance, bounds.minY - bufferDistance);
  const [east, north] = utmToWgs84(bounds.maxX + bufferDistance, bounds.maxY + bufferDistance);

  return { west, south, east, north };
}

/**
 * Create hexagonal buffer around a point
 */
function createHexagonBuffer(
  cx: number,
  cy: number,
  radius: number
): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    points.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  }

  // Close the polygon
  points.push(points[0]);

  return points;
}

// ============================================================================
// Breakline Processing
// ============================================================================

/**
 * Simplify breaklines by removing redundant points
 */
export function simplifyBreaklines(
  breaklines: Breakline[],
  tolerance: number = 0.00001
): Breakline[] {
  return breaklines.map((bl) => ({
    ...bl,
    points: douglasPeucker(bl.points, tolerance),
  }));
}

/**
 * Douglas-Peucker line simplification
 */
function douglasPeucker(
  points: Array<{ x: number; y: number; z?: number }>,
  tolerance: number
): Array<{ x: number; y: number; z?: number }> {
  if (points.length <= 2) return points;

  const first = points[0];
  const last = points[points.length - 1];

  let maxDist = 0;
  let maxIdx = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = douglasPeucker(points.slice(0, maxIdx + 1), tolerance);
    const right = douglasPeucker(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

/**
 * Calculate perpendicular distance from point to line segment
 */
function perpendicularDistance(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number }
): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
    );
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
        (dx * dx + dy * dy)
    )
  );

  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;

  return Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));
}

/**
 * Convert breaklines to surface-ai FeatureDetectionResult format
 */
export function toFeatureDetectionResult(
  result: IDEExtractionResult
): FeatureDetectionResult {
  return {
    features: result.features,
    breaklines: result.breaklines.map((bl) => ({
      points: bl.points,
      type: bl.type,
      source: bl.source,
    })),
    flatConstraints: result.flatConstraints.map((fc) => ({
      polygon: fc.polygon,
      source: fc.source,
    })),
    notes: [
      `Extracted ${result.summary.roadCount} road features`,
      `Extracted ${result.summary.riverCount} river features`,
      `Extracted ${result.summary.lakeCount} lake features`,
      ...result.warnings,
    ],
  };
}
