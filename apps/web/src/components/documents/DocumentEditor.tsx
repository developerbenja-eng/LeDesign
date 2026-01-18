'use client';

/**
 * Document Editor Component
 *
 * Main document editing interface with three-pane layout:
 * - Left: Document structure sidebar
 * - Center: Section editor
 * - Right: Live LaTeX preview
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useDocumentStore,
  selectDocument,
  selectIsDirty,
  selectPdfState,
  selectSelectedSection,
} from '@/stores/document-store';
import type { DocumentType, BaseDocument, DocumentCaratula } from '@/types/documents';
import { DocumentSidebar } from './DocumentSidebar';
import { SectionEditor } from './SectionEditor';
import { LatexPreview, LatexStylesProvider } from './LatexPreview';
import { CaratulaEditor } from './CaratulaEditor';

// Document type display names
const DOCUMENT_TYPE_NAMES: Record<DocumentType, string> = {
  memoria_calculo: 'Memoria de Cálculo',
  especificaciones: 'Especificaciones Técnicas',
  informe_tecnico: 'Informe Técnico',
  presupuesto: 'Presupuesto',
};

interface DocumentEditorProps {
  projectId: string;
  documentId?: string;
  documentType?: DocumentType;
  onSave?: (document: BaseDocument) => void;
  onClose?: () => void;
}

type EditorView = 'structure' | 'caratula' | 'section' | 'preview';

export function DocumentEditor({
  projectId,
  documentId,
  documentType = 'memoria_calculo',
  onSave,
  onClose,
}: DocumentEditorProps) {
  const document = useDocumentStore(selectDocument);
  const isDirty = useDocumentStore(selectIsDirty);
  const pdfState = useDocumentStore(selectPdfState);
  const selectedSection = useDocumentStore(selectSelectedSection);
  const isGeneratingPdf = pdfState.status === 'generating';

  const {
    loadDocument,
    createDocument,
    saveDocument,
    generatePdf,
    updateCaratula,
    setSelectedSection,
  } = useDocumentStore();

  const [activeView, setActiveView] = useState<EditorView>('section');
  const [showPreview, setShowPreview] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [previewWidth, setPreviewWidth] = useState(400);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingPreview, setIsResizingPreview] = useState(false);

  // Load or create document on mount
  useEffect(() => {
    if (documentId) {
      loadDocument(documentId);
    } else {
      createDocument(projectId, documentType, DOCUMENT_TYPE_NAMES[documentType]);
    }
  }, [documentId, projectId, documentType, loadDocument, createDocument]);

  // Handle save
  const handleSave = useCallback(async () => {
    const success = await saveDocument();
    if (success && onSave && document) {
      onSave(document);
    }
  }, [saveDocument, onSave, document]);

  // Handle PDF generation
  const handleGeneratePdf = useCallback(async () => {
    await generatePdf({});
  }, [generatePdf]);

  // Handle carátula update
  const handleCaratulaUpdate = useCallback((caratula: DocumentCaratula) => {
    updateCaratula(caratula);
  }, [updateCaratula]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setShowPreview(!showPreview);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, showPreview]);

  // Resize handlers
  const handleSidebarMouseDown = useCallback(() => {
    setIsResizingSidebar(true);
  }, []);

  const handlePreviewMouseDown = useCallback(() => {
    setIsResizingPreview(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        const newWidth = Math.max(200, Math.min(400, e.clientX));
        setSidebarWidth(newWidth);
      }
      if (isResizingPreview) {
        const newWidth = Math.max(300, Math.min(600, window.innerWidth - e.clientX));
        setPreviewWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingSidebar(false);
      setIsResizingPreview(false);
    };

    if (isResizingSidebar || isResizingPreview) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingSidebar, isResizingPreview]);

  // Generate preview content
  const previewLatex = useMemo(() => {
    if (!selectedSection) {
      return document?.latexContent || '';
    }

    const content = selectedSection.content;
    if (content.type === 'equation') {
      return content.latex || '';
    }

    // For other content types, show the section title
    return `\\section{${selectedSection.title}}`;
  }, [selectedSection, document?.latexContent]);

  if (!document) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
          <p className="mt-4 text-gray-500">Cargando documento...</p>
        </div>
      </div>
    );
  }

  return (
    <LatexStylesProvider>
      <div className="document-editor h-screen flex flex-col bg-gray-100">
        {/* Top Toolbar */}
        <header className="bg-white border-b px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700"
              >
                ← Volver
              </button>
            )}
            <div>
              <h1 className="font-medium text-gray-800">{document.title}</h1>
              <p className="text-xs text-gray-500">
                {DOCUMENT_TYPE_NAMES[document.type]} • v{document.version}
                {isDirty && <span className="ml-2 text-orange-500">• Sin guardar</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggles */}
            <div className="flex border rounded overflow-hidden">
              <button
                onClick={() => setActiveView('caratula')}
                className={`px-3 py-1.5 text-sm ${
                  activeView === 'caratula'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Carátula
              </button>
              <button
                onClick={() => setActiveView('section')}
                className={`px-3 py-1.5 text-sm ${
                  activeView === 'section'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Contenido
              </button>
            </div>

            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`px-3 py-1.5 text-sm border rounded ${
                showPreview
                  ? 'bg-blue-50 border-blue-300 text-blue-600'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {showPreview ? '◉' : '○'} Vista previa
            </button>

            <span className="w-px h-6 bg-gray-200" />

            {/* Actions */}
            <button
              onClick={handleSave}
              disabled={!isDirty}
              className={`px-4 py-1.5 text-sm rounded ${
                isDirty
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              Guardar
            </button>

            <button
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="px-4 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              {isGeneratingPdf ? 'Generando...' : '📄 Exportar PDF'}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          <aside
            className="bg-white border-r flex-shrink-0"
            style={{ width: sidebarWidth }}
          >
            <DocumentSidebar />
          </aside>

          {/* Sidebar resize handle */}
          <div
            className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize"
            onMouseDown={handleSidebarMouseDown}
          />

          {/* Editor area */}
          <main className="flex-1 overflow-hidden">
            {activeView === 'caratula' ? (
              <div className="h-full overflow-y-auto p-6 bg-white">
                <CaratulaEditor
                  caratula={document.caratula}
                  onChange={handleCaratulaUpdate}
                />
              </div>
            ) : (
              <SectionEditor />
            )}
          </main>

          {/* Preview pane */}
          {showPreview && (
            <>
              {/* Preview resize handle */}
              <div
                className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize"
                onMouseDown={handlePreviewMouseDown}
              />

              <aside
                id="latex-preview-container"
                className="bg-white border-l flex-shrink-0 overflow-y-auto"
                style={{ width: previewWidth }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-700 text-sm">Vista previa</h3>
                    <span className="text-xs text-gray-400">LaTeX</span>
                  </div>

                  {previewLatex ? (
                    <LatexPreview
                      latex={previewLatex}
                      displayMode
                    />
                  ) : (
                    <p className="text-gray-400 text-sm text-center py-8">
                      Selecciona una sección con ecuaciones para ver la vista previa
                    </p>
                  )}
                </div>
              </aside>
            </>
          )}
        </div>

        {/* Status bar */}
        <footer className="bg-white border-t px-4 py-1 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>{document.sections.length} secciones</span>
            <span>Estado: {document.status}</span>
          </div>
          <div className="flex items-center gap-4">
            <span>⌘+S guardar</span>
            <span>⌘+P vista previa</span>
          </div>
        </footer>
      </div>
    </LatexStylesProvider>
  );
}

export default DocumentEditor;
