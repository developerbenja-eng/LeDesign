// ============================================================
// PRESENTATION EDITOR LAYOUT
// ============================================================
// Main editor interface with toolbar, slides panel, canvas, and properties

'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Edit3,
  Eye,
  Presentation,
  Plus,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Save,
  Download,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  StickyNote,
  Settings,
  ChevronLeft,
  ChevronRight,
  Palette,
  LayoutTemplate,
  FileText,
  Image,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { usePresentationStore } from '@/stores/presentation-store';
import { SlideRenderer } from './SlideRenderer';
import { PropertiesPanel } from './PropertiesPanel';
import { THEMES } from '@/lib/presentation/templates';
import { quickExportPDF, quickExportPPTX } from '@/lib/presentation/export';
import type { Slide, SlideType } from '@/types/presentation';

// ============================================================
// SLIDE TYPE OPTIONS
// ============================================================

const SLIDE_TYPE_OPTIONS: Array<{ type: SlideType; label: string; icon: React.ReactNode }> = [
  { type: 'title', label: 'Título', icon: <FileText size={16} /> },
  { type: 'title-subtitle', label: 'Título + Texto', icon: <AlignLeft size={16} /> },
  { type: 'stats', label: 'Estadísticas', icon: <Grid3X3 size={16} /> },
  { type: 'grid-2', label: 'Grid 2 cols', icon: <LayoutTemplate size={16} /> },
  { type: 'grid-3', label: 'Grid 3 cols', icon: <LayoutTemplate size={16} /> },
  { type: 'grid-4', label: 'Grid 4 cols', icon: <LayoutTemplate size={16} /> },
  { type: 'comparison', label: 'Comparación', icon: <AlignCenter size={16} /> },
  { type: 'list', label: 'Lista', icon: <AlignLeft size={16} /> },
  { type: 'quote', label: 'Cita', icon: <FileText size={16} /> },
  { type: 'timeline', label: 'Timeline', icon: <AlignLeft size={16} /> },
  { type: 'image-text', label: 'Imagen + Texto', icon: <Image size={16} /> },
  { type: 'cta', label: 'Call to Action', icon: <Presentation size={16} /> },
];

// ============================================================
// TOOLBAR COMPONENT
// ============================================================

function EditorToolbar({
  onExportPDF,
  onExportPPTX,
}: {
  onExportPDF: () => void;
  onExportPPTX: () => void;
}) {
  const {
    presentation,
    editor,
    setEditorMode,
    savePresentation,
    undo,
    redo,
    setZoom,
    toggleGrid,
    toggleNotes,
    setTheme,
  } = usePresentationStore();

  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  if (!presentation) return null;

  const canUndo = editor.history.past.length > 0;
  const canRedo = editor.history.future.length > 0;

  return (
    <div className="h-14 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 flex items-center px-4 gap-2">
      {/* Mode Switcher */}
      <div className="flex items-center bg-slate-800/50 rounded-lg p-1">
        <button
          onClick={() => setEditorMode('edit')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            editor.mode === 'edit'
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Edit3 size={16} />
          Editar
        </button>
        <button
          onClick={() => setEditorMode('preview')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            editor.mode === 'preview'
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Eye size={16} />
          Vista Previa
        </button>
        <button
          onClick={() => setEditorMode('present')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
            editor.mode === 'present'
              ? 'bg-green-500/20 text-green-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Play size={16} />
          Presentar
        </button>
      </div>

      <div className="w-px h-8 bg-slate-700/50 mx-2" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`p-2 rounded-lg transition-colors ${
            canUndo
              ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Deshacer (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`p-2 rounded-lg transition-colors ${
            canRedo
              ? 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              : 'text-slate-600 cursor-not-allowed'
          }`}
          title="Rehacer (Ctrl+Y)"
        >
          <Redo2 size={18} />
        </button>
      </div>

      <div className="w-px h-8 bg-slate-700/50 mx-2" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setZoom(editor.zoom - 10)}
          disabled={editor.zoom <= 25}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors disabled:text-slate-600 disabled:cursor-not-allowed"
        >
          <ZoomOut size={18} />
        </button>
        <span className="text-sm text-slate-400 w-12 text-center">{editor.zoom}%</span>
        <button
          onClick={() => setZoom(editor.zoom + 10)}
          disabled={editor.zoom >= 200}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors disabled:text-slate-600 disabled:cursor-not-allowed"
        >
          <ZoomIn size={18} />
        </button>
      </div>

      <div className="w-px h-8 bg-slate-700/50 mx-2" />

      {/* View Options */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleGrid}
          className={`p-2 rounded-lg transition-colors ${
            editor.showGrid
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
          title="Mostrar Grilla"
        >
          <Grid3X3 size={18} />
        </button>
        <button
          onClick={toggleNotes}
          className={`p-2 rounded-lg transition-colors ${
            editor.showNotes
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
          title="Mostrar Notas"
        >
          <StickyNote size={18} />
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Theme Selector */}
      <div className="relative">
        <button
          onClick={() => setShowThemeDropdown(!showThemeDropdown)}
          className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors flex items-center gap-2"
        >
          <Palette size={16} />
          Tema
        </button>
        {showThemeDropdown && (
          <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
            {Object.entries(THEMES).map(([id, theme]) => (
              <button
                key={id}
                onClick={() => {
                  setTheme(theme);
                  setShowThemeDropdown(false);
                }}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-slate-700 transition-colors flex items-center gap-3 ${
                  presentation.theme.id === id ? 'text-blue-400' : 'text-slate-300'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: theme.colors.primary }}
                />
                {theme.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-8 bg-slate-700/50 mx-2" />

      {/* Save */}
      <button
        onClick={savePresentation}
        className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors flex items-center gap-2"
      >
        <Save size={16} />
        Guardar
      </button>

      {/* Export */}
      <div className="relative">
        <button
          onClick={() => setShowExportDropdown(!showExportDropdown)}
          className="px-3 py-1.5 rounded-lg text-sm bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors flex items-center gap-2"
        >
          <Download size={16} />
          Exportar
        </button>
        {showExportDropdown && (
          <div className="absolute right-0 top-full mt-2 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
            <button
              onClick={() => {
                onExportPDF();
                setShowExportDropdown(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Exportar PDF
            </button>
            <button
              onClick={() => {
                onExportPPTX();
                setShowExportDropdown(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Exportar PPTX
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SLIDES PANEL (Left Sidebar)
// ============================================================

function SlidesPanel() {
  const {
    presentation,
    editor,
    selectSlide,
    addSlide,
    deleteSlide,
    duplicateSlide,
    moveSlide,
  } = usePresentationStore();

  const [showAddSlideMenu, setShowAddSlideMenu] = useState(false);

  if (!presentation) return null;

  const handleAddSlide = (type: SlideType) => {
    addSlide(type, editor.selectedSlideIndex + 1);
    setShowAddSlideMenu(false);
  };

  return (
    <div className="w-64 bg-slate-900/50 border-r border-slate-700/50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">Diapositivas</h3>
        <div className="relative">
          <button
            onClick={() => setShowAddSlideMenu(!showAddSlideMenu)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <Plus size={18} />
          </button>
          {showAddSlideMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
              {SLIDE_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  onClick={() => handleAddSlide(option.type)}
                  className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slides List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {presentation.slides.map((slide, index) => (
          <motion.div
            key={slide.id}
            layout
            className={`relative group rounded-lg overflow-hidden cursor-pointer border-2 transition-colors ${
              editor.selectedSlideIndex === index
                ? 'border-blue-500'
                : 'border-transparent hover:border-slate-600'
            }`}
            onClick={() => selectSlide(index)}
          >
            {/* Thumbnail */}
            <div className="aspect-video bg-slate-800 relative overflow-hidden">
              <div className="absolute inset-0 transform scale-[0.2] origin-top-left w-[500%] h-[500%]">
                <SlideRenderer
                  slide={slide}
                  theme={presentation.theme}
                  isActive={true}
                  isEditing={false}
                />
              </div>
            </div>

            {/* Slide Number */}
            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-slate-900/80 rounded text-xs text-slate-400">
              {index + 1}
            </div>

            {/* Hover Actions */}
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  moveSlide(index, Math.max(0, index - 1));
                }}
                disabled={index === 0}
                className="p-1 bg-slate-900/80 rounded text-slate-400 hover:text-white disabled:opacity-50"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  moveSlide(index, Math.min(presentation.slides.length - 1, index + 1));
                }}
                disabled={index === presentation.slides.length - 1}
                className="p-1 bg-slate-900/80 rounded text-slate-400 hover:text-white disabled:opacity-50"
              >
                <ChevronDown size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateSlide(slide.id);
                }}
                className="p-1 bg-slate-900/80 rounded text-slate-400 hover:text-white"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSlide(slide.id);
                }}
                disabled={presentation.slides.length <= 1}
                className="p-1 bg-slate-900/80 rounded text-slate-400 hover:text-red-400 disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// CANVAS (Main Editor Area)
// ============================================================

function EditorCanvas() {
  const { presentation, editor, selectSlide } = usePresentationStore();

  if (!presentation) return null;

  const currentSlide = presentation.slides[editor.selectedSlideIndex];
  if (!currentSlide) return null;

  const scale = editor.zoom / 100;

  return (
    <div className="flex-1 bg-slate-950 flex items-center justify-center p-8 overflow-auto">
      <div
        className="relative bg-slate-900 rounded-lg shadow-2xl overflow-hidden"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          width: '960px',
          height: '540px',
        }}
      >
        <SlideRenderer
          slide={currentSlide}
          theme={presentation.theme}
          isActive={true}
          isEditing={editor.mode === 'edit'}
        />

        {/* Slide number indicator */}
        <div className="absolute bottom-4 right-4 px-3 py-1 bg-slate-900/80 rounded-full text-sm text-slate-400">
          {editor.selectedSlideIndex + 1} / {presentation.slides.length}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PRESENTATION MODE (Fullscreen)
// ============================================================

function PresentationMode({ onExit }: { onExit: () => void }) {
  const { presentation, editor, selectSlide } = usePresentationStore();
  const [currentIndex, setCurrentIndex] = useState(editor.selectedSlideIndex);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!presentation) return;

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          setCurrentIndex((prev) => Math.min(prev + 1, presentation.slides.length - 1));
          break;
        case 'ArrowLeft':
          setCurrentIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Escape':
          onExit();
          break;
        case 'Home':
          setCurrentIndex(0);
          break;
        case 'End':
          setCurrentIndex(presentation.slides.length - 1);
          break;
      }
    },
    [presentation, onExit]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!presentation) return null;

  const currentSlide = presentation.slides[currentIndex];

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full h-full max-w-[1920px] max-h-[1080px] aspect-video">
          <AnimatePresence mode="wait">
            <SlideRenderer
              key={currentSlide.id}
              slide={currentSlide}
              theme={presentation.theme}
              isActive={true}
              isEditing={false}
            />
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/80 px-4 py-2 rounded-full">
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
          disabled={currentIndex === 0}
          className="p-2 text-slate-400 hover:text-white disabled:opacity-50"
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-slate-300 text-sm">
          {currentIndex + 1} / {presentation.slides.length}
        </span>
        <button
          onClick={() =>
            setCurrentIndex((prev) => Math.min(prev + 1, presentation.slides.length - 1))
          }
          disabled={currentIndex === presentation.slides.length - 1}
          className="p-2 text-slate-400 hover:text-white disabled:opacity-50"
        >
          <ChevronRight size={24} />
        </button>
        <div className="w-px h-6 bg-slate-700" />
        <button onClick={onExit} className="p-2 text-slate-400 hover:text-white">
          <Minimize2 size={20} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / presentation.slides.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================
// NOTES PANEL
// ============================================================

function NotesPanel() {
  const { presentation, editor, updateSlide } = usePresentationStore();

  if (!presentation || !editor.showNotes) return null;

  const currentSlide = presentation.slides[editor.selectedSlideIndex];
  if (!currentSlide) return null;

  return (
    <div className="h-40 bg-slate-900/50 border-t border-slate-700/50 p-4">
      <h4 className="text-sm font-medium text-slate-400 mb-2">Notas del Presentador</h4>
      <textarea
        value={currentSlide.notes || ''}
        onChange={(e) => updateSlide(currentSlide.id, { notes: e.target.value })}
        placeholder="Agrega notas para esta diapositiva..."
        className="w-full h-24 bg-slate-800/50 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-500 resize-none focus:outline-none focus:border-blue-500/50"
      />
    </div>
  );
}

// ============================================================
// MAIN EDITOR COMPONENT
// ============================================================

export function PresentationEditor() {
  const { presentation, editor, setEditorMode } = usePresentationStore();

  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = useCallback(async () => {
    if (!presentation || isExporting) return;

    try {
      setIsExporting(true);
      await quickExportPDF(presentation);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Error al exportar PDF. Por favor intenta de nuevo.');
    } finally {
      setIsExporting(false);
    }
  }, [presentation, isExporting]);

  const handleExportPPTX = useCallback(async () => {
    if (!presentation || isExporting) return;

    try {
      setIsExporting(true);
      await quickExportPPTX(presentation);
    } catch (error) {
      console.error('Error exporting PPTX:', error);
      alert('Error al exportar PPTX. Por favor intenta de nuevo.');
    } finally {
      setIsExporting(false);
    }
  }, [presentation, isExporting]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            usePresentationStore.getState().undo();
            break;
          case 'y':
            e.preventDefault();
            usePresentationStore.getState().redo();
            break;
          case 's':
            e.preventDefault();
            usePresentationStore.getState().savePresentation();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!presentation) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <p className="text-slate-400">No hay presentación cargada</p>
      </div>
    );
  }

  // Presentation mode (fullscreen)
  if (editor.mode === 'present') {
    return <PresentationMode onExit={() => setEditorMode('edit')} />;
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950">
      {/* Toolbar */}
      <EditorToolbar onExportPDF={handleExportPDF} onExportPPTX={handleExportPPTX} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Slides */}
        <SlidesPanel />

        {/* Center - Canvas */}
        <div className="flex-1 flex flex-col">
          <EditorCanvas />
          <NotesPanel />
        </div>

        {/* Right Sidebar - Properties */}
        {editor.mode === 'edit' && <PropertiesPanel />}
      </div>
    </div>
  );
}

export default PresentationEditor;
