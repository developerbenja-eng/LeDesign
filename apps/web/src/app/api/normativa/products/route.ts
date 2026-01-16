import { NextRequest, NextResponse } from 'next/server';
import {
  getAllApprovedProducts,
  getApprovedProductsByCategory,
  getApprovedProductByCode,
  searchApprovedProducts,
} from '@/lib/normativa-data';

/**
 * GET /api/normativa/products
 *
 * Query parameters:
 * - category: Filter by category (e.g., 'stormwater', 'concrete', 'pavement')
 * - code: Get a specific product by code (e.g., 'PROD-001')
 * - search: Search by product name or manufacturer
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const code = searchParams.get('code');
    const search = searchParams.get('search');

    // Get single product by code
    if (code) {
      const product = await getApprovedProductByCode(code);
      if (!product) {
        return NextResponse.json(
          { error: 'Approved product not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(product);
    }

    // Search by term
    if (search) {
      const results = await searchApprovedProducts(search);
      return NextResponse.json(results);
    }

    // Filter by category
    if (category) {
      const products = await getApprovedProductsByCategory(category);
      return NextResponse.json(products);
    }

    // Get all products
    const products = await getAllApprovedProducts();
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching approved products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approved products' },
      { status: 500 }
    );
  }
}
