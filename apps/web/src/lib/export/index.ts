/**
 * Export Utilities Module
 *
 * Provides functionality to export calculation results to various formats:
 * - CSV (using papaparse)
 * - Excel (using xlsx)
 * - JSON
 *
 * Supports all leleCAD calculation modules:
 * - Pavement design (AASHTO)
 * - Sewer hydraulics
 * - Road geometry
 * - Urban elements
 */

import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';

// ============================================================
// TYPES
// ============================================================

export type ExportFormat = 'csv' | 'excel' | 'json';

export interface ExportOptions {
  /** Filename without extension */
  filename: string;
  /** Include headers in output */
  includeHeaders?: boolean;
  /** Include timestamp in filename */
  includeTimestamp?: boolean;
  /** Include metadata sheet (Excel only) */
  includeMetadata?: boolean;
  /** Number decimal places */
  decimalPlaces?: number;
  /** Language for headers */
  language?: 'es' | 'en';
}

export interface ExportMetadata {
  projectName?: string;
  projectNumber?: string;
  engineer?: string;
  date?: string;
  software?: string;
  version?: string;
  notes?: string;
}

export interface ExportResult {
  success: boolean;
  filename: string;
  format: ExportFormat;
  blob?: Blob;
  dataUrl?: string;
  error?: string;
}

export interface TableData {
  headers: string[];
  rows: (string | number | boolean | null)[][];
  title?: string;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Format number with specified decimal places
 */
function formatNumber(value: number | null | undefined, decimals: number = 3): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '-';
  }
  return value.toFixed(decimals);
}

/**
 * Generate timestamp string for filenames
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
}

/**
 * Flatten a nested object for export
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix: string = '',
  separator: string = '.'
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}${separator}${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, newKey, separator));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

// ============================================================
// CSV EXPORT
// ============================================================

/**
 * Export data to CSV format
 */
export function exportToCSV(
  data: TableData | Record<string, unknown>[],
  options: ExportOptions
): ExportResult {
  const {
    filename,
    includeTimestamp = true,
    decimalPlaces = 3,
  } = options;

  try {
    let csvContent: string;

    if (Array.isArray(data) && data.length > 0 && !('headers' in data)) {
      // Array of objects
      const flattened = (data as Record<string, unknown>[]).map(item =>
        flattenObject(item)
      );

      // Process numbers
      const processed = flattened.map(row => {
        const newRow: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          if (typeof value === 'number') {
            newRow[key] = formatNumber(value, decimalPlaces);
          } else {
            newRow[key] = value;
          }
        }
        return newRow;
      });

      csvContent = Papa.unparse(processed);
    } else if ('headers' in data) {
      // TableData format
      const tableData = data as TableData;
      const rows = [tableData.headers, ...tableData.rows.map(row =>
        row.map(cell => {
          if (typeof cell === 'number') {
            return formatNumber(cell, decimalPlaces);
          }
          return cell;
        })
      )];
      csvContent = Papa.unparse(rows);
    } else {
      throw new Error('Invalid data format for CSV export');
    }

    // Create blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const finalFilename = includeTimestamp
      ? `${filename}_${getTimestamp()}.csv`
      : `${filename}.csv`;

    // Create data URL for download
    const dataUrl = URL.createObjectURL(blob);

    return {
      success: true,
      filename: finalFilename,
      format: 'csv',
      blob,
      dataUrl,
    };
  } catch (error) {
    return {
      success: false,
      filename: options.filename,
      format: 'csv',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================
// EXCEL EXPORT
// ============================================================

/**
 * Export data to Excel format
 */
export function exportToExcel(
  sheets: { name: string; data: TableData | Record<string, unknown>[] }[],
  options: ExportOptions,
  metadata?: ExportMetadata
): ExportResult {
  const {
    filename,
    includeTimestamp = true,
    includeMetadata = true,
    decimalPlaces = 3,
  } = options;

  try {
    const workbook = XLSX.utils.book_new();

    // Add metadata sheet if requested
    if (includeMetadata && metadata) {
      const metadataRows = [
        ['INFORMACIÓN DEL PROYECTO'],
        [''],
        ['Proyecto:', metadata.projectName || '-'],
        ['Número:', metadata.projectNumber || '-'],
        ['Ingeniero:', metadata.engineer || '-'],
        ['Fecha:', metadata.date || new Date().toLocaleDateString('es-CL')],
        ['Software:', metadata.software || 'leleCAD'],
        ['Versión:', metadata.version || '1.0.0'],
        [''],
        ['Notas:', metadata.notes || '-'],
      ];
      const metadataSheet = XLSX.utils.aoa_to_sheet(metadataRows);

      // Set column widths
      metadataSheet['!cols'] = [{ wch: 15 }, { wch: 40 }];

      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Info');
    }

    // Add data sheets
    for (const sheet of sheets) {
      let sheetData: (string | number | boolean | null)[][];

      if (Array.isArray(sheet.data) && sheet.data.length > 0 && !('headers' in sheet.data)) {
        // Array of objects
        const flattened = (sheet.data as Record<string, unknown>[]).map(item =>
          flattenObject(item)
        );

        // Get all unique keys for headers
        const headers = Array.from(
          new Set(flattened.flatMap(obj => Object.keys(obj)))
        );

        // Create rows
        const rows = flattened.map(obj =>
          headers.map(header => {
            const value = obj[header];
            if (typeof value === 'number') {
              return Number(formatNumber(value, decimalPlaces));
            }
            return value as string | number | boolean | null;
          })
        );

        sheetData = [headers, ...rows];
      } else if ('headers' in sheet.data) {
        // TableData format
        const tableData = sheet.data as TableData;
        sheetData = [
          tableData.headers,
          ...tableData.rows.map(row =>
            row.map(cell => {
              if (typeof cell === 'number') {
                return Number(formatNumber(cell, decimalPlaces));
              }
              return cell;
            })
          ),
        ];
      } else {
        continue;
      }

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Auto-fit column widths (approximate)
      const colWidths = sheetData[0].map((_, colIndex) => {
        const maxLength = Math.max(
          ...sheetData.map(row => String(row[colIndex] || '').length)
        );
        return { wch: Math.min(50, Math.max(10, maxLength + 2)) };
      });
      worksheet['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.substring(0, 31));
    }

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const finalFilename = includeTimestamp
      ? `${filename}_${getTimestamp()}.xlsx`
      : `${filename}.xlsx`;

    const dataUrl = URL.createObjectURL(blob);

    return {
      success: true,
      filename: finalFilename,
      format: 'excel',
      blob,
      dataUrl,
    };
  } catch (error) {
    return {
      success: false,
      filename: options.filename,
      format: 'excel',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================
// JSON EXPORT
// ============================================================

/**
 * Export data to JSON format
 */
export function exportToJSON(
  data: unknown,
  options: ExportOptions
): ExportResult {
  const {
    filename,
    includeTimestamp = true,
  } = options;

  try {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });

    const finalFilename = includeTimestamp
      ? `${filename}_${getTimestamp()}.json`
      : `${filename}.json`;

    const dataUrl = URL.createObjectURL(blob);

    return {
      success: true,
      filename: finalFilename,
      format: 'json',
      blob,
      dataUrl,
    };
  } catch (error) {
    return {
      success: false,
      filename: options.filename,
      format: 'json',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================
// DOWNLOAD HELPER
// ============================================================

/**
 * Trigger file download in browser
 */
export function downloadFile(result: ExportResult): void {
  if (!result.success || !result.dataUrl) {
    console.error('Export failed:', result.error);
    return;
  }

  const link = document.createElement('a');
  link.href = result.dataUrl;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  setTimeout(() => {
    if (result.dataUrl) {
      URL.revokeObjectURL(result.dataUrl);
    }
  }, 100);
}

// ============================================================
// MODULE-SPECIFIC EXPORTERS
// ============================================================

/**
 * Export pavement design results
 */
export function exportPavementDesign(
  designResult: {
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    layers?: Record<string, unknown>[];
  },
  options: ExportOptions,
  metadata?: ExportMetadata
): ExportResult {
  const sheets = [
    {
      name: 'Datos de Entrada',
      data: {
        headers: ['Parámetro', 'Valor', 'Unidad'],
        rows: Object.entries(designResult.input).map(([key, value]) => [
          getSpanishLabel(key),
          value as string | number,
          getUnit(key),
        ]),
      } as TableData,
    },
    {
      name: 'Resultados',
      data: {
        headers: ['Parámetro', 'Valor', 'Unidad'],
        rows: Object.entries(designResult.output).map(([key, value]) => [
          getSpanishLabel(key),
          value as string | number,
          getUnit(key),
        ]),
      } as TableData,
    },
  ];

  if (designResult.layers && designResult.layers.length > 0) {
    const layerHeaders = Object.keys(designResult.layers[0]);
    sheets.push({
      name: 'Capas',
      data: {
        headers: layerHeaders.map(h => getSpanishLabel(h)),
        rows: designResult.layers.map(layer =>
          layerHeaders.map(h => layer[h] as string | number | boolean | null)
        ),
      } as TableData,
    });
  }

  return exportToExcel(sheets, options, metadata);
}

/**
 * Export sewer hydraulics results
 */
export function exportSewerHydraulics(
  results: {
    pipe: Record<string, unknown>;
    hydraulics: Record<string, unknown>;
    sizing?: Record<string, unknown>[];
  },
  options: ExportOptions,
  metadata?: ExportMetadata
): ExportResult {
  const sheets = [
    {
      name: 'Tubería',
      data: {
        headers: ['Propiedad', 'Valor', 'Unidad'],
        rows: Object.entries(results.pipe).map(([key, value]) => [
          getSpanishLabel(key),
          value as string | number,
          getUnit(key),
        ]),
      } as TableData,
    },
    {
      name: 'Hidráulica',
      data: {
        headers: ['Parámetro', 'Valor', 'Unidad'],
        rows: Object.entries(results.hydraulics).map(([key, value]) => [
          getSpanishLabel(key),
          value as string | number,
          getUnit(key),
        ]),
      } as TableData,
    },
  ];

  if (results.sizing && results.sizing.length > 0) {
    const sizingHeaders = Object.keys(results.sizing[0]);
    sheets.push({
      name: 'Alternativas',
      data: {
        headers: sizingHeaders.map(h => getSpanishLabel(h)),
        rows: results.sizing.map(item =>
          sizingHeaders.map(h => item[h] as string | number | boolean | null)
        ),
      } as TableData,
    });
  }

  return exportToExcel(sheets, options, metadata);
}

/**
 * Export road geometry results
 */
export function exportRoadGeometry(
  results: {
    curveType: string;
    input: Record<string, unknown>;
    output: Record<string, unknown>;
    stakeout?: Record<string, unknown>[];
  },
  options: ExportOptions,
  metadata?: ExportMetadata
): ExportResult {
  const sheets = [
    {
      name: 'Datos de Entrada',
      data: {
        headers: ['Parámetro', 'Valor', 'Unidad'],
        rows: Object.entries(results.input).map(([key, value]) => [
          getSpanishLabel(key),
          value as string | number,
          getUnit(key),
        ]),
      } as TableData,
    },
    {
      name: 'Elementos Curva',
      data: {
        headers: ['Elemento', 'Valor', 'Unidad'],
        rows: Object.entries(results.output).map(([key, value]) => [
          getSpanishLabel(key),
          value as string | number,
          getUnit(key),
        ]),
      } as TableData,
    },
  ];

  if (results.stakeout && results.stakeout.length > 0) {
    const stakeoutHeaders = Object.keys(results.stakeout[0]);
    sheets.push({
      name: 'Replanteo',
      data: {
        headers: stakeoutHeaders.map(h => getSpanishLabel(h)),
        rows: results.stakeout.map(item =>
          stakeoutHeaders.map(h => item[h] as string | number | boolean | null)
        ),
      } as TableData,
    });
  }

  return exportToExcel(sheets, options, metadata);
}

// ============================================================
// LABEL TRANSLATIONS
// ============================================================

const SPANISH_LABELS: Record<string, string> = {
  // Pavement
  W18: 'ESALs de Diseño',
  reliability: 'Confiabilidad',
  standardDeviation: 'Desviación Estándar',
  deltaServiceability: 'Pérdida de Serviciabilidad',
  subgradeModulus: 'Módulo Resiliente Subrasante',
  structuralNumber: 'Número Estructural (SN)',
  layerCoefficient: 'Coeficiente de Capa',
  drainageCoefficient: 'Coeficiente de Drenaje',
  thickness: 'Espesor',

  // Sewer
  diameter: 'Diámetro',
  slope: 'Pendiente',
  material: 'Material',
  flowRate: 'Caudal',
  velocity: 'Velocidad',
  fillRatio: 'Relación de Llenado',
  flowDepth: 'Profundidad de Flujo',
  flowArea: 'Área de Flujo',
  wettedPerimeter: 'Perímetro Mojado',
  hydraulicRadius: 'Radio Hidráulico',
  froudeNumber: 'Número de Froude',
  flowRegime: 'Régimen de Flujo',
  shearStress: 'Tensión de Corte',

  // Road Geometry
  radius: 'Radio',
  deflectionAngle: 'Ángulo de Deflexión',
  delta: 'Delta (Δ)',
  tangent: 'Tangente (T)',
  length: 'Longitud (L)',
  external: 'Externa (E)',
  middleOrdinate: 'Ordenada Media (M)',
  longChord: 'Cuerda Larga (C)',
  degreeOfCurve: 'Grado de Curvatura',
  pcStation: 'Estación PC',
  ptStation: 'Estación PT',
  piStation: 'Estación PI',
  designSpeed: 'Velocidad de Diseño',
  superelevation: 'Peralte',
  station: 'Estación',
  deflection: 'Deflexión',
  chord: 'Cuerda',
};

function getSpanishLabel(key: string): string {
  return SPANISH_LABELS[key] || key;
}

const UNITS: Record<string, string> = {
  // Pavement
  W18: 'ESALs',
  reliability: '%',
  standardDeviation: '-',
  deltaServiceability: '-',
  subgradeModulus: 'psi',
  structuralNumber: '-',
  layerCoefficient: '-',
  drainageCoefficient: '-',
  thickness: 'cm',

  // Sewer
  diameter: 'mm',
  slope: 'm/m',
  flowRate: 'L/s',
  velocity: 'm/s',
  fillRatio: '-',
  flowDepth: 'm',
  flowArea: 'm²',
  wettedPerimeter: 'm',
  hydraulicRadius: 'm',
  froudeNumber: '-',
  shearStress: 'Pa',

  // Road Geometry
  radius: 'm',
  deflectionAngle: '°',
  delta: '°',
  tangent: 'm',
  length: 'm',
  external: 'm',
  middleOrdinate: 'm',
  longChord: 'm',
  degreeOfCurve: '°',
  pcStation: 'm',
  ptStation: 'm',
  piStation: 'm',
  designSpeed: 'km/h',
  superelevation: '%',
  station: 'm',
  deflection: '°',
  chord: 'm',
};

function getUnit(key: string): string {
  return UNITS[key] || '-';
}
