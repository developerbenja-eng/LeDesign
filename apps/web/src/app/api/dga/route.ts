import { NextRequest, NextResponse } from 'next/server';
import {
  fetchDGAStations,
  fetchFloodAlerts,
  fetchReservoirData,
  fetchWaterRestrictions,
  fetchWaterScarcityDecrees,
  analyzeDGAContext,
  type DGAStation,
} from '@ledesign/hydraulics';
import type { BoundingBox } from '@ledesign/terrain';

export const dynamic = 'force-dynamic';

// GET: Fetch DGA stations and data for a bounding box
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse bounds
    const minX = parseFloat(searchParams.get('minX') || '-180');
    const minY = parseFloat(searchParams.get('minY') || '-90');
    const maxX = parseFloat(searchParams.get('maxX') || '180');
    const maxY = parseFloat(searchParams.get('maxY') || '90');

    const bounds: BoundingBox = {
      minX,
      minY,
      maxX,
      maxY,
      minZ: 0,
      maxZ: 0,
    };

    // Get requested data types
    const tipo = searchParams.get('tipo') as DGAStation['tipo'] | null;
    const include = searchParams.get('include')?.split(',') || ['stations'];

    const results: Record<string, any> = {
      bounds,
      timestamp: new Date().toISOString(),
    };

    const promises: Promise<void>[] = [];

    // Stations
    if (include.includes('stations') || include.includes('all')) {
      promises.push(
        fetchDGAStations(bounds, tipo || undefined).then(stations => {
          results.stations = stations;
        })
      );
    }

    // Flood alerts
    if (include.includes('alerts') || include.includes('all')) {
      promises.push(
        fetchFloodAlerts(bounds).then(alerts => {
          results.alerts = alerts;
        })
      );
    }

    // Reservoirs
    if (include.includes('reservoirs') || include.includes('all')) {
      promises.push(
        fetchReservoirData(bounds).then(reservoirs => {
          results.reservoirs = reservoirs;
        })
      );
    }

    // Water restrictions
    if (include.includes('restrictions') || include.includes('all')) {
      promises.push(
        fetchWaterRestrictions(bounds).then(restrictions => {
          results.restrictions = restrictions;
        })
      );
    }

    // Scarcity decrees
    if (include.includes('scarcity') || include.includes('all')) {
      promises.push(
        fetchWaterScarcityDecrees(bounds).then(scarcity => {
          results.scarcity = scarcity;
        })
      );
    }

    await Promise.all(promises);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error('DGA data fetch error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch DGA data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST: Full DGA analysis for a project area
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.bounds) {
      return NextResponse.json(
        { error: 'Bounds are required' },
        { status: 400 }
      );
    }

    const bounds: BoundingBox = {
      minX: body.bounds.minX,
      maxX: body.bounds.maxX,
      minY: body.bounds.minY,
      maxY: body.bounds.maxY,
      minZ: 0,
      maxZ: 0,
    };

    // Run full DGA context analysis
    const analysis = await analyzeDGAContext(bounds);

    // Format for project use
    return NextResponse.json({
      success: true,
      analysis,
      summary: {
        stationCount: analysis.stations.length,
        activeAlerts: analysis.alerts.length,
        reservoirCount: analysis.reservoirs.length,
        hasWaterRestrictions: analysis.restrictions.hasRestrictions,
        hasScarcityDecrees: analysis.restrictions.scarcityDecrees.length > 0,
        riskLevel: analysis.riskLevel,
      },
      forSurfaceGeneration: {
        // Data useful for surface generation
        breaklineFeatures: analysis.stations
          .filter(s => s.rio)
          .map(s => ({
            type: 'river_gauge',
            name: s.nombre,
            location: [s.longitud, s.latitud],
            river: s.rio,
          })),
        exclusionZones: [
          ...analysis.restrictions.hasProhibitions
            ? [{ type: 'water_prohibition', reason: 'DGA Zona de Prohibición' }]
            : [],
        ],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('DGA analysis error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze DGA data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
