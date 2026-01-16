import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getDb, query, queryOne, execute } from '@ledesign/db';
import { Project, ProjectElement } from '@/types/user';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// GET /api/projects/[id]/elements - List project elements
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;

      // Verify project ownership
      const project = await queryOne<Project>(
        getDb(),
        `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
        [id, req.user.userId]
      );

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      const elements = await query<ProjectElement>(
        getDb(),
        `SELECT * FROM project_elements
         WHERE project_id = ?
         ORDER BY created_at ASC`,
        [id]
      );

      return NextResponse.json({
        success: true,
        elements,
      });
    } catch (error) {
      console.error('Error fetching elements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch elements' },
        { status: 500 }
      );
    }
  });
}

// POST /api/projects/[id]/elements - Create element(s)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;
      const body = await request.json();

      // Verify project ownership
      const project = await queryOne<Project>(
        getDb(),
        `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
        [id, req.user.userId]
      );

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      // Support batch creation
      const elementsToCreate = Array.isArray(body) ? body : [body];
      const createdElements: ProjectElement[] = [];
      const now = new Date().toISOString();

      for (const element of elementsToCreate) {
        const { element_type, layer, geometry, properties } = element;

        if (!element_type || !geometry) {
          continue; // Skip invalid elements
        }

        const elementId = generateId();

        await execute(
          getDb(),
          `INSERT INTO project_elements (
            id, project_id, element_type, layer, geometry, properties, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            elementId,
            id,
            element_type,
            layer || '0',
            typeof geometry === 'string' ? geometry : JSON.stringify(geometry),
            properties ? (typeof properties === 'string' ? properties : JSON.stringify(properties)) : null,
            now,
            now,
          ]
        );

        createdElements.push({
          id: elementId,
          project_id: id,
          element_type,
          layer: layer || '0',
          geometry: typeof geometry === 'string' ? geometry : JSON.stringify(geometry),
          properties: properties ? (typeof properties === 'string' ? properties : JSON.stringify(properties)) : '',
          created_at: now,
          updated_at: now,
        });
      }

      // Update project timestamp
      await execute(
        getDb(),
        `UPDATE projects SET updated_at = ? WHERE id = ?`,
        [now, id]
      );

      return NextResponse.json({
        success: true,
        elements: createdElements,
      });
    } catch (error) {
      console.error('Error creating elements:', error);
      return NextResponse.json(
        { error: 'Failed to create elements' },
        { status: 500 }
      );
    }
  });
}

// DELETE /api/projects/[id]/elements - Delete all elements (with optional filter)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;
      const { searchParams } = new URL(request.url);
      const elementIds = searchParams.get('ids')?.split(',');

      // Verify project ownership
      const project = await queryOne<Project>(
        getDb(),
        `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
        [id, req.user.userId]
      );

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      if (elementIds && elementIds.length > 0) {
        // Delete specific elements
        const placeholders = elementIds.map(() => '?').join(',');
        await execute(
          getDb(),
          `DELETE FROM project_elements WHERE project_id = ? AND id IN (${placeholders})`,
          [id, ...elementIds]
        );
      } else {
        // Delete all elements
        await execute(
          getDb(),
          `DELETE FROM project_elements WHERE project_id = ?`,
          [id]
        );
      }

      // Update project timestamp
      const now = new Date().toISOString();
      await execute(
        getDb(),
        `UPDATE projects SET updated_at = ? WHERE id = ?`,
        [now, id]
      );

      return NextResponse.json({
        success: true,
        message: 'Elements deleted',
      });
    } catch (error) {
      console.error('Error deleting elements:', error);
      return NextResponse.json(
        { error: 'Failed to delete elements' },
        { status: 500 }
      );
    }
  });
}
