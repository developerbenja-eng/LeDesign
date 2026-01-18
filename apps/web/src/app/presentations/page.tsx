// ============================================================
// PRESENTATIONS PAGE
// ============================================================
// Main page for creating and managing presentations

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus,
  FileText,
  Presentation,
  Clock,
  Trash2,
  MoreVertical,
  LayoutTemplate,
  Palette,
  ArrowRight,
  ChevronLeft,
  Wand2,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { usePresentationStore } from '@/stores/presentation-store';
import { TEMPLATES, THEMES } from '@/lib/presentation/templates';
import { SlideRenderer } from '@/components/presentation/SlideRenderer';
import { AIGenerator } from '@/components/presentation/AIGenerator';

// ============================================================
// TEMPLATE CARD
// ============================================================

function TemplateCard({
  template,
  onSelect,
}: {
  template: (typeof TEMPLATES)[number];
  onSelect: (templateId: string) => void;
}) {
  return (
    <motion.button
      onClick={() => onSelect(template.id)}
      className="glass-card rounded-xl overflow-hidden text-left group hover:border-blue-500/50 transition-all"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Preview */}
      <div className="aspect-video bg-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 transform scale-[0.15] origin-top-left w-[666%] h-[666%]">
          {template.defaultSlides[0] && (
            <SlideRenderer
              slide={{
                ...template.defaultSlides[0],
                id: 'preview',
              }}
              theme={template.defaultTheme}
              isActive={true}
              isEditing={false}
            />
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
          {template.name}
        </h3>
        <p className="text-sm text-slate-400 mt-1">{template.description}</p>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs px-2 py-1 bg-slate-800/50 rounded-full text-slate-400">
            {template.defaultSlides.length} diapositivas
          </span>
          <span className="text-xs px-2 py-1 bg-slate-800/50 rounded-full text-slate-400 capitalize">
            {template.category}
          </span>
        </div>
      </div>
    </motion.button>
  );
}

// ============================================================
// THEME SELECTOR
// ============================================================

function ThemeSelector({
  selectedTheme,
  onSelect,
}: {
  selectedTheme: string;
  onSelect: (themeId: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
      {Object.entries(THEMES).map(([id, theme]) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`relative p-2 rounded-lg transition-all ${
            selectedTheme === id
              ? 'ring-2 ring-blue-500 bg-slate-800/50'
              : 'bg-slate-800/30 hover:bg-slate-800/50'
          }`}
          title={theme.name}
        >
          <div className="flex gap-1 justify-center">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: theme.colors.primary }}
            />
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: theme.colors.secondary }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 truncate">{theme.name}</p>
        </button>
      ))}
    </div>
  );
}

// ============================================================
// SAVED PRESENTATION CARD
// ============================================================

function SavedPresentationCard({
  presentation,
  onOpen,
  onDelete,
}: {
  presentation: { id: string; title: string; updatedAt: string };
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="glass-card rounded-xl p-4 group hover:border-slate-600/50 transition-all">
      <div className="flex items-start justify-between">
        <button onClick={() => onOpen(presentation.id)} className="flex-1 text-left">
          <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
            {presentation.title || 'Sin título'}
          </h3>
          <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
            <Clock size={14} />
            {new Date(presentation.updatedAt).toLocaleDateString('es-CL', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </div>
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
          >
            <MoreVertical size={16} />
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20">
                <button
                  onClick={() => {
                    onOpen(presentation.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 rounded-t-lg"
                >
                  Abrir
                </button>
                <button
                  onClick={() => {
                    onDelete(presentation.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-slate-700 rounded-b-lg"
                >
                  Eliminar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// NEW PRESENTATION MODAL
// ============================================================

function NewPresentationModal({
  isOpen,
  onClose,
  onCreatePresentation,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreatePresentation: (templateId: string, themeId: string) => void;
}) {
  const [step, setStep] = useState<'template' | 'theme'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>('dark-blue');

  if (!isOpen) return null;

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setStep('theme');
  };

  const handleCreate = () => {
    if (selectedTemplate) {
      onCreatePresentation(selectedTemplate, selectedTheme);
      onClose();
      setStep('template');
      setSelectedTemplate(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {step === 'theme' && (
              <button
                onClick={() => setStep('template')}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">
                {step === 'template' ? 'Selecciona una Plantilla' : 'Selecciona un Tema'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {step === 'template'
                  ? 'Elige una plantilla base para tu presentación'
                  : 'Personaliza los colores de tu presentación'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {step === 'template' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TEMPLATES.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleTemplateSelect}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              <ThemeSelector selectedTheme={selectedTheme} onSelect={setSelectedTheme} />

              {/* Preview */}
              <div className="mt-6">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Vista Previa</h3>
                <div className="aspect-video bg-slate-800 rounded-xl overflow-hidden">
                  {selectedTemplate && (
                    <div className="w-full h-full">
                      <SlideRenderer
                        slide={{
                          ...TEMPLATES.find((t) => t.id === selectedTemplate)!.defaultSlides[0],
                          id: 'preview-theme',
                        }}
                        theme={THEMES[selectedTheme]}
                        isActive={true}
                        isEditing={false}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'theme' && (
          <div className="p-6 border-t border-slate-700/50 flex justify-end">
            <button
              onClick={handleCreate}
              className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              Crear Presentación
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function PresentationsPage() {
  const router = useRouter();
  const { savedPresentations, createPresentation, loadPresentation, clearPresentation } =
    usePresentationStore();

  const [showNewModal, setShowNewModal] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  // Load saved presentation from localStorage
  const handleOpenPresentation = (id: string) => {
    const savedData = localStorage.getItem(`presentation_${id}`);
    if (savedData) {
      try {
        const presentation = JSON.parse(savedData);
        loadPresentation(presentation);
        router.push('/presentations/editor');
      } catch (error) {
        console.error('Error loading presentation:', error);
        alert('Error al cargar la presentación');
      }
    }
  };

  // Delete presentation
  const handleDeletePresentation = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta presentación?')) {
      localStorage.removeItem(`presentation_${id}`);
      // The store will update on next page load
      window.location.reload();
    }
  };

  // Create new presentation
  const handleCreatePresentation = (templateId: string, themeId: string) => {
    createPresentation(templateId, themeId);
    router.push('/presentations/editor');
  };

  // Handle AI generated presentation
  const handleAIGenerated = (presentation: {
    title: string;
    description: string;
    themeId: string;
    slides: any[];
  }) => {
    // Load the AI generated presentation into store
    const fullPresentation = {
      id: `pres_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: presentation.title,
      description: presentation.description,
      templateId: 'ai-generated',
      theme: THEMES[presentation.themeId] || THEMES['dark-blue'],
      slides: presentation.slides,
      settings: {
        aspectRatio: '16:9' as const,
        autoPlay: false,
        autoPlayInterval: 5,
        showProgress: true,
        showSlideNumbers: true,
        loopPresentation: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'ai',
    };
    loadPresentation(fullPresentation);
    setShowAIGenerator(false);
    router.push('/presentations/editor');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="glass-header sticky top-0 z-40 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <Presentation className="w-8 h-8 text-blue-400" />
                <span className="text-xl font-bold text-white">LeDesign</span>
              </Link>
              <span className="text-slate-600">/</span>
              <h1 className="text-lg font-medium text-white">Presentaciones</h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAIGenerator(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all flex items-center gap-2"
              >
                <Sparkles size={18} />
                Generar con IA
              </button>
              <button
                onClick={() => setShowNewModal(true)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus size={18} />
                Nueva Presentación
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* AI Generation Card */}
        <section className="mb-12">
          <motion.button
            onClick={() => setShowAIGenerator(true)}
            className="w-full glass-card rounded-2xl p-8 text-left group hover:border-purple-500/50 transition-all"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-start gap-6">
              <div className="p-4 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl group-hover:from-purple-500/30 group-hover:to-blue-500/30 transition-all">
                <Wand2 className="w-10 h-10 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-2xl font-bold text-white group-hover:text-purple-400 transition-colors">
                    Generar con IA
                  </h2>
                  <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-400 rounded-full">
                    Nuevo
                  </span>
                </div>
                <p className="text-slate-400 max-w-2xl">
                  Describe el tema de tu presentación y nuestra IA creará automáticamente la estructura,
                  contenido y diseño. Podrás editar todo después.
                </p>
                <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-400" />
                    Powered by Gemini
                  </span>
                  <span>|</span>
                  <span>Análisis de contenido</span>
                  <span>|</span>
                  <span>Selección automática de tema</span>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-slate-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </div>
          </motion.button>
        </section>

        {/* Quick Start */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Comenzar con una Plantilla</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TEMPLATES.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={(id) => {
                  createPresentation(id);
                  router.push('/presentations/editor');
                }}
              />
            ))}
          </div>
        </section>

        {/* Recent Presentations */}
        {savedPresentations.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-6">Presentaciones Recientes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedPresentations.map((presentation) => (
                <SavedPresentationCard
                  key={presentation.id}
                  presentation={presentation}
                  onOpen={handleOpenPresentation}
                  onDelete={handleDeletePresentation}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {savedPresentations.length === 0 && (
          <section className="text-center py-16">
            <div className="glass-panel rounded-2xl p-12 max-w-lg mx-auto">
              <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">
                No tienes presentaciones aún
              </h3>
              <p className="text-slate-400 mb-6">
                Crea tu primera presentación seleccionando una plantilla arriba
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors inline-flex items-center gap-2"
              >
                <Plus size={20} />
                Nueva Presentación
              </button>
            </div>
          </section>
        )}
      </main>

      {/* New Presentation Modal */}
      <NewPresentationModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreatePresentation={handleCreatePresentation}
      />

      {/* AI Generator Modal */}
      {showAIGenerator && (
        <AIGenerator
          onGenerated={handleAIGenerated}
          onClose={() => setShowAIGenerator(false)}
        />
      )}
    </div>
  );
}
