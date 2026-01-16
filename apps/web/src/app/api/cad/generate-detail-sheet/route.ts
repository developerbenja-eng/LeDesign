import { NextRequest, NextResponse } from 'next/server';
import { getDb, query } from '@ledesign/db';
import type { AnyCADEntity, Point3D } from '@ledesign/terrain/cad-types';

export const dynamic = 'force-dynamic';

// Standard paper sizes in mm
const PAPER_SIZES = {
  A4: { width: 297, height: 210 },
  A3: { width: 420, height: 297 },
  A2: { width: 594, height: 420 },
  A1: { width: 841, height: 594 },
  A0: { width: 1189, height: 841 },
} as const;

type PaperSize = keyof typeof PAPER_SIZES;

interface StandardDetailData {
  code: string;
  name: string;
  entities: AnyCADEntity[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

interface DetailSheetConfig {
  paperSize: PaperSize;
  scale: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  titleBlockHeight: number;
  detailSpacing: number;
  columns: number;
}

const DEFAULT_CONFIG: DetailSheetConfig = {
  paperSize: 'A3',
  scale: 0.02,
  margins: {
    top: 20,
    bottom: 20,
    left: 20,
    right: 20,
  },
  titleBlockHeight: 30,
  detailSpacing: 20,
  columns: 2,
};

interface StandardDetailRow {
  code: string;
  name_es: string;
  geometry_json: string;
}

/**
 * POST /api/cad/generate-detail-sheet
 *
 * Generate a detail sheet from detail codes
 *
 * Request body:
 * {
 *   "codes": ["DET-001", "DET-002", ...],
 *   "config": { ... } // Optional configuration override
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codes, config: userConfig } = body;

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json({ error: 'codes array is required' }, { status: 400 });
    }

    const db = getDb();
    const config: DetailSheetConfig = { ...DEFAULT_CONFIG, ...userConfig };
    const paper = PAPER_SIZES[config.paperSize];

    // Fetch details from database
    const details: StandardDetailData[] = [];
    for (const code of codes) {
      const rows = await query<StandardDetailRow>(
        db,
        'SELECT code, name_es, geometry_json FROM standard_details WHERE code = ?',
        [code]
      );

      if (rows.length > 0) {
        const row = rows[0];
        try {
          const geomData = JSON.parse(row.geometry_json);
          details.push({
            code: row.code,
            name: row.name_es,
            entities: geomData.entities || [],
            bounds: geomData.bounds || { minX: 0, minY: 0, maxX: 100, maxY: 100 },
          });
        } catch {
          console.warn(`Failed to parse geometry for ${code}`);
        }
      }
    }

    if (details.length === 0) {
      return NextResponse.json(
        { error: 'No valid details found for the given codes' },
        { status: 404 }
      );
    }

    // Calculate layout
    const usableWidth =
      (paper.width - config.margins.left - config.margins.right) / config.scale;
    const usableHeight =
      (paper.height - config.margins.top - config.margins.bottom - config.titleBlockHeight) /
      config.scale;
    const cellWidth =
      (usableWidth - ((config.columns - 1) * config.detailSpacing) / config.scale) /
      config.columns;

    const positions = new Map<string, { x: number; y: number }>();
    const scaledBounds = new Map<string, { width: number; height: number }>();

    let currentX = config.margins.left / config.scale;
    let currentY =
      (paper.height - config.margins.top - config.titleBlockHeight) / config.scale;
    let maxRowHeight = 0;
    let col = 0;

    for (const detail of details) {
      const detailWidth = detail.bounds.maxX - detail.bounds.minX;
      const detailHeight = detail.bounds.maxY - detail.bounds.minY;

      const scaleX = detailWidth > cellWidth ? cellWidth / detailWidth : 1;
      const scaleY = detailHeight > usableHeight / 2 ? usableHeight / 2 / detailHeight : 1;
      const fitScale = Math.min(scaleX, scaleY, 1);

      const scaledWidth = detailWidth * fitScale;
      const scaledHeight = detailHeight * fitScale;

      if (col >= config.columns) {
        col = 0;
        currentX = config.margins.left / config.scale;
        currentY -= maxRowHeight + config.detailSpacing / config.scale;
        maxRowHeight = 0;
      }

      positions.set(detail.code, { x: currentX, y: currentY - scaledHeight });
      scaledBounds.set(detail.code, { width: scaledWidth, height: scaledHeight });

      maxRowHeight = Math.max(maxRowHeight, scaledHeight);
      currentX += cellWidth + config.detailSpacing / config.scale;
      col++;
    }

    // Generate entities
    const resultEntities: AnyCADEntity[] = [];

    // Paper border
    resultEntities.push({
      id: 'detail_sheet_border',
      type: 'polyline',
      layer: 'DETAIL-SHEET',
      visible: true,
      selected: false,
      vertices: [
        { x: 0, y: 0, z: 0 },
        { x: paper.width / config.scale, y: 0, z: 0 },
        { x: paper.width / config.scale, y: paper.height / config.scale, z: 0 },
        { x: 0, y: paper.height / config.scale, z: 0 },
      ],
      closed: true,
    });

    // Title block
    const titleBlockY = config.titleBlockHeight / config.scale;
    resultEntities.push({
      id: 'title_block_line',
      type: 'line',
      layer: 'DETAIL-SHEET',
      visible: true,
      selected: false,
      start: { x: 0, y: titleBlockY, z: 0 },
      end: { x: paper.width / config.scale, y: titleBlockY, z: 0 },
    });

    resultEntities.push({
      id: 'title_text',
      type: 'text',
      layer: 'DETAIL-SHEET',
      visible: true,
      selected: false,
      position: { x: paper.width / config.scale / 2, y: titleBlockY / 2, z: 0 },
      text: 'DETALLES TIPO',
      height: 8,
      rotation: 0,
    });

    // Add each detail
    for (const detail of details) {
      const position = positions.get(detail.code);
      const bounds = scaledBounds.get(detail.code);
      if (!position || !bounds) continue;

      const centerX = (detail.bounds.minX + detail.bounds.maxX) / 2;
      const centerY = (detail.bounds.minY + detail.bounds.maxY) / 2;
      const targetCenterX = position.x + bounds.width / 2;
      const targetCenterY = position.y + bounds.height / 2;
      const offsetX = targetCenterX - centerX;
      const offsetY = targetCenterY - centerY;

      for (const entity of detail.entities) {
        const newId = `ds_${detail.code}_${entity.id}`;
        let newEntity: AnyCADEntity;

        if ('position' in entity && entity.position) {
          newEntity = {
            ...entity,
            id: newId,
            layer: `DETAIL-${detail.code}`,
            position: {
              x: entity.position.x + offsetX,
              y: entity.position.y + offsetY,
              z: 0,
            },
          } as AnyCADEntity;
        } else if ('center' in entity && entity.center) {
          newEntity = {
            ...entity,
            id: newId,
            layer: `DETAIL-${detail.code}`,
            center: {
              x: entity.center.x + offsetX,
              y: entity.center.y + offsetY,
              z: 0,
            },
          } as AnyCADEntity;
        } else if ('start' in entity && 'end' in entity && entity.start && entity.end) {
          newEntity = {
            ...entity,
            id: newId,
            layer: `DETAIL-${detail.code}`,
            start: {
              x: entity.start.x + offsetX,
              y: entity.start.y + offsetY,
              z: 0,
            },
            end: {
              x: entity.end.x + offsetX,
              y: entity.end.y + offsetY,
              z: 0,
            },
          } as AnyCADEntity;
        } else if ('vertices' in entity && entity.vertices) {
          newEntity = {
            ...entity,
            id: newId,
            layer: `DETAIL-${detail.code}`,
            vertices: entity.vertices.map((v: Point3D) => ({
              x: v.x + offsetX,
              y: v.y + offsetY,
              z: 0,
            })),
          } as AnyCADEntity;
        } else {
          newEntity = { ...entity, id: newId, layer: `DETAIL-${detail.code}` };
        }

        resultEntities.push(newEntity);
      }

      // Detail label
      resultEntities.push({
        id: `ds_label_${detail.code}`,
        type: 'text',
        layer: 'DETAIL-LABELS',
        visible: true,
        selected: false,
        position: { x: targetCenterX, y: position.y - 5, z: 0 },
        text: `${detail.code}: ${detail.name}`,
        height: 4,
        rotation: 0,
      });

      // Bounding box
      resultEntities.push({
        id: `ds_box_${detail.code}`,
        type: 'polyline',
        layer: 'DETAIL-BOXES',
        color: '#666666',
        visible: true,
        selected: false,
        vertices: [
          { x: position.x - 2, y: position.y - 10, z: 0 },
          { x: position.x + bounds.width + 2, y: position.y - 10, z: 0 },
          { x: position.x + bounds.width + 2, y: position.y + bounds.height + 2, z: 0 },
          { x: position.x - 2, y: position.y + bounds.height + 2, z: 0 },
        ],
        closed: true,
      });
    }

    return NextResponse.json({
      success: true,
      entities: resultEntities,
      bounds: {
        minX: 0,
        minY: 0,
        maxX: paper.width / config.scale,
        maxY: paper.height / config.scale,
      },
      detailsIncluded: details.map((d) => d.code),
      paperSize: config.paperSize,
      detailCount: details.length,
    });
  } catch (error) {
    console.error('Error generating detail sheet:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate detail sheet',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
