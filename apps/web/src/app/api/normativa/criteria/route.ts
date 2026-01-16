import { NextRequest, NextResponse } from 'next/server';
import {
  getAllVerificationCriteria,
  getVerificationCriteriaByCategory,
  getVerificationCriteriaByPhase,
  getVerificationCriterionByCode,
} from '@/lib/normativa-data';

/**
 * GET /api/normativa/criteria
 *
 * Query parameters:
 * - category: Filter by category (e.g., 'pavement', 'stormwater', 'final_reception')
 * - phase: Filter by phase ('pre_construction', 'during', 'final_reception')
 * - code: Get a specific criterion by code (e.g., 'PAV-001')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');
    const phase = searchParams.get('phase');
    const code = searchParams.get('code');

    // Get single criterion by code
    if (code) {
      const criterion = await getVerificationCriterionByCode(code);
      if (!criterion) {
        return NextResponse.json(
          { error: 'Verification criterion not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(criterion);
    }

    // Filter by phase
    if (phase) {
      const criteria = await getVerificationCriteriaByPhase(phase);
      return NextResponse.json(criteria);
    }

    // Filter by category
    if (category) {
      const criteria = await getVerificationCriteriaByCategory(category);
      return NextResponse.json(criteria);
    }

    // Get all criteria
    const criteria = await getAllVerificationCriteria();
    return NextResponse.json(criteria);
  } catch (error) {
    console.error('Error fetching verification criteria:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verification criteria' },
      { status: 500 }
    );
  }
}
