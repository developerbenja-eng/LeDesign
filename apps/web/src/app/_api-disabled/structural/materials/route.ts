import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@ledesign/db';
import { verifyAuth } from '@/lib/auth/jwt';
import { createMaterial, createDefaultSteelMaterial, createDefaultConcreteMaterial } from '@ledesign/structural/factories';
import {
  Material,
  CreateMaterialInput,
  materialRowToMaterial,
  MaterialRow,
} from '@ledesign/structural';

export const dynamic = 'force-dynamic';

// GET /api/structural/materials - Get library materials and optionally project materials
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const projectId = url.searchParams.get('project_id');
    const libraryOnly = url.searchParams.get('library_only') === 'true';

    const db = getDb();
    let result;

    if (libraryOnly) {
      result = await db.execute({
        sql: `SELECT * FROM materials WHERE is_library = 1 ORDER BY material_type, name`,
        args: [],
      });
    } else if (projectId) {
      // Get both library materials and project-specific materials
      result = await db.execute({
        sql: `SELECT * FROM materials
              WHERE is_library = 1 OR project_id = ?
              ORDER BY is_library DESC, material_type, name`,
        args: [projectId],
      });
    } else {
      result = await db.execute({
        sql: `SELECT * FROM materials WHERE is_library = 1 ORDER BY material_type, name`,
        args: [],
      });
    }

    const materials = result.rows.map((row) =>
      materialRowToMaterial(row as unknown as MaterialRow)
    );

    return NextResponse.json({ materials });
  } catch (error) {
    console.error('Error fetching materials:', error);
    return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
  }
}

// POST /api/structural/materials - Create a new material
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const input: CreateMaterialInput = body;

    // Validate project ownership if project_id is provided
    if (input.project_id) {
      const db = getDb();
      const projectCheck = await db.execute({
        sql: `SELECT id FROM structural_projects WHERE id = ? AND created_by = ?`,
        args: [input.project_id, user.id],
      });
      if (projectCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    const material = createMaterial(input);

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO materials (
        id, project_id, name, material_type, is_library,
        elastic_modulus, shear_modulus, poisson_ratio, density,
        yield_strength, ultimate_strength, thermal_coefficient,
        properties, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        material.id, material.project_id ?? null, material.name, material.material_type,
        material.is_library ? 1 : 0,
        material.elastic_modulus, material.shear_modulus ?? null, material.poisson_ratio ?? null,
        material.density ?? null, material.yield_strength ?? null, material.ultimate_strength ?? null,
        material.thermal_coefficient ?? null,
        JSON.stringify(material.properties),
        material.created_at, material.updated_at ?? null,
      ],
    });

    return NextResponse.json({ material }, { status: 201 });
  } catch (error) {
    console.error('Error creating material:', error);
    return NextResponse.json({ error: 'Failed to create material' }, { status: 500 });
  }
}

// PUT /api/structural/materials - Seed default materials
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();

    // Check if library materials already exist
    const existing = await db.execute({
      sql: `SELECT COUNT(*) as count FROM materials WHERE is_library = 1`,
      args: [],
    });

    if ((existing.rows[0] as any).count > 0) {
      return NextResponse.json({
        message: 'Library materials already exist',
        seeded: false
      });
    }

    // Create default library materials
    const defaultMaterials = [
      // Steel grades
      createMaterial({
        name: 'A992 Gr. 50',
        material_type: 'steel',
        is_library: true,
        elastic_modulus: 29000,
        shear_modulus: 11200,
        poisson_ratio: 0.3,
        density: 490,
        yield_strength: 50,
        ultimate_strength: 65,
        thermal_coefficient: 6.5e-6,
        properties: { grade: 'A992', fy: 50, fu: 65 },
      }),
      createMaterial({
        name: 'A36',
        material_type: 'steel',
        is_library: true,
        elastic_modulus: 29000,
        shear_modulus: 11200,
        poisson_ratio: 0.3,
        density: 490,
        yield_strength: 36,
        ultimate_strength: 58,
        thermal_coefficient: 6.5e-6,
        properties: { grade: 'A36', fy: 36, fu: 58 },
      }),
      createMaterial({
        name: 'A572 Gr. 50',
        material_type: 'steel',
        is_library: true,
        elastic_modulus: 29000,
        shear_modulus: 11200,
        poisson_ratio: 0.3,
        density: 490,
        yield_strength: 50,
        ultimate_strength: 65,
        thermal_coefficient: 6.5e-6,
        properties: { grade: 'A572', fy: 50, fu: 65 },
      }),
      // Concrete grades
      createMaterial({
        name: "f'c = 3000 psi",
        material_type: 'concrete',
        is_library: true,
        elastic_modulus: 3122, // 57000 * sqrt(3000) / 1000
        poisson_ratio: 0.2,
        density: 150,
        properties: { fc: 3, fr: 0.411 },
      }),
      createMaterial({
        name: "f'c = 4000 psi",
        material_type: 'concrete',
        is_library: true,
        elastic_modulus: 3605,
        poisson_ratio: 0.2,
        density: 150,
        properties: { fc: 4, fr: 0.474 },
      }),
      createMaterial({
        name: "f'c = 5000 psi",
        material_type: 'concrete',
        is_library: true,
        elastic_modulus: 4031,
        poisson_ratio: 0.2,
        density: 150,
        properties: { fc: 5, fr: 0.530 },
      }),
      createMaterial({
        name: "f'c = 6000 psi",
        material_type: 'concrete',
        is_library: true,
        elastic_modulus: 4415,
        poisson_ratio: 0.2,
        density: 150,
        properties: { fc: 6, fr: 0.581 },
      }),
    ];

    for (const material of defaultMaterials) {
      await db.execute({
        sql: `INSERT INTO materials (
          id, project_id, name, material_type, is_library,
          elastic_modulus, shear_modulus, poisson_ratio, density,
          yield_strength, ultimate_strength, thermal_coefficient,
          properties, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          material.id, material.project_id ?? null, material.name, material.material_type,
          material.is_library ? 1 : 0,
          material.elastic_modulus, material.shear_modulus ?? null, material.poisson_ratio ?? null,
          material.density ?? null, material.yield_strength ?? null, material.ultimate_strength ?? null,
          material.thermal_coefficient ?? null,
          JSON.stringify(material.properties),
          material.created_at, material.updated_at ?? null,
        ],
      });
    }

    return NextResponse.json({
      message: 'Library materials seeded',
      seeded: true,
      count: defaultMaterials.length
    });
  } catch (error) {
    console.error('Error seeding materials:', error);
    return NextResponse.json({ error: 'Failed to seed materials' }, { status: 500 });
  }
}
