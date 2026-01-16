import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@ledesign/db';
import { verifyAuth } from '@/lib/auth/jwt';
import { createLoadCombination } from '@ledesign/structural/factories';
import {
  LoadCombination,
  CreateLoadCombinationInput,
  loadCombinationRowToLoadCombination,
  LoadCombinationRow,
  LoadCombinationFactors,
} from '@ledesign/structural';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function verifyProjectOwnership(projectId: string, userId: string) {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id FROM structural_projects WHERE id = ? AND created_by = ?`,
    args: [projectId, userId],
  });
  return result.rows.length > 0;
}

// GET /api/structural/projects/[id]/load-combinations
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const comboType = url.searchParams.get('combination_type');

    const db = getDb();
    let result;

    if (comboType) {
      result = await db.execute({
        sql: `SELECT * FROM load_combinations WHERE project_id = ? AND combination_type = ? ORDER BY name`,
        args: [projectId, comboType],
      });
    } else {
      result = await db.execute({
        sql: `SELECT * FROM load_combinations WHERE project_id = ? ORDER BY combination_type, name`,
        args: [projectId],
      });
    }

    const loadCombinations = result.rows.map((row) =>
      loadCombinationRowToLoadCombination(row as unknown as LoadCombinationRow)
    );

    return NextResponse.json({ loadCombinations });
  } catch (error) {
    console.error('Error fetching load combinations:', error);
    return NextResponse.json({ error: 'Failed to fetch load combinations' }, { status: 500 });
  }
}

// POST /api/structural/projects/[id]/load-combinations
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const combination = createLoadCombination({ ...body, project_id: projectId });

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO load_combinations (
        id, project_id, name, combination_type, design_type, factors, is_envelope,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        combination.id, combination.project_id, combination.name ?? null,
        combination.combination_type ?? 'linear', combination.design_type ?? 'strength',
        JSON.stringify(combination.factors), combination.is_envelope ? 1 : 0,
        combination.created_at, combination.updated_at ?? null,
      ],
    });

    return NextResponse.json({ loadCombination: combination }, { status: 201 });
  } catch (error) {
    console.error('Error creating load combination:', error);
    return NextResponse.json({ error: 'Failed to create load combination' }, { status: 500 });
  }
}

// PUT /api/structural/projects/[id]/load-combinations - Create default ASCE 7 combinations
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const db = getDb();

    // Check if load combinations already exist
    const existing = await db.execute({
      sql: `SELECT COUNT(*) as count FROM load_combinations WHERE project_id = ?`,
      args: [projectId],
    });

    if ((existing.rows[0] as any).count > 0) {
      return NextResponse.json({
        message: 'Load combinations already exist for this project',
        created: false
      });
    }

    // Get load case IDs for this project
    const loadCasesResult = await db.execute({
      sql: `SELECT id, load_type, name FROM load_cases WHERE project_id = ?`,
      args: [projectId],
    });

    const loadCases: Record<string, string> = {};
    for (const row of loadCasesResult.rows) {
      const r = row as any;
      // Map by load type and direction if applicable
      const key = r.name.replace(/\s+/g, '_').toLowerCase();
      loadCases[key] = r.id;
    }

    // Create ASCE 7-22 LRFD combinations
    const defaultCombinations: LoadCombination[] = [];

    // Helper to create factors object (load_case_id -> factor)
    const createFactors = (factorMap: Record<string, number>): LoadCombinationFactors => {
      const result: LoadCombinationFactors = {};
      for (const [key, factor] of Object.entries(factorMap)) {
        if (loadCases[key]) {
          result[loadCases[key]] = factor;
        }
      }
      return result;
    };

    // 1.4D
    if (loadCases['dead']) {
      defaultCombinations.push(createLoadCombination({
        project_id: projectId,
        name: '1.4D',
        combination_type: 'linear', design_type: 'strength',
        factors: createFactors({ dead: 1.4 }),
      }));
    }

    // 1.2D + 1.6L + 0.5Lr
    if (loadCases['dead'] && loadCases['live']) {
      const factors: Record<string, number> = { dead: 1.2, live: 1.6 };
      if (loadCases['live_roof']) factors['live_roof'] = 0.5;
      defaultCombinations.push(createLoadCombination({
        project_id: projectId,
        name: '1.2D + 1.6L + 0.5Lr',
        combination_type: 'linear', design_type: 'strength',
        factors: createFactors(factors),
      }));
    }

    // 1.2D + 1.6Lr + L
    if (loadCases['dead'] && loadCases['live_roof']) {
      const factors: Record<string, number> = { dead: 1.2, live_roof: 1.6 };
      if (loadCases['live']) factors['live'] = 1.0;
      defaultCombinations.push(createLoadCombination({
        project_id: projectId,
        name: '1.2D + 1.6Lr + L',
        combination_type: 'linear', design_type: 'strength',
        factors: createFactors(factors),
      }));
    }

    // Wind combinations: 1.2D + W + L + 0.5Lr
    const windDirections = ['wind_+x', 'wind_-x', 'wind_+y', 'wind_-y'];
    for (const windKey of windDirections) {
      if (loadCases[windKey] && loadCases['dead']) {
        const dir = windKey.replace('wind_', '').toUpperCase();
        const factors: Record<string, number> = { dead: 1.2, [windKey]: 1.0 };
        if (loadCases['live']) factors['live'] = 1.0;
        if (loadCases['live_roof']) factors['live_roof'] = 0.5;
        defaultCombinations.push(createLoadCombination({
          project_id: projectId,
          name: `1.2D + W${dir} + L + 0.5Lr`,
          combination_type: 'linear', design_type: 'strength',
          factors: createFactors(factors),
        }));
      }
    }

    // Seismic combinations: 1.2D + E + L
    const seismicDirections = ['seismic_x', 'seismic_y'];
    for (const seismicKey of seismicDirections) {
      if (loadCases[seismicKey] && loadCases['dead']) {
        const dir = seismicKey.replace('seismic_', '').toUpperCase();
        const factors: Record<string, number> = { dead: 1.2, [seismicKey]: 1.0 };
        if (loadCases['live']) factors['live'] = 1.0;
        defaultCombinations.push(createLoadCombination({
          project_id: projectId,
          name: `1.2D + E${dir} + L`,
          combination_type: 'linear', design_type: 'strength',
          factors: createFactors(factors),
        }));
      }
    }

    // 0.9D + W (for uplift)
    for (const windKey of windDirections) {
      if (loadCases[windKey] && loadCases['dead']) {
        const dir = windKey.replace('wind_', '').toUpperCase();
        defaultCombinations.push(createLoadCombination({
          project_id: projectId,
          name: `0.9D + W${dir}`,
          combination_type: 'linear', design_type: 'strength',
          factors: createFactors({ dead: 0.9, [windKey]: 1.0 }),
        }));
      }
    }

    // 0.9D + E (for uplift)
    for (const seismicKey of seismicDirections) {
      if (loadCases[seismicKey] && loadCases['dead']) {
        const dir = seismicKey.replace('seismic_', '').toUpperCase();
        defaultCombinations.push(createLoadCombination({
          project_id: projectId,
          name: `0.9D + E${dir}`,
          combination_type: 'linear', design_type: 'strength',
          factors: createFactors({ dead: 0.9, [seismicKey]: 1.0 }),
        }));
      }
    }

    // Service combinations
    if (loadCases['dead'] && loadCases['live']) {
      defaultCombinations.push(createLoadCombination({
        project_id: projectId,
        name: 'D + L (Service)',
        combination_type: 'linear', design_type: 'service',
        factors: createFactors({ dead: 1.0, live: 1.0 }),
      }));
    }

    // Insert all combinations
    for (const combo of defaultCombinations) {
      await db.execute({
        sql: `INSERT INTO load_combinations (
          id, project_id, name, combination_type, design_type, factors, is_envelope,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          combo.id, combo.project_id, combo.name ?? null,
          combo.combination_type ?? 'linear', combo.design_type ?? 'strength',
          JSON.stringify(combo.factors), combo.is_envelope ? 1 : 0,
          combo.created_at, combo.updated_at ?? null,
        ],
      });
    }

    return NextResponse.json({
      message: 'Default load combinations created',
      created: true,
      loadCombinations: defaultCombinations
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating default load combinations:', error);
    return NextResponse.json({ error: 'Failed to create load combinations' }, { status: 500 });
  }
}

// DELETE /api/structural/projects/[id]/load-combinations?combination_id=xxx
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const combinationId = url.searchParams.get('combination_id');
    if (!combinationId) return NextResponse.json({ error: 'combination_id required' }, { status: 400 });

    const db = getDb();
    await db.execute({
      sql: `DELETE FROM load_combinations WHERE id = ? AND project_id = ?`,
      args: [combinationId, projectId],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting load combination:', error);
    return NextResponse.json({ error: 'Failed to delete load combination' }, { status: 500 });
  }
}
