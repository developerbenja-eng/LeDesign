import { NextRequest, NextResponse } from 'next/server';
import {
  getAllUnitPrices,
  getUnitPricesByCategory,
  getUnitPriceByCode,
  searchUnitPrices,
} from '@/lib/normativa-data';

/**
 * GET /api/normativa/prices
 *
 * Query parameters:
 * - category: Filter by category (e.g., 'pavement', 'stormwater', 'sidewalk')
 * - code: Get a specific price by code (e.g., 'SRV-001')
 * - search: Search by description
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const code = searchParams.get('code');
    const search = searchParams.get('search');

    // Get single price by code
    if (code) {
      const price = await getUnitPriceByCode(code);
      if (!price) {
        return NextResponse.json(
          { error: 'Unit price not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(price);
    }

    // Search by term
    if (search) {
      const results = await searchUnitPrices(search);
      return NextResponse.json(results);
    }

    // Filter by category
    if (category) {
      const prices = await getUnitPricesByCategory(category);
      return NextResponse.json(prices);
    }

    // Get all prices
    const prices = await getAllUnitPrices();
    return NextResponse.json(prices);
  } catch (error) {
    console.error('Error fetching unit prices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unit prices' },
      { status: 500 }
    );
  }
}
