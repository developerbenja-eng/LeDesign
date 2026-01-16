import { NextRequest, NextResponse } from 'next/server';
import {
  getTile,
  getTilesForBounds,
  fetchFromOpenTopography,
  CHILE_REGIONS,
  type BoundingBox,
  type ChileRegion,
} from '@ledesign/terrain/dem-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for DEM fetching

/**
 * GET /api/dem
 *
 * Query params:
 * - lat, lon: Get single tile
 * - south, north, west, east: Get tiles for bounding box
 * - region: Use predefined Chile region (santiago, valparaiso, etc.)
 * - source: 'copernicus' (default) or 'opentopography'
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // Get predefined region
  const regionName = searchParams.get('region') as ChileRegion | null;
  if (regionName && regionName in CHILE_REGIONS) {
    const bounds = CHILE_REGIONS[regionName];
    const tiles = getTilesForBounds(bounds);
    return NextResponse.json({
      success: true,
      region: regionName,
      bounds,
      tiles: tiles.map((t) => ({
        lat: t.lat,
        lon: t.lon,
        url: `/api/dem?lat=${t.lat}&lon=${t.lon}`,
      })),
    });
  }

  // Single tile by lat/lon
  const lat = parseFloat(searchParams.get('lat') || '');
  const lon = parseFloat(searchParams.get('lon') || '');

  if (!isNaN(lat) && !isNaN(lon)) {
    try {
      const buffer = await getTile(Math.floor(lat), Math.floor(lon));

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/tiff',
          'Content-Disposition': `attachment; filename="dem_${lat}_${lon}.tif"`,
          'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
        },
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Failed to fetch DEM tile',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }
  }

  // Bounding box query
  const south = parseFloat(searchParams.get('south') || '');
  const north = parseFloat(searchParams.get('north') || '');
  const west = parseFloat(searchParams.get('west') || '');
  const east = parseFloat(searchParams.get('east') || '');

  if (!isNaN(south) && !isNaN(north) && !isNaN(west) && !isNaN(east)) {
    const bounds: BoundingBox = { south, north, west, east };
    const source = searchParams.get('source') || 'copernicus';

    // For OpenTopography, return single merged GeoTIFF
    if (source === 'opentopography') {
      try {
        const buffer = await fetchFromOpenTopography(bounds);

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': 'image/tiff',
            'Content-Disposition': 'attachment; filename="dem_region.tif"',
          },
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Failed to fetch DEM from OpenTopography',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          { status: 500 }
        );
      }
    }

    // For Copernicus, return list of tiles to fetch
    const tiles = getTilesForBounds(bounds);
    return NextResponse.json({
      success: true,
      bounds,
      tileCount: tiles.length,
      tiles: tiles.map((t) => ({
        lat: t.lat,
        lon: t.lon,
        url: `/api/dem?lat=${t.lat}&lon=${t.lon}`,
        directUrl: t.url, // AWS S3 URL for direct access
      })),
    });
  }

  // Return available regions and usage info
  return NextResponse.json({
    success: true,
    usage: {
      singleTile: '/api/dem?lat=-33&lon=-71',
      boundingBox: '/api/dem?south=-33.5&north=-33.3&west=-70.8&east=-70.5',
      predefinedRegion: '/api/dem?region=santiago',
      openTopography:
        '/api/dem?south=-33.5&north=-33.4&west=-70.7&east=-70.6&source=opentopography',
    },
    availableRegions: Object.keys(CHILE_REGIONS),
    regions: CHILE_REGIONS,
  });
}
