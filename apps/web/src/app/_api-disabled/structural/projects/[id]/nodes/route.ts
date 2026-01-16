import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@ledesign/db';
import { verifyAuth } from '@/lib/auth/jwt';
import { createNode } from '@ledesign/structural/factories';
import {
  StructuralNode,
  CreateNodeInput,
  nodeRowToNode,
  NodeRow,
} from '@ledesign/structural';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to verify project ownership
async function verifyProjectOwnership(projectId: string, userId: string) {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT id FROM structural_projects WHERE id = ? AND created_by = ?`,
    args: [projectId, userId],
  });
  return result.rows.length > 0;
}

// GET /api/structural/projects/[id]/nodes - List all nodes
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const storyId = url.searchParams.get('story_id');

    const db = getDb();
    let result;

    if (storyId) {
      result = await db.execute({
        sql: `SELECT * FROM nodes WHERE project_id = ? AND story_id = ? ORDER BY name`,
        args: [projectId, storyId],
      });
    } else {
      result = await db.execute({
        sql: `SELECT * FROM nodes WHERE project_id = ? ORDER BY name`,
        args: [projectId],
      });
    }

    const nodes = result.rows.map((row) =>
      nodeRowToNode(row as unknown as NodeRow)
    );

    return NextResponse.json({ nodes });
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nodes' },
      { status: 500 }
    );
  }
}

// POST /api/structural/projects/[id]/nodes - Create a new node
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const input: CreateNodeInput = {
      ...body,
      project_id: projectId,
    };

    const node = createNode(input);

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO nodes (
        id, project_id, story_id, name, x, y, z,
        support_type, restraints, spring_stiffness,
        prescribed_displacements, mass, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        node.id,
        node.project_id,
        node.story_id ?? null,
        node.name ?? null,
        node.x,
        node.y,
        node.z,
        node.support_type ?? 'free',
        node.restraints ? JSON.stringify(node.restraints) : null,
        node.spring_stiffness ? JSON.stringify(node.spring_stiffness) : null,
        node.prescribed_displacements ? JSON.stringify(node.prescribed_displacements) : null,
        node.mass ? JSON.stringify(node.mass) : null,
        node.created_at,
        node.updated_at ?? null,
      ],
    });

    return NextResponse.json({ node }, { status: 201 });
  } catch (error) {
    console.error('Error creating node:', error);
    return NextResponse.json(
      { error: 'Failed to create node' },
      { status: 500 }
    );
  }
}

// PUT /api/structural/projects/[id]/nodes - Batch create nodes
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { nodes: nodeInputs } = body as { nodes: CreateNodeInput[] };

    if (!Array.isArray(nodeInputs) || nodeInputs.length === 0) {
      return NextResponse.json(
        { error: 'nodes array is required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const nodes: StructuralNode[] = [];

    for (const input of nodeInputs) {
      const node = createNode({
        ...input,
        project_id: projectId,
      });

      await db.execute({
        sql: `INSERT INTO nodes (
          id, project_id, story_id, name, x, y, z,
          support_type, restraints, spring_stiffness,
          prescribed_displacements, mass, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          node.id,
          node.project_id,
          node.story_id ?? null,
          node.name ?? null,
          node.x,
          node.y,
          node.z,
          node.support_type ?? 'free',
          node.restraints ? JSON.stringify(node.restraints) : null,
          node.spring_stiffness ? JSON.stringify(node.spring_stiffness) : null,
          node.prescribed_displacements ? JSON.stringify(node.prescribed_displacements) : null,
          node.mass ? JSON.stringify(node.mass) : null,
          node.created_at,
          node.updated_at ?? null,
        ],
      });

      nodes.push(node);
    }

    return NextResponse.json({ nodes, count: nodes.length }, { status: 201 });
  } catch (error) {
    console.error('Error batch creating nodes:', error);
    return NextResponse.json(
      { error: 'Failed to create nodes' },
      { status: 500 }
    );
  }
}

// PATCH /api/structural/projects/[id]/nodes - Update a node by ID in body
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { node_id, ...updates } = body as { node_id: string } & Partial<CreateNodeInput>;

    if (!node_id) {
      return NextResponse.json({ error: 'node_id is required' }, { status: 400 });
    }

    const db = getDb();

    // Verify node exists
    const existing = await db.execute({
      sql: `SELECT * FROM nodes WHERE id = ? AND project_id = ?`,
      args: [node_id, projectId],
    });

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const currentNode = nodeRowToNode(existing.rows[0] as unknown as NodeRow);

    // Build update query
    const updateFields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.name !== undefined) {
      updateFields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.x !== undefined) {
      updateFields.push('x = ?');
      values.push(updates.x);
    }
    if (updates.y !== undefined) {
      updateFields.push('y = ?');
      values.push(updates.y);
    }
    if (updates.z !== undefined) {
      updateFields.push('z = ?');
      values.push(updates.z);
    }
    if (updates.story_id !== undefined) {
      updateFields.push('story_id = ?');
      values.push(updates.story_id);
    }
    if (updates.support_type !== undefined) {
      updateFields.push('support_type = ?');
      values.push(updates.support_type);
    }
    if (updates.restraints !== undefined) {
      updateFields.push('restraints = ?');
      values.push(JSON.stringify({ ...currentNode.restraints, ...updates.restraints }));
    }
    if (updates.spring_stiffness !== undefined) {
      updateFields.push('spring_stiffness = ?');
      values.push(JSON.stringify({ ...currentNode.spring_stiffness, ...updates.spring_stiffness }));
    }
    if (updates.prescribed_displacements !== undefined) {
      updateFields.push('prescribed_displacements = ?');
      values.push(JSON.stringify({ ...currentNode.prescribed_displacements, ...updates.prescribed_displacements }));
    }
    if (updates.mass !== undefined) {
      updateFields.push('mass = ?');
      values.push(JSON.stringify({ ...currentNode.mass, ...updates.mass }));
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updateFields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(node_id);

    await db.execute({
      sql: `UPDATE nodes SET ${updateFields.join(', ')} WHERE id = ?`,
      args: values,
    });

    // Fetch updated node
    const updated = await db.execute({
      sql: `SELECT * FROM nodes WHERE id = ?`,
      args: [node_id],
    });

    const node = nodeRowToNode(updated.rows[0] as unknown as NodeRow);

    return NextResponse.json({ node });
  } catch (error) {
    console.error('Error updating node:', error);
    return NextResponse.json(
      { error: 'Failed to update node' },
      { status: 500 }
    );
  }
}

// DELETE /api/structural/projects/[id]/nodes?node_id=xxx
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!(await verifyProjectOwnership(projectId, user.id))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const nodeId = url.searchParams.get('node_id');

    if (!nodeId) {
      return NextResponse.json({ error: 'node_id query param required' }, { status: 400 });
    }

    const db = getDb();

    // Verify node exists
    const existing = await db.execute({
      sql: `SELECT id FROM nodes WHERE id = ? AND project_id = ?`,
      args: [nodeId, projectId],
    });

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    await db.execute({
      sql: `DELETE FROM nodes WHERE id = ?`,
      args: [nodeId],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting node:', error);
    return NextResponse.json(
      { error: 'Failed to delete node' },
      { status: 500 }
    );
  }
}
