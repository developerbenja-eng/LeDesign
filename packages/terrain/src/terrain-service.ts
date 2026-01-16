/**
 * Terrain Service - Advanced terrain operations
 * Merges DEM tiles, combines with survey points, extracts profiles
 */

import type { DEMData } from './geotiff-terrain';
import { getElevationAt } from './geotiff-terrain';
import type { Point3D } from './types';

export interface TerrainPoint {
  x: number; // Longitude
  y: number; // Latitude
  z: number; // Elevation (meters)
  source: 'dem' | 'survey' | 'interpolated';
}

export interface TerrainProfile {
  points: TerrainPoint[];
  distance: number; // Total distance in meters
  elevationGain: number;
  elevationLoss: number;
  minElevation: number;
  maxElevation: number;
}

export interface MergedDEM {
  bounds: {
    south: number;
    north: number;
    west: number;
    east: number;
  };
  resolution: number; // meters
  width: number;
  height: number;
  elevations: number[];
  noDataValue: number;
}

/**
 * Merge multiple DEM tiles into a single continuous surface
 */
export function mergeDEMTiles(tiles: DEMData[]): MergedDEM {
  if (tiles.length === 0) {
    throw new Error('No tiles to merge');
  }

  if (tiles.length === 1) {
    // Single tile, return as-is
    return {
      bounds: tiles[0].bounds,
      resolution: 30, // Copernicus 30m
      width: tiles[0].width,
      height: tiles[0].height,
      elevations: Array.from(tiles[0].elevation),
      noDataValue: tiles[0].noDataValue,
    };
  }

  // Find overall bounds
  const bounds = {
    south: Math.min(...tiles.map(t => t.bounds.south)),
    north: Math.max(...tiles.map(t => t.bounds.north)),
    west: Math.min(...tiles.map(t => t.bounds.west)),
    east: Math.max(...tiles.map(t => t.bounds.east)),
  };

  // Calculate merged dimensions
  const resolution = 30; // Copernicus 30m
  const latRange = bounds.north - bounds.south;
  const lonRange = bounds.east - bounds.west;

  // Rough approximation: 1 degree ≈ 111km at equator, varies by latitude
  const avgLat = (bounds.north + bounds.south) / 2;
  const latMetersPerDegree = 111000;
  const lonMetersPerDegree = 111000 * Math.cos((avgLat * Math.PI) / 180);

  const width = Math.ceil((lonRange * lonMetersPerDegree) / resolution);
  const height = Math.ceil((latRange * latMetersPerDegree) / resolution);

  // Create output grid
  const elevations = new Array(width * height).fill(-9999); // noDataValue

  // Sample from tiles
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const lat = bounds.south + (row / height) * latRange;
      const lon = bounds.west + (col / width) * lonRange;

      // Find which tile contains this point
      for (const tile of tiles) {
        if (
          lat >= tile.bounds.south &&
          lat <= tile.bounds.north &&
          lon >= tile.bounds.west &&
          lon <= tile.bounds.east
        ) {
          const elevation = getElevationAt(tile, lon, lat);
          if (elevation !== null) {
            elevations[row * width + col] = elevation;
            break;
          }
        }
      }
    }
  }

  return {
    bounds,
    resolution,
    width,
    height,
    elevations,
    noDataValue: -9999,
  };
}

/**
 * Extract elevation profile along a polyline
 */
export function extractProfile(
  dem: DEMData,
  path: Array<{ lon: number; lat: number }>,
  sampleInterval: number = 10 // meters
): TerrainProfile {
  if (path.length < 2) {
    throw new Error('Path must have at least 2 points');
  }

  const points: TerrainPoint[] = [];
  let totalDistance = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  let minElevation = Infinity;
  let maxElevation = -Infinity;

  for (let i = 0; i < path.length - 1; i++) {
    const start = path[i];
    const end = path[i + 1];

    // Calculate distance between points
    const segmentDistance = haversineDistance(
      start.lat,
      start.lon,
      end.lat,
      end.lon
    );

    // Number of samples for this segment
    const numSamples = Math.max(2, Math.ceil(segmentDistance / sampleInterval));

    for (let j = 0; j < numSamples; j++) {
      const t = j / (numSamples - 1);
      const lat = start.lat + (end.lat - start.lat) * t;
      const lon = start.lon + (end.lon - start.lon) * t;

      const elevation = getElevationAt(dem, lon, lat);

      if (elevation !== null) {
        points.push({
          x: lon,
          y: lat,
          z: elevation,
          source: 'dem',
        });

        minElevation = Math.min(minElevation, elevation);
        maxElevation = Math.max(maxElevation, elevation);

        // Calculate elevation change
        if (points.length > 1) {
          const prevZ = points[points.length - 2].z;
          const deltaZ = elevation - prevZ;
          if (deltaZ > 0) {
            elevationGain += deltaZ;
          } else {
            elevationLoss += Math.abs(deltaZ);
          }
        }
      }
    }

    totalDistance += segmentDistance;
  }

  return {
    points,
    distance: totalDistance,
    elevationGain,
    elevationLoss,
    minElevation: minElevation === Infinity ? 0 : minElevation,
    maxElevation: maxElevation === -Infinity ? 0 : maxElevation,
  };
}

/**
 * Combine DEM data with survey points
 * Survey points override DEM elevations in their vicinity
 */
export function combineDEMWithSurvey(
  dem: DEMData,
  surveyPoints: Point3D[],
  influenceRadius: number = 50 // meters
): MergedDEM {
  const { bounds, width, height, elevation, noDataValue } = dem;

  // Create output grid (copy of DEM)
  const mergedElevations = Array.from(elevation);

  // Calculate meters per pixel
  const avgLat = (bounds.north + bounds.south) / 2;
  const latMetersPerDegree = 111000;
  const lonMetersPerDegree = 111000 * Math.cos((avgLat * Math.PI) / 180);

  const latRange = bounds.north - bounds.south;
  const lonRange = bounds.east - bounds.west;

  const metersPerPixelLat = (latRange * latMetersPerDegree) / height;
  const metersPerPixelLon = (lonRange * lonMetersPerDegree) / width;

  // For each survey point, update nearby DEM cells
  for (const survey of surveyPoints) {
    // Convert survey point to pixel coordinates
    const surveyRow = ((survey.y - bounds.south) / latRange) * height;
    const surveyCol = ((survey.x - bounds.west) / lonRange) * width;

    // Calculate influence radius in pixels
    const radiusPixelsLat = influenceRadius / metersPerPixelLat;
    const radiusPixelsLon = influenceRadius / metersPerPixelLon;

    // Update cells within influence radius
    const minRow = Math.max(0, Math.floor(surveyRow - radiusPixelsLat));
    const maxRow = Math.min(height - 1, Math.ceil(surveyRow + radiusPixelsLat));
    const minCol = Math.max(0, Math.floor(surveyCol - radiusPixelsLon));
    const maxCol = Math.min(width - 1, Math.ceil(surveyCol + radiusPixelsLon));

    for (let row = minRow; row <= maxRow; row++) {
      for (let col = minCol; col <= maxCol; col++) {
        const dRow = row - surveyRow;
        const dCol = col - surveyCol;
        const distance = Math.sqrt(
          (dRow * metersPerPixelLat) ** 2 + (dCol * metersPerPixelLon) ** 2
        );

        if (distance <= influenceRadius) {
          // Inverse distance weighting
          const weight = 1 - distance / influenceRadius;
          const idx = row * width + col;
          const demValue = mergedElevations[idx];

          if (demValue !== noDataValue) {
            // Blend survey point with DEM
            mergedElevations[idx] = demValue * (1 - weight) + survey.z * weight;
          } else {
            // No DEM data, use survey point
            mergedElevations[idx] = survey.z;
          }
        }
      }
    }
  }

  return {
    bounds,
    resolution: 30,
    width,
    height,
    elevations: mergedElevations,
    noDataValue,
  };
}

/**
 * Generate grid of sample points from DEM for TIN generation
 */
export function sampleDEMForTIN(
  dem: DEMData,
  gridSpacing: number = 100 // meters between sample points
): Point3D[] {
  const { bounds, width, height, elevation, noDataValue } = dem;
  const points: Point3D[] = [];

  const avgLat = (bounds.north + bounds.south) / 2;
  const latMetersPerDegree = 111000;
  const lonMetersPerDegree = 111000 * Math.cos((avgLat * Math.PI) / 180);

  const latRange = bounds.north - bounds.south;
  const lonRange = bounds.east - bounds.west;

  const metersPerPixelLat = (latRange * latMetersPerDegree) / height;
  const metersPerPixelLon = (lonRange * lonMetersPerDegree) / width;

  const rowStep = Math.ceil(gridSpacing / metersPerPixelLat);
  const colStep = Math.ceil(gridSpacing / metersPerPixelLon);

  for (let row = 0; row < height; row += rowStep) {
    for (let col = 0; col < width; col += colStep) {
      const idx = row * width + col;
      const elevValue = elevation[idx];

      if (elevValue !== noDataValue) {
        const lat = bounds.south + (row / height) * latRange;
        const lon = bounds.west + (col / width) * lonRange;

        points.push({ x: lon, y: lat, z: elevValue });
      }
    }
  }

  return points;
}

/**
 * Calculate haversine distance between two points (in meters)
 */
function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate slope and aspect from DEM
 */
export interface SlopeAspect {
  slope: number; // degrees
  aspect: number; // degrees (0 = North, 90 = East, 180 = South, 270 = West)
}

export function calculateSlopeAspect(
  dem: DEMData,
  lon: number,
  lat: number
): SlopeAspect | null {
  const { bounds, width, height, elevation, noDataValue } = dem;

  // Convert to pixel coordinates
  const latRange = bounds.north - bounds.south;
  const lonRange = bounds.east - bounds.west;

  const row = Math.floor(((lat - bounds.south) / latRange) * height);
  const col = Math.floor(((lon - bounds.west) / lonRange) * width);

  // Check bounds
  if (row < 1 || row >= height - 1 || col < 1 || col >= width - 1) {
    return null;
  }

  // Get 3x3 neighborhood
  const z = [
    elevation[(row - 1) * width + (col - 1)],
    elevation[(row - 1) * width + col],
    elevation[(row - 1) * width + (col + 1)],
    elevation[row * width + (col - 1)],
    elevation[row * width + col],
    elevation[row * width + (col + 1)],
    elevation[(row + 1) * width + (col - 1)],
    elevation[(row + 1) * width + col],
    elevation[(row + 1) * width + (col + 1)],
  ];

  // Check for noData
  if (z.some(v => v === noDataValue)) {
    return null;
  }

  // Calculate cell size in meters
  const avgLat = (bounds.north + bounds.south) / 2;
  const cellSizeY = (latRange / height) * 111000;
  const cellSizeX = (lonRange / width) * 111000 * Math.cos((avgLat * Math.PI) / 180);

  // Calculate gradients using Horn's method
  const dz_dx = ((z[2] + 2 * z[5] + z[8]) - (z[0] + 2 * z[3] + z[6])) / (8 * cellSizeX);
  const dz_dy = ((z[6] + 2 * z[7] + z[8]) - (z[0] + 2 * z[1] + z[2])) / (8 * cellSizeY);

  // Calculate slope (in degrees)
  const slope = Math.atan(Math.sqrt(dz_dx * dz_dx + dz_dy * dz_dy)) * (180 / Math.PI);

  // Calculate aspect (in degrees)
  let aspect = Math.atan2(dz_dy, -dz_dx) * (180 / Math.PI);
  if (aspect < 0) {
    aspect += 360;
  }

  return { slope, aspect };
}
