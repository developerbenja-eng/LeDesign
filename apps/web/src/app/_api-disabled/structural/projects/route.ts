import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@ledesign/db';
import { verifyAuth } from '@/lib/auth/jwt';
import {
  createStructuralProject,
  generateProjectId,
} from '@ledesign/structural/factories';
import {
  StructuralProject,
  CreateStructuralProjectInput,
  projectRowToProject,
  StructuralProjectRow,
} from '@ledesign/structural';

export const dynamic = 'force-dynamic';

// GET /api/structural/projects - List all projects for the user
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const result = await db.execute({
      sql: `SELECT * FROM structural_projects WHERE created_by = ? ORDER BY updated_at DESC`,
      args: [user.id],
    });

    const projects = result.rows.map((row) =>
      projectRowToProject(row as unknown as StructuralProjectRow)
    );

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/structural/projects - Create a new project
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const input: CreateStructuralProjectInput = {
      ...body,
      created_by: user.id,
    };

    const project = createStructuralProject(input);

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO structural_projects (
        id, name, description, created_by, created_at, updated_at,
        design_code, seismic_code, wind_code, concrete_code,
        length_unit, force_unit, moment_unit, stress_unit, temperature_unit,
        settings
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        project.id,
        project.name,
        project.description ?? null,
        project.created_by,
        project.created_at,
        project.updated_at ?? null,
        project.design_code ?? 'AISC 360-22',
        project.seismic_code ?? 'ASCE 7-22',
        project.wind_code ?? 'ASCE 7-22',
        project.concrete_code ?? 'ACI 318-19',
        project.length_unit ?? 'ft',
        project.force_unit ?? 'kip',
        project.moment_unit ?? 'kip-ft',
        project.stress_unit ?? 'ksi',
        project.temperature_unit ?? 'F',
        project.settings ? JSON.stringify(project.settings) : '{}',
      ],
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
