/**
 * GeoTIFF to Three.js Terrain Converter
 * Parses GeoTIFF DEM files and generates 3D terrain meshes
 */

import * as THREE from 'three';
import GeoTIFF, { fromArrayBuffer, fromUrl } from 'geotiff';

// Types
export interface DEMData {
  width: number;
  height: number;
  elevation: Float32Array;
  bounds: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
  resolution: {
    x: number; // meters per pixel
    y: number;
  };
  noDataValue: number;
  minElevation: number;
  maxElevation: number;
  crs: string;
}

export interface TerrainOptions {
  verticalExaggeration?: number;
  colorByElevation?: boolean;
  wireframe?: boolean;
  simplify?: number; // 1 = full resolution, 2 = half, etc.
}

/**
 * Load and parse GeoTIFF from ArrayBuffer
 */
export async function parseGeoTIFF(buffer: ArrayBuffer): Promise<DEMData> {
  const tiff = await fromArrayBuffer(buffer);
  const image = await tiff.getImage();

  const width = image.getWidth();
  const height = image.getHeight();
  const [west, south, east, north] = image.getBoundingBox();
  const [resX, resY] = image.getResolution();

  // Read raster data
  const rasters = await image.readRasters();
  const rawData = rasters[0] as Float32Array | Int16Array | Uint16Array;

  // Convert to Float32Array and find stats
  const elevation = new Float32Array(rawData.length);
  let minElevation = Infinity;
  let maxElevation = -Infinity;
  const noDataValue = image.getGDALNoData() ?? -9999;

  for (let i = 0; i < rawData.length; i++) {
    const value = rawData[i];
    elevation[i] = value;

    if (value !== noDataValue && isFinite(value)) {
      minElevation = Math.min(minElevation, value);
      maxElevation = Math.max(maxElevation, value);
    }
  }

  // Get CRS info
  const geoKeys = image.getGeoKeys();
  const crs = geoKeys.ProjectedCSTypeGeoKey
    ? `EPSG:${geoKeys.ProjectedCSTypeGeoKey}`
    : geoKeys.GeographicTypeGeoKey
      ? `EPSG:${geoKeys.GeographicTypeGeoKey}`
      : 'EPSG:4326';

  return {
    width,
    height,
    elevation,
    bounds: { west, south, east, north },
    resolution: { x: Math.abs(resX), y: Math.abs(resY) },
    noDataValue,
    minElevation,
    maxElevation,
    crs,
  };
}

/**
 * Load GeoTIFF from URL
 */
export async function loadGeoTIFFFromUrl(url: string): Promise<DEMData> {
  const tiff = await fromUrl(url);
  const image = await tiff.getImage();

  const width = image.getWidth();
  const height = image.getHeight();
  const [west, south, east, north] = image.getBoundingBox();
  const [resX, resY] = image.getResolution();

  const rasters = await image.readRasters();
  const rawData = rasters[0] as Float32Array | Int16Array | Uint16Array;

  const elevation = new Float32Array(rawData.length);
  let minElevation = Infinity;
  let maxElevation = -Infinity;
  const noDataValue = image.getGDALNoData() ?? -9999;

  for (let i = 0; i < rawData.length; i++) {
    const value = rawData[i];
    elevation[i] = value;

    if (value !== noDataValue && isFinite(value)) {
      minElevation = Math.min(minElevation, value);
      maxElevation = Math.max(maxElevation, value);
    }
  }

  const geoKeys = image.getGeoKeys();
  const crs = geoKeys.ProjectedCSTypeGeoKey
    ? `EPSG:${geoKeys.ProjectedCSTypeGeoKey}`
    : 'EPSG:4326';

  return {
    width,
    height,
    elevation,
    bounds: { west, south, east, north },
    resolution: { x: Math.abs(resX), y: Math.abs(resY) },
    noDataValue,
    minElevation,
    maxElevation,
    crs,
  };
}

/**
 * Convert DEM data to Three.js BufferGeometry
 */
export function demToGeometry(dem: DEMData, options: TerrainOptions = {}): THREE.BufferGeometry {
  const {
    verticalExaggeration = 1,
    simplify = 1,
  } = options;

  // Calculate dimensions
  const sampledWidth = Math.ceil(dem.width / simplify);
  const sampledHeight = Math.ceil(dem.height / simplify);

  // Calculate real-world dimensions in meters
  // For geographic coordinates, approximate meters using latitude
  const centerLat = (dem.bounds.north + dem.bounds.south) / 2;
  const metersPerDegreeLat = 111320; // Approximately constant
  const metersPerDegreeLon = 111320 * Math.cos(centerLat * Math.PI / 180);

  const worldWidth = (dem.bounds.east - dem.bounds.west) * metersPerDegreeLon;
  const worldHeight = (dem.bounds.north - dem.bounds.south) * metersPerDegreeLat;

  // Create plane geometry with subdivisions matching DEM resolution
  const geometry = new THREE.PlaneGeometry(
    worldWidth,
    worldHeight,
    sampledWidth - 1,
    sampledHeight - 1
  );

  // Get position attribute
  const positions = geometry.attributes.position.array as Float32Array;

  // Update Z values (elevation)
  for (let j = 0; j < sampledHeight; j++) {
    for (let i = 0; i < sampledWidth; i++) {
      const vertexIndex = j * sampledWidth + i;

      // Sample from original DEM data
      const demI = Math.min(i * simplify, dem.width - 1);
      const demJ = Math.min(j * simplify, dem.height - 1);
      const demIndex = demJ * dem.width + demI;

      let elevation = dem.elevation[demIndex];

      // Handle nodata values
      if (elevation === dem.noDataValue || !isFinite(elevation)) {
        elevation = dem.minElevation;
      }

      // Set Z position (elevation with exaggeration)
      // Note: PlaneGeometry is XY, we use Z for height
      positions[vertexIndex * 3 + 2] = elevation * verticalExaggeration;
    }
  }

  // Update normals for proper lighting
  geometry.computeVertexNormals();

  // Add UV mapping for textures
  geometry.computeBoundingBox();

  return geometry;
}

/**
 * Create elevation-based color attribute for terrain
 */
export function createElevationColors(dem: DEMData, geometry: THREE.BufferGeometry): Float32Array {
  const positions = geometry.attributes.position.array as Float32Array;
  const vertexCount = positions.length / 3;
  const colors = new Float32Array(vertexCount * 3);

  const elevationRange = dem.maxElevation - dem.minElevation;

  // Color gradient: blue (low) -> green -> yellow -> red -> white (high)
  for (let i = 0; i < vertexCount; i++) {
    const elevation = positions[i * 3 + 2]; // Z is elevation
    const t = (elevation - dem.minElevation) / elevationRange;

    let r, g, b;

    if (t < 0.25) {
      // Blue to green
      const u = t / 0.25;
      r = 0;
      g = u;
      b = 1 - u;
    } else if (t < 0.5) {
      // Green to yellow
      const u = (t - 0.25) / 0.25;
      r = u;
      g = 1;
      b = 0;
    } else if (t < 0.75) {
      // Yellow to red
      const u = (t - 0.5) / 0.25;
      r = 1;
      g = 1 - u;
      b = 0;
    } else {
      // Red to white
      const u = (t - 0.75) / 0.25;
      r = 1;
      g = u;
      b = u;
    }

    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  return colors;
}

/**
 * Create a terrain mesh with material
 */
export function createTerrainMesh(
  dem: DEMData,
  options: TerrainOptions = {}
): THREE.Mesh {
  const geometry = demToGeometry(dem, options);

  let material: THREE.Material;

  if (options.colorByElevation) {
    const colors = createElevationColors(dem, geometry);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      wireframe: options.wireframe ?? false,
      side: THREE.DoubleSide,
      flatShading: false,
    });
  } else {
    material = new THREE.MeshStandardMaterial({
      color: 0x8B7355, // Earth tone
      roughness: 0.9,
      metalness: 0.0,
      wireframe: options.wireframe ?? false,
      side: THREE.DoubleSide,
      flatShading: false,
    });
  }

  const mesh = new THREE.Mesh(geometry, material);

  // Rotate to make Y up (Three.js convention)
  mesh.rotation.x = -Math.PI / 2;

  // Store metadata
  mesh.userData = {
    dem: {
      bounds: dem.bounds,
      resolution: dem.resolution,
      minElevation: dem.minElevation,
      maxElevation: dem.maxElevation,
      crs: dem.crs,
    },
  };

  return mesh;
}

/**
 * Create contour lines from DEM
 */
export function createContourLines(
  dem: DEMData,
  interval: number = 10, // meters between contours
  options: { color?: number; lineWidth?: number } = {}
): THREE.Group {
  const { color = 0x333333 } = options;
  const group = new THREE.Group();

  const centerLat = (dem.bounds.north + dem.bounds.south) / 2;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLon = 111320 * Math.cos(centerLat * Math.PI / 180);

  const cellWidth = (dem.bounds.east - dem.bounds.west) * metersPerDegreeLon / dem.width;
  const cellHeight = (dem.bounds.north - dem.bounds.south) * metersPerDegreeLat / dem.height;

  // Generate contour levels
  const startLevel = Math.ceil(dem.minElevation / interval) * interval;
  const endLevel = Math.floor(dem.maxElevation / interval) * interval;

  for (let level = startLevel; level <= endLevel; level += interval) {
    const points: THREE.Vector3[] = [];

    // Marching squares algorithm (simplified)
    for (let j = 0; j < dem.height - 1; j++) {
      for (let i = 0; i < dem.width - 1; i++) {
        const idx00 = j * dem.width + i;
        const idx10 = j * dem.width + i + 1;
        const idx01 = (j + 1) * dem.width + i;
        const idx11 = (j + 1) * dem.width + i + 1;

        const v00 = dem.elevation[idx00];
        const v10 = dem.elevation[idx10];
        const v01 = dem.elevation[idx01];
        const v11 = dem.elevation[idx11];

        // Check if contour crosses this cell
        const above00 = v00 >= level;
        const above10 = v10 >= level;
        const above01 = v01 >= level;
        const above11 = v11 >= level;

        if (above00 !== above10 || above00 !== above01 || above00 !== above11) {
          // Interpolate crossing points
          const x = i * cellWidth - (dem.width * cellWidth) / 2;
          const y = j * cellHeight - (dem.height * cellHeight) / 2;

          // Add midpoint as simplified contour point
          points.push(new THREE.Vector3(x + cellWidth / 2, level, y + cellHeight / 2));
        }
      }
    }

    if (points.length > 1) {
      const contourGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const contourMaterial = new THREE.PointsMaterial({
        color,
        size: 2,
      });
      const contourPoints = new THREE.Points(contourGeometry, contourMaterial);
      contourPoints.userData.elevation = level;
      group.add(contourPoints);
    }
  }

  return group;
}

/**
 * Get elevation at a specific coordinate
 */
export function getElevationAt(dem: DEMData, lon: number, lat: number): number | null {
  // Check if point is within bounds
  if (
    lon < dem.bounds.west ||
    lon > dem.bounds.east ||
    lat < dem.bounds.south ||
    lat > dem.bounds.north
  ) {
    return null;
  }

  // Calculate pixel coordinates
  const x = ((lon - dem.bounds.west) / (dem.bounds.east - dem.bounds.west)) * dem.width;
  const y = ((dem.bounds.north - lat) / (dem.bounds.north - dem.bounds.south)) * dem.height;

  // Bilinear interpolation
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, dem.width - 1);
  const y1 = Math.min(y0 + 1, dem.height - 1);

  const fx = x - x0;
  const fy = y - y0;

  const v00 = dem.elevation[y0 * dem.width + x0];
  const v10 = dem.elevation[y0 * dem.width + x1];
  const v01 = dem.elevation[y1 * dem.width + x0];
  const v11 = dem.elevation[y1 * dem.width + x1];

  // Handle nodata
  if (v00 === dem.noDataValue || v10 === dem.noDataValue ||
      v01 === dem.noDataValue || v11 === dem.noDataValue) {
    return null;
  }

  // Bilinear interpolation
  const elevation =
    v00 * (1 - fx) * (1 - fy) +
    v10 * fx * (1 - fy) +
    v01 * (1 - fx) * fy +
    v11 * fx * fy;

  return elevation;
}
