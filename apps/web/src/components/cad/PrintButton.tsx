'use client';

import { useState, useCallback } from 'react';
import { useSettingsStore } from '@/stores/settings-store';
import {
  printDocument,
  downloadAsHTML,
  type PrintDocumentOptions,
  type HeaderConfig,
} from '@/lib/reports/print-layouts';

interface PrintButtonProps {
  title: string;
  content: string;
  projectName?: string;
  className?: string;
  variant?: 'icon' | 'button' | 'dropdown';
}

export function PrintButton({
  title,
  content,
  projectName,
  className = '',
  variant = 'button',
}: PrintButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const { settings } = useSettingsStore();

  const getPrintOptions = useCallback((): PrintDocumentOptions => {
    const header: HeaderConfig = {
      companyName: settings.export.companyName || undefined,
      projectName: projectName,
      documentTitle: title,
      engineerName: settings.export.engineerName || undefined,
      logoUrl: settings.export.logoUrl || undefined,
      showDate: true,
    };

    return {
      header,
      footer: {
        centerText: 'Generado con leleCAD',
      },
    };
  }, [settings, projectName, title]);

  const handlePrint = useCallback(() => {
    printDocument(title, content, getPrintOptions());
    setShowMenu(false);
  }, [title, content, getPrintOptions]);

  const handleDownloadHTML = useCallback(() => {
    const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}`;
    downloadAsHTML(title, content, filename, getPrintOptions());
    setShowMenu(false);
  }, [title, content, getPrintOptions]);

  const handlePreview = useCallback(() => {
    const options = getPrintOptions();
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - Vista Previa</title>
        <style>
          @media print {
            @page { size: letter; margin: 25mm 20mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            font-size: 10pt;
            color: #333;
            max-width: 215.9mm;
            margin: 20px auto;
            padding: 25mm 20mm;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .print-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 10pt;
            border-bottom: 2pt solid #1a1a1a;
            margin-bottom: 15pt;
          }
          .print-header-company { font-size: 14pt; font-weight: bold; color: #1a1a1a; }
          .print-header-project { font-size: 11pt; color: #333; margin-top: 3pt; }
          .print-header-date { font-size: 9pt; color: #666; margin-top: 3pt; }
          .print-title { font-size: 16pt; font-weight: bold; text-align: center; margin: 20pt 0; }
          .print-subtitle { font-size: 12pt; font-weight: bold; margin: 15pt 0 10pt 0; border-bottom: 1pt solid #ccc; padding-bottom: 5pt; }
          .print-section { margin-bottom: 15pt; }
          .print-table { width: 100%; border-collapse: collapse; margin: 10pt 0; font-size: 9pt; }
          .print-table th { background-color: #f5f5f5; font-weight: bold; padding: 6pt 8pt; text-align: left; border: 1pt solid #ccc; }
          .print-table td { padding: 5pt 8pt; border: 1pt solid #ccc; }
          .print-table tr:nth-child(even) { background-color: #fafafa; }
          .print-table-numeric { text-align: right; font-family: 'Courier New', monospace; }
          .print-result-box { background-color: #f5f5f5; border: 2pt solid #1a1a1a; padding: 10pt; margin: 10pt 0; text-align: center; }
          .print-result-label { font-size: 10pt; color: #333; margin-bottom: 5pt; }
          .print-result-value { font-size: 18pt; font-weight: bold; color: #1a1a1a; }
          .print-result-unit { font-size: 12pt; color: #333; margin-left: 5pt; }
          .print-notes { font-size: 9pt; color: #666; margin-top: 10pt; padding: 8pt; background-color: #f9f9f9; border-left: 3pt solid #ccc; }
          .print-formula { font-family: 'Courier New', monospace; background-color: #f5f5f5; padding: 8pt; margin: 8pt 0; border-radius: 3pt; font-size: 10pt; }
          .print-footer { margin-top: 30pt; padding-top: 8pt; border-top: 1pt solid #ccc; font-size: 8pt; color: #666; text-align: center; }
          .no-print-toolbar { position: fixed; top: 10px; right: 10px; background: #333; color: white; padding: 10px; border-radius: 8px; display: flex; gap: 8px; z-index: 1000; }
          .no-print-toolbar button { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; }
          .no-print-toolbar .print-btn { background: #4CAF50; color: white; }
          .no-print-toolbar .close-btn { background: #666; color: white; }
          @media print { .no-print-toolbar { display: none; } }
        </style>
      </head>
      <body>
        <div class="no-print-toolbar">
          <button class="print-btn" onclick="window.print()">Imprimir</button>
          <button class="close-btn" onclick="window.close()">Cerrar</button>
        </div>
        <div class="print-header">
          <div>
            ${options.header?.companyName ? `<div class="print-header-company">${options.header.companyName}</div>` : ''}
          </div>
          <div style="text-align: right">
            ${options.header?.projectName ? `<div class="print-header-project">${options.header.projectName}</div>` : ''}
            ${options.header?.engineerName ? `<div class="print-header-project">${options.header.engineerName}</div>` : ''}
            <div class="print-header-date">${new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
        </div>
        <h1 class="print-title">${title}</h1>
        ${content}
        <div class="print-footer">Generado con leleCAD</div>
      </body>
      </html>
    `;

    const previewWindow = window.open('', '_blank');
    if (previewWindow) {
      previewWindow.document.write(html);
      previewWindow.document.close();
    }
    setShowMenu(false);
  }, [title, content, getPrintOptions]);

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <button
        onClick={handlePrint}
        className={`p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors ${className}`}
        title="Imprimir"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
      </button>
    );
  }

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors ${className}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Imprimir
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 mt-1 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-20 py-1">
              <button
                onClick={handlePrint}
                className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Imprimir Directo
              </button>
              <button
                onClick={handlePreview}
                className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Vista Previa
              </button>
              <button
                onClick={handleDownloadHTML}
                className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar HTML
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Default button variant
  return (
    <button
      onClick={handlePrint}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors ${className}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      Imprimir
    </button>
  );
}

export default PrintButton;
