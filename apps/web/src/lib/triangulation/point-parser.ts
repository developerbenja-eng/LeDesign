/**
 * Smart Surface Generation - Point Parser
 *
 * Parses survey points from CSV/XYZ files with automatic column detection,
 * validation, outlier detection, and duplicate removal.
 */

import Papa from 'papaparse';
import {
  SurveyPoint,
  CSVParseOptions,
  ParseResult,
  ParseError,
  ParseWarning,
  ColumnMapping,
  DatasetStatistics,
  BoundingBox,
} from './types';

// ============================================================================
// Column Detection
// ============================================================================

const X_COLUMN_NAMES = ['x', 'easting', 'este', 'e', 'lon', 'longitude', 'lng', 'coord_x'];
const Y_COLUMN_NAMES = ['y', 'northing', 'norte', 'n', 'lat', 'latitude', 'coord_y'];
const Z_COLUMN_NAMES = ['z', 'elevation', 'elevacion', 'elev', 'altura', 'height', 'alt', 'cota', 'coord_z'];
const ID_COLUMN_NAMES = ['id', 'point_id', 'punto', 'pt', 'num', 'number', 'nombre', 'name'];
const CODE_COLUMN_NAMES = ['code', 'codigo', 'cod', 'feature', 'type', 'tipo', 'desc'];

/**
 * Auto-detect column mapping from header row
 */
export function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

  // Find X column
  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (X_COLUMN_NAMES.includes(normalizedHeaders[i])) {
      mapping.x = i;
      break;
    }
  }

  // Find Y column
  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (Y_COLUMN_NAMES.includes(normalizedHeaders[i])) {
      mapping.y = i;
      break;
    }
  }

  // Find Z column
  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (Z_COLUMN_NAMES.includes(normalizedHeaders[i])) {
      mapping.z = i;
      break;
    }
  }

  // Find ID column
  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (ID_COLUMN_NAMES.includes(normalizedHeaders[i])) {
      mapping.id = i;
      break;
    }
  }

  // Find Code column
  for (let i = 0; i < normalizedHeaders.length; i++) {
    if (CODE_COLUMN_NAMES.includes(normalizedHeaders[i])) {
      mapping.code = i;
      break;
    }
  }

  // Fallback: If no headers matched, try positional detection
  // Common formats: ID,X,Y,Z or X,Y,Z or Pt,N,E,Z
  if (mapping.x === undefined && mapping.y === undefined && mapping.z === undefined) {
    if (headers.length >= 3) {
      // Check if first column is numeric (likely ID) or not
      const firstIsNumeric = !isNaN(parseFloat(headers[0]));

      if (headers.length === 3) {
        // Assume X,Y,Z
        mapping.x = 0;
        mapping.y = 1;
        mapping.z = 2;
      } else if (headers.length >= 4) {
        if (firstIsNumeric || headers[0].match(/^\d+$/)) {
          // Assume ID,X,Y,Z or ID,N,E,Z
          mapping.id = 0;
          mapping.x = 1;
          mapping.y = 2;
          mapping.z = 3;
        } else {
          // Assume Name,X,Y,Z
          mapping.id = 0;
          mapping.x = 1;
          mapping.y = 2;
          mapping.z = 3;
        }
      }
    }
  }

  return mapping;
}

/**
 * Detect delimiter from file content
 */
export function detectDelimiter(content: string): ',' | ';' | '\t' | ' ' {
  const firstLines = content.split('\n').slice(0, 5).join('\n');

  const delimiters: Array<',' | ';' | '\t' | ' '> = [',', ';', '\t', ' '];
  let bestDelimiter: ',' | ';' | '\t' | ' ' = ',';
  let maxConsistency = 0;

  for (const delimiter of delimiters) {
    const lines = firstLines.split('\n').filter(l => l.trim());
    if (lines.length < 2) continue;

    const counts = lines.map(line => line.split(delimiter).length);
    const isConsistent = counts.every(c => c === counts[0]);

    if (isConsistent && counts[0] > maxConsistency) {
      maxConsistency = counts[0];
      bestDelimiter = delimiter;
    }
  }

  return bestDelimiter;
}

/**
 * Detect if file has header row
 */
export function detectHeader(firstRow: string[]): boolean {
  // Check if first row contains any non-numeric values that look like headers
  const hasTextValues = firstRow.some(cell => {
    const trimmed = cell.trim();
    if (!trimmed) return false;
    const num = parseFloat(trimmed);
    return isNaN(num) && trimmed.length > 0;
  });

  // Check for common header patterns
  const lowerRow = firstRow.map(c => c.toLowerCase().trim());
  const hasCommonHeaders = lowerRow.some(cell =>
    [...X_COLUMN_NAMES, ...Y_COLUMN_NAMES, ...Z_COLUMN_NAMES, ...ID_COLUMN_NAMES].includes(cell)
  );

  return hasTextValues || hasCommonHeaders;
}

// ============================================================================
// Main Parsing Functions
// ============================================================================

/**
 * Parse CSV/XYZ file content into survey points
 */
export async function parseCSV(
  content: string,
  options: CSVParseOptions = {}
): Promise<ParseResult> {
  const startTime = performance.now();
  const errors: ParseError[] = [];
  const warnings: ParseWarning[] = [];
  const points: SurveyPoint[] = [];

  // Detect delimiter if not specified
  const delimiter = options.delimiter || detectDelimiter(content);

  // Parse CSV
  const parseResult = Papa.parse<string[]>(content, {
    delimiter,
    skipEmptyLines: true,
    comments: '#',
  });

  if (parseResult.errors.length > 0) {
    for (const err of parseResult.errors) {
      errors.push({
        row: err.row || 0,
        message: err.message,
      });
    }
  }

  const data = parseResult.data;
  if (data.length === 0) {
    return {
      success: false,
      points: [],
      errors: [{ row: 0, message: 'No data found in file' }],
      warnings: [],
      statistics: { totalRows: 0, validPoints: 0, skippedRows: 0, parseTime: 0 },
    };
  }

  // Detect header and column mapping
  const hasHeader = options.hasHeader ?? detectHeader(data[0]);
  const startRow = (options.skipRows || 0) + (hasHeader ? 1 : 0);

  const headers = hasHeader ? data[0] : data[0].map((_, i) => `col_${i}`);
  const mapping = options.columnMapping || detectColumnMapping(headers);

  // Validate mapping
  if (mapping.x === undefined || mapping.y === undefined || mapping.z === undefined) {
    return {
      success: false,
      points: [],
      errors: [{
        row: 0,
        message: `Could not detect X, Y, Z columns. Found mapping: X=${mapping.x}, Y=${mapping.y}, Z=${mapping.z}`,
      }],
      warnings: [],
      statistics: { totalRows: data.length, validPoints: 0, skippedRows: data.length, parseTime: 0 },
    };
  }

  // Parse points
  let skippedRows = 0;
  const seenCoords = new Map<string, number>(); // For duplicate detection

  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 1;

    try {
      const xCol = typeof mapping.x === 'number' ? mapping.x : parseInt(mapping.x as string);
      const yCol = typeof mapping.y === 'number' ? mapping.y : parseInt(mapping.y as string);
      const zCol = typeof mapping.z === 'number' ? mapping.z : parseInt(mapping.z as string);

      const xStr = row[xCol]?.trim();
      const yStr = row[yCol]?.trim();
      const zStr = row[zCol]?.trim();

      if (!xStr || !yStr || !zStr) {
        skippedRows++;
        warnings.push({
          row: rowNum,
          type: 'missing_value',
          message: `Row ${rowNum}: Missing coordinate value`,
        });
        continue;
      }

      const x = parseFloat(xStr.replace(',', '.'));
      const y = parseFloat(yStr.replace(',', '.'));
      let z = parseFloat(zStr.replace(',', '.'));

      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        skippedRows++;
        errors.push({
          row: rowNum,
          message: `Invalid numeric values: X=${xStr}, Y=${yStr}, Z=${zStr}`,
        });
        continue;
      }

      // Convert feet to meters if specified
      if (options.elevationUnit === 'feet') {
        z = z * 0.3048;
      }

      // Check for duplicates
      const coordKey = `${x.toFixed(3)}_${y.toFixed(3)}`;
      if (seenCoords.has(coordKey)) {
        const origRow = seenCoords.get(coordKey)!;
        warnings.push({
          row: rowNum,
          type: 'duplicate',
          message: `Row ${rowNum}: Duplicate XY coordinate (same as row ${origRow})`,
        });
        // Still add the point, but mark for potential removal
      }
      seenCoords.set(coordKey, rowNum);

      // Get optional fields
      let id = `P${points.length + 1}`;
      if (mapping.id !== undefined) {
        const idCol = typeof mapping.id === 'number' ? mapping.id : parseInt(mapping.id as string);
        id = row[idCol]?.trim() || id;
      }

      let code: string | undefined;
      if (mapping.code !== undefined) {
        const codeCol = typeof mapping.code === 'number' ? mapping.code : parseInt(mapping.code as string);
        code = row[codeCol]?.trim();
      }

      points.push({
        id,
        x,
        y,
        z,
        code,
        source: 'survey_csv',
      });
    } catch (err) {
      skippedRows++;
      errors.push({
        row: rowNum,
        message: `Parse error: ${(err as Error).message}`,
      });
    }
  }

  const parseTime = performance.now() - startTime;

  return {
    success: errors.length === 0 || points.length > 0,
    points,
    errors,
    warnings,
    statistics: {
      totalRows: data.length - startRow,
      validPoints: points.length,
      skippedRows,
      parseTime,
    },
  };
}

// ============================================================================
// Validation & Cleaning
// ============================================================================

/**
 * Remove duplicate points within tolerance
 */
export function removeDuplicates(
  points: SurveyPoint[],
  tolerance: number = 0.001
): { points: SurveyPoint[]; removedCount: number } {
  const seen = new Map<string, SurveyPoint>();
  const result: SurveyPoint[] = [];
  let removedCount = 0;

  for (const point of points) {
    // Round coordinates to tolerance
    const precision = Math.ceil(-Math.log10(tolerance));
    const key = `${point.x.toFixed(precision)}_${point.y.toFixed(precision)}`;

    if (!seen.has(key)) {
      seen.set(key, point);
      result.push(point);
    } else {
      removedCount++;
      // Keep the one with higher elevation accuracy (more decimal places)
      const existing = seen.get(key)!;
      const existingDecimals = (existing.z.toString().split('.')[1] || '').length;
      const newDecimals = (point.z.toString().split('.')[1] || '').length;
      if (newDecimals > existingDecimals) {
        // Replace with more precise point
        const idx = result.findIndex(p => p.id === existing.id);
        if (idx >= 0) {
          result[idx] = point;
          seen.set(key, point);
        }
      }
    }
  }

  return { points: result, removedCount };
}

/**
 * Detect and remove elevation outliers using IQR method
 */
export function removeOutliers(
  points: SurveyPoint[],
  threshold: number = 3.0
): { points: SurveyPoint[]; outliers: SurveyPoint[]; stats: { mean: number; stdDev: number } } {
  if (points.length < 10) {
    return {
      points,
      outliers: [],
      stats: { mean: 0, stdDev: 0 },
    };
  }

  // Calculate statistics
  const elevations = points.map(p => p.z);
  const mean = elevations.reduce((a, b) => a + b, 0) / elevations.length;
  const variance = elevations.reduce((sum, z) => sum + Math.pow(z - mean, 2), 0) / elevations.length;
  const stdDev = Math.sqrt(variance);

  // Filter outliers
  const result: SurveyPoint[] = [];
  const outliers: SurveyPoint[] = [];

  for (const point of points) {
    const zScore = Math.abs(point.z - mean) / stdDev;
    if (zScore <= threshold) {
      result.push(point);
    } else {
      outliers.push(point);
    }
  }

  return {
    points: result,
    outliers,
    stats: { mean, stdDev },
  };
}

/**
 * Calculate dataset statistics
 */
export function calculateStatistics(points: SurveyPoint[]): DatasetStatistics {
  if (points.length === 0) {
    return {
      pointCount: 0,
      densityPerHectare: 0,
      elevationMean: 0,
      elevationStdDev: 0,
      elevationMin: 0,
      elevationMax: 0,
      areaHectares: 0,
      outlierCount: 0,
      duplicateCount: 0,
    };
  }

  const elevations = points.map(p => p.z);
  const mean = elevations.reduce((a, b) => a + b, 0) / elevations.length;
  const variance = elevations.reduce((sum, z) => sum + Math.pow(z - mean, 2), 0) / elevations.length;
  const stdDev = Math.sqrt(variance);
  const minZ = Math.min(...elevations);
  const maxZ = Math.max(...elevations);

  // Calculate bounding box area
  const bounds = calculateBounds(points);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const areaSquareMeters = width * height;
  const areaHectares = areaSquareMeters / 10000;

  // Point density
  const densityPerHectare = areaHectares > 0 ? points.length / areaHectares : 0;

  // Count ground points if LAS classification available
  const groundPointCount = points.filter(p => p.classification === 2).length;

  return {
    pointCount: points.length,
    groundPointCount: groundPointCount > 0 ? groundPointCount : undefined,
    densityPerHectare,
    elevationMean: mean,
    elevationStdDev: stdDev,
    elevationMin: minZ,
    elevationMax: maxZ,
    areaHectares,
    outlierCount: 0,
    duplicateCount: 0,
  };
}

/**
 * Calculate bounding box
 */
export function calculateBounds(points: SurveyPoint[]): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.z > maxZ) maxZ = p.z;
  }

  return { minX, maxX, minY, maxY, minZ, maxZ };
}

// ============================================================================
// File Type Detection
// ============================================================================

export type SurveyFileType = 'csv' | 'xyz' | 'las' | 'laz' | 'unknown';

/**
 * Detect file type from filename or content
 */
export function detectFileType(filename: string, content?: ArrayBuffer): SurveyFileType {
  const ext = filename.toLowerCase().split('.').pop();

  if (ext === 'csv' || ext === 'txt') return 'csv';
  if (ext === 'xyz' || ext === 'pts') return 'xyz';
  if (ext === 'las') return 'las';
  if (ext === 'laz') return 'laz';

  // Check file magic bytes for LAS
  if (content && content.byteLength >= 4) {
    const view = new DataView(content);
    const magic = String.fromCharCode(
      view.getUint8(0),
      view.getUint8(1),
      view.getUint8(2),
      view.getUint8(3)
    );
    if (magic === 'LASF') return 'las';
  }

  return 'unknown';
}

// ============================================================================
// XYZ Format (Space-separated, no header)
// ============================================================================

/**
 * Parse simple XYZ format (space-separated X Y Z, no header)
 */
export async function parseXYZ(content: string): Promise<ParseResult> {
  return parseCSV(content, {
    delimiter: ' ',
    hasHeader: false,
    columnMapping: { x: 0, y: 1, z: 2 },
  });
}

// ============================================================================
// Process Full File
// ============================================================================

/**
 * Full pipeline: parse, validate, clean, calculate statistics
 */
export async function processPointFile(
  content: string | ArrayBuffer,
  filename: string,
  options: CSVParseOptions & {
    removeOutliers?: boolean;
    removeDuplicates?: boolean;
    outlierThreshold?: number;
    duplicateTolerance?: number;
  } = {}
): Promise<{
  result: ParseResult;
  statistics: DatasetStatistics;
  bounds: BoundingBox;
  cleanedPoints: SurveyPoint[];
}> {
  const fileType = detectFileType(filename, content instanceof ArrayBuffer ? content : undefined);

  let result: ParseResult;

  if (fileType === 'las' || fileType === 'laz') {
    // LAS parsing not implemented in this file - will be separate
    return {
      result: {
        success: false,
        points: [],
        errors: [{ row: 0, message: 'LAS/LAZ parsing requires separate implementation' }],
        warnings: [],
        statistics: { totalRows: 0, validPoints: 0, skippedRows: 0, parseTime: 0 },
      },
      statistics: calculateStatistics([]),
      bounds: calculateBounds([]),
      cleanedPoints: [],
    };
  }

  // Parse as CSV/XYZ
  const textContent = content instanceof ArrayBuffer
    ? new TextDecoder().decode(content)
    : content;

  if (fileType === 'xyz') {
    result = await parseXYZ(textContent);
  } else {
    result = await parseCSV(textContent, options);
  }

  let cleanedPoints = result.points;

  // Remove duplicates
  if (options.removeDuplicates !== false) {
    const { points: deduped, removedCount } = removeDuplicates(
      cleanedPoints,
      options.duplicateTolerance || 0.001
    );
    cleanedPoints = deduped;
    result.warnings.push({
      type: 'duplicate',
      message: `Removed ${removedCount} duplicate points`,
    });
  }

  // Remove outliers
  if (options.removeOutliers !== false) {
    const { points: cleaned, outliers, stats } = removeOutliers(
      cleanedPoints,
      options.outlierThreshold || 3.0
    );
    cleanedPoints = cleaned;
    if (outliers.length > 0) {
      result.warnings.push({
        type: 'outlier',
        message: `Removed ${outliers.length} outliers (mean=${stats.mean.toFixed(2)}, stdDev=${stats.stdDev.toFixed(2)})`,
      });
    }
  }

  const statistics = calculateStatistics(cleanedPoints);
  const bounds = calculateBounds(cleanedPoints);

  return {
    result,
    statistics,
    bounds,
    cleanedPoints,
  };
}
