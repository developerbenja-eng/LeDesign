/**
 * DEM Service - Fetches and caches Digital Elevation Models
 * Sources: AWS Copernicus (no auth), OpenTopography (API key), GCS cache
 *
 * NOTE: This module can be used server-side or client-side for read operations
 */

// Types
export interface BoundingBox {
  south: number;
  north: number;
  west: number;
  east: number;
}

export interface DEMTile {
  lat: number;
  lon: number;
  url: string;
  cached: boolean;
  gcsPath?: string;
}

export interface DEMMetadata {
  source: 'copernicus' | 'opentopography' | 'custom';
  resolution: number; // meters
  bounds: BoundingBox;
  crs: string;
  timestamp: string;
}

// Configuration
const GCS_BUCKET = 'caeser-geo-data';
const GCS_DEM_PREFIX = 'dem/chile/copernicus-30m';

/**
 * Get Copernicus DEM tile URL from AWS S3 (no auth required)
 *
 * Copernicus DEM is a ~30m resolution global DEM available freely from AWS.
 * Tiles are 1x1 degree and named by their SW corner coordinates.
 */
export function getCopernicusTileUrl(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  const latStr = Math.abs(Math.floor(lat)).toString().padStart(2, '0');
  const lonStr = Math.abs(Math.floor(lon)).toString().padStart(3, '0');

  const tileName = `Copernicus_DSM_COG_10_${ns}${latStr}_00_${ew}${lonStr}_00_DEM`;
  return `https://copernicus-dem-30m.s3.eu-central-1.amazonaws.com/${tileName}/${tileName}.tif`;
}

/**
 * Get all tile URLs needed to cover a bounding box
 *
 * Tiles are 1x1 degree, so we need to cover all integer lat/lon
 * coordinates that intersect with the bounding box.
 */
export function getTilesForBounds(bounds: BoundingBox): DEMTile[] {
  const tiles: DEMTile[] = [];

  // Get integer bounds (tiles are 1x1 degree)
  const minLat = Math.floor(bounds.south);
  const maxLat = Math.floor(bounds.north);
  const minLon = Math.floor(bounds.west);
  const maxLon = Math.floor(bounds.east);

  for (let lat = minLat; lat <= maxLat; lat++) {
    for (let lon = minLon; lon <= maxLon; lon++) {
      tiles.push({
        lat,
        lon,
        url: getCopernicusTileUrl(lat, lon),
        cached: false,
      });
    }
  }

  return tiles;
}

/**
 * Generate consistent file name for tile
 */
function getTileFileName(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  const latStr = Math.abs(lat).toString().padStart(2, '0');
  const lonStr = Math.abs(lon).toString().padStart(3, '0');
  return `${ns}${latStr}_${ew}${lonStr}.tif`;
}

/**
 * Fetch DEM tile from AWS Copernicus
 *
 * Directly fetches from Copernicus without caching.
 * For production use with many requests, consider implementing
 * a cache layer using GCS, S3, or local file system.
 */
export async function fetchTile(lat: number, lon: number): Promise<ArrayBuffer> {
  const url = getCopernicusTileUrl(lat, lon);

  console.log(`Fetching DEM tile from: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch DEM tile: ${response.status} ${response.statusText}`);
  }

  return response.arrayBuffer();
}

/**
 * Get tile (alias for fetchTile for backwards compatibility)
 */
export async function getTile(lat: number, lon: number): Promise<ArrayBuffer> {
  return fetchTile(lat, lon);
}

/**
 * Fetch DEM from OpenTopography API (requires API key)
 *
 * OpenTopography provides access to multiple DEM datasets including:
 * - COP30: Copernicus 30m
 * - SRTMGL1: SRTM 30m
 * - NASADEM: NASA DEM 30m
 *
 * Requires OPENTOPO_API_KEY environment variable.
 */
export async function fetchFromOpenTopography(
  bounds: BoundingBox,
  demType: 'COP30' | 'SRTMGL1' | 'NASADEM' = 'COP30'
): Promise<ArrayBuffer> {
  const apiKey = process.env.OPENTOPO_API_KEY;

  if (!apiKey) {
    throw new Error('OPENTOPO_API_KEY environment variable is required');
  }

  const url = new URL('https://portal.opentopography.org/API/globaldem');
  url.searchParams.set('demtype', demType);
  url.searchParams.set('south', bounds.south.toString());
  url.searchParams.set('north', bounds.north.toString());
  url.searchParams.set('west', bounds.west.toString());
  url.searchParams.set('east', bounds.east.toString());
  url.searchParams.set('outputFormat', 'GTiff');
  url.searchParams.set('API_Key', apiKey);

  console.log(
    `Fetching from OpenTopography: ${bounds.south},${bounds.west} to ${bounds.north},${bounds.east}`
  );

  const response = await fetch(url.toString());

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenTopography API error: ${response.status} - ${text}`);
  }

  return response.arrayBuffer();
}

/**
 * Pre-defined regions for Chile
 *
 * Common urban areas with their bounding boxes for quick DEM fetching.
 */
export const CHILE_REGIONS = {
  santiago: { south: -33.65, north: -33.3, west: -70.85, east: -70.45 },
  valparaiso: { south: -33.1, north: -32.95, west: -71.7, east: -71.5 },
  concepcion: { south: -36.9, north: -36.75, west: -73.15, east: -72.95 },
  antofagasta: { south: -23.75, north: -23.55, west: -70.45, east: -70.3 },
  temuco: { south: -38.8, north: -38.65, west: -72.7, east: -72.5 },
} as const;

export type ChileRegion = keyof typeof CHILE_REGIONS;
