/**
 * Data Layers API
 *
 * Fetch specific data layers by ID for a given bounding box.
 * This is useful for incrementally loading data layers in the map viewer.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { BoundingBox } from '@ledesign/terrain/triangulation';

// Import individual data source functions
import {
  fetchGeology,
  fetchFaults,
  fetchVolcanoes,
  fetchLandslideZones,
  getSeismicZone,
} from '@ledesign/hydraulics/data-sources/sernageomin';

import {
  fetchVegetation,
  fetchProtectedAreas,
  fetchActiveFires,
  fetchHistoricalFires,
  fetchNativeForest,
} from '@ledesign/hydraulics/data-sources/conaf';

import {
  findNearestTideStation,
  estimateTidalRange,
  fetchTsunamiZones,
  calculateDesignWaterLevel,
  TIDE_STATIONS,
} from '@ledesign/hydraulics/data-sources/shoa';

import {
  fetchZoning,
  fetchRiskZones,
  fetchPatrimony,
  checkUrbanLimit,
} from '@ledesign/hydraulics/data-sources/minvu';

import {
  estimateSoilType,
  getNCh433Classification,
  recommendFoundation,
  estimateGroundwater,
} from '@ledesign/hydraulics/data-sources/soil';

export const dynamic = 'force-dynamic';

// Helper to create a full BoundingBox with Z coordinates
function createBounds(minX: number, maxX: number, minY: number, maxY: number): BoundingBox {
  return {
    minX,
    maxX,
    minY,
    maxY,
    minZ: 0,
    maxZ: 10000, // Default max elevation for Chile
  };
}

// Layer fetch functions
const layerFetchers: Record<string, (bounds: BoundingBox, center: { lat: number; lon: number }) => Promise<unknown>> = {
  // SERNAGEOMIN
  geology: async (bounds) => fetchGeology(bounds),
  faults: async (bounds) => fetchFaults(bounds),
  volcanoes: async () => fetchVolcanoes(),
  landslides: async (bounds) => fetchLandslideZones(bounds),
  seismic_zone: async (_, center) => getSeismicZone(center.lat, center.lon),

  // CONAF
  vegetation: async (bounds) => fetchVegetation(bounds),
  snaspe: async (bounds) => fetchProtectedAreas(bounds),
  fires_active: async (bounds) => fetchActiveFires(bounds),
  fires_historical: async (bounds) => fetchHistoricalFires(bounds),
  native_forest: async (bounds) => fetchNativeForest(bounds),

  // SHOA
  tide_stations: async () => TIDE_STATIONS,
  nearest_tide_station: async (_, center) => findNearestTideStation(center.lat, center.lon),
  tidal_range: async (_, center) => estimateTidalRange(center.lat, center.lon),
  tsunami: async (bounds) => fetchTsunamiZones(bounds),
  design_water_level: async (_, center) => calculateDesignWaterLevel(center.lat, center.lon, 100, true),

  // MINVU
  zoning: async (bounds) => fetchZoning(bounds),
  urban_risk: async (bounds) => fetchRiskZones(bounds),
  patrimony: async (bounds) => fetchPatrimony(bounds),
  urban_limit: async (_, center) => checkUrbanLimit(center.lat, center.lon),

  // SOIL
  soil_type: async (_, center) => estimateSoilType(center.lat, center.lon),
  nch433_soil: async (_, center) => getNCh433Classification(center.lat, center.lon),
  groundwater: async (_, center) => estimateGroundwater(center.lat, center.lon),
  foundation: async (_, center) => recommendFoundation(center.lat, center.lon, 'vivienda'), // Default to residential
};

// Available layer IDs
const AVAILABLE_LAYERS = Object.keys(layerFetchers);

// ============================================================================
// GET: Fetch specific layer(s)
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Get layer ID(s)
  const layerParam = searchParams.get('layer') || searchParams.get('layers');
  if (!layerParam) {
    return NextResponse.json({
      success: true,
      message: 'Capas de datos disponibles',
      availableLayers: AVAILABLE_LAYERS,
      usage: 'GET /api/data-layers?layer=geology&minX=-70.7&maxX=-70.6&minY=-33.5&maxY=-33.4',
    });
  }

  // Parse layer IDs
  const layerIds = layerParam.split(',').map(l => l.trim());
  const invalidLayers = layerIds.filter(l => !AVAILABLE_LAYERS.includes(l));
  if (invalidLayers.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Capas no válidas: ${invalidLayers.join(', ')}`,
        availableLayers: AVAILABLE_LAYERS,
      },
      { status: 400 }
    );
  }

  // Get bounds
  const minX = parseFloat(searchParams.get('minX') || '');
  const maxX = parseFloat(searchParams.get('maxX') || '');
  const minY = parseFloat(searchParams.get('minY') || '');
  const maxY = parseFloat(searchParams.get('maxY') || '');

  // Or center point
  const lat = parseFloat(searchParams.get('lat') || '');
  const lon = parseFloat(searchParams.get('lon') || '');
  const radius = parseFloat(searchParams.get('radius') || '1'); // km

  let bounds: BoundingBox;
  let center: { lat: number; lon: number };

  if (!isNaN(minX) && !isNaN(maxX) && !isNaN(minY) && !isNaN(maxY)) {
    bounds = createBounds(minX, maxX, minY, maxY);
    center = { lat: (minY + maxY) / 2, lon: (minX + maxX) / 2 };
  } else if (!isNaN(lat) && !isNaN(lon)) {
    const latOffset = radius / 111.32;
    const lonOffset = radius / (111.32 * Math.cos(lat * Math.PI / 180));
    bounds = createBounds(
      lon - lonOffset,
      lon + lonOffset,
      lat - latOffset,
      lat + latOffset
    );
    center = { lat, lon };
  } else {
    return NextResponse.json(
      {
        success: false,
        error: 'Se requieren bounds (minX, maxX, minY, maxY) o center (lat, lon)',
      },
      { status: 400 }
    );
  }

  // Validate coordinates are in Chile
  if (center.lat < -56 || center.lat > -17 || center.lon < -76 || center.lon > -66) {
    return NextResponse.json(
      { success: false, error: 'Coordenadas fuera del territorio chileno' },
      { status: 400 }
    );
  }

  // Fetch requested layers in parallel
  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  await Promise.all(
    layerIds.map(async (layerId) => {
      try {
        const fetcher = layerFetchers[layerId];
        results[layerId] = await fetcher(bounds, center);
      } catch (error) {
        errors.push(`${layerId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    })
  );

  return NextResponse.json({
    success: true,
    bounds: { minX: bounds.minX, maxX: bounds.maxX, minY: bounds.minY, maxY: bounds.maxY },
    center,
    layers: results,
    errors: errors.length > 0 ? errors : undefined,
    metadata: {
      timestamp: new Date().toISOString(),
      layersRequested: layerIds.length,
      layersSuccessful: Object.keys(results).length,
    },
  });
}

// ============================================================================
// POST: Batch fetch multiple layers with options
// ============================================================================

interface BatchLayerRequest {
  layers: string[];
  bounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  center?: {
    lat: number;
    lon: number;
    radiusKm?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: BatchLayerRequest = await request.json();

    if (!body.layers || !Array.isArray(body.layers) || body.layers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere un array de layers',
          availableLayers: AVAILABLE_LAYERS,
        },
        { status: 400 }
      );
    }

    // Validate layers
    const invalidLayers = body.layers.filter(l => !AVAILABLE_LAYERS.includes(l));
    if (invalidLayers.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Capas no válidas: ${invalidLayers.join(', ')}`,
          availableLayers: AVAILABLE_LAYERS,
        },
        { status: 400 }
      );
    }

    // Get bounds
    let bounds: BoundingBox;
    let center: { lat: number; lon: number };

    if (body.bounds) {
      bounds = createBounds(body.bounds.minX, body.bounds.maxX, body.bounds.minY, body.bounds.maxY);
      center = { lat: (bounds.minY + bounds.maxY) / 2, lon: (bounds.minX + bounds.maxX) / 2 };
    } else if (body.center) {
      const radiusKm = body.center.radiusKm || 1;
      const latOffset = radiusKm / 111.32;
      const lonOffset = radiusKm / (111.32 * Math.cos(body.center.lat * Math.PI / 180));
      bounds = createBounds(
        body.center.lon - lonOffset,
        body.center.lon + lonOffset,
        body.center.lat - latOffset,
        body.center.lat + latOffset
      );
      center = { lat: body.center.lat, lon: body.center.lon };
    } else {
      return NextResponse.json(
        { success: false, error: 'Se requiere bounds o center en el request' },
        { status: 400 }
      );
    }

    // Validate coordinates
    if (center.lat < -56 || center.lat > -17 || center.lon < -76 || center.lon > -66) {
      return NextResponse.json(
        { success: false, error: 'Coordenadas fuera del territorio chileno' },
        { status: 400 }
      );
    }

    // Fetch all requested layers
    const results: Record<string, unknown> = {};
    const errors: string[] = [];

    await Promise.all(
      body.layers.map(async (layerId) => {
        try {
          const fetcher = layerFetchers[layerId];
          results[layerId] = await fetcher(bounds, center);
        } catch (error) {
          errors.push(`${layerId}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      })
    );

    return NextResponse.json({
      success: true,
      bounds: { minX: bounds.minX, maxX: bounds.maxX, minY: bounds.minY, maxY: bounds.maxY },
      center,
      layers: results,
      errors: errors.length > 0 ? errors : undefined,
      metadata: {
        timestamp: new Date().toISOString(),
        layersRequested: body.layers.length,
        layersSuccessful: Object.keys(results).length,
      },
    });
  } catch (error) {
    console.error('Data layers POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al procesar request'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// OPTIONS: CORS preflight
// ============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
