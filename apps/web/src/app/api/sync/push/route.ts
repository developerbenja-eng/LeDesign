// ============================================================
// SYNC PUSH API
// Push changes from browser IndexedDB to Turso
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getDb, executeBatch, upsertEntity, upsertLayer, deleteEntities, updateProjectSyncTime, logSync } from '@/lib/db/turso';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SyncPushRequest {
  projectId: string;
  userId: string;
  entities: Array<{
    id: string;
    type: string;
    layer: string;
    geometry: any;
    properties?: any;
  }>;
  layers: Array<{
    id: string;
    name: string;
    color: string;
    visible: boolean;
    locked: boolean;
    orderIndex: number;
  }>;
  deletes: Array<{
    entityId: string;
  }>;
  timestamp: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: SyncPushRequest = await request.json();
    const { projectId, userId, entities, layers, deletes, timestamp } = body;

    if (!projectId || !userId) {
      return NextResponse.json(
        { error: 'Missing projectId or userId' },
        { status: 400 }
      );
    }

    const db = getDb();
    const syncLogId = nanoid();

    // Log sync start
    await logSync(db, {
      id: syncLogId,
      projectId,
      userId,
      syncType: 'auto',
      changesCount: entities.length + layers.length + deletes.length,
      entitiesChanged: entities.length,
      layersChanged: layers.length,
      status: 'pending',
    });

    try {
      // Process entities
      if (entities.length > 0) {
        console.log(`Syncing ${entities.length} entities...`);

        for (const entity of entities) {
          await upsertEntity(db, {
            id: entity.id,
            projectId,
            type: entity.type,
            layer: entity.layer,
            geometry: entity.geometry,
            properties: entity.properties,
            version: 1, // TODO: Implement proper versioning
          });
        }
      }

      // Process layers
      if (layers.length > 0) {
        console.log(`Syncing ${layers.length} layers...`);

        for (const layer of layers) {
          await upsertLayer(db, {
            id: layer.id,
            projectId,
            name: layer.name,
            color: layer.color,
            visible: layer.visible,
            locked: layer.locked,
            orderIndex: layer.orderIndex,
            version: 1,
          });
        }
      }

      // Process deletes
      if (deletes.length > 0) {
        console.log(`Deleting ${deletes.length} entities...`);

        const entityIds = deletes.map((d) => d.entityId);
        await deleteEntities(db, projectId, entityIds);
      }

      // Update project sync timestamp
      await updateProjectSyncTime(db, projectId);

      // Log sync success
      await logSync(db, {
        id: syncLogId,
        projectId,
        userId,
        syncType: 'auto',
        changesCount: entities.length + layers.length + deletes.length,
        entitiesChanged: entities.length,
        layersChanged: layers.length,
        status: 'completed',
      });

      return NextResponse.json({
        success: true,
        entitiesChanged: entities.length,
        layersChanged: layers.length,
        deletesProcessed: deletes.length,
        timestamp: Date.now(),
      });
    } catch (error) {
      // Log sync failure
      await logSync(db, {
        id: syncLogId,
        projectId,
        userId,
        syncType: 'auto',
        changesCount: entities.length + layers.length + deletes.length,
        entitiesChanged: 0,
        layersChanged: 0,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  } catch (error) {
    console.error('Sync push error:', error);

    return NextResponse.json(
      {
        error: 'Failed to sync changes',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
