/**
 * Detail Sheet Generator
 *
 * Automatically generates a detail sheet from infrastructure entities placed in a project.
 * Collects unique standard details and arranges them in a grid layout.
 */

import type { AnyCADEntity, Point3D } from '@/types/cad';
import type { AnyInfrastructureEntity } from '@/types/infrastructure-entities';

// Standard paper sizes in mm
export const PAPER_SIZES = {
  A4: { width: 297, height: 210 },
  A3: { width: 420, height: 297 },
  A2: { width: 594, height: 420 },
  A1: { width: 841, height: 594 },
  A0: { width: 1189, height: 841 },
} as const;

export type PaperSize = keyof typeof PAPER_SIZES;

export interface DetailSheetConfig {
  paperSize: PaperSize;
  scale: number; // e.g., 1 for 1:1, 0.02 for 1:50
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  titleBlockHeight: number;
  detailSpacing: number; // Space between details
  columns: number; // Number of columns in grid
}

export interface StandardDetailData {
  code: string;
  name: string;
  entities: AnyCADEntity[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  thumbnail_svg?: string;
}

export interface DetailSheetResult {
  entities: AnyCADEntity[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  detailsIncluded: string[];
  paperSize: PaperSize;
}

const DEFAULT_CONFIG: DetailSheetConfig = {
  paperSize: 'A3',
  scale: 0.02, // 1:50 scale
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

/**
 * Get unique standard detail codes from infrastructure entities
 */
export function getRequiredDetailCodes(entities: AnyInfrastructureEntity[]): string[] {
  const codes = new Set<string>();

  for (const entity of entities) {
    if (entity.standardDetailCode) {
      codes.add(entity.standardDetailCode);
    }
  }

  return Array.from(codes).sort();
}

/**
 * Count how many of each detail are used in the project
 */
export function countDetailUsage(entities: AnyInfrastructureEntity[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const entity of entities) {
    if (entity.standardDetailCode) {
      const current = counts.get(entity.standardDetailCode) || 0;
      counts.set(entity.standardDetailCode, current + 1);
    }
  }

  return counts;
}

/**
 * Calculate the layout for details on a sheet
 */
function calculateLayout(
  details: StandardDetailData[],
  config: DetailSheetConfig
): { positions: Map<string, Point3D>; scaledBounds: Map<string, { width: number; height: number }> } {
  const paper = PAPER_SIZES[config.paperSize];
  const usableWidth = (paper.width - config.margins.left - config.margins.right) / config.scale;
  const usableHeight = (paper.height - config.margins.top - config.margins.bottom - config.titleBlockHeight) / config.scale;

  const cellWidth = (usableWidth - (config.columns - 1) * config.detailSpacing / config.scale) / config.columns;

  const positions = new Map<string, Point3D>();
  const scaledBounds = new Map<string, { width: number; height: number }>();

  let currentX = config.margins.left / config.scale;
  let currentY = (paper.height - config.margins.top - config.titleBlockHeight) / config.scale;
  let maxRowHeight = 0;
  let col = 0;

  for (const detail of details) {
    const detailWidth = detail.bounds.maxX - detail.bounds.minX;
    const detailHeight = detail.bounds.maxY - detail.bounds.minY;

    // Scale to fit in cell if needed
    const scaleX = detailWidth > cellWidth ? cellWidth / detailWidth : 1;
    const scaleY = detailHeight > (usableHeight / 2) ? (usableHeight / 2) / detailHeight : 1;
    const fitScale = Math.min(scaleX, scaleY, 1);

    const scaledWidth = detailWidth * fitScale;
    const scaledHeight = detailHeight * fitScale;

    // Move to next row if needed
    if (col >= config.columns) {
      col = 0;
      currentX = config.margins.left / config.scale;
      currentY -= maxRowHeight + config.detailSpacing / config.scale;
      maxRowHeight = 0;
    }

    positions.set(detail.code, {
      x: currentX,
      y: currentY - scaledHeight, // Position at bottom-left of detail
      z: 0,
    });

    scaledBounds.set(detail.code, {
      width: scaledWidth,
      height: scaledHeight,
    });

    maxRowHeight = Math.max(maxRowHeight, scaledHeight);
    currentX += cellWidth + config.detailSpacing / config.scale;
    col++;
  }

  return { positions, scaledBounds };
}

/**
 * Generate a detail sheet from the given details
 */
export function generateDetailSheet(
  details: StandardDetailData[],
  config: Partial<DetailSheetConfig> = {}
): DetailSheetResult {
  const fullConfig: DetailSheetConfig = { ...DEFAULT_CONFIG, ...config };
  const paper = PAPER_SIZES[fullConfig.paperSize];

  if (details.length === 0) {
    return {
      entities: [],
      bounds: { minX: 0, minY: 0, maxX: paper.width, maxY: paper.height },
      detailsIncluded: [],
      paperSize: fullConfig.paperSize,
    };
  }

  const { positions, scaledBounds } = calculateLayout(details, fullConfig);
  const resultEntities: AnyCADEntity[] = [];

  // Add paper border
  resultEntities.push({
    id: 'detail_sheet_border',
    type: 'polyline',
    layer: 'DETAIL-SHEET',
    visible: true,
    selected: false,
    vertices: [
      { x: 0, y: 0, z: 0 },
      { x: paper.width / fullConfig.scale, y: 0, z: 0 },
      { x: paper.width / fullConfig.scale, y: paper.height / fullConfig.scale, z: 0 },
      { x: 0, y: paper.height / fullConfig.scale, z: 0 },
    ],
    closed: true,
  });

  // Add title block separator
  const titleBlockY = fullConfig.titleBlockHeight / fullConfig.scale;
  resultEntities.push({
    id: 'title_block_line',
    type: 'line',
    layer: 'DETAIL-SHEET',
    visible: true,
    selected: false,
    start: { x: 0, y: titleBlockY, z: 0 },
    end: { x: paper.width / fullConfig.scale, y: titleBlockY, z: 0 },
  });

  // Add title text
  resultEntities.push({
    id: 'title_text',
    type: 'text',
    layer: 'DETAIL-SHEET',
    visible: true,
    selected: false,
    position: { x: (paper.width / fullConfig.scale) / 2, y: titleBlockY / 2, z: 0 },
    text: 'DETALLES TIPO',
    height: 8,
    rotation: 0,
  });

  // Add each detail with its label
  for (const detail of details) {
    const position = positions.get(detail.code);
    const bounds = scaledBounds.get(detail.code);
    if (!position || !bounds) continue;

    // Calculate offset to transform detail entities
    const centerX = (detail.bounds.minX + detail.bounds.maxX) / 2;
    const centerY = (detail.bounds.minY + detail.bounds.maxY) / 2;
    const targetCenterX = position.x + bounds.width / 2;
    const targetCenterY = position.y + bounds.height / 2;
    const offsetX = targetCenterX - centerX;
    const offsetY = targetCenterY - centerY;

    // Add detail entities
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

    // Add detail label
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

    // Add bounding box around detail
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

  return {
    entities: resultEntities,
    bounds: {
      minX: 0,
      minY: 0,
      maxX: paper.width / fullConfig.scale,
      maxY: paper.height / fullConfig.scale,
    },
    detailsIncluded: details.map(d => d.code),
    paperSize: fullConfig.paperSize,
  };
}

/**
 * Fetch details from API and generate sheet
 */
export async function generateDetailSheetFromProject(
  infrastructureEntities: AnyInfrastructureEntity[],
  config?: Partial<DetailSheetConfig>
): Promise<DetailSheetResult> {
  // Get unique detail codes
  const codes = getRequiredDetailCodes(infrastructureEntities);

  if (codes.length === 0) {
    return {
      entities: [],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      detailsIncluded: [],
      paperSize: config?.paperSize || 'A3',
    };
  }

  // Fetch detail data from API
  const details: StandardDetailData[] = [];

  for (const code of codes) {
    try {
      const response = await fetch(`/api/normativa/details?code=${code}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.geometry_json) {
          const geomData = JSON.parse(data.geometry_json);
          details.push({
            code: data.code,
            name: data.name_es,
            entities: geomData.entities || [],
            bounds: geomData.bounds || { minX: 0, minY: 0, maxX: 100, maxY: 100 },
            thumbnail_svg: data.thumbnail_svg,
          });
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch detail ${code}:`, error);
    }
  }

  return generateDetailSheet(details, config);
}
