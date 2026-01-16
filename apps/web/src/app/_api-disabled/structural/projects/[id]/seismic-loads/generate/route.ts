// ============================================================
// API ROUTE: Generate NCh433 Seismic Loads
// ============================================================
// POST /api/structural/projects/:id/seismic-loads/generate
// Auto-generate equivalent static seismic loads from NCh433 parameters

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@ledesign/db';
import { verifyAuth } from '@/lib/auth/jwt';
import {
  generateNCh433SeismicLoads,
  createSeismicLoadCases,
  FloorLevel,
  NCh433SeismicLoadInput,
} from '@ledesign/chilean-codes';

export const dynamic = 'force-dynamic';

/**
 * POST /api/structural/projects/:id/seismic-loads/generate
 * Generate NCh433 seismic loads and create load cases
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const db = getDb();
    const body = await request.json();

    // Extract parameters from request
    const {
      zone,
      soil_type,
      occupancy,
      structural_system,
      R0,
      approximate_period,
      accidental_eccentricity_factor,
      include_accidental_torsion = true,
      create_load_cases = true,
    } = body;

    // Validate required parameters
    if (!zone || !soil_type || !occupancy || !structural_system) {
      return NextResponse.json(
        {
          error: 'Missing required parameters: zone, soil_type, occupancy, structural_system',
        },
        { status: 400 }
      );
    }

    // Step 1: Fetch building data and stories
    const buildingResult = await db.execute({
      sql: `SELECT id, name, height FROM buildings WHERE project_id = ? ORDER BY created_at LIMIT 1`,
      args: [projectId],
    });

    if (buildingResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No building found in project' },
        { status: 404 }
      );
    }

    const building = buildingResult.rows[0] as unknown as {
      id: string;
      name: string;
      height: number;
    };

    // Step 2: Fetch stories with their elevations
    const storiesResult = await db.execute({
      sql: `SELECT id, name, elevation FROM stories WHERE building_id = ? ORDER BY elevation`,
      args: [building.id],
    });

    if (storiesResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No stories found in building' },
        { status: 404 }
      );
    }

    // Step 3: Calculate seismic mass at each story
    // For now, we'll use a simplified approach: calculate mass from loads
    // In a real implementation, you'd query load cases and extract dead/live loads
    const floors: FloorLevel[] = await Promise.all(
      storiesResult.rows.map(async (row) => {
        const story = row as unknown as {
          id: string;
          name: string;
          elevation: number;
        };

        // Query dead and live loads at this story
        // This is a simplified version - you'd want to integrate with your load system
        const deadLoad = 100; // kN (placeholder - replace with actual query)
        const liveLoad = 50; // kN (placeholder - replace with actual query)

        // Calculate seismic mass (DL + 0.25*LL per NCh433)
        const seismicMass = deadLoad + 0.25 * liveLoad;

        return {
          story_id: story.id,
          elevation: story.elevation,
          seismic_mass: seismicMass,
        };
      })
    );

    // Step 4: Prepare input for seismic load generation
    const seismicInput: NCh433SeismicLoadInput = {
      zone,
      soilType: soil_type,
      occupancy,
      structuralSystem: structural_system,
      R0,
      height: building.height,
      floors,
      approximate_period,
      accidental_eccentricity_factor,
    };

    // Step 5: Generate seismic loads
    const result = generateNCh433SeismicLoads(seismicInput);

    // Step 6: Create load cases if requested
    let createdLoadCases = null;
    if (create_load_cases) {
      const loadCasesData = createSeismicLoadCases(
        result,
        include_accidental_torsion
      );

      // Insert load cases into database
      createdLoadCases = [];
      for (const loadCaseData of loadCasesData) {
        // Insert load case
        const loadCaseResult = await db.execute({
          sql: `INSERT INTO load_cases (project_id, name, description, load_type)
                VALUES (?, ?, ?, 'seismic')
                RETURNING id`,
          args: [
            projectId,
            loadCaseData.name,
            loadCaseData.description,
          ],
        });

        const loadCaseId = (loadCaseResult.rows[0] as unknown as { id: string }).id;

        // Store floor load data in the description for now
        // In a production system, you'd create actual nodal or distributed loads
        // based on the floor forces and building geometry

        createdLoadCases.push({
          id: loadCaseId,
          name: loadCaseData.name,
          description: loadCaseData.description,
          direction: loadCaseData.direction,
          floor_loads: loadCaseData.floor_loads,
        });
      }
    }

    // Step 7: Return results
    return NextResponse.json({
      success: true,
      seismic_analysis: {
        design_spectrum_Sa: result.design_spectrum_Sa,
        fundamental_period: result.fundamental_period,
        base_shear: result.base_shear,
        code_parameters: {
          A0: result.A0,
          S: result.S,
          I: result.I,
          R0: result.R0,
          T0: result.T0,
          Tp: result.Tp,
          n: result.n,
        },
      },
      floor_loads: result.floor_loads,
      load_cases: createdLoadCases,
    });
  } catch (error) {
    console.error('Error generating NCh433 seismic loads:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate seismic loads',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
