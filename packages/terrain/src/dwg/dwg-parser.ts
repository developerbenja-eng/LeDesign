/**
 * DWG Parser - Stub Module
 *
 * The actual implementation is in dwg-parser.impl.ts but is disabled
 * due to webpack compatibility issues with libredwg-web's 25MB inline WASM.
 *
 * Standard MINVU details are pre-parsed and stored in the database.
 * Use the "Detalles MINVU" panel to insert them.
 */

import type { AnyCADEntity, CADLayer, Point3D } from '../cad-types';

// Re-export types for backwards compatibility
export interface Transform {
  translation: Point3D;
  rotation: number;
  scale: { x: number; y: number; z: number };
}

export interface BlockDefinition {
  name: string;
  basePoint: Point3D;
  entities: DWGEntity[];
}

export interface DWGInsertEntity extends DWGEntity {
  type: 'INSERT';
  name: string;
  insertionPoint: Point3D;
  xScale?: number;
  yScale?: number;
  zScale?: number;
  rotation?: number;
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
    blockCount?: number;
  };
}

export interface DWGEntity {
  type: string;
  layer?: string;
  color?: number;
  startPoint?: { x: number; y: number; z?: number };
  endPoint?: { x: number; y: number; z?: number };
  start?: { x: number; y: number; z?: number };
  end?: { x: number; y: number; z?: number };
  start_pt?: { x: number; y: number; z?: number };
  end_pt?: { x: number; y: number; z?: number };
  vertices?: Array<{ x: number; y: number; z?: number; bulge?: number }>;
  closed?: boolean;
  center?: { x: number; y: number; z?: number };
  radius?: number;
  startAngle?: number;
  endAngle?: number;
  text?: string;
  string?: string;
  position?: { x: number; y: number; z?: number };
  insertionPoint?: { x: number; y: number; z?: number };
  height?: number;
  textHeight?: number;
  rotation?: number;
  location?: { x: number; y: number; z?: number };
  dimensionType?: number;
  defPoint?: { x: number; y: number; z?: number };
  defPoint2?: { x: number; y: number; z?: number };
  defPoint3?: { x: number; y: number; z?: number };
  defPoint4?: { x: number; y: number; z?: number };
  textMidpoint?: { x: number; y: number; z?: number };
  textRotation?: number;
  measurement?: number;
  userText?: string;
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
 * Parse a DWG file - DISABLED
 *
 * DWG parsing is temporarily disabled due to webpack compatibility issues
 * with the libredwg-web library's 25MB inline WASM.
 *
 * Use the pre-parsed standard details from the "Detalles MINVU" panel instead.
 */
export async function parseDWG(_buffer: ArrayBuffer): Promise<DWGParseResult> {
  throw new Error(
    'DWG parsing is temporarily disabled due to webpack compatibility issues. ' +
    'Use the "Detalles MINVU" panel to insert standard MINVU construction details.'
  );
}

/**
 * Check if a file is a valid DWG file
 */
export function isDWGFile(buffer: ArrayBuffer): boolean {
  const view = new Uint8Array(buffer, 0, 6);
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
