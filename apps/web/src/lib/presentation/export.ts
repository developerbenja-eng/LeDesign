// ============================================================
// PRESENTATION EXPORT UTILITIES
// ============================================================
// Export presentations to PDF and PPTX formats

import type { Presentation, Slide, Theme } from '@/types/presentation';

// ============================================================
// PDF EXPORT
// ============================================================

export interface PDFExportOptions {
  quality?: 'draft' | 'standard' | 'high';
  includeNotes?: boolean;
  slideRange?: { from: number; to: number };
}

/**
 * Export presentation to PDF
 * Uses html2canvas to capture slide renders and jsPDF to create PDF
 */
export async function exportToPDF(
  presentation: Presentation,
  options: PDFExportOptions = {}
): Promise<void> {
  const { quality = 'standard', includeNotes = false, slideRange } = options;

  // Dynamically import jsPDF and html2canvas
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  // Quality settings
  const qualitySettings = {
    draft: { scale: 1, imageQuality: 0.7 },
    standard: { scale: 2, imageQuality: 0.85 },
    high: { scale: 3, imageQuality: 0.95 },
  }[quality];

  // Create PDF with 16:9 aspect ratio
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: [1920, 1080],
  });

  // Determine slides to export
  const startIndex = slideRange?.from ?? 0;
  const endIndex = slideRange?.to ?? presentation.slides.length - 1;
  const slidesToExport = presentation.slides.slice(startIndex, endIndex + 1);

  // Create a temporary container for rendering slides
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1920px';
  container.style.height = '1080px';
  document.body.appendChild(container);

  try {
    for (let i = 0; i < slidesToExport.length; i++) {
      const slide = slidesToExport[i];

      // Add new page (except for first slide)
      if (i > 0) {
        pdf.addPage([1920, 1080], 'landscape');
      }

      // Render slide to container
      const slideHtml = generateSlideHTML(slide, presentation.theme);
      container.innerHTML = slideHtml;

      // Wait for images to load
      await waitForImages(container);

      // Capture with html2canvas
      const canvas = await html2canvas(container, {
        scale: qualitySettings.scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: presentation.theme.colors.background,
      });

      // Add to PDF
      const imgData = canvas.toDataURL('image/jpeg', qualitySettings.imageQuality);
      pdf.addImage(imgData, 'JPEG', 0, 0, 1920, 1080);

      // Add notes if enabled
      if (includeNotes && slide.notes) {
        // Add notes as a separate page
        pdf.addPage([1920, 1080], 'landscape');
        pdf.setFontSize(24);
        pdf.setTextColor(255, 255, 255);
        pdf.text(`Notas - Diapositiva ${startIndex + i + 1}`, 100, 100);
        pdf.setFontSize(16);
        pdf.setTextColor(200, 200, 200);

        // Word wrap notes
        const lines = pdf.splitTextToSize(slide.notes, 1720);
        pdf.text(lines, 100, 150);
      }
    }

    // Save PDF
    pdf.save(`${presentation.title || 'presentacion'}.pdf`);
  } finally {
    // Cleanup
    document.body.removeChild(container);
  }
}

// ============================================================
// PPTX EXPORT
// ============================================================

export interface PPTXExportOptions {
  includeNotes?: boolean;
  slideRange?: { from: number; to: number };
}

/**
 * Export presentation to PPTX
 * Uses pptxgenjs to create PowerPoint file
 */
export async function exportToPPTX(
  presentation: Presentation,
  options: PPTXExportOptions = {}
): Promise<void> {
  const { includeNotes = true, slideRange } = options;

  // Dynamically import pptxgenjs
  const PptxGenJS = (await import('pptxgenjs')).default;

  const pptx = new PptxGenJS();

  // Set presentation metadata
  pptx.title = presentation.title || 'Presentación';
  pptx.author = 'LeDesign';
  pptx.company = 'LeDesign';
  pptx.revision = '1';

  // Set slide size (16:9)
  pptx.defineLayout({ name: '16x9', width: 10, height: 5.625 });
  pptx.layout = '16x9';

  // Determine slides to export
  const startIndex = slideRange?.from ?? 0;
  const endIndex = slideRange?.to ?? presentation.slides.length - 1;
  const slidesToExport = presentation.slides.slice(startIndex, endIndex + 1);

  // Process each slide
  for (const slide of slidesToExport) {
    const pptxSlide = pptx.addSlide();

    // Set background
    setSlideBackground(pptxSlide, slide, presentation.theme);

    // Add content based on slide type
    addSlideContent(pptxSlide, slide, presentation.theme);

    // Add notes if enabled
    if (includeNotes && slide.notes) {
      pptxSlide.addNotes(slide.notes);
    }
  }

  // Generate and download
  await pptx.writeFile({ fileName: `${presentation.title || 'presentacion'}.pptx` });
}

// ============================================================
// HELPER: Generate Slide HTML for PDF
// ============================================================

function generateSlideHTML(slide: Slide, theme: Theme): string {
  const { content, style, type } = slide;

  // Background style
  let bgStyle = '';
  if (style.backgroundType === 'solid' && style.backgroundColor) {
    bgStyle = `background-color: ${style.backgroundColor};`;
  } else if (style.backgroundType === 'gradient' && style.backgroundGradient) {
    const { from, via, to, direction } = style.backgroundGradient;
    const dir = {
      'to-r': 'to right',
      'to-l': 'to left',
      'to-t': 'to top',
      'to-b': 'to bottom',
      'to-br': 'to bottom right',
      'to-bl': 'to bottom left',
      'to-tr': 'to top right',
      'to-tl': 'to top left',
    }[direction];
    const colors = via ? `${from}, ${via}, ${to}` : `${from}, ${to}`;
    bgStyle = `background: linear-gradient(${dir}, ${colors});`;
  } else if (style.backgroundType === 'image' && style.backgroundImage) {
    bgStyle = `background-image: url(${style.backgroundImage}); background-size: cover; background-position: center;`;
  } else {
    bgStyle = `background-color: ${theme.colors.background};`;
  }

  // Alignment
  const textAlign = style.alignment || 'center';
  const justify = style.alignment === 'center' ? 'center' : style.alignment === 'right' ? 'flex-end' : 'flex-start';

  // Title size
  const titleSizes: Record<string, string> = {
    sm: '2rem',
    md: '2.5rem',
    lg: '3rem',
    xl: '3.5rem',
    '2xl': '4rem',
    '3xl': '5rem',
  };
  const titleSize = titleSizes[style.titleSize] || titleSizes.xl;

  // Generate content HTML based on type
  let contentHTML = '';

  switch (type) {
    case 'title':
    case 'title-subtitle':
      contentHTML = `
        ${content.title ? `<h1 style="font-size: ${titleSize}; font-weight: bold; color: ${theme.colors.text}; margin-bottom: 1rem;">${content.title}</h1>` : ''}
        ${content.subtitle ? `<p style="font-size: 2rem; color: ${theme.colors.textMuted};">${content.subtitle}</p>` : ''}
        ${content.body ? `<p style="font-size: 1.5rem; color: ${theme.colors.textMuted}; margin-top: 1rem; max-width: 800px;">${content.body}</p>` : ''}
      `;
      break;

    case 'stats':
      contentHTML = `
        ${content.title ? `<h2 style="font-size: ${titleSize}; font-weight: bold; color: ${theme.colors.text}; margin-bottom: 3rem;">${content.title}</h2>` : ''}
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; width: 100%;">
          ${content.items?.map(item => `
            <div style="text-align: center; padding: 2rem; background: rgba(255,255,255,0.05); border-radius: 1rem;">
              <div style="font-size: 3rem; font-weight: bold; color: ${item.color || theme.colors.primary};">${item.value}</div>
              <div style="font-size: 1rem; color: ${theme.colors.textMuted};">${item.label}</div>
            </div>
          `).join('') || ''}
        </div>
      `;
      break;

    case 'grid-2':
    case 'grid-3':
    case 'grid-4':
      const cols = parseInt(type.split('-')[1]);
      contentHTML = `
        ${content.title ? `<h2 style="font-size: ${titleSize}; font-weight: bold; color: ${theme.colors.text}; margin-bottom: 3rem;">${content.title}</h2>` : ''}
        <div style="display: grid; grid-template-columns: repeat(${cols}, 1fr); gap: 2rem; width: 100%;">
          ${content.items?.map(item => `
            <div style="padding: 2rem; background: rgba(255,255,255,0.05); border-radius: 1rem;">
              <h3 style="font-size: 1.5rem; font-weight: bold; color: ${theme.colors.text}; margin-bottom: 0.5rem;">${item.label}</h3>
              ${item.value ? `<p style="font-size: 1rem; color: ${theme.colors.textMuted};">${item.value}</p>` : ''}
              ${item.description ? `<p style="font-size: 0.875rem; color: ${theme.colors.textMuted}; margin-top: 0.5rem;">${item.description}</p>` : ''}
            </div>
          `).join('') || ''}
        </div>
      `;
      break;

    case 'quote':
      contentHTML = `
        <blockquote style="font-size: 3rem; font-style: italic; color: ${theme.colors.text}; max-width: 1200px;">
          ${content.quote || ''}
        </blockquote>
        ${content.quoteAuthor ? `<cite style="font-size: 1.5rem; color: ${theme.colors.textMuted}; margin-top: 2rem; display: block;">${content.quoteAuthor}</cite>` : ''}
      `;
      break;

    case 'list':
      contentHTML = `
        ${content.title ? `<h2 style="font-size: ${titleSize}; font-weight: bold; color: ${theme.colors.text}; margin-bottom: 2rem;">${content.title}</h2>` : ''}
        <div style="text-align: left; max-width: 800px;">
          ${content.items?.map(item => `
            <div style="display: flex; gap: 1rem; margin-bottom: 1rem;">
              <span style="font-size: 1.25rem; font-weight: bold; color: ${theme.colors.primary};">${item.label}</span>
              <span style="font-size: 1.25rem; color: ${theme.colors.text};">${item.value}</span>
            </div>
          `).join('') || ''}
        </div>
      `;
      break;

    case 'cta':
      contentHTML = `
        ${content.title ? `<h2 style="font-size: ${titleSize}; font-weight: bold; color: ${theme.colors.text}; margin-bottom: 1rem;">${content.title}</h2>` : ''}
        ${content.subtitle ? `<p style="font-size: 1.5rem; color: ${theme.colors.textMuted}; margin-bottom: 2rem;">${content.subtitle}</p>` : ''}
        ${content.body ? `<p style="font-size: 1.25rem; color: ${theme.colors.textMuted};">${content.body}</p>` : ''}
      `;
      break;

    default:
      contentHTML = `
        <p style="color: ${theme.colors.textMuted};">Contenido de diapositiva</p>
      `;
  }

  return `
    <div style="
      width: 1920px;
      height: 1080px;
      ${bgStyle}
      display: flex;
      flex-direction: column;
      align-items: ${justify};
      justify-content: center;
      padding: 6rem;
      text-align: ${textAlign};
      font-family: Inter, system-ui, sans-serif;
      box-sizing: border-box;
    ">
      ${contentHTML}
    </div>
  `;
}

// ============================================================
// HELPER: Wait for Images
// ============================================================

async function waitForImages(container: HTMLElement): Promise<void> {
  const images = container.querySelectorAll('img');
  const promises = Array.from(images).map(
    (img) =>
      new Promise<void>((resolve) => {
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }
      })
  );
  await Promise.all(promises);
}

// ============================================================
// HELPER: Set PPTX Slide Background
// ============================================================

function setSlideBackground(pptxSlide: any, slide: Slide, theme: Theme): void {
  const { style } = slide;

  if (style.backgroundType === 'solid' && style.backgroundColor) {
    pptxSlide.background = { color: style.backgroundColor.replace('#', '') };
  } else if (style.backgroundType === 'gradient' && style.backgroundGradient) {
    // PPTX doesn't support gradients directly, use start color
    pptxSlide.background = { color: style.backgroundGradient.from.replace('#', '') };
  } else if (style.backgroundType === 'image' && style.backgroundImage) {
    pptxSlide.background = { path: style.backgroundImage };
  } else {
    pptxSlide.background = { color: theme.colors.background.replace('#', '') };
  }
}

// ============================================================
// HELPER: Add PPTX Slide Content
// ============================================================

function addSlideContent(pptxSlide: any, slide: Slide, theme: Theme): void {
  const { content, style, type } = slide;

  // Title sizes in inches
  const titleSizes: Record<string, number> = {
    sm: 24,
    md: 28,
    lg: 36,
    xl: 44,
    '2xl': 54,
    '3xl': 64,
  };
  const titleFontSize = titleSizes[style.titleSize] || titleSizes.xl;

  // Common positioning
  const xPos = style.alignment === 'left' ? 0.5 : style.alignment === 'right' ? 4.5 : 0.5;
  const textAlign = style.alignment;
  const width = style.alignment === 'center' ? 9 : 5;

  // Add title if present
  if (content.title) {
    pptxSlide.addText(content.title, {
      x: xPos,
      y: 1,
      w: width,
      h: 1,
      fontSize: titleFontSize,
      bold: true,
      color: theme.colors.text.replace('#', ''),
      align: textAlign,
    });
  }

  // Add subtitle if present
  if (content.subtitle) {
    pptxSlide.addText(content.subtitle, {
      x: xPos,
      y: 2.2,
      w: width,
      h: 0.5,
      fontSize: 24,
      color: theme.colors.textMuted.replace('#', ''),
      align: textAlign,
    });
  }

  // Add body if present
  if (content.body) {
    pptxSlide.addText(content.body, {
      x: xPos,
      y: 3,
      w: width,
      h: 1.5,
      fontSize: 18,
      color: theme.colors.textMuted.replace('#', ''),
      align: textAlign,
    });
  }

  // Add quote if present
  if (content.quote) {
    pptxSlide.addText(content.quote, {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 2,
      fontSize: 36,
      italic: true,
      color: theme.colors.text.replace('#', ''),
      align: 'center',
    });

    if (content.quoteAuthor) {
      pptxSlide.addText(content.quoteAuthor, {
        x: 0.5,
        y: 3.8,
        w: 9,
        h: 0.5,
        fontSize: 20,
        color: theme.colors.textMuted.replace('#', ''),
        align: 'center',
      });
    }
  }

  // Add items for grid/stats/list slides
  if (content.items && content.items.length > 0) {
    const cols = type === 'grid-4' ? 4 : type === 'grid-3' ? 3 : type === 'grid-2' || type === 'comparison' ? 2 : type === 'stats' ? 4 : 1;
    const colWidth = (9 - (cols - 1) * 0.3) / cols;
    const startY = content.title ? 2.5 : 1;

    content.items.forEach((item, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = 0.5 + col * (colWidth + 0.3);
      const y = startY + row * 1.5;

      if (type === 'stats') {
        // Stats layout
        pptxSlide.addText(item.value, {
          x,
          y,
          w: colWidth,
          h: 0.6,
          fontSize: 36,
          bold: true,
          color: (item.color || theme.colors.primary).replace('#', ''),
          align: 'center',
        });
        pptxSlide.addText(item.label, {
          x,
          y: y + 0.6,
          w: colWidth,
          h: 0.4,
          fontSize: 14,
          color: theme.colors.textMuted.replace('#', ''),
          align: 'center',
        });
      } else if (type === 'list') {
        // List layout
        pptxSlide.addText(`${item.label} ${item.value}`, {
          x: 0.5,
          y: startY + index * 0.6,
          w: 9,
          h: 0.5,
          fontSize: 18,
          color: theme.colors.text.replace('#', ''),
          align: 'left',
        });
      } else {
        // Grid/Comparison layout
        pptxSlide.addText(item.label, {
          x,
          y,
          w: colWidth,
          h: 0.4,
          fontSize: 18,
          bold: true,
          color: theme.colors.text.replace('#', ''),
          align: 'left',
        });
        if (item.value) {
          pptxSlide.addText(item.value, {
            x,
            y: y + 0.4,
            w: colWidth,
            h: 0.3,
            fontSize: 14,
            color: theme.colors.textMuted.replace('#', ''),
            align: 'left',
          });
        }
        if (item.description) {
          pptxSlide.addText(item.description, {
            x,
            y: y + (item.value ? 0.7 : 0.4),
            w: colWidth,
            h: 0.5,
            fontSize: 12,
            color: theme.colors.textMuted.replace('#', ''),
            align: 'left',
          });
        }
      }
    });
  }
}

// ============================================================
// QUICK EXPORT FUNCTIONS
// ============================================================

export async function quickExportPDF(presentation: Presentation): Promise<void> {
  return exportToPDF(presentation, { quality: 'standard' });
}

export async function quickExportPPTX(presentation: Presentation): Promise<void> {
  return exportToPPTX(presentation, { includeNotes: true });
}
