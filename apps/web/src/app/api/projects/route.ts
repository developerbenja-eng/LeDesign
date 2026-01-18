import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/lib/auth-middleware';
import { getClient, query, execute } from '@ledesign/db';
import { Project } from '@/types/user';
import { generateId } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// GET /api/projects - List user's projects
export async function GET(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const projects = await query<Project>(
        getClient(),
        `SELECT * FROM projects
         WHERE user_id = ?
         ORDER BY updated_at DESC`,
        [req.user.userId]
      );

      return NextResponse.json({
        success: true,
        projects,
      });
    } catch (error) {
      console.error('Error fetching projects:', error);
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      );
    }
  });
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  return withAuth(request, async (req: AuthenticatedRequest) => {
    try {
      const body = await request.json();
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
      } = body;

      if (!name) {
        return NextResponse.json(
          { error: 'Project name is required' },
          { status: 400 }
        );
      }

      const projectId = generateId();
      const now = new Date().toISOString();

      await execute(
        getClient(),
        `INSERT INTO projects (
          id, user_id, name, description,
          bounds_south, bounds_north, bounds_west, bounds_east,
          center_lat, center_lon,
          region, comuna, project_type, status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          projectId,
          req.user.userId,
          name,
          description || null,
          bounds_south ?? null,
          bounds_north ?? null,
          bounds_west ?? null,
          bounds_east ?? null,
          center_lat ?? null,
          center_lon ?? null,
          region || null,
          comuna || null,
          project_type || null,
          'draft',
          now,
          now,
        ]
      );

      const project: Project = {
        id: projectId,
        user_id: req.user.userId,
        name,
        description: description || null,
        bounds_south: bounds_south ?? null,
        bounds_north: bounds_north ?? null,
        bounds_west: bounds_west ?? null,
        bounds_east: bounds_east ?? null,
        center_lat: center_lat ?? null,
        center_lon: center_lon ?? null,
        region: region || null,
        comuna: comuna || null,
        project_type: project_type || null,
        status: 'draft',
        created_at: now,
        updated_at: now,
      };

      return NextResponse.json({
        success: true,
        project,
      });
    } catch (error) {
      console.error('Error creating project:', error);
      return NextResponse.json(
        { error: 'Failed to create project' },
        { status: 500 }
      );
    }
  });
}
