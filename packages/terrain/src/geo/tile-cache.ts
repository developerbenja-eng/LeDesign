/**
 * Tile-based Rendering and Caching System
 * Divides viewport into tiles, renders each independently, and caches results
 */

import type { LatLng } from '../cad-types';
import type { SpatialIndex } from './spatial-index';

export interface TileCoord {
  x: number;
  y: number;
  z: number;  // zoom level
}

export interface TileBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface CachedTile {
  coord: TileCoord;
  canvas: OffscreenCanvas | HTMLCanvasElement;
  timestamp: number;
  entityCount: number;
  version: number;  // Incremented when entities change
}

// Standard web map tile size
const TILE_SIZE = 256;

// Maximum cache size (tiles)
const MAX_CACHE_SIZE = 256;

// Tile expiration time (ms)
const TILE_TTL = 60000;

/**
 * Convert lat/lng to tile coordinates at a given zoom level
 */
export function latLngToTile(lat: number, lng: number, zoom: number): TileCoord {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n);

  return {
    x: Math.max(0, Math.min(n - 1, x)),
    y: Math.max(0, Math.min(n - 1, y)),
    z: zoom,
  };
}

/**
 * Convert tile coordinates to lat/lng bounds
 */
export function tileToLatLngBounds(tile: TileCoord): TileBounds {
  const n = Math.pow(2, tile.z);

  const west = (tile.x / n) * 360 - 180;
  const east = ((tile.x + 1) / n) * 360 - 180;

  const northRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * tile.y / n)));
  const southRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (tile.y + 1) / n)));

  const north = northRad * 180 / Math.PI;
  const south = southRad * 180 / Math.PI;

  return { north, south, east, west };
}

/**
 * Get tile key for caching
 */
export function getTileKey(tile: TileCoord): string {
  return `${tile.z}/${tile.x}/${tile.y}`;
}

/**
 * Get visible tiles for a viewport
 */
export function getVisibleTiles(
  bounds: { north: number; south: number; east: number; west: number },
  zoom: number
): TileCoord[] {
  const tiles: TileCoord[] = [];

  const nwTile = latLngToTile(bounds.north, bounds.west, zoom);
  const seTile = latLngToTile(bounds.south, bounds.east, zoom);

  // Handle date line wrap-around
  const minX = nwTile.x;
  let maxX = seTile.x;

  if (bounds.west > bounds.east) {
    // Viewport crosses date line
    const n = Math.pow(2, zoom);
    maxX = seTile.x + n;
  }

  for (let x = minX; x <= maxX; x++) {
    const n = Math.pow(2, zoom);
    const normalizedX = ((x % n) + n) % n;

    for (let y = nwTile.y; y <= seTile.y; y++) {
      tiles.push({ x: normalizedX, y, z: zoom });
    }
  }

  return tiles;
}

/**
 * Tile Cache with LRU eviction
 */
export class TileCache {
  private cache: Map<string, CachedTile> = new Map();
  private accessOrder: string[] = [];
  private dataVersion = 0;

  /**
   * Get a cached tile
   */
  get(tile: TileCoord): CachedTile | null {
    const key = getTileKey(tile);
    const cached = this.cache.get(key);

    if (!cached) return null;

    // Check if tile is still valid
    if (Date.now() - cached.timestamp > TILE_TTL) {
      this.cache.delete(key);
      return null;
    }

    // Check if data has changed
    if (cached.version !== this.dataVersion) {
      this.cache.delete(key);
      return null;
    }

    // Update access order (LRU)
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);

    return cached;
  }

  /**
   * Store a tile in cache
   */
  set(tile: TileCoord, canvas: OffscreenCanvas | HTMLCanvasElement, entityCount: number): void {
    const key = getTileKey(tile);

    // Evict old tiles if cache is full
    while (this.cache.size >= MAX_CACHE_SIZE && this.accessOrder.length > 0) {
      const oldestKey = this.accessOrder.shift()!;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      coord: tile,
      canvas,
      timestamp: Date.now(),
      entityCount,
      version: this.dataVersion,
    });

    this.accessOrder.push(key);
  }

  /**
   * Invalidate all cached tiles (call when entities change)
   */
  invalidate(): void {
    this.dataVersion++;
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses
    };
  }
}

/**
 * Tile Renderer
 * Renders entities into tiles using a spatial index for efficient lookups
 */
export class TileRenderer<T extends {
  id: string;
  type: string;
  color: string;
  geoPoints: LatLng[];
  geoCenter?: LatLng;
  radiusMeters?: number;
  startAngle?: number;
  endAngle?: number;
}> {
  private cache: TileCache;
  private spatialIndex: SpatialIndex<T> | null = null;

  constructor() {
    this.cache = new TileCache();
  }

  /**
   * Set the spatial index for entity lookups
   */
  setSpatialIndex(index: SpatialIndex<T>): void {
    this.spatialIndex = index;
    this.cache.invalidate();
  }

  /**
   * Render entities in viewport using tile caching
   */
  renderViewport(
    viewport: { north: number; south: number; east: number; west: number },
    zoom: number,
    targetCanvas: HTMLCanvasElement | OffscreenCanvas
  ): void {
    const ctx = targetCanvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    if (!ctx) return;

    // Clear target canvas
    ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

    // Get visible tiles
    const tiles = getVisibleTiles(viewport, Math.floor(zoom));

    // Calculate viewport to canvas transform
    const viewportWidth = viewport.east - viewport.west;
    const viewportHeight = viewport.north - viewport.south;
    const scaleX = targetCanvas.width / viewportWidth;
    const scaleY = targetCanvas.height / viewportHeight;

    // Render each tile
    for (const tile of tiles) {
      const cachedTile = this.cache.get(tile);
      let tileCanvas: OffscreenCanvas | HTMLCanvasElement;

      if (cachedTile) {
        tileCanvas = cachedTile.canvas;
      } else {
        // Render new tile
        tileCanvas = this.renderTile(tile);
      }

      // Calculate tile position in target canvas
      const tileBounds = tileToLatLngBounds(tile);
      const x = (tileBounds.west - viewport.west) * scaleX;
      const y = (viewport.north - tileBounds.north) * scaleY;
      const width = (tileBounds.east - tileBounds.west) * scaleX;
      const height = (tileBounds.north - tileBounds.south) * scaleY;

      // Draw tile to target canvas
      ctx.drawImage(tileCanvas, x, y, width, height);
    }
  }

  /**
   * Render a single tile
   */
  private renderTile(tile: TileCoord): OffscreenCanvas | HTMLCanvasElement {
    // Create tile canvas
    const canvas = typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(TILE_SIZE, TILE_SIZE)
      : document.createElement('canvas');

    if ('width' in canvas) {
      canvas.width = TILE_SIZE;
      canvas.height = TILE_SIZE;
    }

    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    if (!ctx || !this.spatialIndex) {
      this.cache.set(tile, canvas, 0);
      return canvas;
    }

    // Get tile bounds
    const bounds = tileToLatLngBounds(tile);

    // Query entities in tile
    const entities = this.spatialIndex.query({
      minX: bounds.west,
      minY: bounds.south,
      maxX: bounds.east,
      maxY: bounds.north,
    }).map(item => item.data);

    // Set up transform from lat/lng to tile pixels
    const lngRange = bounds.east - bounds.west;
    const latRange = bounds.north - bounds.south;

    const lngToX = (lng: number) => ((lng - bounds.west) / lngRange) * TILE_SIZE;
    const latToY = (lat: number) => ((bounds.north - lat) / latRange) * TILE_SIZE;

    // Render entities
    for (const entity of entities) {
      ctx.strokeStyle = entity.color;
      ctx.fillStyle = entity.color;
      ctx.lineWidth = 1;

      switch (entity.type) {
        case 'point':
          if (entity.geoPoints[0]) {
            const x = lngToX(entity.geoPoints[0].lng);
            const y = latToY(entity.geoPoints[0].lat);
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
          }
          break;

        case 'line':
        case 'polyline':
          if (entity.geoPoints.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(
              lngToX(entity.geoPoints[0].lng),
              latToY(entity.geoPoints[0].lat)
            );
            for (let i = 1; i < entity.geoPoints.length; i++) {
              ctx.lineTo(
                lngToX(entity.geoPoints[i].lng),
                latToY(entity.geoPoints[i].lat)
              );
            }
            ctx.stroke();
          }
          break;

        case 'circle':
          if (entity.geoCenter && entity.radiusMeters) {
            const cx = lngToX(entity.geoCenter.lng);
            const cy = latToY(entity.geoCenter.lat);

            // Calculate pixel radius (approximate)
            const latOffset = entity.radiusMeters / 111320;
            const radiusPixels = (latOffset / latRange) * TILE_SIZE;

            ctx.beginPath();
            ctx.arc(cx, cy, radiusPixels, 0, Math.PI * 2);
            ctx.stroke();
          }
          break;

        case 'arc':
          if (entity.geoCenter && entity.radiusMeters && entity.startAngle !== undefined && entity.endAngle !== undefined) {
            const cx = lngToX(entity.geoCenter.lng);
            const cy = latToY(entity.geoCenter.lat);

            const latOffset = entity.radiusMeters / 111320;
            const radiusPixels = (latOffset / latRange) * TILE_SIZE;

            ctx.beginPath();
            ctx.arc(cx, cy, radiusPixels, entity.startAngle, entity.endAngle);
            ctx.stroke();
          }
          break;
      }
    }

    // Cache the rendered tile
    this.cache.set(tile, canvas, entities.length);

    return canvas;
  }

  /**
   * Invalidate cache (call when entities change)
   */
  invalidate(): void {
    this.cache.invalidate();
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Get optimal tile zoom level for a viewport
 */
export function getOptimalTileZoom(
  viewportWidth: number,
  viewportHeight: number,
  bounds: { north: number; south: number; east: number; west: number }
): number {
  const lngRange = bounds.east - bounds.west;
  const latRange = bounds.north - bounds.south;

  // Calculate zoom level where 1 tile ≈ viewport size
  const lngZoom = Math.log2(360 / lngRange);
  const latZoom = Math.log2(180 / latRange);

  // Use the smaller zoom (larger area)
  const zoom = Math.min(lngZoom, latZoom);

  // Clamp to valid range and round
  return Math.max(0, Math.min(22, Math.floor(zoom)));
}
