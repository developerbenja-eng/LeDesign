import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/turso';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { createSection } from '@/lib/structural/factories';
import {
  Section,
  CreateSectionInput,
  sectionRowToSection,
  SectionRow,
} from '@/types/structural';

export const dynamic = 'force-dynamic';

// GET /api/structural/sections
export async function GET(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const url = new URL(request.url);
    const projectId = url.searchParams.get('project_id');
    const libraryOnly = url.searchParams.get('library_only') === 'true';
    const sectionType = url.searchParams.get('section_type');

    const db = getDb();
    let sql = `SELECT * FROM sections WHERE `;
    const conditions: string[] = [];
    const args: (string | number)[] = [];

    if (libraryOnly) {
      conditions.push('is_library = 1');
    } else if (projectId) {
      conditions.push('(is_library = 1 OR project_id = ?)');
      args.push(projectId);
    } else {
      conditions.push('is_library = 1');
    }

    if (sectionType) {
      conditions.push('section_type = ?');
      args.push(sectionType);
    }

    sql += conditions.join(' AND ') + ' ORDER BY is_library DESC, section_type, name';

    const result = await db.execute({ sql, args });

    const sections = result.rows.map((row) =>
      sectionRowToSection(row as unknown as SectionRow)
    );

    return NextResponse.json({ sections });
    } catch (error) {
      console.error('Error fetching sections:', error);
      return NextResponse.json({ error: 'Failed to fetch sections' }, { status: 500 });
    }
  });
}

// POST /api/structural/sections
export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const body = await request.json();
    const input: CreateSectionInput = body;

    // Validate project ownership if project_id is provided
    if (input.project_id) {
      const db = getDb();
      const projectCheck = await db.execute({
        sql: `SELECT id FROM structural_projects WHERE id = ? AND created_by = ?`,
        args: [input.project_id, req.user.userId],
      });
      if (projectCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
    }

    const section = createSection(input);

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO sections (
        id, project_id, name, section_type, material_id, is_library,
        area, ix, iy, iz, sx, sy, zx, zy, rx, ry, j, cw,
        dimensions, rebar_config_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        section.id, section.project_id ?? null, section.name, section.section_type,
        section.material_id ?? null, section.is_library ? 1 : 0,
        section.area ?? null, section.ix ?? null, section.iy ?? null, section.iz ?? null,
        section.sx ?? null, section.sy ?? null, section.zx ?? null, section.zy ?? null,
        section.rx ?? null, section.ry ?? null, section.j ?? null, section.cw ?? null,
        section.dimensions ? JSON.stringify(section.dimensions) : null, section.rebar_config_id ?? null,
        section.created_at, section.updated_at ?? null,
      ],
    });

    return NextResponse.json({ section }, { status: 201 });
    } catch (error) {
      console.error('Error creating section:', error);
      return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
    }
  });
}

// DELETE /api/structural/sections?section_id=xxx
export async function DELETE(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const url = new URL(request.url);
    const sectionId = url.searchParams.get('section_id');

    if (!sectionId) {
      return NextResponse.json({ error: 'section_id required' }, { status: 400 });
    }

    const db = getDb();

    // Only allow deletion of non-library sections that belong to user's projects
    const existing = await db.execute({
      sql: `SELECT s.id FROM sections s
            LEFT JOIN structural_projects p ON s.project_id = p.id
            WHERE s.id = ? AND s.is_library = 0 AND (p.created_by = ? OR s.project_id IS NULL)`,
      args: [sectionId, req.user.userId],
    });

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Section not found or cannot be deleted' }, { status: 404 });
    }

    await db.execute({
      sql: `DELETE FROM sections WHERE id = ?`,
      args: [sectionId],
    });

    return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting section:', error);
      return NextResponse.json({ error: 'Failed to delete section' }, { status: 500 });
    }
  });
}
