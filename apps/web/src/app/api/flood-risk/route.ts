import { NextRequest, NextResponse } from 'next/server';
import { analyzeDGAContext, fetchFloodAlerts, fetchReservoirData } from '@ledesign/hydraulics';
import { analyzeFloodRisk, searchSentinel1ForFlood, searchSentinel2ForFlood } from '@ledesign/hydraulics';
import type { BoundingBox } from '@ledesign/terrain';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface FloodRiskRequest {
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
  includeDGA?: boolean;
  includeSatellite?: boolean;
  includeForecast?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: FloodRiskRequest = await request.json();

    if (!body.bounds) {
      return NextResponse.json(
        { error: 'Bounds are required' },
        { status: 400 }
      );
    }

    const bounds: BoundingBox = {
      ...body.bounds,
      minZ: 0,
      maxZ: 0,
    };

    const results: Record<string, any> = {
      bounds,
      timestamp: new Date().toISOString(),
    };

    // Run analyses in parallel
    const analyses = [];

    // DGA Analysis (Chilean water authority)
    if (body.includeDGA !== false) {
      analyses.push(
        analyzeDGAContext(bounds).then(dga => {
          results.dga = dga;
        }).catch(err => {
          console.warn('DGA analysis failed:', err);
          results.dga = { error: 'Failed to fetch DGA data' };
        })
      );
    }

    // Satellite imagery search
    if (body.includeSatellite !== false) {
      const endDate = body.dateRange?.end || new Date().toISOString().split('T')[0];
      const startDate = body.dateRange?.start ||
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      analyses.push(
        Promise.all([
          searchSentinel1ForFlood(bounds, startDate, endDate),
          searchSentinel2ForFlood(bounds, startDate, endDate, 30),
        ]).then(([s1, s2]) => {
          results.satellite = {
            sentinel1: s1,
            sentinel2: s2,
            totalImages: s1.length + s2.length,
          };
        }).catch(err => {
          console.warn('Satellite search failed:', err);
          results.satellite = { error: 'Failed to search satellite imagery' };
        })
      );
    }

    // Flood risk analysis
    analyses.push(
      analyzeFloodRisk(bounds, {
        includeHistorical: true,
        includeSatellite: body.includeSatellite !== false,
      }).then(risk => {
        results.riskAnalysis = risk;
      }).catch(err => {
        console.warn('Risk analysis failed:', err);
        results.riskAnalysis = { error: 'Failed to analyze flood risk' };
      })
    );

    await Promise.all(analyses);

    // Compute overall risk level
    let overallRisk: 'bajo' | 'medio' | 'alto' | 'muy_alto' = 'bajo';
    const allRecommendations: string[] = [];

    if (results.dga?.riskLevel) {
      overallRisk = results.dga.riskLevel;
      allRecommendations.push(...(results.dga.recommendations || []));
    }

    if (results.riskAnalysis?.recommendations) {
      allRecommendations.push(...results.riskAnalysis.recommendations);
    }

    // Check for active alerts
    if (results.dga?.alerts?.length > 0) {
      const alertTypes = results.dga.alerts.map((a: any) => a.tipo);
      if (alertTypes.includes('alerta_roja') || alertTypes.includes('evacuacion')) {
        overallRisk = 'muy_alto';
      } else if (alertTypes.includes('alerta_amarilla') && overallRisk !== 'muy_alto') {
        overallRisk = 'alto';
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      summary: {
        overallRisk,
        recommendations: [...new Set(allRecommendations)], // Remove duplicates
        dataSourcesUsed: [
          body.includeDGA !== false ? 'DGA Chile' : null,
          body.includeSatellite !== false ? 'Copernicus Sentinel' : null,
        ].filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Flood risk analysis error:', error);
    return NextResponse.json(
      {
        error: 'Failed to analyze flood risk',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for quick flood alerts check
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
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

    const [alerts, reservoirs] = await Promise.all([
      fetchFloodAlerts(bounds),
      fetchReservoirData(bounds),
    ]);

    return NextResponse.json({
      success: true,
      alerts,
      reservoirs: reservoirs.map(r => ({
        nombre: r.estacion.nombre,
        porcentajeLleno: r.porcentajeLleno,
        volumen: r.volumen,
        capacidad: r.capacidad,
      })),
      activeAlertCount: alerts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Flood alerts fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flood alerts' },
      { status: 500 }
    );
  }
}
