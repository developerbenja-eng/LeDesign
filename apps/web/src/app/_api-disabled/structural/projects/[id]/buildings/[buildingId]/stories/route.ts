import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@ledesign/db';
import { verifyAuth } from '@/lib/auth/jwt';
import { createStory } from '@ledesign/structural/factories';
import {
  Story,
  CreateStoryInput,
  storyRowToStory,
  StoryRow,
} from '@ledesign/structural';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string; buildingId: string }>;
}

// Helper to verify building ownership
async function verifyBuildingOwnership(
  projectId: string,
  buildingId: string,
  userId: string
) {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT b.id FROM buildings b
          JOIN structural_projects p ON b.project_id = p.id
          WHERE b.id = ? AND b.project_id = ? AND p.created_by = ?`,
    args: [buildingId, projectId, userId],
  });
  return result.rows.length > 0;
}

// GET /api/structural/projects/[id]/buildings/[buildingId]/stories
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, buildingId } = await params;

    if (!(await verifyBuildingOwnership(projectId, buildingId, user.id))) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 });
    }

    const db = getDb();
    const result = await db.execute({
      sql: `SELECT * FROM stories WHERE building_id = ? ORDER BY elevation DESC`,
      args: [buildingId],
    });

    const stories = result.rows.map((row) =>
      storyRowToStory(row as unknown as StoryRow)
    );

    return NextResponse.json({ stories });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}

// POST /api/structural/projects/[id]/buildings/[buildingId]/stories
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, buildingId } = await params;

    if (!(await verifyBuildingOwnership(projectId, buildingId, user.id))) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 });
    }

    const body = await request.json();
    const input: CreateStoryInput = {
      ...body,
      building_id: buildingId,
    };

    const story = createStory(input);

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO stories (
        id, building_id, name, story_number, elevation, height,
        is_basement, is_roof, master_story_id, is_master,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        story.id,
        story.building_id,
        story.name ?? null,
        story.story_number,
        story.elevation ?? 0,
        story.height ?? 0,
        story.is_basement ? 1 : 0,
        story.is_roof ? 1 : 0,
        story.master_story_id ?? null,
        story.is_master ? 1 : 0,
        story.created_at,
        story.updated_at ?? null,
      ],
    });

    return NextResponse.json({ story }, { status: 201 });
  } catch (error) {
    console.error('Error creating story:', error);
    return NextResponse.json(
      { error: 'Failed to create story' },
      { status: 500 }
    );
  }
}

// POST /api/structural/projects/[id]/buildings/[buildingId]/stories/batch
// Create multiple stories at once (useful for building setup)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId, buildingId } = await params;

    if (!(await verifyBuildingOwnership(projectId, buildingId, user.id))) {
      return NextResponse.json({ error: 'Building not found' }, { status: 404 });
    }

    const body = await request.json();
    const { stories: storyInputs } = body as { stories: CreateStoryInput[] };

    if (!Array.isArray(storyInputs) || storyInputs.length === 0) {
      return NextResponse.json(
        { error: 'stories array is required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const stories: Story[] = [];

    for (const input of storyInputs) {
      const story = createStory({
        ...input,
        building_id: buildingId,
      });

      await db.execute({
        sql: `INSERT INTO stories (
          id, building_id, name, story_number, elevation, height,
          is_basement, is_roof, master_story_id, is_master,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          story.id,
          story.building_id,
          story.name ?? null,
          story.story_number,
          story.elevation ?? 0,
          story.height ?? 0,
          story.is_basement ? 1 : 0,
          story.is_roof ? 1 : 0,
          story.master_story_id ?? null,
          story.is_master ? 1 : 0,
          story.created_at,
          story.updated_at ?? null,
        ],
      });

      stories.push(story);
    }

    return NextResponse.json({ stories }, { status: 201 });
  } catch (error) {
    console.error('Error creating stories:', error);
    return NextResponse.json(
      { error: 'Failed to create stories' },
      { status: 500 }
    );
  }
}
