/**
 * PDF Generator
 *
 * Generates PDF documents from document data using jspdf and html2canvas.
 * Handles page layout, headers, footers, table of contents, and LaTeX content.
 */

import type {
  BaseDocument,
  DocumentSection,
  PDFGenerationOptions,
  PDFGenerationResult,
  TableContent,
  CalculationContent,
} from '@/types/documents';

// Page dimensions in mm (Letter size)
const PAGE_SIZES = {
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 },
  a4: { width: 210, height: 297 },
};

/**
 * Default PDF options
 */
export const DEFAULT_PDF_OPTIONS: PDFGenerationOptions = {
  format: 'letter',
  orientation: 'portrait',
  margins: {
    top: 25,
    right: 20,
    bottom: 25,
    left: 25,
  },
  includeTableOfContents: true,
  includePageNumbers: true,
};

/**
 * Generate PDF from document (client-side)
 *
 * This function must be called from a browser environment
 * as it uses html2canvas and jspdf which require DOM access.
 */
export async function generatePDF(
  document: BaseDocument,
  options: Partial<PDFGenerationOptions> = {},
  previewElement?: HTMLElement
): Promise<PDFGenerationResult> {
  // Merge options with defaults
  const opts: PDFGenerationOptions = { ...DEFAULT_PDF_OPTIONS, ...options };

  try {
    // Dynamic imports for client-side only
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    // Get page dimensions
    const pageSize = PAGE_SIZES[opts.format];
    const effectiveWidth = opts.orientation === 'portrait' ? pageSize.width : pageSize.height;
    const effectiveHeight = opts.orientation === 'portrait' ? pageSize.height : pageSize.width;

    // Create PDF
    const pdf = new jsPDF({
      orientation: opts.orientation,
      unit: 'mm',
      format: opts.format,
    });

    // Content area dimensions
    const contentWidth = effectiveWidth - opts.margins.left - opts.margins.right;
    const contentHeight = effectiveHeight - opts.margins.top - opts.margins.bottom;

    let currentPage = 1;
    let yPosition = opts.margins.top;

    // Add header function
    const addHeader = () => {
      pdf.setFontSize(9);
      pdf.setTextColor(128, 128, 128);

      // Left: Document title
      pdf.text(document.title, opts.margins.left, 15);

      // Right: Project code
      if (document.caratula.projectCode) {
        const codeWidth = pdf.getTextWidth(document.caratula.projectCode);
        pdf.text(document.caratula.projectCode, effectiveWidth - opts.margins.right - codeWidth, 15);
      }

      // Line under header
      pdf.setDrawColor(200, 200, 200);
      pdf.line(opts.margins.left, 18, effectiveWidth - opts.margins.right, 18);

      pdf.setTextColor(0, 0, 0);
    };

    // Add footer function
    const addFooter = () => {
      if (!opts.includePageNumbers) return;

      pdf.setFontSize(9);
      pdf.setTextColor(128, 128, 128);

      // Line above footer
      pdf.setDrawColor(200, 200, 200);
      const footerY = effectiveHeight - 12;
      pdf.line(opts.margins.left, footerY, effectiveWidth - opts.margins.right, footerY);

      // Page number
      const pageText = `Página ${currentPage}`;
      const pageWidth = pdf.getTextWidth(pageText);
      pdf.text(pageText, (effectiveWidth - pageWidth) / 2, effectiveHeight - 8);

      // Footer text if provided
      if (opts.footerText) {
        pdf.text(opts.footerText, opts.margins.left, effectiveHeight - 8);
      }

      pdf.setTextColor(0, 0, 0);
    };

    // Add new page function
    const addNewPage = () => {
      addFooter();
      pdf.addPage();
      currentPage++;
      yPosition = opts.margins.top;
      addHeader();
    };

    // Check if we need a new page
    const checkNewPage = (neededHeight: number) => {
      if (yPosition + neededHeight > effectiveHeight - opts.margins.bottom) {
        addNewPage();
      }
    };

    // === COVER PAGE (Carátula) ===
    const addCoverPage = () => {
      const caratula = document.caratula;

      // Title block
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(document.title, contentWidth);
      pdf.text(titleLines, effectiveWidth / 2, 60, { align: 'center' });

      yPosition = 80 + titleLines.length * 10;

      // Document type
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      const typeLabels: Record<string, string> = {
        memoria_calculo: 'MEMORIA DE CÁLCULO',
        especificaciones: 'ESPECIFICACIONES TÉCNICAS',
        informe_tecnico: 'INFORME TÉCNICO',
        presupuesto: 'PRESUPUESTO',
      };
      pdf.text(typeLabels[document.type] || document.type, effectiveWidth / 2, yPosition, { align: 'center' });

      yPosition += 30;

      // Project info box
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      const boxX = opts.margins.left + 20;
      const boxWidth = contentWidth - 40;
      const boxY = yPosition;
      const boxHeight = 80;
      pdf.rect(boxX, boxY, boxWidth, boxHeight);

      yPosition += 10;
      pdf.setFontSize(11);

      const addInfoRow = (label: string, value: string) => {
        pdf.setFont('helvetica', 'bold');
        pdf.text(label + ':', boxX + 5, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(value, boxX + 50, yPosition);
        yPosition += 8;
      };

      addInfoRow('Proyecto', caratula.projectName);
      if (caratula.projectCode) {
        addInfoRow('Código', caratula.projectCode);
      }
      addInfoRow('Mandante', caratula.clientName || '-');
      addInfoRow('Ubicación', `${caratula.location.comuna}, ${caratula.location.region}`);
      addInfoRow('Fecha', formatDate(caratula.date));
      addInfoRow('Revisión', `Rev. ${caratula.revisionNumber}`);

      // Designer info
      yPosition = boxY + boxHeight + 30;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Elaborado por:', opts.margins.left + 20, yPosition);
      yPosition += 10;
      pdf.setFont('helvetica', 'normal');
      pdf.text(caratula.designer.name || '-', opts.margins.left + 20, yPosition);
      yPosition += 6;
      pdf.text(caratula.designer.title || '-', opts.margins.left + 20, yPosition);
      if (caratula.designer.registration) {
        yPosition += 6;
        pdf.text(`Reg. ${caratula.designer.registration}`, opts.margins.left + 20, yPosition);
      }

      // Add new page for content
      addNewPage();
    };

    // === TABLE OF CONTENTS ===
    const addTableOfContents = () => {
      if (!opts.includeTableOfContents) return;

      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ÍNDICE', opts.margins.left, yPosition);
      yPosition += 15;

      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');

      const addTocEntry = (section: DocumentSection, indent: number = 0) => {
        checkNewPage(8);

        const text = `${section.number}  ${section.title}`;
        const xPos = opts.margins.left + indent * 10;
        pdf.text(text, xPos, yPosition);
        yPosition += 7;

        if (section.subsections) {
          section.subsections.forEach((sub) => addTocEntry(sub, indent + 1));
        }
      };

      document.sections.forEach((section) => addTocEntry(section));

      addNewPage();
    };

    // === RENDER SECTION ===
    const renderSection = (section: DocumentSection, depth: number = 0) => {
      // Section title
      const fontSize = depth === 0 ? 14 : depth === 1 ? 12 : 11;
      checkNewPage(fontSize + 10);

      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', 'bold');
      const titleText = `${section.number}  ${section.title}`;
      pdf.text(titleText, opts.margins.left, yPosition);
      yPosition += fontSize * 0.5 + 5;

      // Section content
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);

      switch (section.type) {
        case 'text':
          renderTextContent(section.content as { type: 'text'; html: string });
          break;
        case 'table':
          renderTableContent(section.content as TableContent);
          break;
        case 'calculation':
          renderCalculationContent(section.content as CalculationContent);
          break;
        case 'equation':
          renderEquationContent(section.content as { type: 'equation'; latex: string; description?: string });
          break;
        case 'reference':
          renderReferenceContent(section.content as { type: 'reference'; references: Array<{ code: string; title: string }> });
          break;
        default:
          // Fallback for unknown types
          pdf.text('(Contenido no renderizable en PDF)', opts.margins.left, yPosition);
          yPosition += 10;
      }

      yPosition += 5;

      // Render subsections
      if (section.subsections) {
        section.subsections.forEach((sub) => renderSection(sub, depth + 1));
      }
    };

    // Text content renderer
    const renderTextContent = (content: { type: 'text'; html: string }) => {
      // Strip HTML and render as plain text
      // In a production version, you'd want to parse HTML properly
      const text = stripHtml(content.html);
      const lines = pdf.splitTextToSize(text, contentWidth);

      lines.forEach((line: string) => {
        checkNewPage(7);
        pdf.text(line, opts.margins.left, yPosition);
        yPosition += 6;
      });
    };

    // Table content renderer
    const renderTableContent = (content: TableContent) => {
      const { headers, rows, caption } = content;
      const colCount = headers.length;
      const colWidth = contentWidth / colCount;

      // Caption
      if (caption) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.text(caption, opts.margins.left, yPosition);
        yPosition += 8;
      }

      // Check space for table header
      checkNewPage(20);

      // Draw header
      pdf.setFillColor(240, 240, 240);
      pdf.rect(opts.margins.left, yPosition - 5, contentWidth, 8, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);

      headers.forEach((header, i) => {
        const x = opts.margins.left + i * colWidth + 2;
        pdf.text(String(header), x, yPosition);
      });

      yPosition += 5;

      // Draw rows
      pdf.setFont('helvetica', 'normal');
      rows.forEach((row, rowIndex) => {
        checkNewPage(8);

        // Alternate row background
        if (rowIndex % 2 === 1) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(opts.margins.left, yPosition - 4, contentWidth, 6, 'F');
        }

        row.forEach((cell, i) => {
          const x = opts.margins.left + i * colWidth + 2;
          const cellText = String(cell);
          // Truncate if too long
          const truncated = cellText.length > 20 ? cellText.substring(0, 18) + '...' : cellText;
          pdf.text(truncated, x, yPosition);
        });

        yPosition += 6;
      });

      yPosition += 5;
    };

    // Calculation content renderer
    const renderCalculationContent = (content: CalculationContent) => {
      // NCh Reference
      if (content.nchReference) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`Referencia: ${content.nchReference}`, opts.margins.left, yPosition);
        yPosition += 8;
      }

      // Inputs table
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Datos de entrada:', opts.margins.left, yPosition);
      yPosition += 6;

      pdf.setFont('helvetica', 'normal');
      Object.entries(content.inputs).forEach(([key, input]) => {
        checkNewPage(6);
        const text = `${input.label} (${key}): ${input.value} ${input.unit}`;
        pdf.text(text, opts.margins.left + 5, yPosition);
        yPosition += 5;
      });

      yPosition += 5;

      // Results table
      pdf.setFont('helvetica', 'bold');
      pdf.text('Resultados:', opts.margins.left, yPosition);
      yPosition += 6;

      pdf.setFont('helvetica', 'normal');
      Object.entries(content.results).forEach(([key, result]) => {
        checkNewPage(8);

        const valueText = `${result.label} (${key}): ${result.value.toFixed(4)} ${result.unit}`;
        pdf.text(valueText, opts.margins.left + 5, yPosition);

        // Status indicator
        if (result.status === 'ok') {
          pdf.setTextColor(0, 128, 0);
          pdf.text('OK', effectiveWidth - opts.margins.right - 10, yPosition);
        } else if (result.status === 'warning') {
          pdf.setTextColor(200, 150, 0);
          pdf.text('!', effectiveWidth - opts.margins.right - 10, yPosition);
        } else if (result.status === 'error') {
          pdf.setTextColor(200, 0, 0);
          pdf.text('X', effectiveWidth - opts.margins.right - 10, yPosition);
        }
        pdf.setTextColor(0, 0, 0);

        yPosition += 5;

        if (result.statusMessage) {
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'italic');
          pdf.text(`  ${result.statusMessage}`, opts.margins.left + 5, yPosition);
          yPosition += 5;
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
        }
      });

      yPosition += 5;
    };

    // Equation content renderer
    const renderEquationContent = (content: { type: 'equation'; latex: string; description?: string }) => {
      // For now, render LaTeX as text
      // In production, you'd render the equation using a canvas or image
      pdf.setFontSize(10);
      pdf.setFont('courier', 'normal');

      const eqText = content.latex.replace(/\\/g, '');
      const lines = pdf.splitTextToSize(eqText, contentWidth - 20);

      lines.forEach((line: string) => {
        checkNewPage(7);
        pdf.text(line, opts.margins.left + 10, yPosition);
        yPosition += 6;
      });

      if (content.description) {
        pdf.setFont('helvetica', 'italic');
        pdf.text(content.description, opts.margins.left, yPosition);
        yPosition += 6;
      }

      pdf.setFont('helvetica', 'normal');
    };

    // Reference content renderer
    const renderReferenceContent = (content: { type: 'reference'; references: Array<{ code: string; title: string }> }) => {
      content.references.forEach((ref) => {
        checkNewPage(7);
        pdf.setFont('helvetica', 'bold');
        pdf.text(ref.code, opts.margins.left, yPosition);
        pdf.setFont('helvetica', 'normal');
        pdf.text(` - ${ref.title}`, opts.margins.left + 30, yPosition);
        yPosition += 6;
      });
    };

    // === GENERATE PDF ===

    // If we have a preview element, use html2canvas
    if (previewElement) {
      const canvas = await html2canvas(previewElement, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = opts.margins.top;

      // Add first page
      pdf.addImage(imgData, 'PNG', opts.margins.left, position, imgWidth, imgHeight);
      heightLeft -= contentHeight;

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + opts.margins.top;
        pdf.addPage();
        currentPage++;
        pdf.addImage(imgData, 'PNG', opts.margins.left, position, imgWidth, imgHeight);
        heightLeft -= contentHeight;
      }
    } else {
      // Manual rendering
      addCoverPage();
      addTableOfContents();

      document.sections.forEach((section) => {
        if (section.pageBreakBefore) {
          addNewPage();
        }
        renderSection(section);
        if (section.pageBreakAfter) {
          addNewPage();
        }
      });

      addFooter();
    }

    // Generate blob
    const pdfBlob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);

    return {
      success: true,
      pdfUrl,
      pdfBlob,
      pageCount: currentPage,
    };
  } catch (error) {
    console.error('PDF generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error generating PDF',
    };
  }
}

/**
 * Download PDF from blob URL
 */
export function downloadPDF(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Helper: Strip HTML tags
 */
function stripHtml(html: string): string {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

/**
 * Helper: Format date
 */
function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
