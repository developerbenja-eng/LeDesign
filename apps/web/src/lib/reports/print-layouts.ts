/**
 * Print Layouts and Styles
 *
 * Professional print layouts for engineering reports with:
 * - Standard page sizes (Letter, Legal, A4)
 * - Header/footer templates
 * - Table formatting
 * - Professional styling for technical documents
 *
 * @module reports/print-layouts
 */

// ============================================
// TYPES
// ============================================

export type PageSize = 'letter' | 'legal' | 'a4';
export type Orientation = 'portrait' | 'landscape';

export interface PageSettings {
  size: PageSize;
  orientation: Orientation;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface HeaderConfig {
  companyName?: string;
  projectName?: string;
  documentTitle?: string;
  engineerName?: string;
  logoUrl?: string;
  showDate?: boolean;
  showPageNumbers?: boolean;
}

export interface FooterConfig {
  leftText?: string;
  centerText?: string;
  rightText?: string;
  showPageNumbers?: boolean;
}

export interface PrintStyles {
  fontFamily: string;
  fontSize: string;
  titleColor: string;
  textColor: string;
  borderColor: string;
  headerBgColor: string;
}

// ============================================
// PAGE SIZE DIMENSIONS (in mm)
// ============================================

export const PAGE_SIZES: Record<PageSize, { width: number; height: number }> = {
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 },
  a4: { width: 210, height: 297 },
};

// ============================================
// DEFAULT SETTINGS
// ============================================

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  size: 'letter',
  orientation: 'portrait',
  margins: {
    top: 25,
    right: 20,
    bottom: 25,
    left: 20,
  },
};

export const DEFAULT_PRINT_STYLES: PrintStyles = {
  fontFamily: "'Helvetica Neue', Arial, sans-serif",
  fontSize: '10pt',
  titleColor: '#1a1a1a',
  textColor: '#333333',
  borderColor: '#cccccc',
  headerBgColor: '#f5f5f5',
};

// ============================================
// CSS GENERATION
// ============================================

/**
 * Generate print CSS styles
 */
export function generatePrintCSS(
  pageSettings: PageSettings = DEFAULT_PAGE_SETTINGS,
  styles: PrintStyles = DEFAULT_PRINT_STYLES
): string {
  const { size, orientation, margins } = pageSettings;
  const pageSize = PAGE_SIZES[size];

  const width = orientation === 'portrait' ? pageSize.width : pageSize.height;
  const height = orientation === 'portrait' ? pageSize.height : pageSize.width;

  return `
    @media print {
      @page {
        size: ${width}mm ${height}mm;
        margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      html, body {
        font-family: ${styles.fontFamily};
        font-size: ${styles.fontSize};
        color: ${styles.textColor};
        background: white !important;
        margin: 0;
        padding: 0;
      }

      .print-container {
        width: 100%;
        max-width: none;
      }

      .print-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 10pt;
        border-bottom: 2pt solid ${styles.titleColor};
        margin-bottom: 15pt;
      }

      .print-header-logo {
        max-height: 50pt;
        max-width: 150pt;
      }

      .print-header-info {
        text-align: right;
      }

      .print-header-company {
        font-size: 14pt;
        font-weight: bold;
        color: ${styles.titleColor};
      }

      .print-header-project {
        font-size: 11pt;
        color: ${styles.textColor};
        margin-top: 3pt;
      }

      .print-header-date {
        font-size: 9pt;
        color: #666;
        margin-top: 3pt;
      }

      .print-title {
        font-size: 16pt;
        font-weight: bold;
        color: ${styles.titleColor};
        text-align: center;
        margin: 20pt 0;
        page-break-after: avoid;
      }

      .print-subtitle {
        font-size: 12pt;
        font-weight: bold;
        color: ${styles.titleColor};
        margin: 15pt 0 10pt 0;
        page-break-after: avoid;
        border-bottom: 1pt solid ${styles.borderColor};
        padding-bottom: 5pt;
      }

      .print-section {
        margin-bottom: 15pt;
        page-break-inside: avoid;
      }

      .print-table {
        width: 100%;
        border-collapse: collapse;
        margin: 10pt 0;
        font-size: 9pt;
      }

      .print-table th {
        background-color: ${styles.headerBgColor};
        color: ${styles.titleColor};
        font-weight: bold;
        padding: 6pt 8pt;
        text-align: left;
        border: 1pt solid ${styles.borderColor};
      }

      .print-table td {
        padding: 5pt 8pt;
        border: 1pt solid ${styles.borderColor};
        vertical-align: top;
      }

      .print-table tr:nth-child(even) {
        background-color: #fafafa;
      }

      .print-table-numeric {
        text-align: right;
        font-family: 'Courier New', monospace;
      }

      .print-result-box {
        background-color: ${styles.headerBgColor};
        border: 2pt solid ${styles.titleColor};
        padding: 10pt;
        margin: 10pt 0;
        text-align: center;
        page-break-inside: avoid;
      }

      .print-result-label {
        font-size: 10pt;
        color: ${styles.textColor};
        margin-bottom: 5pt;
      }

      .print-result-value {
        font-size: 18pt;
        font-weight: bold;
        color: ${styles.titleColor};
      }

      .print-result-unit {
        font-size: 12pt;
        color: ${styles.textColor};
        margin-left: 5pt;
      }

      .print-notes {
        font-size: 9pt;
        color: #666;
        margin-top: 10pt;
        padding: 8pt;
        background-color: #f9f9f9;
        border-left: 3pt solid ${styles.borderColor};
      }

      .print-formula {
        font-family: 'Courier New', monospace;
        background-color: #f5f5f5;
        padding: 8pt;
        margin: 8pt 0;
        border-radius: 3pt;
        font-size: 10pt;
      }

      .print-footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: space-between;
        padding-top: 8pt;
        border-top: 1pt solid ${styles.borderColor};
        font-size: 8pt;
        color: #666;
      }

      .print-page-break {
        page-break-before: always;
      }

      .print-no-break {
        page-break-inside: avoid;
      }

      /* Hide non-printable elements */
      .no-print, button, .btn, nav, .toolbar, .sidebar {
        display: none !important;
      }
    }

    /* Screen preview styles */
    @media screen {
      .print-preview {
        max-width: ${width}mm;
        margin: 20px auto;
        padding: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
        background: white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        font-family: ${styles.fontFamily};
        font-size: ${styles.fontSize};
        color: ${styles.textColor};
      }
    }
  `;
}

// ============================================
// HTML GENERATION
// ============================================

/**
 * Generate print header HTML
 */
export function generatePrintHeader(config: HeaderConfig): string {
  const date = new Date().toLocaleDateString('es-CL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
    <div class="print-header">
      <div class="print-header-left">
        ${config.logoUrl ? `<img src="${config.logoUrl}" class="print-header-logo" alt="Logo">` : ''}
        ${config.companyName ? `<div class="print-header-company">${config.companyName}</div>` : ''}
      </div>
      <div class="print-header-info">
        ${config.projectName ? `<div class="print-header-project">${config.projectName}</div>` : ''}
        ${config.engineerName ? `<div class="print-header-project">${config.engineerName}</div>` : ''}
        ${config.showDate !== false ? `<div class="print-header-date">${date}</div>` : ''}
      </div>
    </div>
    ${config.documentTitle ? `<h1 class="print-title">${config.documentTitle}</h1>` : ''}
  `;
}

/**
 * Generate print footer HTML
 */
export function generatePrintFooter(config: FooterConfig): string {
  return `
    <div class="print-footer">
      <div>${config.leftText || ''}</div>
      <div>${config.centerText || 'Generado con leleCAD'}</div>
      <div>${config.rightText || ''}</div>
    </div>
  `;
}

/**
 * Generate a data table for printing
 */
export function generatePrintTable(
  headers: string[],
  rows: (string | number)[][],
  options?: {
    numericColumns?: number[];
    title?: string;
    caption?: string;
  }
): string {
  const numericCols = new Set(options?.numericColumns || []);

  const headerRow = headers
    .map((h) => `<th>${h}</th>`)
    .join('');

  const dataRows = rows
    .map(
      (row) =>
        '<tr>' +
        row
          .map((cell, i) => {
            const isNumeric = numericCols.has(i) || typeof cell === 'number';
            const value = typeof cell === 'number' ? cell.toLocaleString('es-CL') : cell;
            return `<td class="${isNumeric ? 'print-table-numeric' : ''}">${value}</td>`;
          })
          .join('') +
        '</tr>'
    )
    .join('');

  return `
    ${options?.title ? `<h3 class="print-subtitle">${options.title}</h3>` : ''}
    <table class="print-table">
      <thead><tr>${headerRow}</tr></thead>
      <tbody>${dataRows}</tbody>
    </table>
    ${options?.caption ? `<p class="print-notes">${options.caption}</p>` : ''}
  `;
}

/**
 * Generate a result highlight box
 */
export function generateResultBox(
  label: string,
  value: number | string,
  unit?: string
): string {
  const displayValue = typeof value === 'number' ? value.toLocaleString('es-CL') : value;

  return `
    <div class="print-result-box">
      <div class="print-result-label">${label}</div>
      <span class="print-result-value">${displayValue}</span>
      ${unit ? `<span class="print-result-unit">${unit}</span>` : ''}
    </div>
  `;
}

/**
 * Generate a formula display
 */
export function generateFormula(formula: string, description?: string): string {
  return `
    <div class="print-formula">
      ${formula}
      ${description ? `<br><small style="color: #666;">${description}</small>` : ''}
    </div>
  `;
}

/**
 * Generate notes section
 */
export function generateNotes(notes: string[]): string {
  if (notes.length === 0) return '';

  return `
    <div class="print-notes">
      <strong>Notas:</strong>
      <ul style="margin: 5pt 0 0 15pt; padding: 0;">
        ${notes.map((note) => `<li>${note}</li>`).join('')}
      </ul>
    </div>
  `;
}

// ============================================
// COMPLETE DOCUMENT GENERATION
// ============================================

export interface PrintDocumentOptions {
  pageSettings?: PageSettings;
  styles?: PrintStyles;
  header?: HeaderConfig;
  footer?: FooterConfig;
}

/**
 * Generate a complete printable document
 */
export function generatePrintDocument(
  title: string,
  content: string,
  options: PrintDocumentOptions = {}
): string {
  const pageSettings = options.pageSettings || DEFAULT_PAGE_SETTINGS;
  const styles = options.styles || DEFAULT_PRINT_STYLES;

  const css = generatePrintCSS(pageSettings, styles);
  const header = options.header ? generatePrintHeader(options.header) : '';
  const footer = options.footer ? generatePrintFooter(options.footer) : '';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>${css}</style>
    </head>
    <body>
      <div class="print-container print-preview">
        ${header}
        ${content}
        ${footer}
      </div>
    </body>
    </html>
  `;
}

// ============================================
// PRINT FUNCTION
// ============================================

/**
 * Open print dialog with generated document
 */
export function printDocument(
  title: string,
  content: string,
  options: PrintDocumentOptions = {}
): void {
  const html = generatePrintDocument(title, content, options);

  // Open in new window and print
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();

    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }
}

/**
 * Download document as HTML file
 */
export function downloadAsHTML(
  title: string,
  content: string,
  filename: string,
  options: PrintDocumentOptions = {}
): void {
  const html = generatePrintDocument(title, content, options);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  a.click();

  URL.revokeObjectURL(url);
}

// ============================================
// ENGINEERING REPORT TEMPLATES
// ============================================

/**
 * Generate pavement design report content
 */
export function generatePavementReport(data: {
  projectName: string;
  designMethod: string;
  trafficData: {
    esal: number;
    designPeriod: number;
    trafficGrowth: number;
  };
  soilData: {
    cbr: number;
    mr: number;
  };
  results: {
    structuralNumber: number;
    layers: Array<{
      material: string;
      coefficient: number;
      drainage: number;
      thickness: number;
    }>;
    totalThickness: number;
  };
  notes?: string[];
}): string {
  const layersTable = generatePrintTable(
    ['Capa', 'Material', 'ai', 'mi', 'Di (cm)', 'SNi'],
    data.results.layers.map((layer, i) => [
      `Capa ${i + 1}`,
      layer.material,
      layer.coefficient.toFixed(3),
      layer.drainage.toFixed(2),
      layer.thickness.toFixed(1),
      (layer.coefficient * layer.drainage * layer.thickness / 2.54).toFixed(3),
    ]),
    { numericColumns: [2, 3, 4, 5], title: 'Estructura del Pavimento' }
  );

  return `
    <h2 class="print-subtitle">1. Datos de Transito</h2>
    <div class="print-section">
      ${generatePrintTable(
        ['Parametro', 'Valor', 'Unidad'],
        [
          ['ESAL de Diseno', data.trafficData.esal.toLocaleString('es-CL'), 'ejes equiv.'],
          ['Periodo de Diseno', data.trafficData.designPeriod, 'anos'],
          ['Tasa de Crecimiento', data.trafficData.trafficGrowth, '%'],
        ],
        { numericColumns: [1] }
      )}
    </div>

    <h2 class="print-subtitle">2. Caracteristicas del Suelo</h2>
    <div class="print-section">
      ${generatePrintTable(
        ['Parametro', 'Valor', 'Unidad'],
        [
          ['CBR de Diseno', data.soilData.cbr, '%'],
          ['Modulo Resiliente (Mr)', data.soilData.mr.toLocaleString('es-CL'), 'psi'],
        ],
        { numericColumns: [1] }
      )}
    </div>

    <h2 class="print-subtitle">3. Resultados del Diseno</h2>
    <div class="print-section">
      ${generateResultBox('Numero Estructural Requerido (SN)', data.results.structuralNumber.toFixed(3), '')}
      ${layersTable}
      ${generateResultBox('Espesor Total', data.results.totalThickness.toFixed(1), 'cm')}
    </div>

    <h2 class="print-subtitle">4. Metodologia</h2>
    <div class="print-section">
      <p>Metodo de diseno: <strong>${data.designMethod}</strong></p>
      ${generateFormula(
        'SN = a₁D₁ + a₂D₂m₂ + a₃D₃m₃',
        'donde: ai = coeficiente de capa, Di = espesor (in), mi = coeficiente de drenaje'
      )}
    </div>

    ${data.notes ? generateNotes(data.notes) : ''}
  `;
}

/**
 * Generate hydraulic calculation report content
 */
export function generateHydraulicReport(data: {
  projectName: string;
  calculationType: string;
  pipeData: Array<{
    id: string;
    diameter: number;
    slope: number;
    length: number;
    material: string;
    manning: number;
    fullCapacity: number;
    designFlow: number;
    velocity: number;
    fillRatio: number;
  }>;
  notes?: string[];
}): string {
  const pipeTable = generatePrintTable(
    ['ID', 'D (mm)', 'S (%)', 'L (m)', 'n', 'Qll (L/s)', 'Qd (L/s)', 'V (m/s)', 'y/D'],
    data.pipeData.map((pipe) => [
      pipe.id,
      pipe.diameter,
      (pipe.slope * 100).toFixed(3),
      pipe.length.toFixed(1),
      pipe.manning.toFixed(3),
      pipe.fullCapacity.toFixed(2),
      pipe.designFlow.toFixed(2),
      pipe.velocity.toFixed(2),
      (pipe.fillRatio * 100).toFixed(0) + '%',
    ]),
    {
      numericColumns: [1, 2, 3, 4, 5, 6, 7],
      title: 'Resumen de Calculo Hidraulico',
      caption: 'D = diametro, S = pendiente, n = Manning, Qll = capacidad a tubo lleno, Qd = caudal de diseno, V = velocidad, y/D = llenado',
    }
  );

  return `
    <h2 class="print-subtitle">1. Tipo de Calculo</h2>
    <div class="print-section">
      <p>Metodo: <strong>${data.calculationType}</strong></p>
      ${generateFormula(
        'Q = (1/n) × A × R^(2/3) × S^(1/2)',
        'Ecuacion de Manning para flujo uniforme'
      )}
    </div>

    <h2 class="print-subtitle">2. Resultados</h2>
    <div class="print-section">
      ${pipeTable}
    </div>

    <h2 class="print-subtitle">3. Verificaciones</h2>
    <div class="print-section">
      ${generatePrintTable(
        ['Criterio', 'Limite', 'Estado'],
        [
          ['Velocidad minima', '> 0.6 m/s', 'Verificar autolimpieza'],
          ['Velocidad maxima', '< 5.0 m/s', 'Evitar erosion'],
          ['Llenado maximo', '< 75%', 'Ventilacion adecuada'],
          ['Pendiente minima', '> 0.3%', 'Evitar sedimentacion'],
        ],
        { title: 'Criterios de Diseno' }
      )}
    </div>

    ${data.notes ? generateNotes(data.notes) : ''}
  `;
}

/**
 * Generate road geometry report content
 */
export function generateRoadGeometryReport(data: {
  projectName: string;
  horizontalCurves: Array<{
    id: string;
    radius: number;
    delta: number;
    tangent: number;
    length: number;
    external: number;
  }>;
  verticalCurves: Array<{
    id: string;
    type: 'crest' | 'sag';
    g1: number;
    g2: number;
    length: number;
    kValue: number;
  }>;
  designSpeed: number;
  notes?: string[];
}): string {
  const hCurveTable = data.horizontalCurves.length > 0
    ? generatePrintTable(
        ['ID', 'R (m)', 'Delta', 'T (m)', 'L (m)', 'E (m)'],
        data.horizontalCurves.map((c) => [
          c.id,
          c.radius.toFixed(1),
          c.delta.toFixed(4) + '°',
          c.tangent.toFixed(3),
          c.length.toFixed(3),
          c.external.toFixed(3),
        ]),
        {
          numericColumns: [1, 3, 4, 5],
          title: 'Curvas Horizontales',
          caption: 'R = radio, T = tangente, L = longitud de arco, E = externa',
        }
      )
    : '<p class="print-notes">No hay curvas horizontales definidas.</p>';

  const vCurveTable = data.verticalCurves.length > 0
    ? generatePrintTable(
        ['ID', 'Tipo', 'g1 (%)', 'g2 (%)', 'L (m)', 'K'],
        data.verticalCurves.map((c) => [
          c.id,
          c.type === 'crest' ? 'Convexa' : 'Concava',
          c.g1.toFixed(2),
          c.g2.toFixed(2),
          c.length.toFixed(1),
          c.kValue.toFixed(2),
        ]),
        {
          numericColumns: [2, 3, 4, 5],
          title: 'Curvas Verticales',
          caption: 'g1 = pendiente entrada, g2 = pendiente salida, K = parametro de curvatura',
        }
      )
    : '<p class="print-notes">No hay curvas verticales definidas.</p>';

  return `
    <h2 class="print-subtitle">1. Parametros de Diseno</h2>
    <div class="print-section">
      ${generateResultBox('Velocidad de Diseno', data.designSpeed, 'km/h')}
    </div>

    <h2 class="print-subtitle">2. Alineamiento Horizontal</h2>
    <div class="print-section">
      ${hCurveTable}
    </div>

    <h2 class="print-subtitle">3. Alineamiento Vertical</h2>
    <div class="print-section">
      ${vCurveTable}
    </div>

    ${data.notes ? generateNotes(data.notes) : ''}
  `;
}
