/**
 * Document Store
 *
 * Zustand store for managing document generation state.
 * Handles document editing, preview rendering, and PDF generation.
 */

import { create } from 'zustand';
import { generateId } from '@/lib/utils';

import type {
  AnyDocument,
  BaseDocument,
  DocumentType,
  DocumentStatus,
  DocumentSection,
  DocumentCaratula,
  DocumentTemplate,
  SectionContent,
  PDFGenerationOptions,
  CreateDocumentRequest,
  UpdateDocumentRequest,
} from '@/types/documents';

// ============================================================================
// Store State Interface
// ============================================================================

interface DocumentState {
  // Current document being edited
  document: AnyDocument | null;
  isDirty: boolean;
  lastSavedAt: string | null;

  // Available templates
  templates: DocumentTemplate[];

  // Preview state
  previewHtml: string;
  previewErrors: string[];
  isPreviewLoading: boolean;
  previewDebounceTimer: ReturnType<typeof setTimeout> | null;

  // PDF generation state
  pdfState: {
    status: 'idle' | 'generating' | 'complete' | 'error';
    progress: number;
    error?: string;
    resultUrl?: string;
    resultBlob?: Blob;
  };

  // Document list (for project)
  projectDocuments: BaseDocument[];
  isLoadingDocuments: boolean;

  // Selected section for editing
  selectedSectionId: string | null;

  // Undo/Redo history
  history: AnyDocument[];
  historyIndex: number;
  maxHistorySize: number;

  // Actions
  // Document CRUD
  setDocument: (doc: AnyDocument | null) => void;
  createDocument: (projectId: string, type: DocumentType, title: string) => Promise<AnyDocument | null>;
  loadDocument: (id: string) => Promise<void>;
  saveDocument: () => Promise<boolean>;
  deleteDocument: (id: string) => Promise<boolean>;

  // Document editing
  updateCaratula: (updates: Partial<DocumentCaratula>) => void;
  updateSection: (sectionId: string, updates: Partial<DocumentSection>) => void;
  updateSectionContent: (sectionId: string, content: SectionContent) => void;
  addSection: (section: DocumentSection, afterId?: string) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (fromIndex: number, toIndex: number) => void;
  setSelectedSection: (sectionId: string | null) => void;

  // Status management
  updateStatus: (status: DocumentStatus) => void;
  setDirty: (dirty: boolean) => void;

  // Preview
  updatePreview: (html: string, errors?: string[]) => void;
  setPreviewLoading: (loading: boolean) => void;
  triggerPreviewUpdate: () => void;

  // PDF generation
  setPdfState: (state: Partial<DocumentState['pdfState']>) => void;
  generatePdf: (options?: Partial<PDFGenerationOptions>) => Promise<void>;

  // Project documents
  loadProjectDocuments: (projectId: string) => Promise<void>;
  clearProjectDocuments: () => void;

  // Templates
  loadTemplates: () => Promise<void>;

  // History
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Reset
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  document: null,
  isDirty: false,
  lastSavedAt: null,
  templates: [],
  previewHtml: '',
  previewErrors: [],
  isPreviewLoading: false,
  previewDebounceTimer: null,
  pdfState: {
    status: 'idle' as const,
    progress: 0,
  },
  projectDocuments: [],
  isLoadingDocuments: false,
  selectedSectionId: null,
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useDocumentStore = create<DocumentState>((set, get) => ({
  ...initialState,

  // -------------------------------------------------------------------------
  // Document CRUD
  // -------------------------------------------------------------------------

  setDocument: (doc) => {
    set({
      document: doc,
      isDirty: false,
      lastSavedAt: doc?.updatedAt || null,
      selectedSectionId: null,
      history: doc ? [doc] : [],
      historyIndex: doc ? 0 : -1,
    });
    get().triggerPreviewUpdate();
  },

  createDocument: async (projectId, type, title) => {
    try {
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          type,
          title,
        } as CreateDocumentRequest),
      });

      if (!response.ok) {
        throw new Error('Failed to create document');
      }

      const data = await response.json();
      const doc = data.document as AnyDocument;

      set({
        document: doc,
        isDirty: false,
        lastSavedAt: doc.createdAt,
        history: [doc],
        historyIndex: 0,
      });

      get().triggerPreviewUpdate();
      return doc;
    } catch (error) {
      console.error('Error creating document:', error);
      return null;
    }
  },

  loadDocument: async (id) => {
    try {
      const response = await fetch(`/api/documents/${id}`);

      if (!response.ok) {
        throw new Error('Failed to load document');
      }

      const data = await response.json();
      const doc = data.document as AnyDocument;

      set({
        document: doc,
        isDirty: false,
        lastSavedAt: doc.updatedAt,
        history: [doc],
        historyIndex: 0,
      });

      get().triggerPreviewUpdate();
    } catch (error) {
      console.error('Error loading document:', error);
    }
  },

  saveDocument: async () => {
    const { document, isDirty } = get();

    if (!document || !isDirty) {
      return true;
    }

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: document.title,
          status: document.status,
          caratula: document.caratula,
          sections: document.sections,
        } as UpdateDocumentRequest),
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }

      const data = await response.json();
      const savedDoc = data.document as AnyDocument;

      set({
        document: savedDoc,
        isDirty: false,
        lastSavedAt: savedDoc.updatedAt,
      });

      return true;
    } catch (error) {
      console.error('Error saving document:', error);
      return false;
    }
  },

  deleteDocument: async (id) => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      // Clear current document if it's the one being deleted
      const { document } = get();
      if (document?.id === id) {
        set({
          document: null,
          isDirty: false,
          lastSavedAt: null,
        });
      }

      // Remove from project documents list
      set((state) => ({
        projectDocuments: state.projectDocuments.filter((d) => d.id !== id),
      }));

      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  },

  // -------------------------------------------------------------------------
  // Document Editing
  // -------------------------------------------------------------------------

  updateCaratula: (updates) => {
    set((state) => {
      if (!state.document) return state;

      const newDoc = {
        ...state.document,
        caratula: { ...state.document.caratula, ...updates },
      };

      return { document: newDoc, isDirty: true };
    });

    get().pushHistory();
    get().triggerPreviewUpdate();
  },

  updateSection: (sectionId, updates) => {
    set((state) => {
      if (!state.document) return state;

      const updateSectionRecursive = (sections: DocumentSection[]): DocumentSection[] => {
        return sections.map((section) => {
          if (section.id === sectionId) {
            return { ...section, ...updates };
          }
          if (section.subsections) {
            return {
              ...section,
              subsections: updateSectionRecursive(section.subsections),
            };
          }
          return section;
        });
      };

      const newSections = updateSectionRecursive(state.document.sections);

      return {
        document: { ...state.document, sections: newSections },
        isDirty: true,
      };
    });

    get().pushHistory();
    get().triggerPreviewUpdate();
  },

  updateSectionContent: (sectionId, content) => {
    get().updateSection(sectionId, { content });
  },

  addSection: (section, afterId) => {
    set((state) => {
      if (!state.document) return state;

      let sections = [...state.document.sections];

      if (afterId) {
        const index = sections.findIndex((s) => s.id === afterId);
        if (index >= 0) {
          sections.splice(index + 1, 0, section);
        } else {
          sections.push(section);
        }
      } else {
        sections.push(section);
      }

      // Renumber sections
      sections = renumberSections(sections);

      return {
        document: { ...state.document, sections },
        isDirty: true,
      };
    });

    get().pushHistory();
    get().triggerPreviewUpdate();
  },

  removeSection: (sectionId) => {
    set((state) => {
      if (!state.document) return state;

      const removeSectionRecursive = (sections: DocumentSection[]): DocumentSection[] => {
        return sections
          .filter((section) => section.id !== sectionId)
          .map((section) => {
            if (section.subsections) {
              return {
                ...section,
                subsections: removeSectionRecursive(section.subsections),
              };
            }
            return section;
          });
      };

      let sections = removeSectionRecursive(state.document.sections);
      sections = renumberSections(sections);

      return {
        document: { ...state.document, sections },
        isDirty: true,
        selectedSectionId:
          state.selectedSectionId === sectionId ? null : state.selectedSectionId,
      };
    });

    get().pushHistory();
    get().triggerPreviewUpdate();
  },

  reorderSections: (fromIndex, toIndex) => {
    set((state) => {
      if (!state.document) return state;

      const sections = [...state.document.sections];
      const [removed] = sections.splice(fromIndex, 1);
      sections.splice(toIndex, 0, removed);

      const renumbered = renumberSections(sections);

      return {
        document: { ...state.document, sections: renumbered },
        isDirty: true,
      };
    });

    get().pushHistory();
    get().triggerPreviewUpdate();
  },

  setSelectedSection: (sectionId) => {
    set({ selectedSectionId: sectionId });
  },

  // -------------------------------------------------------------------------
  // Status Management
  // -------------------------------------------------------------------------

  updateStatus: (status) => {
    set((state) => {
      if (!state.document) return state;

      return {
        document: { ...state.document, status },
        isDirty: true,
      };
    });
  },

  setDirty: (dirty) => {
    set({ isDirty: dirty });
  },

  // -------------------------------------------------------------------------
  // Preview
  // -------------------------------------------------------------------------

  updatePreview: (html, errors = []) => {
    set({
      previewHtml: html,
      previewErrors: errors,
      isPreviewLoading: false,
    });
  },

  setPreviewLoading: (loading) => {
    set({ isPreviewLoading: loading });
  },

  triggerPreviewUpdate: () => {
    const { previewDebounceTimer } = get();

    // Clear existing timer
    if (previewDebounceTimer) {
      clearTimeout(previewDebounceTimer);
    }

    // Set new debounced timer
    const timer = setTimeout(() => {
      // The actual preview rendering happens in the component
      // This just signals that an update is needed
      set({ isPreviewLoading: true });
    }, 300);

    set({ previewDebounceTimer: timer });
  },

  // -------------------------------------------------------------------------
  // PDF Generation
  // -------------------------------------------------------------------------

  setPdfState: (stateUpdate) => {
    set((state) => ({
      pdfState: { ...state.pdfState, ...stateUpdate },
    }));
  },

  generatePdf: async (options) => {
    const { document } = get();
    if (!document) return;

    set({
      pdfState: { status: 'generating', progress: 0 },
    });

    try {
      // Import PDF generator dynamically
      const { generatePDF } = await import('@/lib/documents/pdf-generator');

      set({ pdfState: { status: 'generating', progress: 30 } });

      const result = await generatePDF(document, options);

      set({ pdfState: { status: 'generating', progress: 80 } });

      if (result.success && result.pdfUrl) {
        set({
          pdfState: {
            status: 'complete',
            progress: 100,
            resultUrl: result.pdfUrl,
            resultBlob: result.pdfBlob,
          },
        });
      } else {
        set({
          pdfState: {
            status: 'error',
            progress: 0,
            error: result.error || 'Unknown error',
          },
        });
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      set({
        pdfState: {
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'PDF generation failed',
        },
      });
    }
  },

  // -------------------------------------------------------------------------
  // Project Documents
  // -------------------------------------------------------------------------

  loadProjectDocuments: async (projectId) => {
    set({ isLoadingDocuments: true });

    try {
      const response = await fetch(`/api/documents?projectId=${projectId}`);

      if (!response.ok) {
        throw new Error('Failed to load documents');
      }

      const data = await response.json();

      set({
        projectDocuments: data.documents,
        isLoadingDocuments: false,
      });
    } catch (error) {
      console.error('Error loading project documents:', error);
      set({ isLoadingDocuments: false });
    }
  },

  clearProjectDocuments: () => {
    set({ projectDocuments: [] });
  },

  // -------------------------------------------------------------------------
  // Templates
  // -------------------------------------------------------------------------

  loadTemplates: async () => {
    try {
      const response = await fetch('/api/documents/templates');

      if (!response.ok) {
        // Templates API may not exist yet
        return;
      }

      const data = await response.json();
      set({ templates: data.templates || [] });
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  },

  // -------------------------------------------------------------------------
  // History (Undo/Redo)
  // -------------------------------------------------------------------------

  pushHistory: () => {
    set((state) => {
      if (!state.document) return state;

      // Create a deep copy of the current document
      const docCopy = JSON.parse(JSON.stringify(state.document));

      // Remove any future history if we're not at the end
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(docCopy);

      // Limit history size
      while (newHistory.length > state.maxHistorySize) {
        newHistory.shift();
      }

      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  },

  undo: () => {
    set((state) => {
      if (state.historyIndex <= 0) return state;

      const newIndex = state.historyIndex - 1;
      const prevDoc = state.history[newIndex];

      return {
        document: JSON.parse(JSON.stringify(prevDoc)),
        historyIndex: newIndex,
        isDirty: true,
      };
    });

    get().triggerPreviewUpdate();
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;

      const newIndex = state.historyIndex + 1;
      const nextDoc = state.history[newIndex];

      return {
        document: JSON.parse(JSON.stringify(nextDoc)),
        historyIndex: newIndex,
        isDirty: true,
      };
    });

    get().triggerPreviewUpdate();
  },

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------

  reset: () => {
    const { previewDebounceTimer } = get();
    if (previewDebounceTimer) {
      clearTimeout(previewDebounceTimer);
    }

    set(initialState);
  },
}));

// ============================================================================
// Helpers
// ============================================================================

/**
 * Renumber sections sequentially
 */
function renumberSections(
  sections: DocumentSection[],
  prefix: string = ''
): DocumentSection[] {
  return sections.map((section, index) => {
    const number = prefix ? `${prefix}.${index + 1}` : `${index + 1}`;

    return {
      ...section,
      number,
      subsections: section.subsections
        ? renumberSections(section.subsections, number)
        : undefined,
    };
  });
}

// ============================================================================
// Selectors
// ============================================================================

export const selectDocument = (state: DocumentState) => state.document;
export const selectIsDirty = (state: DocumentState) => state.isDirty;
export const selectPreviewHtml = (state: DocumentState) => state.previewHtml;
export const selectPreviewErrors = (state: DocumentState) => state.previewErrors;
export const selectIsPreviewLoading = (state: DocumentState) => state.isPreviewLoading;
export const selectPdfState = (state: DocumentState) => state.pdfState;
export const selectSelectedSectionId = (state: DocumentState) => state.selectedSectionId;
export const selectCanUndo = (state: DocumentState) => state.historyIndex > 0;
export const selectCanRedo = (state: DocumentState) => state.historyIndex < state.history.length - 1;

export const selectSelectedSection = (state: DocumentState): DocumentSection | null => {
  if (!state.document || !state.selectedSectionId) return null;

  const findSection = (sections: DocumentSection[]): DocumentSection | null => {
    for (const section of sections) {
      if (section.id === state.selectedSectionId) return section;
      if (section.subsections) {
        const found = findSection(section.subsections);
        if (found) return found;
      }
    }
    return null;
  };

  return findSection(state.document.sections);
};
