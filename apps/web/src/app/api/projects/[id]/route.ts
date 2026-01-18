import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getClient, queryOne, execute } from '@ledesign/db';
import { Project } from '@/types/user';

export const dynamic = 'force-dynamic';

// GET /api/projects/[id] - Get a single project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;

      const project = await queryOne<Project>(
        getClient(),
        `SELECT * FROM projects WHERE id = ? AND user_id = ?`,
        [id, req.user.userId]
      );

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        project,
      });
    } catch (error) {
      console.error('Error fetching project:', error);
      return NextResponse.json(
        { error: 'Failed to fetch project' },
        { status: 500 }
      );
    }
  });
}

// PUT /api/projects/[id] - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;
      const body = await request.json();

      // Verify ownership
      const existing = await queryOne<Project>(
        getClient(),
        `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
        [id, req.user.userId]
      );

      if (!existing) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      const {
        name,
        description,
        bounds_south,
        bounds_north,
        bounds_west,
        bounds_east,
        center_lat,
        center_lon,
        region,
        comuna,
        project_type,
        status,
      } = body;

      const now = new Date().toISOString();

      await execute(
        getClient(),
        `UPDATE projects SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          bounds_south = COALESCE(?, bounds_south),
          bounds_north = COALESCE(?, bounds_north),
          bounds_west = COALESCE(?, bounds_west),
          bounds_east = COALESCE(?, bounds_east),
          center_lat = COALESCE(?, center_lat),
          center_lon = COALESCE(?, center_lon),
          region = COALESCE(?, region),
          comuna = COALESCE(?, comuna),
          project_type = COALESCE(?, project_type),
          status = COALESCE(?, status),
          updated_at = ?
        WHERE id = ?`,
        [
          name ?? null,
          description ?? null,
          bounds_south ?? null,
          bounds_north ?? null,
          bounds_west ?? null,
          bounds_east ?? null,
          center_lat ?? null,
          center_lon ?? null,
          region ?? null,
          comuna ?? null,
          project_type ?? null,
          status ?? null,
          now,
          id,
        ]
      );

      // Fetch updated project
      const project = await queryOne<Project>(
        getClient(),
        `SELECT * FROM projects WHERE id = ?`,
        [id]
      );

      return NextResponse.json({
        success: true,
        project,
      });
    } catch (error) {
      console.error('Error updating project:', error);
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      );
    }
  });
}

// PATCH /api/projects/[id] - Partially update a project (alias for PUT)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params });
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const { id } = await params;

      // Verify ownership
      const existing = await queryOne<Project>(
        getClient(),
        `SELECT id FROM projects WHERE id = ? AND user_id = ?`,
        [id, req.user.userId]
      );

      if (!existing) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        );
      }

      // Delete project (cascade will delete elements and topography)
      await execute(
        getClient(),
        `DELETE FROM projects WHERE id = ?`,
        [id]
      );

      return NextResponse.json({
        success: true,
        message: 'Project deleted',
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      );
    }
  });
}
