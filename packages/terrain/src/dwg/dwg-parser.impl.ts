/**
 * DWG Parser using libredwg-web
 * Parses AutoCAD DWG files and converts them to CAD entities
 *
 * Supports block explosion with proper nested transform accumulation
 */

import { Dwg_File_Type, LibreDwg } from '@mlightcad/libredwg-web';
import type { AnyCADEntity, PointEntity, LineEntity, PolylineEntity, CircleEntity, ArcEntity, TextEntity, DimensionEntity, DimensionType, CADLayer, Point3D } from '../cad-types';

// Singleton instance for LibreDwg
let libredwgInstance: LibreDwg | null = null;

/**
 * Transform matrix for block insertion
 * Used to accumulate transforms for nested blocks
 */
export interface Transform {
  translation: Point3D;
  rotation: number;        // Radians
  scale: { x: number; y: number; z: number };  // Non-uniform scale support
}

/**
 * Block definition from DWG file
 */
export interface BlockDefinition {
  name: string;
  basePoint: Point3D;
  entities: DWGEntity[];
}

/**
 * INSERT entity (block reference)
 */
export interface DWGInsertEntity extends DWGEntity {
  type: 'INSERT';
  name: string;           // Block name to reference
  insertionPoint: Point3D;
  xScale?: number;
  yScale?: number;
  zScale?: number;
  rotation?: number;      // Radians
}

/**
 * Identity transform (no transformation)
 */
const IDENTITY_TRANSFORM: Transform = {
  translation: { x: 0, y: 0, z: 0 },
  rotation: 0,
  scale: { x: 1, y: 1, z: 1 },
};

/**
 * Compose two transforms (parent * child)
 * Used for nested block explosion - transforms accumulate correctly
 */
function composeTransforms(parent: Transform, child: Transform): Transform {
  // Scales multiply
  const scale = {
    x: parent.scale.x * child.scale.x,
    y: parent.scale.y * child.scale.y,
    z: parent.scale.z * child.scale.z,
  };

  // Rotations add
  const rotation = parent.rotation + child.rotation;

  // Translation: child point transformed by parent's rotation and scale
  const cos = Math.cos(parent.rotation);
  const sin = Math.sin(parent.rotation);
  const translation = {
    x: parent.translation.x + (child.translation.x * cos - child.translation.y * sin) * parent.scale.x,
    y: parent.translation.y + (child.translation.x * sin + child.translation.y * cos) * parent.scale.y,
    z: parent.translation.z + child.translation.z * parent.scale.z,
  };

  return { translation, rotation, scale };
}

/**
 * Apply transform to a single point
 */
function transformPoint(point: Point3D, transform: Transform): Point3D {
  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);

  return {
    x: transform.translation.x + (point.x * cos - point.y * sin) * transform.scale.x,
    y: transform.translation.y + (point.x * sin + point.y * cos) * transform.scale.y,
    z: transform.translation.z + point.z * transform.scale.z,
  };
}

/**
 * Apply transform to an entity's geometry
 * Returns a new entity with transformed coordinates
 */
function applyTransformToEntity(entity: AnyCADEntity, transform: Transform): AnyCADEntity {
  // For identity transform, return as-is
  if (
    transform.translation.x === 0 &&
    transform.translation.y === 0 &&
    transform.translation.z === 0 &&
    transform.rotation === 0 &&
    transform.scale.x === 1 &&
    transform.scale.y === 1 &&
    transform.scale.z === 1
  ) {
    return entity;
  }

  switch (entity.type) {
    case 'point': {
      const e = entity as PointEntity;
      return {
        ...e,
        position: transformPoint(e.position, transform),
      };
    }

    case 'line': {
      const e = entity as LineEntity;
      return {
        ...e,
        start: transformPoint(e.start, transform),
        end: transformPoint(e.end, transform),
      };
    }

    case 'polyline': {
      const e = entity as PolylineEntity;
      return {
        ...e,
        vertices: e.vertices.map(v => transformPoint(v, transform)),
      };
    }

    case 'circle': {
      const e = entity as CircleEntity;
      // For non-uniform scale, circle becomes ellipse - we approximate with average scale
      const avgScale = (Math.abs(transform.scale.x) + Math.abs(transform.scale.y)) / 2;
      return {
        ...e,
        center: transformPoint(e.center, transform),
        radius: e.radius * avgScale,
      };
    }

    case 'arc': {
      const e = entity as ArcEntity;
      const avgScale = (Math.abs(transform.scale.x) + Math.abs(transform.scale.y)) / 2;
      return {
        ...e,
        center: transformPoint(e.center, transform),
        radius: e.radius * avgScale,
        startAngle: e.startAngle + transform.rotation,
        endAngle: e.endAngle + transform.rotation,
      };
    }

    case 'text': {
      const e = entity as TextEntity;
      const avgScale = (Math.abs(transform.scale.x) + Math.abs(transform.scale.y)) / 2;
      return {
        ...e,
        position: transformPoint(e.position, transform),
        height: e.height * avgScale,
        rotation: e.rotation + transform.rotation,
      };
    }

    case 'dimension': {
      const e = entity as DimensionEntity;
      const avgScale = (Math.abs(transform.scale.x) + Math.abs(transform.scale.y)) / 2;
      return {
        ...e,
        defPoint1: transformPoint(e.defPoint1, transform),
        defPoint2: transformPoint(e.defPoint2, transform),
        dimLinePoint: transformPoint(e.dimLinePoint, transform),
        textPosition: transformPoint(e.textPosition, transform),
        measurement: e.measurement * avgScale,
        textHeight: (e.textHeight || 2.5) * avgScale,
      };
    }

    default:
      return entity;
  }
}

/**
 * Recursively explode a block reference (INSERT entity) into its constituent entities
 * Properly accumulates transforms for nested blocks
 */
function explodeBlock(
  insertEntity: DWGInsertEntity,
  blockDefs: Map<string, BlockDefinition>,
  parentTransform: Transform = IDENTITY_TRANSFORM,
  depth: number = 0
): AnyCADEntity[] {
  // Prevent infinite recursion
  if (depth > 100) {
    console.warn(`Block explosion depth exceeded for block: ${insertEntity.name}`);
    return [];
  }

  const blockDef = blockDefs.get(insertEntity.name);
  if (!blockDef) {
    // Block definition not found - common for external references (XREFs)
    return [];
  }

  // Build this insert's transform
  const insertPoint = insertEntity.insertionPoint || { x: 0, y: 0, z: 0 };
  const currentTransform: Transform = {
    translation: {
      x: insertPoint.x - (blockDef.basePoint?.x || 0) * (insertEntity.xScale ?? 1),
      y: insertPoint.y - (blockDef.basePoint?.y || 0) * (insertEntity.yScale ?? 1),
      z: (insertPoint.z || 0) - (blockDef.basePoint?.z || 0) * (insertEntity.zScale ?? 1),
    },
    rotation: insertEntity.rotation || 0,
    scale: {
      x: insertEntity.xScale ?? 1,
      y: insertEntity.yScale ?? 1,
      z: insertEntity.zScale ?? 1,
    },
  };

  // Accumulate with parent transform
  const accumulated = composeTransforms(parentTransform, currentTransform);

  const results: AnyCADEntity[] = [];

  for (const blockEntity of blockDef.entities) {
    if (blockEntity.type === 'INSERT') {
      // Nested block - recurse with accumulated transform
      const nestedInsert = blockEntity as unknown as DWGInsertEntity;
      results.push(...explodeBlock(nestedInsert, blockDefs, accumulated, depth + 1));
    } else {
      // Regular entity - convert and transform
      const cadEntity = convertEntity(blockEntity, results.length);
      if (cadEntity) {
        results.push(applyTransformToEntity(cadEntity, accumulated));
      }
    }
  }

  return results;
}

export interface DWGParseResult {
  entities: AnyCADEntity[];
  layers: CADLayer[];
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  stats: {
    totalEntities: number;
    byType: Record<string, number>;
    byLayer: Record<string, number>;
    blockCount?: number;  // Number of block definitions found
  };
}

export interface DWGEntity {
  type: string;
  layer?: string;
  color?: number;
  // Line (libredwg uses startPoint/endPoint)
  startPoint?: { x: number; y: number; z?: number };
  endPoint?: { x: number; y: number; z?: number };
  start?: { x: number; y: number; z?: number };
  end?: { x: number; y: number; z?: number };
  start_pt?: { x: number; y: number; z?: number };
  end_pt?: { x: number; y: number; z?: number };
  // Polyline
  vertices?: Array<{ x: number; y: number; z?: number; bulge?: number }>;
  closed?: boolean;
  // Circle/Arc
  center?: { x: number; y: number; z?: number };
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  // Text (libredwg uses startPoint for position and textHeight for size)
  text?: string;
  string?: string;
  position?: { x: number; y: number; z?: number };
  insertionPoint?: { x: number; y: number; z?: number };
  height?: number;
  textHeight?: number;
  rotation?: number;
  // Point
  location?: { x: number; y: number; z?: number };
  // Dimension
  dimensionType?: number;         // 0=linear, 1=aligned, 2=angular, 3=diameter, 4=radius, 5=angular3pt, 6=ordinate
  defPoint?: { x: number; y: number; z?: number };      // Definition point (on dimension line)
  defPoint2?: { x: number; y: number; z?: number };     // First extension line origin
  defPoint3?: { x: number; y: number; z?: number };     // Second extension line origin
  defPoint4?: { x: number; y: number; z?: number };     // Additional point for some types
  textMidpoint?: { x: number; y: number; z?: number };  // Text position
  textRotation?: number;
  measurement?: number;           // Actual measurement value
  userText?: string;              // User override text
}

export interface DWGLayer {
  name: string;
  color?: number;
  on?: boolean;
  frozen?: boolean;
}

export interface DWGBlockRecord {
  name: string;
  basePoint?: { x: number; y: number; z?: number };
  entities?: DWGEntity[];
}

export interface DWGDatabase {
  entities?: DWGEntity[];
  tables?: {
    layer?: DWGLayer[];
    BLOCK_RECORD?: {
      entries?: DWGBlockRecord[];
    };
  };
}

/**
 * Initialize LibreDwg instance
 */
async function getLibreDwg(): Promise<LibreDwg> {
  if (!libredwgInstance) {
    // In browser, WASM files should be in /wasm/ folder
    const wasmPath = typeof window !== 'undefined' ? '/wasm/' : './node_modules/@mlightcad/libredwg-web/wasm/';
    libredwgInstance = await LibreDwg.create(wasmPath);
  }
  return libredwgInstance;
}

/**
 * Convert DWG color index to hex color
 */
function dwgColorToHex(colorIndex: number | undefined): string {
  if (colorIndex === undefined || colorIndex === 256) {
    return '#ffffff'; // ByLayer - default to white
  }
  if (colorIndex === 0) {
    return '#000000'; // ByBlock - default to black
  }

  // AutoCAD Color Index (ACI) - common colors
  const aciColors: Record<number, string> = {
    1: '#ff0000',   // Red
    2: '#ffff00',   // Yellow
    3: '#00ff00',   // Green
    4: '#00ffff',   // Cyan
    5: '#0000ff',   // Blue
    6: '#ff00ff',   // Magenta
    7: '#ffffff',   // White
    8: '#808080',   // Dark gray
    9: '#c0c0c0',   // Light gray
    10: '#ff0000',  // Red
    // Add more as needed
  };

  return aciColors[colorIndex] || '#ffffff';
}

/**
 * Generate unique ID for entities
 */
function generateId(): string {
  return `dwg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Convert DWG entity to CAD entity
 */
function convertEntity(dwgEntity: DWGEntity, index: number): AnyCADEntity | null {
  const baseEntity = {
    id: generateId(),
    layer: dwgEntity.layer || '0',
    color: dwgColorToHex(dwgEntity.color),
    visible: true,
    selected: false,
  };

  switch (dwgEntity.type) {
    case 'LINE': {
      // libredwg uses startPoint/endPoint
      const start = dwgEntity.startPoint || dwgEntity.start || dwgEntity.start_pt;
      const end = dwgEntity.endPoint || dwgEntity.end || dwgEntity.end_pt;
      if (!start || !end) return null;

      return {
        ...baseEntity,
        type: 'line',
        start: { x: start.x, y: start.y, z: start.z || 0 },
        end: { x: end.x, y: end.y, z: end.z || 0 },
      } as LineEntity;
    }

    case 'LWPOLYLINE':
    case 'POLYLINE':
    case 'POLYLINE2D':
    case 'POLYLINE3D': {
      if (!dwgEntity.vertices || dwgEntity.vertices.length < 2) return null;

      return {
        ...baseEntity,
        type: 'polyline',
        vertices: dwgEntity.vertices.map(v => ({
          x: v.x,
          y: v.y,
          z: v.z || 0,
        })),
        closed: dwgEntity.closed || false,
      } as PolylineEntity;
    }

    case 'CIRCLE': {
      if (!dwgEntity.center || dwgEntity.radius === undefined) return null;

      return {
        ...baseEntity,
        type: 'circle',
        center: {
          x: dwgEntity.center.x,
          y: dwgEntity.center.y,
          z: dwgEntity.center.z || 0,
        },
        radius: dwgEntity.radius,
      } as CircleEntity;
    }

    case 'ARC': {
      if (!dwgEntity.center || dwgEntity.radius === undefined) return null;

      return {
        ...baseEntity,
        type: 'arc',
        center: {
          x: dwgEntity.center.x,
          y: dwgEntity.center.y,
          z: dwgEntity.center.z || 0,
        },
        radius: dwgEntity.radius,
        startAngle: dwgEntity.startAngle || 0,
        endAngle: dwgEntity.endAngle || Math.PI * 2,
      } as ArcEntity;
    }

    case 'TEXT':
    case 'MTEXT': {
      const text = dwgEntity.text || dwgEntity.string || '';
      // libredwg uses startPoint for text position and textHeight for size
      const pos = dwgEntity.startPoint || dwgEntity.position || dwgEntity.insertionPoint;
      if (!pos) return null;

      return {
        ...baseEntity,
        type: 'text',
        position: { x: pos.x, y: pos.y, z: pos.z || 0 },
        text: text,
        height: dwgEntity.textHeight || dwgEntity.height || 10,
        rotation: dwgEntity.rotation || 0,
      } as TextEntity;
    }

    case 'POINT': {
      const location = dwgEntity.location || dwgEntity.position;
      if (!location) return null;

      return {
        ...baseEntity,
        type: 'point',
        position: { x: location.x, y: location.y, z: location.z || 0 },
      } as PointEntity;
    }

    // INSERT entities are handled separately via block explosion
    case 'INSERT':
      return null;

    case 'DIMENSION':
    case 'DIMENSION_LINEAR':
    case 'DIMENSION_ALIGNED':
    case 'DIMENSION_ANG3PT':
    case 'DIMENSION_ANG2LN':
    case 'DIMENSION_RADIUS':
    case 'DIMENSION_DIAMETER':
    case 'DIMENSION_ORDINATE': {
      // Map DWG dimension type codes to our types
      const dimTypeMap: Record<number, DimensionType> = {
        0: 'linear',    // Rotated, horizontal, or vertical
        1: 'aligned',   // Aligned
        2: 'angular',   // Angular
        3: 'diameter',  // Diameter
        4: 'radial',    // Radius
        5: 'angular',   // Angular 3-point
        6: 'ordinate',  // Ordinate
      };

      // libredwg uses dimensionType as bit field, extract actual type from bits 0-2
      const dimTypeBits = (dwgEntity.dimensionType ?? 0) & 0x07;
      const dimType = dimTypeMap[dimTypeBits] || 'linear';

      // Get definition points - libredwg uses subDefinitionPoint1/2 and definitionPoint
      const entity = dwgEntity as any;
      const defPoint1 = entity.subDefinitionPoint1 || dwgEntity.defPoint2 || dwgEntity.start || { x: 0, y: 0, z: 0 };
      const defPoint2 = entity.subDefinitionPoint2 || dwgEntity.defPoint3 || dwgEntity.end || { x: 0, y: 0, z: 0 };
      const dimLinePoint = entity.definitionPoint || dwgEntity.defPoint || { x: 0, y: 0, z: 0 };
      const textPosition = entity.textPoint || dwgEntity.textMidpoint || dwgEntity.position || dimLinePoint;

      // Calculate measurement if not provided
      let measurement = dwgEntity.measurement;
      if (measurement === undefined) {
        const dx = defPoint2.x - defPoint1.x;
        const dy = defPoint2.y - defPoint1.y;
        measurement = Math.sqrt(dx * dx + dy * dy);
      }

      // Format dimension text
      const text = dwgEntity.userText || dwgEntity.text || measurement.toFixed(2);

      return {
        ...baseEntity,
        type: 'dimension',
        dimensionType: dimType,
        defPoint1: { x: defPoint1.x, y: defPoint1.y, z: defPoint1.z || 0 },
        defPoint2: { x: defPoint2.x, y: defPoint2.y, z: defPoint2.z || 0 },
        dimLinePoint: { x: dimLinePoint.x, y: dimLinePoint.y, z: dimLinePoint.z || 0 },
        textPosition: { x: textPosition.x, y: textPosition.y, z: textPosition.z || 0 },
        text: text,
        measurement: measurement,
        textHeight: dwgEntity.height || 2.5,
      } as DimensionEntity;
    }

    // SPLINE - convert to polyline using fit points or control points
    case 'SPLINE': {
      const fitPoints = (dwgEntity as any).fitPoints || [];
      const controlPoints = (dwgEntity as any).controlPoints || [];
      const points = fitPoints.length >= 2 ? fitPoints : controlPoints;

      if (points.length < 2) return null;

      return {
        ...baseEntity,
        type: 'polyline',
        vertices: points.map((p: any) => ({
          x: p.x,
          y: p.y,
          z: p.z || 0,
        })),
        closed: false,
      } as PolylineEntity;
    }

    // Skip unsupported types for now (TODO: add support)
    case 'HATCH':
    case 'ELLIPSE':
    case 'VIEWPORT':
    case 'OLE2FRAME':
      return null;

    default:
      return null;
  }
}

/**
 * Convert DWG layers to CAD layers
 */
function convertLayers(dwgLayers: DWGLayer[]): CADLayer[] {
  return dwgLayers.map(layer => ({
    name: layer.name,
    color: dwgColorToHex(layer.color),
    visible: layer.on !== false && layer.frozen !== true,
    locked: false,
  }));
}

/**
 * Calculate bounds from entities
 */
function calculateBounds(entities: AnyCADEntity[]): DWGParseResult['bounds'] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const entity of entities) {
    const points: Array<{ x: number; y: number }> = [];

    if ('position' in entity && entity.position) {
      points.push(entity.position);
    }
    if ('start' in entity && entity.start) {
      points.push(entity.start);
    }
    if ('end' in entity && entity.end) {
      points.push(entity.end);
    }
    if ('center' in entity && entity.center) {
      points.push(entity.center);
    }
    if ('vertices' in entity && entity.vertices) {
      points.push(...entity.vertices);
    }

    for (const pt of points) {
      if (pt.x !== undefined && pt.y !== undefined) {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
      }
    }
  }

  return {
    minX: minX === Infinity ? 0 : minX,
    minY: minY === Infinity ? 0 : minY,
    maxX: maxX === -Infinity ? 1000 : maxX,
    maxY: maxY === -Infinity ? 1000 : maxY,
  };
}

/**
 * Extract block definitions from DWG database
 */
function extractBlockDefinitions(rawDb: DWGDatabase): Map<string, BlockDefinition> {
  const blockDefs = new Map<string, BlockDefinition>();

  const blockRecords = rawDb.tables?.BLOCK_RECORD?.entries || [];

  for (const record of blockRecords) {
    if (!record.name) continue;

    // Skip model space and paper space blocks
    if (record.name.startsWith('*')) continue;

    blockDefs.set(record.name, {
      name: record.name,
      basePoint: record.basePoint
        ? { x: record.basePoint.x, y: record.basePoint.y, z: record.basePoint.z || 0 }
        : { x: 0, y: 0, z: 0 },
      entities: (record.entities || []) as DWGEntity[],
    });
  }

  return blockDefs;
}

/**
 * Parse a DWG file and return CAD entities
 */
export async function parseDWG(buffer: ArrayBuffer): Promise<DWGParseResult> {
  const libredwg = await getLibreDwg();

  // Parse DWG file - pass buffer as Uint8Array (library accepts this)
  const dwg = libredwg.dwg_read_data(new Uint8Array(buffer) as unknown as ArrayBuffer, Dwg_File_Type.DWG);

  if (!dwg) {
    throw new Error('Failed to parse DWG file');
  }

  // Convert to database format - use any since library types don't match our interface exactly
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawDb: any = libredwg.convert(dwg);

  // Map to our expected structure
  const db: DWGDatabase = {
    entities: rawDb.entities || [],
    tables: {
      layer: rawDb.tables?.LAYER?.entries || [],
      BLOCK_RECORD: rawDb.tables?.BLOCK_RECORD || { entries: [] },
    },
  };

  // Extract block definitions for INSERT explosion
  const blockDefs = extractBlockDefinitions(db);

  // Convert entities
  const entities: AnyCADEntity[] = [];
  const byType: Record<string, number> = {};
  const byLayer: Record<string, number> = {};

  if (db.entities) {
    for (let i = 0; i < db.entities.length; i++) {
      const dwgEntity: DWGEntity = db.entities[i] as DWGEntity;
      const type = dwgEntity.type || 'UNKNOWN';
      const layer = dwgEntity.layer || '0';

      byType[type] = (byType[type] || 0) + 1;
      byLayer[layer] = (byLayer[layer] || 0) + 1;

      // Handle INSERT entities via block explosion
      if (type === 'INSERT') {
        const insertEntity = dwgEntity as unknown as DWGInsertEntity;
        const explodedEntities = explodeBlock(insertEntity, blockDefs);

        // Track exploded entities in stats
        for (const exploded of explodedEntities) {
          byType[`INSERT→${exploded.type}`] = (byType[`INSERT→${exploded.type}`] || 0) + 1;
          byLayer[exploded.layer] = (byLayer[exploded.layer] || 0) + 1;
        }

        entities.push(...explodedEntities);
      } else {
        const cadEntity = convertEntity(dwgEntity, i);
        if (cadEntity) {
          entities.push(cadEntity);
        }
      }
    }
  }

  // Convert layers
  const layers = db.tables?.layer ? convertLayers(db.tables.layer) : [
    { name: '0', color: '#ffffff', visible: true, locked: false }
  ];

  // Calculate bounds
  const bounds = calculateBounds(entities);

  // Free memory
  libredwg.dwg_free(dwg);

  return {
    entities,
    layers,
    bounds,
    stats: {
      totalEntities: db.entities?.length || 0,
      byType,
      byLayer,
      blockCount: blockDefs.size,
    },
  };
}

/**
 * Check if a file is a valid DWG file
 */
export function isDWGFile(buffer: ArrayBuffer): boolean {
  const view = new Uint8Array(buffer, 0, 6);
  // DWG files start with "AC" followed by version number
  return view[0] === 0x41 && view[1] === 0x43;
}

/**
 * Get DWG version from file header
 */
export function getDWGVersion(buffer: ArrayBuffer): string {
  const view = new Uint8Array(buffer, 0, 6);
  const versionStr = String.fromCharCode(...view);

  const versions: Record<string, string> = {
    'AC1015': 'AutoCAD 2000',
    'AC1018': 'AutoCAD 2004',
    'AC1021': 'AutoCAD 2007',
    'AC1024': 'AutoCAD 2010',
    'AC1027': 'AutoCAD 2013',
    'AC1032': 'AutoCAD 2018',
  };

  return versions[versionStr] || `Unknown (${versionStr})`;
}
