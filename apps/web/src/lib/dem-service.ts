/**
 * DEM Service - Fetches and caches Digital Elevation Models
 * Sources: AWS Copernicus (no auth), OpenTopography (API key), GCS cache
 *
 * NOTE: This module is server-only and should only be imported in API routes
 */

import 'server-only';
import { Storage } from '@google-cloud/storage';

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

// Initialize GCS client (uses ADC or service account)
let storageClient: Storage | null = null;

function getStorageClient(): Storage {
  if (!storageClient) {
    // Try service account key first, fall back to ADC
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (keyPath) {
      storageClient = new Storage({ keyFilename: keyPath });
    } else {
      storageClient = new Storage();
    }
  }
  return storageClient;
}

/**
 * Get Copernicus DEM tile URL from AWS S3 (no auth required)
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
 * Check if a tile is cached in GCS
 */
export async function checkTileCache(lat: number, lon: number): Promise<string | null> {
  try {
    const storage = getStorageClient();
    const fileName = getTileFileName(lat, lon);
    const filePath = `${GCS_DEM_PREFIX}/${fileName}`;

    const [exists] = await storage.bucket(GCS_BUCKET).file(filePath).exists();

    if (exists) {
      return `gs://${GCS_BUCKET}/${filePath}`;
    }
    return null;
  } catch (error) {
    console.error('Error checking cache:', error);
    return null;
  }
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
 * Fetch DEM tile from AWS Copernicus and cache to GCS
 */
export async function fetchAndCacheTile(lat: number, lon: number): Promise<ArrayBuffer> {
  const url = getCopernicusTileUrl(lat, lon);

  console.log(`Fetching DEM tile from: ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch DEM tile: ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();

  // Cache to GCS in background
  cacheTileToGCS(lat, lon, Buffer.from(buffer)).catch(err => {
    console.error('Failed to cache tile to GCS:', err);
  });

  return buffer;
}

/**
 * Cache tile buffer to GCS
 */
async function cacheTileToGCS(lat: number, lon: number, buffer: Buffer): Promise<void> {
  try {
    const storage = getStorageClient();
    const fileName = getTileFileName(lat, lon);
    const filePath = `${GCS_DEM_PREFIX}/${fileName}`;

    await storage.bucket(GCS_BUCKET).file(filePath).save(buffer, {
      contentType: 'image/tiff',
      metadata: {
        source: 'copernicus',
        lat: lat.toString(),
        lon: lon.toString(),
        cachedAt: new Date().toISOString(),
      },
    });

    console.log(`Cached tile to gs://${GCS_BUCKET}/${filePath}`);
  } catch (error) {
    console.error('Error caching to GCS:', error);
    throw error;
  }
}

/**
 * Get tile from cache or fetch from source
 */
export async function getTile(lat: number, lon: number): Promise<ArrayBuffer> {
  // Check cache first
  const cached = await checkTileCache(lat, lon);

  if (cached) {
    console.log(`Loading tile from cache: ${cached}`);
    const storage = getStorageClient();
    const fileName = getTileFileName(lat, lon);
    const filePath = `${GCS_DEM_PREFIX}/${fileName}`;

    const [buffer] = await storage.bucket(GCS_BUCKET).file(filePath).download();
    // Convert Buffer to ArrayBuffer
    return new Uint8Array(buffer).buffer;
  }

  // Fetch from source and cache
  return fetchAndCacheTile(lat, lon);
}

/**
 * Fetch DEM from OpenTopography API (requires API key)
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

  console.log(`Fetching from OpenTopography: ${bounds.south},${bounds.west} to ${bounds.north},${bounds.east}`);

  const response = await fetch(url.toString());

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenTopography API error: ${response.status} - ${text}`);
  }

  return response.arrayBuffer();
}

/**
 * Get signed URL for direct browser access to cached tile
 */
export async function getSignedUrl(lat: number, lon: number, expiresInMinutes = 60): Promise<string | null> {
  const cached = await checkTileCache(lat, lon);

  if (!cached) {
    return null;
  }

  const storage = getStorageClient();
  const fileName = getTileFileName(lat, lon);
  const filePath = `${GCS_DEM_PREFIX}/${fileName}`;

  const [url] = await storage.bucket(GCS_BUCKET).file(filePath).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });

  return url;
}

/**
 * List all cached tiles
 */
export async function listCachedTiles(): Promise<DEMTile[]> {
  try {
    const storage = getStorageClient();
    const [files] = await storage.bucket(GCS_BUCKET).getFiles({
      prefix: GCS_DEM_PREFIX,
    });

    const tiles: DEMTile[] = [];

    for (const file of files) {
      if (file.name.endsWith('.tif')) {
        const match = file.name.match(/([NS])(\d{2})_([EW])(\d{3})\.tif$/);
        if (match) {
          const lat = parseInt(match[2]) * (match[1] === 'S' ? -1 : 1);
          const lon = parseInt(match[4]) * (match[3] === 'W' ? -1 : 1);

          tiles.push({
            lat,
            lon,
            url: getCopernicusTileUrl(lat, lon),
            cached: true,
            gcsPath: `gs://${GCS_BUCKET}/${file.name}`,
          });
        }
      }
    }

    return tiles;
  } catch (error) {
    console.error('Error listing cached tiles:', error);
    return [];
  }
}

// Pre-defined regions for Chile
export const CHILE_REGIONS = {
  santiago: { south: -33.65, north: -33.30, west: -70.85, east: -70.45 },
  valparaiso: { south: -33.10, north: -32.95, west: -71.70, east: -71.50 },
  concepcion: { south: -36.90, north: -36.75, west: -73.15, east: -72.95 },
  antofagasta: { south: -23.75, north: -23.55, west: -70.45, east: -70.30 },
  temuco: { south: -38.80, north: -38.65, west: -72.70, east: -72.50 },
} as const;

export type ChileRegion = keyof typeof CHILE_REGIONS;
