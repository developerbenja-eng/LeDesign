/**
 * Detail Sheet Generator
 *
 * Automatically generates detail plan sheets based on infrastructure
 * elements placed in a project. Collects unique standard details and
 * arranges them on a sheet for inclusion in the plan set.
 */

import type { AnyCADEntity, Point3D } from '@/types/cad';
import type { AnyInfrastructureEntity } from '@/types/infrastructure-entities';
import {
  getDetailByCode,
  parseStandardDetail,
  type ParsedStandardDetail,
} from './standard-details';

/**
 * Paper size definitions (in mm)
 */
export const PAPER_SIZES = {
  A4: { width: 297, height: 210, margin: 10 },
  A3: { width: 420, height: 297, margin: 15 },
  A2: { width: 594, height: 420, margin: 20 },
  A1: { width: 841, height: 594, margin: 25 },
  A0: { width: 1189, height: 841, margin: 30 },
} as const;

export type PaperSize = keyof typeof PAPER_SIZES;

/**
 * Detail sheet layout options
 */
export interface DetailSheetOptions {
  paperSize: PaperSize;
  scale: string; // e.g., '1:20', '1:50'
  columns: number;
  titleHeight: number; // Height reserved for title block
  detailSpacing: number; // Spacing between details
  showDetailCode: boolean;
  showDetailName: boolean;
  showScale: boolean;
}

const DEFAULT_OPTIONS: DetailSheetOptions = {
  paperSize: 'A1',
  scale: '1:20',
  columns: 3,
  titleHeight: 50,
  detailSpacing: 20,
  showDetailCode: true,
  showDetailName: true,
  showScale: true,
};

/**
 * Positioned detail on the sheet
 */
export interface PositionedDetail {
  detail: ParsedStandardDetail;
  position: Point3D;
  scaleFactor: number;
  width: number;
  height: number;
}

/**
 * Generated detail sheet
 */
export interface DetailSheet {
  sheetNumber: number;
  paperSize: PaperSize;
  details: PositionedDetail[];
  entities: AnyCADEntity[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

/**
 * Extract unique standard detail codes from infrastructure entities
 */
export function extractDetailCodes(entities: AnyInfrastructureEntity[]): Set<string> {
  const codes = new Set<string>();

  for (const entity of entities) {
    if (entity.standardDetailCode) {
      codes.add(entity.standardDetailCode);
    }
  }

  return codes;
}

/**
 * Count infrastructure entities by type (for statistics)
 */
export function countInfrastructureByType(
  entities: AnyInfrastructureEntity[]
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const entity of entities) {
    const type = entity.infrastructureType;
    counts[type] = (counts[type] || 0) + 1;
  }

  return counts;
}

/**
 * Fetch all required details for a project
 */
export async function fetchRequiredDetails(
  detailCodes: Set<string>
): Promise<ParsedStandardDetail[]> {
  const details: ParsedStandardDetail[] = [];

  for (const code of detailCodes) {
    const detail = await getDetailByCode(code);
    if (detail) {
      details.push(parseStandardDetail(detail));
    }
  }

  return details;
}

/**
 * Parse scale string to get scale factor
 */
function parseScale(scale: string): number {
  const match = scale.match(/1:(\d+)/);
  if (match) {
    return 1 / parseInt(match[1], 10);
  }
  return 1 / 20; // Default to 1:20
}

/**
 * Calculate the display size of a detail at given scale
 */
function calculateDetailDisplaySize(
  detail: ParsedStandardDetail,
  scaleFactor: number
): { width: number; height: number } {
  const boundsWidth = detail.bounds.maxX - detail.bounds.minX;
  const boundsHeight = detail.bounds.maxY - detail.bounds.minY;

  return {
    width: boundsWidth * scaleFactor,
    height: boundsHeight * scaleFactor,
  };
}

/**
 * Layout details on sheets
 * Uses a simple grid layout algorithm
 */
export function layoutDetailsOnSheets(
  details: ParsedStandardDetail[],
  options: DetailSheetOptions = DEFAULT_OPTIONS
): DetailSheet[] {
  const sheets: DetailSheet[] = [];
  const paper = PAPER_SIZES[options.paperSize];
  const scaleFactor = parseScale(options.scale);

  // Calculate available area
  const availableWidth = paper.width - paper.margin * 2;
  const availableHeight = paper.height - paper.margin * 2 - options.titleHeight;

  // Calculate column width
  const columnWidth = (availableWidth - options.detailSpacing * (options.columns - 1)) / options.columns;

  // Sort details by size (largest first) for better packing
  const sortedDetails = [...details].sort((a, b) => {
    const aArea = (a.bounds.maxX - a.bounds.minX) * (a.bounds.maxY - a.bounds.minY);
    const bArea = (b.bounds.maxX - b.bounds.minX) * (b.bounds.maxY - b.bounds.minY);
    return bArea - aArea;
  });

  // Track current position and sheet
  let currentSheet: DetailSheet = {
    sheetNumber: 1,
    paperSize: options.paperSize,
    details: [],
    entities: [],
    bounds: {
      minX: 0,
      minY: 0,
      maxX: paper.width,
      maxY: paper.height,
    },
  };

  // Track column heights for simple bin packing
  const columnHeights: number[] = new Array(options.columns).fill(0);

  for (const detail of sortedDetails) {
    const { width, height } = calculateDetailDisplaySize(detail, scaleFactor);

    // Check if detail fits in column width
    const effectiveWidth = Math.min(width, columnWidth);
    const detailScaleFactor = effectiveWidth / (detail.bounds.maxX - detail.bounds.minX);
    const effectiveHeight = (detail.bounds.maxY - detail.bounds.minY) * detailScaleFactor;

    // Find the column with minimum height
    let bestColumn = 0;
    let minHeight = columnHeights[0];
    for (let i = 1; i < options.columns; i++) {
      if (columnHeights[i] < minHeight) {
        minHeight = columnHeights[i];
        bestColumn = i;
      }
    }

    // Check if detail fits on current sheet
    if (columnHeights[bestColumn] + effectiveHeight + options.detailSpacing > availableHeight) {
      // Start new sheet
      sheets.push(currentSheet);
      currentSheet = {
        sheetNumber: sheets.length + 1,
        paperSize: options.paperSize,
        details: [],
        entities: [],
        bounds: {
          minX: 0,
          minY: 0,
          maxX: paper.width,
          maxY: paper.height,
        },
      };
      columnHeights.fill(0);
      bestColumn = 0;
    }

    // Calculate position
    const x = paper.margin + bestColumn * (columnWidth + options.detailSpacing);
    const y = paper.margin + options.titleHeight + columnHeights[bestColumn];

    // Add detail to sheet
    const positionedDetail: PositionedDetail = {
      detail,
      position: { x, y, z: 0 },
      scaleFactor: detailScaleFactor,
      width: effectiveWidth,
      height: effectiveHeight,
    };

    currentSheet.details.push(positionedDetail);

    // Transform and add entities to sheet
    const transformedEntities = transformDetailEntities(
      detail,
      { x, y, z: 0 },
      detailScaleFactor,
      options
    );
    currentSheet.entities.push(...transformedEntities);

    // Update column height
    columnHeights[bestColumn] += effectiveHeight + options.detailSpacing;
  }

  // Add final sheet if it has content
  if (currentSheet.details.length > 0) {
    sheets.push(currentSheet);
  }

  return sheets;
}

/**
 * Transform detail entities to their position on the sheet
 */
function transformDetailEntities(
  detail: ParsedStandardDetail,
  position: Point3D,
  scaleFactor: number,
  options: DetailSheetOptions
): AnyCADEntity[] {
  const entities: AnyCADEntity[] = [];

  // Calculate offset from detail origin to target position
  const offsetX = position.x - detail.bounds.minX * scaleFactor;
  const offsetY = position.y - detail.bounds.minY * scaleFactor;

  for (const entity of detail.entities) {
    const newId = `sheet_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Transform based on entity type
    if ('position' in entity && entity.position) {
      entities.push({
        ...entity,
        id: newId,
        position: {
          x: entity.position.x * scaleFactor + offsetX,
          y: entity.position.y * scaleFactor + offsetY,
          z: entity.position.z,
        },
      });
    } else if ('center' in entity && entity.center) {
      entities.push({
        ...entity,
        id: newId,
        center: {
          x: entity.center.x * scaleFactor + offsetX,
          y: entity.center.y * scaleFactor + offsetY,
          z: entity.center.z,
        },
        radius: 'radius' in entity ? entity.radius * scaleFactor : 1,
      });
    } else if ('start' in entity && 'end' in entity && entity.start && entity.end) {
      entities.push({
        ...entity,
        id: newId,
        start: {
          x: entity.start.x * scaleFactor + offsetX,
          y: entity.start.y * scaleFactor + offsetY,
          z: entity.start.z,
        },
        end: {
          x: entity.end.x * scaleFactor + offsetX,
          y: entity.end.y * scaleFactor + offsetY,
          z: entity.end.z,
        },
      });
    } else if ('vertices' in entity && entity.vertices) {
      entities.push({
        ...entity,
        id: newId,
        vertices: entity.vertices.map(v => ({
          x: v.x * scaleFactor + offsetX,
          y: v.y * scaleFactor + offsetY,
          z: v.z,
        })),
      });
    }
  }

  // Add detail label
  if (options.showDetailCode || options.showDetailName) {
    const labelY = position.y - 5; // Above the detail
    let labelText = '';

    if (options.showDetailCode) {
      labelText = detail.code;
    }
    if (options.showDetailName) {
      labelText += labelText ? ` - ${detail.name_es}` : detail.name_es;
    }
    if (options.showScale) {
      labelText += ` (${options.scale})`;
    }

    entities.push({
      id: `label_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: 'text',
      layer: 'DETAILS-LABELS',
      color: '#000000',
      visible: true,
      selected: false,
      position: { x: position.x, y: labelY, z: 0 },
      text: labelText,
      height: 3,
      rotation: 0,
    });
  }

  return entities;
}

/**
 * Main function to generate detail sheets for a project
 */
export async function generateDetailSheets(
  infrastructureEntities: AnyInfrastructureEntity[],
  options: Partial<DetailSheetOptions> = {}
): Promise<DetailSheet[]> {
  // Extract unique detail codes
  const detailCodes = extractDetailCodes(infrastructureEntities);

  if (detailCodes.size === 0) {
    return [];
  }

  // Fetch all required details
  const details = await fetchRequiredDetails(detailCodes);

  if (details.length === 0) {
    return [];
  }

  // Layout details on sheets
  const mergedOptions: DetailSheetOptions = { ...DEFAULT_OPTIONS, ...options };
  return layoutDetailsOnSheets(details, mergedOptions);
}

/**
 * Get summary of required details for a project
 */
export function getDetailsSummary(
  infrastructureEntities: AnyInfrastructureEntity[]
): {
  totalEntities: number;
  byType: Record<string, number>;
  uniqueDetailCodes: string[];
} {
  const byType = countInfrastructureByType(infrastructureEntities);
  const detailCodes = extractDetailCodes(infrastructureEntities);

  return {
    totalEntities: infrastructureEntities.length,
    byType,
    uniqueDetailCodes: Array.from(detailCodes),
  };
}
