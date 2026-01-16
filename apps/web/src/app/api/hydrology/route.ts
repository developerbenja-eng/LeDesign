import { NextRequest, NextResponse } from 'next/server';
import {
  STATIONS,
  findNearestStation,
  getStationsByRegion,
  generateIDFCurve,
  getIDFTable,
  generateDesignStorm,
  generateChicagoStorm,
  calculateIntensity,
  type ReturnPeriod,
  type Duration,
} from '@ledesign/hydraulics';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type') || 'stations';

  try {
    switch (type) {
      case 'stations': {
        // List all stations or filter by region
        const region = searchParams.get('region') as 'biobio' | 'nuble' | null;
        const stations = region ? getStationsByRegion(region) : STATIONS;
        return NextResponse.json({ stations });
      }

      case 'nearest': {
        // Find nearest station to coordinates
        const lat = parseFloat(searchParams.get('lat') || '');
        const lng = parseFloat(searchParams.get('lng') || '');

        if (isNaN(lat) || isNaN(lng)) {
          return NextResponse.json(
            { error: 'Missing or invalid lat/lng parameters' },
            { status: 400 }
          );
        }

        const station = findNearestStation(lat, lng);
        return NextResponse.json({ station });
      }

      case 'idf': {
        // Generate IDF curve data
        const stationCode = searchParams.get('station');
        const lat = parseFloat(searchParams.get('lat') || '');
        const lng = parseFloat(searchParams.get('lng') || '');

        let station;
        if (stationCode) {
          station = STATIONS.find(s => s.code === stationCode);
          if (!station) {
            return NextResponse.json(
              { error: `Station not found: ${stationCode}` },
              { status: 404 }
            );
          }
        } else if (!isNaN(lat) && !isNaN(lng)) {
          station = findNearestStation(lat, lng);
        } else {
          return NextResponse.json(
            { error: 'Provide station code or lat/lng parameters' },
            { status: 400 }
          );
        }

        const idfData = generateIDFCurve(station);
        const idfTable = getIDFTable(station);

        return NextResponse.json({
          station,
          data: idfData,
          table: idfTable,
        });
      }

      case 'intensity': {
        // Calculate single intensity value
        const stationCode = searchParams.get('station');
        const lat = parseFloat(searchParams.get('lat') || '');
        const lng = parseFloat(searchParams.get('lng') || '');
        const returnPeriod = parseInt(searchParams.get('T') || '10') as ReturnPeriod;
        const duration = parseInt(searchParams.get('D') || '60') as Duration;

        let station;
        if (stationCode) {
          station = STATIONS.find(s => s.code === stationCode);
          if (!station) {
            return NextResponse.json(
              { error: `Station not found: ${stationCode}` },
              { status: 404 }
            );
          }
        } else if (!isNaN(lat) && !isNaN(lng)) {
          station = findNearestStation(lat, lng);
        } else {
          return NextResponse.json(
            { error: 'Provide station code or lat/lng parameters' },
            { status: 400 }
          );
        }

        const intensity = calculateIntensity(station, returnPeriod, duration);
        const depth = intensity * duration / 60;

        return NextResponse.json({
          station: station.name,
          returnPeriod,
          duration,
          intensity,
          depth,
        });
      }

      case 'design-storm': {
        // Generate design storm hyetograph
        const stationCode = searchParams.get('station');
        const lat = parseFloat(searchParams.get('lat') || '');
        const lng = parseFloat(searchParams.get('lng') || '');
        const returnPeriod = parseInt(searchParams.get('T') || '10') as ReturnPeriod;
        const totalDuration = parseInt(searchParams.get('duration') || '120');
        const timeStep = parseInt(searchParams.get('step') || '5');
        const method = searchParams.get('method') || 'alternating'; // alternating or chicago

        let station;
        if (stationCode) {
          station = STATIONS.find(s => s.code === stationCode);
          if (!station) {
            return NextResponse.json(
              { error: `Station not found: ${stationCode}` },
              { status: 404 }
            );
          }
        } else if (!isNaN(lat) && !isNaN(lng)) {
          station = findNearestStation(lat, lng);
        } else {
          return NextResponse.json(
            { error: 'Provide station code or lat/lng parameters' },
            { status: 400 }
          );
        }

        const storm = method === 'chicago'
          ? generateChicagoStorm(station, returnPeriod, totalDuration, timeStep)
          : generateDesignStorm(station, returnPeriod, totalDuration, timeStep);

        return NextResponse.json({
          station,
          method,
          storm,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown type: ${type}. Use: stations, nearest, idf, intensity, design-storm` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Hydrology API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process hydrology request' },
      { status: 500 }
    );
  }
}
