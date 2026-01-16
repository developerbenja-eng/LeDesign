import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentWeather,
  getHistoricalWeather,
  getRiverDischarge,
  getHourlyForecast,
  type HistoricalVariable,
} from '@ledesign/hydraulics';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const type = searchParams.get('type') || 'current'; // current, historical, hourly, river

  if (!lat || !lng) {
    return NextResponse.json(
      { error: 'Missing latitude (lat) or longitude (lng) parameter' },
      { status: 400 }
    );
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json(
      { error: 'Invalid latitude or longitude' },
      { status: 400 }
    );
  }

  try {
    switch (type) {
      case 'current': {
        const data = await getCurrentWeather(latitude, longitude, {
          forecastDays: parseInt(searchParams.get('days') || '7'),
        });
        return NextResponse.json(data);
      }

      case 'hourly': {
        const data = await getHourlyForecast(latitude, longitude, {
          forecastDays: parseInt(searchParams.get('days') || '3'),
        });
        return NextResponse.json(data);
      }

      case 'historical': {
        const startDate = searchParams.get('start');
        const endDate = searchParams.get('end');

        if (!startDate || !endDate) {
          return NextResponse.json(
            { error: 'Historical data requires start and end date parameters (YYYY-MM-DD)' },
            { status: 400 }
          );
        }

        const variables = searchParams.get('variables')?.split(',') as HistoricalVariable[] | undefined;

        const data = await getHistoricalWeather({
          latitude,
          longitude,
          startDate,
          endDate,
          variables,
        });
        return NextResponse.json(data);
      }

      case 'river': {
        const pastDays = searchParams.get('pastDays');
        const forecastDays = searchParams.get('forecastDays');

        const data = await getRiverDischarge({
          latitude,
          longitude,
          pastDays: pastDays ? parseInt(pastDays) : 30,
          forecastDays: forecastDays ? parseInt(forecastDays) : 10,
        });
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json(
          { error: `Unknown type: ${type}. Use: current, hourly, historical, or river` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch weather data' },
      { status: 500 }
    );
  }
}
