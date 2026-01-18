/**
 * Engineering Calculation Report Generator
 *
 * Creates professional PDF reports for engineering calculations.
 * Supports all leleCAD modules:
 * - Pavement design (AASHTO)
 * - Sewer hydraulics
 * - Road geometry
 * - Urban elements
 *
 * Reports include:
 * - Cover page with project info
 * - Input parameters table
 * - Calculation results
 * - Design checks and warnings
 * - Professional formatting
 */

import { jsPDF } from 'jspdf';

// ============================================================
// TYPES
// ============================================================

export interface ReportMetadata {
  projectName: string;
  projectNumber?: string;
  client?: string;
  engineer: string;
  reviewer?: string;
  date?: string;
  version?: string;
  company?: string;
  logo?: string; // Base64 encoded image
}

export interface ReportSection {
  title: string;
  content: ReportContent[];
}

export type ReportContent =
  | { type: 'text'; value: string }
  | { type: 'heading'; value: string; level: 1 | 2 | 3 }
  | { type: 'table'; headers: string[]; rows: (string | number)[]; title?: string }
  | { type: 'formula'; latex?: string; description: string; result?: string }
  | { type: 'warning'; message: string }
  | { type: 'check'; label: string; passed: boolean; note?: string }
  | { type: 'spacer'; height: number }
  | { type: 'divider' };

export interface ReportOptions {
  language?: 'es' | 'en';
  pageSize?: 'letter' | 'a4';
  orientation?: 'portrait' | 'landscape';
  includePageNumbers?: boolean;
  includeFooter?: boolean;
  footerText?: string;
}

export interface ReportResult {
  success: boolean;
  filename: string;
  blob?: Blob;
  dataUrl?: string;
  error?: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const COLORS = {
  primary: [41, 128, 185] as [number, number, number], // Blue
  secondary: [52, 73, 94] as [number, number, number], // Dark gray
  success: [39, 174, 96] as [number, number, number], // Green
  warning: [243, 156, 18] as [number, number, number], // Orange
  danger: [231, 76, 60] as [number, number, number], // Red
  text: [44, 62, 80] as [number, number, number], // Dark
  lightGray: [236, 240, 241] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

const FONTS = {
  title: 18,
  subtitle: 14,
  heading1: 14,
  heading2: 12,
  heading3: 11,
  body: 10,
  small: 9,
  footer: 8,
};

const MARGINS = {
  top: 25,
  bottom: 25,
  left: 20,
  right: 20,
};

// ============================================================
// REPORT GENERATOR CLASS
// ============================================================

export class ReportGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private contentWidth: number;
  private currentY: number;
  private pageNumber: number;
  private options: Required<ReportOptions>;
  private metadata: ReportMetadata;

  constructor(metadata: ReportMetadata, options: ReportOptions = {}) {
    this.options = {
      language: options.language ?? 'es',
      pageSize: options.pageSize ?? 'letter',
      orientation: options.orientation ?? 'portrait',
      includePageNumbers: options.includePageNumbers ?? true,
      includeFooter: options.includeFooter ?? true,
      footerText: options.footerText ?? 'Generado con leleCAD',
    };

    this.metadata = metadata;
    this.pageNumber = 1;

    // Initialize PDF
    this.doc = new jsPDF({
      orientation: this.options.orientation,
      unit: 'mm',
      format: this.options.pageSize,
    });

    // Get page dimensions
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - MARGINS.left - MARGINS.right;
    this.currentY = MARGINS.top;
  }

  /**
   * Generate cover page
   */
  public addCoverPage(): void {
    const centerX = this.pageWidth / 2;

    // Company name or logo
    if (this.metadata.company) {
      this.doc.setFontSize(16);
      this.doc.setTextColor(...COLORS.secondary);
      this.doc.text(this.metadata.company, centerX, 40, { align: 'center' });
    }

    // Title block
    this.doc.setFillColor(...COLORS.primary);
    this.doc.rect(MARGINS.left, 60, this.contentWidth, 30, 'F');

    this.doc.setFontSize(FONTS.title);
    this.doc.setTextColor(...COLORS.white);
    this.doc.text('MEMORIA DE CÁLCULO', centerX, 75, { align: 'center' });

    if (this.metadata.projectName) {
      this.doc.setFontSize(FONTS.subtitle);
      this.doc.text(this.metadata.projectName.toUpperCase(), centerX, 85, { align: 'center' });
    }

    // Project info box
    const infoY = 110;
    this.doc.setDrawColor(...COLORS.secondary);
    this.doc.setLineWidth(0.5);
    this.doc.rect(MARGINS.left, infoY, this.contentWidth, 60);

    this.doc.setFontSize(FONTS.body);
    this.doc.setTextColor(...COLORS.text);

    const infoItems = [
      ['Proyecto:', this.metadata.projectName],
      ['N° Proyecto:', this.metadata.projectNumber || '-'],
      ['Cliente:', this.metadata.client || '-'],
      ['Ingeniero:', this.metadata.engineer],
      ['Revisor:', this.metadata.reviewer || '-'],
      ['Fecha:', this.metadata.date || new Date().toLocaleDateString('es-CL')],
    ];

    let itemY = infoY + 10;
    for (const [label, value] of infoItems) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(label, MARGINS.left + 5, itemY);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(value, MARGINS.left + 40, itemY);
      itemY += 8;
    }

    // Version
    if (this.metadata.version) {
      this.doc.setFontSize(FONTS.small);
      this.doc.text(`Versión: ${this.metadata.version}`, centerX, this.pageHeight - 40, { align: 'center' });
    }

    // Software credit
    this.doc.setFontSize(FONTS.footer);
    this.doc.setTextColor(...COLORS.secondary);
    this.doc.text('Generado con leleCAD - Software de Diseño de Ingeniería Civil', centerX, this.pageHeight - 20, { align: 'center' });

    this.addNewPage();
  }

  /**
   * Add a new section to the report
   */
  public addSection(section: ReportSection): void {
    // Section title
    this.checkPageBreak(20);
    this.addHeading(section.title, 1);

    // Section content
    for (const content of section.content) {
      this.addContent(content);
    }
  }

  /**
   * Add content element
   */
  private addContent(content: ReportContent): void {
    switch (content.type) {
      case 'text':
        this.addText(content.value);
        break;
      case 'heading':
        this.addHeading(content.value, content.level);
        break;
      case 'table':
        this.addTable(content.headers, content.rows, content.title);
        break;
      case 'formula':
        this.addFormula(content.description, content.result);
        break;
      case 'warning':
        this.addWarning(content.message);
        break;
      case 'check':
        this.addCheck(content.label, content.passed, content.note);
        break;
      case 'spacer':
        this.currentY += content.height;
        break;
      case 'divider':
        this.addDivider();
        break;
    }
  }

  /**
   * Add heading
   */
  private addHeading(text: string, level: 1 | 2 | 3): void {
    const fontSize = level === 1 ? FONTS.heading1 : level === 2 ? FONTS.heading2 : FONTS.heading3;
    const spacing = level === 1 ? 12 : level === 2 ? 10 : 8;

    this.checkPageBreak(spacing + 5);
    this.currentY += level === 1 ? 5 : 3;

    this.doc.setFontSize(fontSize);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...(level === 1 ? COLORS.primary : COLORS.secondary));

    if (level === 1) {
      // Draw underline for main headings
      this.doc.text(text, MARGINS.left, this.currentY);
      this.currentY += 2;
      this.doc.setDrawColor(...COLORS.primary);
      this.doc.setLineWidth(0.5);
      this.doc.line(MARGINS.left, this.currentY, MARGINS.left + this.contentWidth, this.currentY);
    } else {
      this.doc.text(text, MARGINS.left, this.currentY);
    }

    this.currentY += spacing;
    this.doc.setFont('helvetica', 'normal');
  }

  /**
   * Add text paragraph
   */
  private addText(text: string): void {
    this.doc.setFontSize(FONTS.body);
    this.doc.setTextColor(...COLORS.text);
    this.doc.setFont('helvetica', 'normal');

    const lines = this.doc.splitTextToSize(text, this.contentWidth);
    this.checkPageBreak(lines.length * 5 + 5);

    this.doc.text(lines, MARGINS.left, this.currentY);
    this.currentY += lines.length * 5 + 3;
  }

  /**
   * Add table
   */
  private addTable(headers: string[], rows: (string | number)[], title?: string): void {
    const numCols = headers.length;
    const colWidth = this.contentWidth / numCols;
    const rowHeight = 7;

    // Convert flat rows array to 2D array
    const dataRows: (string | number)[][] = [];
    for (let i = 0; i < rows.length; i += numCols) {
      dataRows.push(rows.slice(i, i + numCols));
    }

    const tableHeight = (dataRows.length + 1) * rowHeight + 10;
    this.checkPageBreak(tableHeight);

    // Table title
    if (title) {
      this.doc.setFontSize(FONTS.small);
      this.doc.setFont('helvetica', 'italic');
      this.doc.setTextColor(...COLORS.secondary);
      this.doc.text(title, MARGINS.left, this.currentY);
      this.currentY += 5;
    }

    // Header row
    this.doc.setFillColor(...COLORS.primary);
    this.doc.rect(MARGINS.left, this.currentY, this.contentWidth, rowHeight, 'F');

    this.doc.setFontSize(FONTS.small);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.white);

    headers.forEach((header, i) => {
      this.doc.text(header, MARGINS.left + i * colWidth + 2, this.currentY + 5);
    });

    this.currentY += rowHeight;

    // Data rows
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...COLORS.text);

    dataRows.forEach((row, rowIndex) => {
      // Alternate row colors
      if (rowIndex % 2 === 0) {
        this.doc.setFillColor(...COLORS.lightGray);
        this.doc.rect(MARGINS.left, this.currentY, this.contentWidth, rowHeight, 'F');
      }

      row.forEach((cell, colIndex) => {
        const cellText = typeof cell === 'number' ? cell.toFixed(3) : String(cell);
        this.doc.text(cellText, MARGINS.left + colIndex * colWidth + 2, this.currentY + 5);
      });

      this.currentY += rowHeight;
    });

    // Table border
    this.doc.setDrawColor(...COLORS.secondary);
    this.doc.setLineWidth(0.3);
    this.doc.rect(MARGINS.left, this.currentY - (dataRows.length + 1) * rowHeight, this.contentWidth, (dataRows.length + 1) * rowHeight);

    this.currentY += 5;
  }

  /**
   * Add formula with description
   */
  private addFormula(description: string, result?: string): void {
    this.checkPageBreak(20);

    // Formula description
    this.doc.setFontSize(FONTS.body);
    this.doc.setFont('helvetica', 'italic');
    this.doc.setTextColor(...COLORS.secondary);
    this.doc.text(description, MARGINS.left + 5, this.currentY);
    this.currentY += 5;

    // Result
    if (result) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...COLORS.primary);
      this.doc.text(`= ${result}`, MARGINS.left + 10, this.currentY);
      this.currentY += 8;
    }

    this.doc.setFont('helvetica', 'normal');
  }

  /**
   * Add warning message
   */
  private addWarning(message: string): void {
    this.checkPageBreak(15);

    this.doc.setFillColor(255, 243, 205); // Light yellow
    this.doc.setDrawColor(...COLORS.warning);
    this.doc.setLineWidth(0.5);
    this.doc.roundedRect(MARGINS.left, this.currentY, this.contentWidth, 12, 2, 2, 'FD');

    this.doc.setFontSize(FONTS.small);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.warning);
    this.doc.text('ADVERTENCIA: ', MARGINS.left + 3, this.currentY + 7);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...COLORS.text);
    this.doc.text(message, MARGINS.left + 35, this.currentY + 7);

    this.currentY += 18;
  }

  /**
   * Add verification check
   */
  private addCheck(label: string, passed: boolean, note?: string): void {
    this.checkPageBreak(10);

    const icon = passed ? '✓' : '✗';
    const color = passed ? COLORS.success : COLORS.danger;

    this.doc.setFontSize(FONTS.body);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...color);
    this.doc.text(icon, MARGINS.left, this.currentY);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(...COLORS.text);
    this.doc.text(label, MARGINS.left + 8, this.currentY);

    if (note) {
      this.doc.setFontSize(FONTS.small);
      this.doc.setTextColor(...COLORS.secondary);
      this.doc.text(`(${note})`, MARGINS.left + 8 + this.doc.getTextWidth(label) + 3, this.currentY);
    }

    this.currentY += 7;
  }

  /**
   * Add horizontal divider
   */
  private addDivider(): void {
    this.currentY += 3;
    this.doc.setDrawColor(...COLORS.lightGray);
    this.doc.setLineWidth(0.5);
    this.doc.line(MARGINS.left, this.currentY, MARGINS.left + this.contentWidth, this.currentY);
    this.currentY += 5;
  }

  /**
   * Check if page break is needed
   */
  private checkPageBreak(requiredHeight: number): void {
    if (this.currentY + requiredHeight > this.pageHeight - MARGINS.bottom) {
      this.addNewPage();
    }
  }

  /**
   * Add new page
   */
  private addNewPage(): void {
    // Add footer to current page
    this.addFooter();

    // Add new page
    this.doc.addPage();
    this.pageNumber++;
    this.currentY = MARGINS.top;

    // Add header to new page
    this.addHeader();
  }

  /**
   * Add page header
   */
  private addHeader(): void {
    this.doc.setFontSize(FONTS.small);
    this.doc.setTextColor(...COLORS.secondary);
    this.doc.text(this.metadata.projectName, MARGINS.left, 15);

    if (this.metadata.projectNumber) {
      this.doc.text(`N° ${this.metadata.projectNumber}`, this.pageWidth - MARGINS.right, 15, { align: 'right' });
    }

    this.doc.setDrawColor(...COLORS.lightGray);
    this.doc.setLineWidth(0.3);
    this.doc.line(MARGINS.left, 18, this.pageWidth - MARGINS.right, 18);
  }

  /**
   * Add page footer
   */
  private addFooter(): void {
    if (!this.options.includeFooter) return;

    const footerY = this.pageHeight - 15;

    this.doc.setDrawColor(...COLORS.lightGray);
    this.doc.setLineWidth(0.3);
    this.doc.line(MARGINS.left, footerY - 3, this.pageWidth - MARGINS.right, footerY - 3);

    this.doc.setFontSize(FONTS.footer);
    this.doc.setTextColor(...COLORS.secondary);

    // Footer text
    if (this.options.footerText) {
      this.doc.text(this.options.footerText, MARGINS.left, footerY);
    }

    // Page number
    if (this.options.includePageNumbers) {
      this.doc.text(`Página ${this.pageNumber}`, this.pageWidth - MARGINS.right, footerY, { align: 'right' });
    }

    // Date
    const date = this.metadata.date || new Date().toLocaleDateString('es-CL');
    this.doc.text(date, this.pageWidth / 2, footerY, { align: 'center' });
  }

  /**
   * Generate the final PDF
   */
  public generate(filename: string): ReportResult {
    try {
      // Add final footer
      this.addFooter();

      // Generate blob
      const blob = this.doc.output('blob');
      const dataUrl = URL.createObjectURL(blob);

      const timestamp = new Date().toISOString().slice(0, 10);
      const finalFilename = `${filename}_${timestamp}.pdf`;

      return {
        success: true,
        filename: finalFilename,
        blob,
        dataUrl,
      };
    } catch (error) {
      return {
        success: false,
        filename,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Download the generated PDF
   */
  public download(filename: string): void {
    const result = this.generate(filename);
    if (result.success && result.dataUrl) {
      const link = document.createElement('a');
      link.href = result.dataUrl;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        if (result.dataUrl) {
          URL.revokeObjectURL(result.dataUrl);
        }
      }, 100);
    }
  }
}

// ============================================================
// CONVENIENCE FUNCTIONS
// ============================================================

/**
 * Generate a pavement design report
 */
export function generatePavementReport(
  metadata: ReportMetadata,
  input: Record<string, unknown>,
  output: Record<string, unknown>,
  options?: ReportOptions
): ReportResult {
  const report = new ReportGenerator(metadata, options);
  report.addCoverPage();

  // Input parameters section
  report.addSection({
    title: 'DATOS DE ENTRADA',
    content: [
      { type: 'text', value: 'Los siguientes parámetros fueron utilizados para el diseño del pavimento flexible según la metodología AASHTO 93:' },
      {
        type: 'table',
        headers: ['Parámetro', 'Valor', 'Unidad'],
        rows: Object.entries(input).flatMap(([key, value]) => [
          getLabel(key),
          formatValue(value),
          getUnit(key),
        ]),
        title: 'Parámetros de diseño',
      },
    ],
  });

  // Results section
  report.addSection({
    title: 'RESULTADOS DEL DISEÑO',
    content: [
      { type: 'text', value: 'Resultados del cálculo del número estructural y espesores de capa:' },
      {
        type: 'table',
        headers: ['Resultado', 'Valor', 'Unidad'],
        rows: Object.entries(output).flatMap(([key, value]) => [
          getLabel(key),
          formatValue(value),
          getUnit(key),
        ]),
      },
    ],
  });

  return report.generate('memoria_pavimento');
}

/**
 * Generate a sewer hydraulics report
 */
export function generateSewerReport(
  metadata: ReportMetadata,
  pipeData: Record<string, unknown>,
  hydraulicResults: Record<string, unknown>,
  options?: ReportOptions
): ReportResult {
  const report = new ReportGenerator(metadata, options);
  report.addCoverPage();

  // Pipe data section
  report.addSection({
    title: 'DATOS DE LA TUBERÍA',
    content: [
      {
        type: 'table',
        headers: ['Propiedad', 'Valor', 'Unidad'],
        rows: Object.entries(pipeData).flatMap(([key, value]) => [
          getLabel(key),
          formatValue(value),
          getUnit(key),
        ]),
      },
    ],
  });

  // Hydraulic results section
  report.addSection({
    title: 'RESULTADOS HIDRÁULICOS',
    content: [
      { type: 'text', value: 'Cálculo hidráulico basado en la ecuación de Manning para flujo uniforme:' },
      { type: 'formula', description: 'Q = (1/n) × A × R^(2/3) × S^(1/2)' },
      {
        type: 'table',
        headers: ['Parámetro', 'Valor', 'Unidad'],
        rows: Object.entries(hydraulicResults).flatMap(([key, value]) => [
          getLabel(key),
          formatValue(value),
          getUnit(key),
        ]),
      },
    ],
  });

  return report.generate('memoria_alcantarillado');
}

/**
 * Generate a road geometry report
 */
export function generateRoadGeometryReport(
  metadata: ReportMetadata,
  curveType: string,
  input: Record<string, unknown>,
  output: Record<string, unknown>,
  options?: ReportOptions
): ReportResult {
  const report = new ReportGenerator(metadata, options);
  report.addCoverPage();

  // Curve input section
  report.addSection({
    title: `CURVA ${curveType.toUpperCase()}`,
    content: [
      { type: 'heading', value: 'Datos de Entrada', level: 2 },
      {
        type: 'table',
        headers: ['Parámetro', 'Valor', 'Unidad'],
        rows: Object.entries(input).flatMap(([key, value]) => [
          getLabel(key),
          formatValue(value),
          getUnit(key),
        ]),
      },
    ],
  });

  // Curve elements section
  report.addSection({
    title: 'ELEMENTOS DE LA CURVA',
    content: [
      {
        type: 'table',
        headers: ['Elemento', 'Valor', 'Unidad'],
        rows: Object.entries(output).flatMap(([key, value]) => [
          getLabel(key),
          formatValue(value),
          getUnit(key),
        ]),
      },
    ],
  });

  return report.generate('memoria_geometria_vial');
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getLabel(key: string): string {
  const labels: Record<string, string> = {
    // Pavement
    W18: 'ESALs de Diseño',
    reliability: 'Confiabilidad',
    standardDeviation: 'Desviación Estándar',
    deltaServiceability: 'Pérdida de Serviciabilidad',
    subgradeModulus: 'Módulo Resiliente Subrasante',
    structuralNumber: 'Número Estructural (SN)',
    // Sewer
    diameter: 'Diámetro',
    slope: 'Pendiente',
    material: 'Material',
    flowRate: 'Caudal',
    velocity: 'Velocidad',
    fillRatio: 'Relación de Llenado',
    flowDepth: 'Profundidad de Flujo',
    hydraulicRadius: 'Radio Hidráulico',
    froudeNumber: 'Número de Froude',
    // Road Geometry
    radius: 'Radio',
    deflectionAngle: 'Ángulo de Deflexión',
    delta: 'Delta (Δ)',
    tangent: 'Tangente (T)',
    length: 'Longitud (L)',
    external: 'Externa (E)',
    middleOrdinate: 'Ordenada Media (M)',
    longChord: 'Cuerda Larga (C)',
    pcStation: 'Estación PC',
    ptStation: 'Estación PT',
    piStation: 'Estación PI',
  };
  return labels[key] || key;
}

function getUnit(key: string): string {
  const units: Record<string, string> = {
    W18: 'ESALs',
    reliability: '%',
    subgradeModulus: 'psi',
    diameter: 'mm',
    slope: 'm/m',
    flowRate: 'L/s',
    velocity: 'm/s',
    flowDepth: 'm',
    hydraulicRadius: 'm',
    radius: 'm',
    deflectionAngle: '°',
    delta: '°',
    tangent: 'm',
    length: 'm',
    external: 'm',
    middleOrdinate: 'm',
    longChord: 'm',
    pcStation: 'm',
    ptStation: 'm',
    piStation: 'm',
  };
  return units[key] || '-';
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  return String(value);
}

// Re-export print layouts module
export * from './print-layouts';
