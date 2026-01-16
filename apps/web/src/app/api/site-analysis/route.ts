/**
 * Unified Site Analysis API
 *
 * Comprehensive site analysis endpoint that combines all data sources:
 * - SERNAGEOMIN: Geology, faults, volcanoes, landslides
 * - CONAF: Vegetation, protected areas, fire risk
 * - SHOA: Tides, tsunami zones, coastal data
 * - MINVU: Zoning, urban planning, risk zones
 * - DGA: Hydrological stations, alerts
 * - SOIL_DB: Geotechnical classification, foundation recommendations
 * - Copernicus: DEM, satellite imagery
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeProjectSite,
  quickRiskCheck,
  getAvailableDataLayers,
  type AnalysisOptions,
} from '@ledesign/hydraulics/data-sources';
import type { BoundingBox } from '@ledesign/terrain/triangulation';

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

// ============================================================================
// GET: List available layers or quick risk check
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'layers';

  try {
    // List all available data layers
    if (action === 'layers') {
      const layers = getAvailableDataLayers();
      return NextResponse.json({
        success: true,
        totalLayers: layers.length,
        layers,
        sources: [
          { id: 'SERNAGEOMIN', name: 'Servicio Nacional de Geología y Minería', type: 'government' },
          { id: 'CONAF', name: 'Corporación Nacional Forestal', type: 'government' },
          { id: 'SHOA', name: 'Servicio Hidrográfico y Oceanográfico de la Armada', type: 'government' },
          { id: 'MINVU', name: 'Ministerio de Vivienda y Urbanismo', type: 'government' },
          { id: 'DGA', name: 'Dirección General de Aguas', type: 'government' },
          { id: 'SOIL_DB', name: 'Base de Datos Geotécnicos', type: 'internal' },
          { id: 'Copernicus', name: 'Copernicus Earth Observation', type: 'international' },
          { id: 'NASA_FIRMS', name: 'NASA Fire Information', type: 'international' },
        ],
      });
    }

    // Quick risk check for a point
    if (action === 'quick-check') {
      const lat = parseFloat(searchParams.get('lat') || '');
      const lon = parseFloat(searchParams.get('lon') || '');

      if (isNaN(lat) || isNaN(lon)) {
        return NextResponse.json(
          { success: false, error: 'Se requieren parámetros lat y lon válidos' },
          { status: 400 }
        );
      }

      // Validate coordinates are in Chile
      if (lat < -56 || lat > -17 || lon < -76 || lon > -66) {
        return NextResponse.json(
          { success: false, error: 'Coordenadas fuera del territorio chileno' },
          { status: 400 }
        );
      }

      const result = await quickRiskCheck(lat, lon);
      return NextResponse.json({
        success: true,
        coordinates: { lat, lon },
        ...result,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Acción no válida. Use action=layers o action=quick-check' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Site analysis GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error en análisis de sitio'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: Full site analysis
// ============================================================================

interface SiteAnalysisRequest {
  // Bounding box for analysis (2D only, Z is added automatically)
  bounds?: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };

  // Or center point with radius
  center?: {
    lat: number;
    lon: number;
    radiusKm?: number;
  };

  // Analysis options
  options?: AnalysisOptions;

  // Output format
  format?: 'full' | 'summary' | 'risks-only';
}

export async function POST(request: NextRequest) {
  try {
    const body: SiteAnalysisRequest = await request.json();

    let bounds: BoundingBox;

    // Determine bounds from input
    if (body.bounds) {
      bounds = createBounds(body.bounds.minX, body.bounds.maxX, body.bounds.minY, body.bounds.maxY);
    } else if (body.center) {
      // Convert center + radius to bounding box
      const radiusKm = body.center.radiusKm || 1;
      const latOffset = radiusKm / 111.32; // ~111km per degree latitude
      const lonOffset = radiusKm / (111.32 * Math.cos(body.center.lat * Math.PI / 180));

      bounds = createBounds(
        body.center.lon - lonOffset,
        body.center.lon + lonOffset,
        body.center.lat - latOffset,
        body.center.lat + latOffset
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'Se requiere bounds o center en el request' },
        { status: 400 }
      );
    }

    // Validate bounds are in Chile
    const centerLat = (bounds.minY + bounds.maxY) / 2;
    const centerLon = (bounds.minX + bounds.maxX) / 2;

    if (centerLat < -56 || centerLat > -17 || centerLon < -76 || centerLon > -66) {
      return NextResponse.json(
        { success: false, error: 'Área de análisis fuera del territorio chileno' },
        { status: 400 }
      );
    }

    // Run full analysis
    const options: AnalysisOptions = body.options || {};
    const result = await analyzeProjectSite(bounds, options);

    // Format response based on request
    const format = body.format || 'full';

    if (format === 'summary') {
      return NextResponse.json({
        success: true,
        location: result.location,
        summary: result.summary,
        metadata: result.metadata,
      });
    }

    if (format === 'risks-only') {
      return NextResponse.json({
        success: true,
        location: result.location,
        risks: {
          geological: result.geology.riskAssessment,
          fire: result.environment.fireRisk,
          coastal: result.coastal ? {
            tsunamiRisk: result.coastal.tsunamiRisk,
            designWaterLevel: result.coastal.designWaterLevel,
          } : null,
          urban: result.urban.zonasRiesgo,
          geotechnical: {
            soilClass: result.geotechnical.nch433Class,
            groundwater: result.geotechnical.groundwater,
          },
        },
        summary: result.summary,
      });
    }

    // Full response
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Site analysis POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error en análisis de sitio completo'
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
