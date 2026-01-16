import { NextRequest, NextResponse } from 'next/server';
import {
  getAllTestSpecifications,
  getTestSpecificationsByCategory,
  getTestSpecificationByCode,
  getTestsForLayer,
  calculateRequiredTests,
} from '@/lib/normativa-data';

/**
 * GET /api/normativa/tests
 *
 * Query parameters:
 * - category: Filter by category (e.g., 'soil', 'concrete', 'asphalt', 'stormwater')
 * - code: Get a specific test by code (e.g., 'TEST-DEN-001')
 * - layer: Get tests applicable to a specific layer (e.g., 'base', 'subbase')
 * - calculate: Calculate required tests for a layer (requires layer, quantity, quantityUnit)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const code = searchParams.get('code');
    const layer = searchParams.get('layer');
    const calculate = searchParams.get('calculate');
    const quantity = searchParams.get('quantity');
    const quantityUnit = searchParams.get('quantityUnit');

    // Get single test by code
    if (code) {
      const test = await getTestSpecificationByCode(code);
      if (!test) {
        return NextResponse.json(
          { error: 'Test specification not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(test);
    }

    // Calculate required tests for a layer
    if (calculate && layer && quantity && quantityUnit) {
      const requiredTests = await calculateRequiredTests(
        layer,
        parseFloat(quantity),
        quantityUnit
      );
      return NextResponse.json({
        layer,
        quantity: parseFloat(quantity),
        quantityUnit,
        requiredTests,
      });
    }

    // Get tests for a specific layer
    if (layer) {
      const tests = await getTestsForLayer(layer);
      return NextResponse.json(tests);
    }

    // Filter by category
    if (category) {
      const tests = await getTestSpecificationsByCategory(category);
      return NextResponse.json(tests);
    }

    // Get all tests
    const tests = await getAllTestSpecifications();
    return NextResponse.json(tests);
  } catch (error) {
    console.error('Error fetching test specifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch test specifications' },
      { status: 500 }
    );
  }
}
