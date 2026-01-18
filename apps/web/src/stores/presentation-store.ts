// ============================================================
// PRESENTATION STORE (Zustand)
// ============================================================
// State management for presentation editor

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Presentation,
  Slide,
  SlideContent,
  SlideStyle,
  SlideAnimation,
  SlideContentItem,
  Theme,
  EditorState,
  generateSlideId,
  generateItemId,
  generatePresentationId,
  DEFAULT_SLIDE_STYLE,
  DEFAULT_SLIDE_ANIMATION,
  DEFAULT_PRESENTATION_SETTINGS,
} from '@/types/presentation';
import { THEMES, TEMPLATES, createPresentationFromTemplate } from '@/lib/presentation/templates';

// ============================================================
// STORE INTERFACE
// ============================================================

interface PresentationStore {
  // Current presentation
  presentation: Presentation | null;

  // Editor state
  editor: EditorState;

  // Saved presentations (local storage)
  savedPresentations: Array<{
    id: string;
    title: string;
    updatedAt: string;
    thumbnail?: string;
  }>;

  // ============================================================
  // PRESENTATION ACTIONS
  // ============================================================

  // Create new presentation from template
  createPresentation: (templateId: string, themeId?: string) => void;

  // Load presentation
  loadPresentation: (presentation: Presentation) => void;

  // Save presentation
  savePresentation: () => void;

  // Update presentation metadata
  updatePresentationMeta: (updates: Partial<Pick<Presentation, 'title' | 'description' | 'projectId'>>) => void;

  // Change theme
  setTheme: (theme: Theme) => void;

  // Update settings
  updateSettings: (settings: Partial<Presentation['settings']>) => void;

  // ============================================================
  // SLIDE ACTIONS
  // ============================================================

  // Add slide
  addSlide: (slideType: Slide['type'], index?: number) => void;

  // Delete slide
  deleteSlide: (slideId: string) => void;

  // Duplicate slide
  duplicateSlide: (slideId: string) => void;

  // Move slide
  moveSlide: (fromIndex: number, toIndex: number) => void;

  // Update slide
  updateSlide: (slideId: string, updates: Partial<Slide>) => void;

  // Update slide content
  updateSlideContent: (slideId: string, content: Partial<SlideContent>) => void;

  // Update slide style
  updateSlideStyle: (slideId: string, style: Partial<SlideStyle>) => void;

  // Update slide animation
  updateSlideAnimation: (slideId: string, animation: Partial<SlideAnimation>) => void;

  // ============================================================
  // ITEM ACTIONS (for slides with items array)
  // ============================================================

  // Add item to slide
  addItem: (slideId: string) => void;

  // Update item
  updateItem: (slideId: string, itemId: string, updates: Partial<SlideContentItem>) => void;

  // Delete item
  deleteItem: (slideId: string, itemId: string) => void;

  // Reorder items
  reorderItems: (slideId: string, fromIndex: number, toIndex: number) => void;

  // ============================================================
  // EDITOR ACTIONS
  // ============================================================

  // Set editor mode
  setEditorMode: (mode: EditorState['mode']) => void;

  // Select slide
  selectSlide: (index: number) => void;

  // Select element
  selectElement: (elementId: string | null) => void;

  // Set zoom
  setZoom: (zoom: number) => void;

  // Toggle grid
  toggleGrid: () => void;

  // Toggle notes
  toggleNotes: () => void;

  // Undo
  undo: () => void;

  // Redo
  redo: () => void;

  // Clear presentation
  clearPresentation: () => void;
}

// ============================================================
// DEFAULT EDITOR STATE
// ============================================================

const DEFAULT_EDITOR_STATE: EditorState = {
  mode: 'edit',
  selectedSlideIndex: 0,
  selectedElementId: null,
  zoom: 100,
  showGrid: false,
  showNotes: false,
  history: {
    past: [],
    future: [],
  },
};

// ============================================================
// HELPER: Create default slide for type
// ============================================================

function createDefaultSlide(type: Slide['type']): Slide {
  const baseSlide: Slide = {
    id: generateSlideId(),
    type,
    content: {},
    style: { ...DEFAULT_SLIDE_STYLE },
    animation: { ...DEFAULT_SLIDE_ANIMATION },
  };

  // Add default content based on type
  switch (type) {
    case 'title':
      baseSlide.content = {
        title: 'Título',
        subtitle: 'Subtítulo',
      };
      baseSlide.style.titleSize = '3xl';
      break;
    case 'title-subtitle':
      baseSlide.content = {
        title: 'Título de la Sección',
        body: 'Contenido de la diapositiva. Edita este texto para agregar tu mensaje.',
      };
      break;
    case 'stats':
      baseSlide.content = {
        title: 'Estadísticas',
        items: [
          { id: generateItemId(), label: 'Métrica 1', value: '100', description: 'Descripción' },
          { id: generateItemId(), label: 'Métrica 2', value: '200', description: 'Descripción' },
          { id: generateItemId(), label: 'Métrica 3', value: '300', description: 'Descripción' },
        ],
      };
      break;
    case 'grid-2':
    case 'grid-3':
    case 'grid-4':
      const count = parseInt(type.split('-')[1]);
      baseSlide.content = {
        title: 'Título',
        items: Array.from({ length: count }, (_, i) => ({
          id: generateItemId(),
          label: `Item ${i + 1}`,
          value: 'Valor',
          description: 'Descripción',
          icon: 'star' as const,
        })),
      };
      break;
    case 'comparison':
      baseSlide.content = {
        title: 'Comparación',
        items: [
          { id: generateItemId(), label: 'Opción A', value: '', description: 'Beneficios de la opción A' },
          { id: generateItemId(), label: 'Opción B', value: '', description: 'Beneficios de la opción B' },
        ],
      };
      break;
    case 'list':
      baseSlide.content = {
        title: 'Lista',
        items: [
          { id: generateItemId(), label: '1.', value: 'Primer punto', description: '' },
          { id: generateItemId(), label: '2.', value: 'Segundo punto', description: '' },
          { id: generateItemId(), label: '3.', value: 'Tercer punto', description: '' },
        ],
      };
      baseSlide.style.alignment = 'left';
      break;
    case 'quote':
      baseSlide.content = {
        quote: '"Cita inspiradora o testimonial aquí."',
        quoteAuthor: '— Autor',
      };
      break;
    case 'timeline':
      baseSlide.content = {
        title: 'Timeline',
        items: [
          { id: generateItemId(), label: 'Etapa 1', value: 'Título', description: 'Descripción' },
          { id: generateItemId(), label: 'Etapa 2', value: 'Título', description: 'Descripción' },
          { id: generateItemId(), label: 'Etapa 3', value: 'Título', description: 'Descripción' },
        ],
      };
      break;
    case 'cta':
      baseSlide.content = {
        title: 'Llamado a la Acción',
        subtitle: 'Subtítulo motivador',
        body: 'Información adicional de contacto',
      };
      baseSlide.style.titleSize = '2xl';
      break;
    case 'image-text':
      baseSlide.content = {
        title: 'Título',
        body: 'Descripción del contenido junto a la imagen.',
        imageUrl: '',
      };
      baseSlide.style.alignment = 'left';
      break;
  }

  return baseSlide;
}

// ============================================================
// STORE IMPLEMENTATION
// ============================================================

export const usePresentationStore = create<PresentationStore>()(
  persist(
    (set, get) => ({
      presentation: null,
      editor: DEFAULT_EDITOR_STATE,
      savedPresentations: [],

      // ============================================================
      // PRESENTATION ACTIONS
      // ============================================================

      createPresentation: (templateId, themeId) => {
        const template = TEMPLATES.find(t => t.id === templateId);
        if (!template) return;

        const theme = themeId ? THEMES[themeId] : template.defaultTheme;
        const newPresentation = createPresentationFromTemplate(template, theme);

        const presentation: Presentation = {
          ...newPresentation,
          id: generatePresentationId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'user', // TODO: Get from auth
        };

        set({
          presentation,
          editor: {
            ...DEFAULT_EDITOR_STATE,
            history: { past: [], future: [] },
          },
        });
      },

      loadPresentation: (presentation) => {
        set({
          presentation,
          editor: {
            ...DEFAULT_EDITOR_STATE,
            history: { past: [], future: [] },
          },
        });
      },

      savePresentation: () => {
        const { presentation, savedPresentations } = get();
        if (!presentation) return;

        const updatedPresentation = {
          ...presentation,
          updatedAt: new Date().toISOString(),
        };

        // Update saved presentations list
        const existingIndex = savedPresentations.findIndex(p => p.id === presentation.id);
        const savedEntry = {
          id: presentation.id,
          title: presentation.title,
          updatedAt: updatedPresentation.updatedAt,
        };

        const newSavedPresentations = existingIndex >= 0
          ? savedPresentations.map((p, i) => i === existingIndex ? savedEntry : p)
          : [...savedPresentations, savedEntry];

        // Save full presentation to localStorage
        localStorage.setItem(`presentation_${presentation.id}`, JSON.stringify(updatedPresentation));

        set({
          presentation: updatedPresentation,
          savedPresentations: newSavedPresentations,
        });
      },

      updatePresentationMeta: (updates) => {
        const { presentation, editor } = get();
        if (!presentation) return;

        // Save to history
        const newHistory = {
          past: [...editor.history.past, presentation].slice(-50),
          future: [],
        };

        set({
          presentation: { ...presentation, ...updates },
          editor: { ...editor, history: newHistory },
        });
      },

      setTheme: (theme) => {
        const { presentation, editor } = get();
        if (!presentation) return;

        const newHistory = {
          past: [...editor.history.past, presentation].slice(-50),
          future: [],
        };

        set({
          presentation: { ...presentation, theme },
          editor: { ...editor, history: newHistory },
        });
      },

      updateSettings: (settings) => {
        const { presentation } = get();
        if (!presentation) return;

        set({
          presentation: {
            ...presentation,
            settings: { ...presentation.settings, ...settings },
          },
        });
      },

      // ============================================================
      // SLIDE ACTIONS
      // ============================================================

      addSlide: (slideType, index) => {
        const { presentation, editor } = get();
        if (!presentation) return;

        const newSlide = createDefaultSlide(slideType);
        const insertIndex = index ?? presentation.slides.length;
        const newSlides = [...presentation.slides];
        newSlides.splice(insertIndex, 0, newSlide);

        const newHistory = {
          past: [...editor.history.past, presentation].slice(-50),
          future: [],
        };

        set({
          presentation: { ...presentation, slides: newSlides },
          editor: {
            ...editor,
            selectedSlideIndex: insertIndex,
            history: newHistory,
          },
        });
      },

      deleteSlide: (slideId) => {
        const { presentation, editor } = get();
        if (!presentation || presentation.slides.length <= 1) return;

        const slideIndex = presentation.slides.findIndex(s => s.id === slideId);
        if (slideIndex === -1) return;

        const newSlides = presentation.slides.filter(s => s.id !== slideId);
        const newSelectedIndex = Math.min(editor.selectedSlideIndex, newSlides.length - 1);

        const newHistory = {
          past: [...editor.history.past, presentation].slice(-50),
          future: [],
        };

        set({
          presentation: { ...presentation, slides: newSlides },
          editor: {
            ...editor,
            selectedSlideIndex: newSelectedIndex,
            history: newHistory,
          },
        });
      },

      duplicateSlide: (slideId) => {
        const { presentation, editor } = get();
        if (!presentation) return;

        const slideIndex = presentation.slides.findIndex(s => s.id === slideId);
        if (slideIndex === -1) return;

        const originalSlide = presentation.slides[slideIndex];
        const duplicatedSlide: Slide = {
          ...JSON.parse(JSON.stringify(originalSlide)),
          id: generateSlideId(),
        };

        // Update item IDs
        if (duplicatedSlide.content.items) {
          duplicatedSlide.content.items = duplicatedSlide.content.items.map(item => ({
            ...item,
            id: generateItemId(),
          }));
        }

        const newSlides = [...presentation.slides];
        newSlides.splice(slideIndex + 1, 0, duplicatedSlide);

        const newHistory = {
          past: [...editor.history.past, presentation].slice(-50),
          future: [],
        };

        set({
          presentation: { ...presentation, slides: newSlides },
          editor: {
            ...editor,
            selectedSlideIndex: slideIndex + 1,
            history: newHistory,
          },
        });
      },

      moveSlide: (fromIndex, toIndex) => {
        const { presentation, editor } = get();
        if (!presentation) return;

        const newSlides = [...presentation.slides];
        const [movedSlide] = newSlides.splice(fromIndex, 1);
        newSlides.splice(toIndex, 0, movedSlide);

        const newHistory = {
          past: [...editor.history.past, presentation].slice(-50),
          future: [],
        };

        set({
          presentation: { ...presentation, slides: newSlides },
          editor: {
            ...editor,
            selectedSlideIndex: toIndex,
            history: newHistory,
          },
        });
      },

      updateSlide: (slideId, updates) => {
        const { presentation, editor } = get();
        if (!presentation) return;

        const newSlides = presentation.slides.map(slide =>
          slide.id === slideId ? { ...slide, ...updates } : slide
        );

        const newHistory = {
          past: [...editor.history.past, presentation].slice(-50),
          future: [],
        };

        set({
          presentation: { ...presentation, slides: newSlides },
          editor: { ...editor, history: newHistory },
        });
      },

      updateSlideContent: (slideId, content) => {
        const { presentation, editor } = get();
        if (!presentation) return;

        const newSlides = presentation.slides.map(slide =>
          slide.id === slideId
            ? { ...slide, content: { ...slide.content, ...content } }
            : slide
        );

        const newHistory = {
          past: [...editor.history.past, presentation].slice(-50),
          future: [],
        };

        set({
          presentation: { ...presentation, slides: newSlides },
          editor: { ...editor, history: newHistory },
        });
      },

      updateSlideStyle: (slideId, style) => {
        const { presentation, editor } = get();
        if (!presentation) return;

        const newSlides = presentation.slides.map(slide =>
          slide.id === slideId
            ? { ...slide, style: { ...slide.style, ...style } }
            : slide
        );

        const newHistory = {
          past: [...editor.history.past, presentation].slice(-50),
          future: [],
        };

        set({
          presentation: { ...presentation, slides: newSlides },
          editor: { ...editor, history: newHistory },
        });
      },

      updateSlideAnimation: (slideId, animation) => {
        const { presentation, editor } = get();
        if (!presentation) return;

        const newSlides = presentation.slides.map(slide =>
          slide.id === slideId
            ? { ...slide, animation: { ...slide.animation, ...animation } }
            : slide
        );

        set({
          presentation: { ...presentation, slides: newSlides },
        });
      },

      // ============================================================
      // ITEM ACTIONS
      // ============================================================

      addItem: (slideId) => {
        const { presentation, editor } = get();
        if (!presentation) return;

        const newItem: SlideContentItem = {
          id: generateItemId(),
          label: 'Nuevo',
          value: 'Valor',
          description: 'Descripción',
        };

        const newSlides = presentation.slides.map(slide => {
          if (slide.id !== slideId) return slide;
          return {
            ...slide,
            content: {
              ...slide.content,
              items: [...(slide.content.items || []), newItem],
            },
          };
        });

        const newHistory = {
          past: [...editor.history.past, presentation].slice(-50),
          future: [],
        };

        set({
          presentation: { ...presentation, slides: newSlides },
          editor: { ...editor, history: newHistory },
        });
      },

      updateItem: (slideId, itemId, updates) => {
        const { presentation, editor } = get();
        if (!presentation) return;

        const newSlides = presentation.slides.map(slide => {
          if (slide.id !== slideId) return slide;
          return {
            ...slide,
            content: {
              ...slide.content,
              items: slide.content.items?.map(item =>
                item.id === itemId ? { ...item, ...updates } : item
              ),
            },
          };
        });

        const newHistory = {
          past: [...editor.history.past, presentation].slice(-50),
          future: [],
        };

        set({
          presentation: { ...presentation, slides: newSlides },
          editor: { ...editor, history: newHistory },
        });
      },

      deleteItem: (slideId, itemId) => {
        const { presentation, editor } = get();
        if (!presentation) return;

        const newSlides = presentation.slides.map(slide => {
          if (slide.id !== slideId) return slide;
          return {
            ...slide,
            content: {
              ...slide.content,
              items: slide.content.items?.filter(item => item.id !== itemId),
            },
          };
        });

        const newHistory = {
          past: [...editor.history.past, presentation].slice(-50),
          future: [],
        };

        set({
          presentation: { ...presentation, slides: newSlides },
          editor: { ...editor, history: newHistory },
        });
      },

      reorderItems: (slideId, fromIndex, toIndex) => {
        const { presentation, editor } = get();
        if (!presentation) return;

        const newSlides = presentation.slides.map(slide => {
          if (slide.id !== slideId || !slide.content.items) return slide;

          const newItems = [...slide.content.items];
          const [movedItem] = newItems.splice(fromIndex, 1);
          newItems.splice(toIndex, 0, movedItem);

          return {
            ...slide,
            content: { ...slide.content, items: newItems },
          };
        });

        const newHistory = {
          past: [...editor.history.past, presentation].slice(-50),
          future: [],
        };

        set({
          presentation: { ...presentation, slides: newSlides },
          editor: { ...editor, history: newHistory },
        });
      },

      // ============================================================
      // EDITOR ACTIONS
      // ============================================================

      setEditorMode: (mode) => {
        set(state => ({
          editor: { ...state.editor, mode },
        }));
      },

      selectSlide: (index) => {
        set(state => ({
          editor: {
            ...state.editor,
            selectedSlideIndex: index,
            selectedElementId: null,
          },
        }));
      },

      selectElement: (elementId) => {
        set(state => ({
          editor: { ...state.editor, selectedElementId: elementId },
        }));
      },

      setZoom: (zoom) => {
        set(state => ({
          editor: { ...state.editor, zoom: Math.min(200, Math.max(25, zoom)) },
        }));
      },

      toggleGrid: () => {
        set(state => ({
          editor: { ...state.editor, showGrid: !state.editor.showGrid },
        }));
      },

      toggleNotes: () => {
        set(state => ({
          editor: { ...state.editor, showNotes: !state.editor.showNotes },
        }));
      },

      undo: () => {
        const { editor, presentation } = get();
        if (editor.history.past.length === 0 || !presentation) return;

        const newPast = [...editor.history.past];
        const previousPresentation = newPast.pop()!;

        set({
          presentation: previousPresentation,
          editor: {
            ...editor,
            history: {
              past: newPast,
              future: [presentation, ...editor.history.future],
            },
          },
        });
      },

      redo: () => {
        const { editor, presentation } = get();
        if (editor.history.future.length === 0 || !presentation) return;

        const newFuture = [...editor.history.future];
        const nextPresentation = newFuture.shift()!;

        set({
          presentation: nextPresentation,
          editor: {
            ...editor,
            history: {
              past: [...editor.history.past, presentation],
              future: newFuture,
            },
          },
        });
      },

      clearPresentation: () => {
        set({
          presentation: null,
          editor: DEFAULT_EDITOR_STATE,
        });
      },
    }),
    {
      name: 'presentation-store',
      partialize: (state) => ({
        savedPresentations: state.savedPresentations,
      }),
    }
  )
);
