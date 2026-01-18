// ============================================================
// AI PRESENTATION GENERATOR
// ============================================================
// UI component for AI-powered presentation generation

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  Sparkles,
  ChevronRight,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  Users,
  Mic,
  Globe,
  Palette,
  FileText,
  Brain,
  PenTool,
  Paintbrush,
  Construction,
} from 'lucide-react';
import type { PresentationGenerationProgress } from '@/lib/presentation/ai/types';

// ============================================================
// TYPES
// ============================================================

interface AIGeneratorProps {
  onGenerated: (presentation: {
    title: string;
    description: string;
    themeId: string;
    slides: any[];
  }) => void;
  onClose?: () => void;
}

interface GenerationOptions {
  audience: 'technical' | 'business' | 'general' | 'academic';
  tone: 'formal' | 'casual' | 'inspiring' | 'professional';
  language: 'es' | 'en';
  themePreference?: string;
  minSlides?: number;
  maxSlides?: number;
}

// ============================================================
// STAGE ICON MAPPING
// ============================================================

const STAGE_ICONS: Record<PresentationGenerationProgress['stage'], React.ReactNode> = {
  analyzing: <Brain className="w-5 h-5" />,
  planning: <FileText className="w-5 h-5" />,
  writing: <PenTool className="w-5 h-5" />,
  styling: <Paintbrush className="w-5 h-5" />,
  building: <Construction className="w-5 h-5" />,
  complete: <CheckCircle className="w-5 h-5" />,
  error: <AlertCircle className="w-5 h-5" />,
};

const STAGE_LABELS: Record<PresentationGenerationProgress['stage'], string> = {
  analyzing: 'Analizando',
  planning: 'Planificando',
  writing: 'Escribiendo',
  styling: 'Estilizando',
  building: 'Construyendo',
  complete: 'Completado',
  error: 'Error',
};

// ============================================================
// OPTIONS
// ============================================================

const AUDIENCE_OPTIONS = [
  { value: 'general', label: 'General', description: 'Público sin conocimiento técnico previo' },
  { value: 'business', label: 'Negocios', description: 'Ejecutivos y tomadores de decisiones' },
  { value: 'technical', label: 'Técnico', description: 'Profesionales especializados' },
  { value: 'academic', label: 'Académico', description: 'Investigadores y académicos' },
] as const;

const TONE_OPTIONS = [
  { value: 'professional', label: 'Profesional', description: 'Cercano pero formal' },
  { value: 'formal', label: 'Formal', description: 'Serio y corporativo' },
  { value: 'casual', label: 'Casual', description: 'Relajado y accesible' },
  { value: 'inspiring', label: 'Inspirador', description: 'Motivacional y energético' },
] as const;

// ============================================================
// AI GENERATOR COMPONENT
// ============================================================

export function AIGenerator({ onGenerated, onClose }: AIGeneratorProps) {
  const [step, setStep] = useState<'input' | 'options' | 'generating' | 'result'>('input');
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<GenerationOptions>({
    audience: 'general',
    tone: 'professional',
    language: 'es',
    minSlides: 6,
    maxSlides: 12,
  });
  const [progress, setProgress] = useState<PresentationGenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Generate presentation
  const handleGenerate = async () => {
    setStep('generating');
    setError(null);
    setProgress({
      stage: 'analyzing',
      progress: 5,
      message: 'Iniciando generación...',
    });

    try {
      const response = await fetch('/api/presentations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          options,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al generar la presentación');
      }

      setResult(data);
      setProgress({
        stage: 'complete',
        progress: 100,
        message: 'Presentación generada',
        details: `${data.presentation.slides.length} diapositivas`,
      });
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setProgress({
        stage: 'error',
        progress: 0,
        message: 'Error en generación',
      });
    }
  };

  // Use generated presentation
  const handleUsePresentation = () => {
    if (result?.presentation) {
      onGenerated(result.presentation);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-lg">
              <Wand2 className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Generar con IA</h2>
              <p className="text-sm text-slate-400">Crea una presentación desde cero</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Input */}
            {step === 'input' && (
              <motion.div
                key="input"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    ¿Sobre qué tema quieres crear la presentación?
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Ej: Una presentación sobre LeDesign, plataforma de ingeniería civil chilena que integra diseño estructural, hidráulico, pavimentos y vial. Destaca su integración con normas NCh y su análisis de terreno con IA."
                    className="w-full h-32 px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                    maxLength={5000}
                  />
                  <p className="text-xs text-slate-500 mt-1 text-right">
                    {prompt.length}/5000 caracteres
                  </p>
                </div>

                {/* Examples */}
                <div>
                  <p className="text-xs text-slate-500 mb-2">Ejemplos rápidos:</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Pitch de startup para inversores',
                      'Informe técnico de proyecto',
                      'Propuesta comercial B2B',
                      'Capacitación de equipo',
                    ].map((example) => (
                      <button
                        key={example}
                        onClick={() => setPrompt(example)}
                        className="px-3 py-1.5 text-xs bg-slate-800/50 text-slate-400 rounded-full hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setStep('options')}
                  disabled={!prompt.trim()}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                >
                  Continuar
                  <ChevronRight size={18} />
                </button>
              </motion.div>
            )}

            {/* Step 2: Options */}
            {step === 'options' && (
              <motion.div
                key="options"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Audience */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                    <Users size={16} />
                    Audiencia
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {AUDIENCE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setOptions({ ...options, audience: option.value })}
                        className={`p-3 rounded-lg text-left transition-all ${
                          options.audience === option.value
                            ? 'bg-blue-500/20 border-blue-500/50 border'
                            : 'bg-slate-800/50 border border-slate-700/30 hover:border-slate-600'
                        }`}
                      >
                        <p className="font-medium text-white text-sm">{option.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tone */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                    <Mic size={16} />
                    Tono
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {TONE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setOptions({ ...options, tone: option.value })}
                        className={`p-3 rounded-lg text-left transition-all ${
                          options.tone === option.value
                            ? 'bg-blue-500/20 border-blue-500/50 border'
                            : 'bg-slate-800/50 border border-slate-700/30 hover:border-slate-600'
                        }`}
                      >
                        <p className="font-medium text-white text-sm">{option.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-3">
                    <Globe size={16} />
                    Idioma
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOptions({ ...options, language: 'es' })}
                      className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                        options.language === 'es'
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-800/50 text-slate-400 hover:text-white'
                      }`}
                    >
                      Español
                    </button>
                    <button
                      onClick={() => setOptions({ ...options, language: 'en' })}
                      className={`flex-1 py-2.5 rounded-lg font-medium transition-all ${
                        options.language === 'en'
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-800/50 text-slate-400 hover:text-white'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep('input')}
                    className="flex-1 py-3 bg-slate-800/50 text-slate-300 rounded-xl font-medium hover:bg-slate-800 transition-colors"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles size={18} />
                    Generar
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Generating */}
            {step === 'generating' && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="py-8 text-center"
              >
                {error ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Error en generación</h3>
                      <p className="text-sm text-slate-400 mt-1">{error}</p>
                    </div>
                    <button
                      onClick={() => {
                        setError(null);
                        setStep('options');
                      }}
                      className="px-6 py-2.5 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors"
                    >
                      Intentar de nuevo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Animated icon */}
                    <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-full animate-pulse" />
                      <div className="absolute inset-2 bg-slate-900 rounded-full flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {progress?.message || 'Generando presentación...'}
                      </h3>
                      {progress?.details && (
                        <p className="text-sm text-slate-400 mt-1">{progress.details}</p>
                      )}
                    </div>

                    {/* Stage indicators */}
                    <div className="flex justify-center gap-2">
                      {(['analyzing', 'planning', 'writing', 'styling', 'building'] as const).map(
                        (stage) => {
                          const isActive = progress?.stage === stage;
                          const isPast =
                            progress &&
                            ['analyzing', 'planning', 'writing', 'styling', 'building'].indexOf(
                              progress.stage
                            ) >
                              ['analyzing', 'planning', 'writing', 'styling', 'building'].indexOf(
                                stage
                              );

                          return (
                            <div
                              key={stage}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${
                                isActive
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : isPast
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-slate-800/50 text-slate-500'
                              }`}
                            >
                              {isPast ? (
                                <CheckCircle size={14} />
                              ) : isActive ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                STAGE_ICONS[stage]
                              )}
                              {STAGE_LABELS[stage]}
                            </div>
                          );
                        }
                      )}
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                        initial={{ width: '0%' }}
                        animate={{ width: `${progress?.progress || 0}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Result */}
            {step === 'result' && result && (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Success message */}
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white">{result.presentation.title}</h3>
                  <p className="text-sm text-slate-400 mt-1">{result.presentation.description}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-white">
                      {result.presentation.slides.length}
                    </p>
                    <p className="text-xs text-slate-400">Diapositivas</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-white">
                      {Math.round(result.metadata.processingTime / 1000)}s
                    </p>
                    <p className="text-xs text-slate-400">Generación</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-white">
                      {result.analysis?.sections || 0}
                    </p>
                    <p className="text-xs text-slate-400">Secciones</p>
                  </div>
                </div>

                {/* Theme info */}
                <div className="bg-slate-800/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Palette className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="font-medium text-white">Tema: {result.style.themeName}</p>
                      <p className="text-xs text-slate-400">{result.style.reasoning}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setStep('input');
                      setPrompt('');
                      setResult(null);
                    }}
                    className="flex-1 py-3 bg-slate-800/50 text-slate-300 rounded-xl font-medium hover:bg-slate-800 transition-colors"
                  >
                    Generar otra
                  </button>
                  <button
                    onClick={handleUsePresentation}
                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
                    Usar presentación
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
