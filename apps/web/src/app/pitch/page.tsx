'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Users,
  Target,
  TrendingUp,
  DollarSign,
  Building2,
  Droplets,
  Map,
  Crown,
  User,
  Handshake,
  CheckCircle2,
  Calendar,
  GraduationCap,
  Briefcase,
  AlertTriangle,
  FileSpreadsheet,
  Zap,
  Database,
  Globe,
  Gauge,
  Sparkles,
  Monitor,
  Cpu,
  Layers,
  Box,
  MapPin,
} from 'lucide-react';
import FounderGate from '@/components/auth/FounderGate';

const TOTAL_SLIDES = 18;

// Define which slides have sub-steps (0-indexed slide number -> total steps)
const SLIDE_STEPS: Record<number, number> = {
  1: 5,  // SlideJourney has 5 timeline items
};

export default function PitchPage() {
  return (
    <FounderGate
      title="Pitch para Co-Fundadores"
      subtitle="Presentación exclusiva para el equipo fundador de LeDesign."
    >
      <PitchContent />
    </FounderGate>
  );
}

function PitchContent() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const maxSteps = SLIDE_STEPS[currentSlide] || 0;

  const goNext = useCallback(() => {
    // If slide has steps and we haven't shown all steps yet
    if (maxSteps > 0 && currentStep < maxSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else if (currentSlide < TOTAL_SLIDES - 1) {
      setCurrentSlide(prev => prev + 1);
      setCurrentStep(0);
    }
    setIsAutoPlaying(false);
  }, [currentSlide, currentStep, maxSteps]);

  const goPrev = useCallback(() => {
    // If we have steps and we're not at step 0, go back a step
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else if (currentSlide > 0) {
      const prevSlide = currentSlide - 1;
      const prevMaxSteps = SLIDE_STEPS[prevSlide] || 0;
      setCurrentSlide(prevSlide);
      // Go to last step of previous slide if it has steps
      setCurrentStep(prevMaxSteps > 0 ? prevMaxSteps - 1 : 0);
    }
    setIsAutoPlaying(false);
  }, [currentSlide, currentStep]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        goNext();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'r' || e.key === 'R') {
        setCurrentSlide(0);
        setCurrentStep(0);
        setIsAutoPlaying(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goNext, goPrev]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    setCurrentStep(0);
    setIsAutoPlaying(false);
  }, []);

  const reset = () => {
    setCurrentSlide(0);
    setCurrentStep(0);
    setIsAutoPlaying(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {currentSlide === 0 && <SlideTitle key="title" />}
          {currentSlide === 1 && <SlideJourney key="journey" activeStep={currentStep} />}
          {currentSlide === 2 && <SlideProblem key="problem" />}
          {currentSlide === 3 && <SlideWhyNow key="whynow" />}
          {currentSlide === 4 && <SlideOpportunity key="opportunity" />}
          {currentSlide === 5 && <SlideMarket key="market" />}
          {currentSlide === 6 && <SlideProduct key="product" />}
          {currentSlide === 7 && <SlideTechStatus key="techstatus" />}
          {currentSlide === 8 && <SlideTeam key="team" />}
          {currentSlide === 9 && <SlideEquity key="equity" />}
          {currentSlide === 10 && <SlideCoFounderCommitment key="commitment" />}
          {currentSlide === 11 && <SlideModuleOwnership key="modules" />}
          {currentSlide === 12 && <SlideFunding key="funding" />}
          {currentSlide === 13 && <SlideTimeline key="timeline" />}
          {currentSlide === 14 && <SlideSustainability key="sustainability" />}
          {currentSlide === 15 && <SlideWhatIfWeNailIt key="nailit" />}
          {currentSlide === 16 && <SlideWhatYouGet key="whatyouget" />}
          {currentSlide === 17 && <SlideCTA key="cta" />}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 controls-panel">
        <div className="glass-card rounded-full px-6 py-3 flex items-center gap-4 border border-white/20">
          {/* Reset */}
          <button
            onClick={reset}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="Reset (R)"
          >
            <RotateCcw className="w-5 h-5 text-white" />
          </button>

          {/* Previous */}
          <button
            onClick={goPrev}
            disabled={currentSlide === 0 && currentStep === 0}
            className="p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
            title="Previous"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>

          {/* Next */}
          <button
            onClick={goNext}
            disabled={currentSlide === TOTAL_SLIDES - 1 && currentStep >= (SLIDE_STEPS[currentSlide] || 1) - 1}
            className="p-3 bg-blue-500 hover:bg-blue-600 rounded-full transition-colors disabled:opacity-30"
            title="Next (Space)"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>

          {/* Slide indicator */}
          <div className="flex items-center gap-2 ml-2">
            {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentSlide
                    ? 'bg-blue-400 w-6'
                    : i < currentSlide
                    ? 'bg-blue-400/50'
                    : 'bg-white/30'
                }`}
              />
            ))}
          </div>

          {/* Slide number */}
          <div className="text-white/50 text-sm ml-2">
            {currentSlide + 1} / {TOTAL_SLIDES}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="fixed top-4 right-4 text-xs text-slate-500 text-right space-y-1">
        <div>Space / Click: Next</div>
        <div>Arrows: Navigate</div>
        <div>R: Reset</div>
      </div>
    </div>
  );
}

// Slide Components

function SlideTitle() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-5xl mx-auto"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="text-9xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent mb-8"
      >
        LeDesign
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-3xl text-slate-300 mb-4"
      >
        <span className="text-blue-400 font-bold">LE</span>desma + Chi<span className="text-blue-400 font-bold">LE</span> + <span className="text-blue-400 font-bold">LE</span> Diseño
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-xl text-slate-500"
      >
        Pitch para Co-Fundadores
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="mt-12 text-slate-600"
      >
        Enero 2026
      </motion.div>
    </motion.div>
  );
}

function SlideJourney({ activeStep }: { activeStep: number }) {
  const timeline = [
    { year: '2016', event: 'Graduado UdeC', icon: GraduationCap, color: 'blue', description: 'Ingeniería Civil, Universidad de Concepción' },
    { year: '2016-19', event: 'LEICO con mi papá', icon: Briefcase, color: 'green', description: 'Trabajando en la empresa familiar de ingeniería' },
    { year: '2019', event: 'PhD Hidrología USA', icon: Droplets, color: 'cyan', description: 'Beca completa para doctorado en hidrología' },
    { year: '2019-24', event: 'Research Center', icon: Database, color: 'purple', description: 'Investigación en sistemas de datos hidrológicos' },
    { year: '2026', event: 'LeDesign', icon: Sparkles, color: 'amber', description: 'Uniendo todo lo aprendido en una plataforma' },
  ];

  const colorClasses: Record<string, { text: string; border: string; bg: string; ring: string }> = {
    blue: { text: 'text-blue-400', border: 'border-blue-500/50', bg: 'bg-blue-500/10', ring: 'ring-blue-500/50' },
    green: { text: 'text-green-400', border: 'border-green-500/50', bg: 'bg-green-500/10', ring: 'ring-green-500/50' },
    cyan: { text: 'text-cyan-400', border: 'border-cyan-500/50', bg: 'bg-cyan-500/10', ring: 'ring-cyan-500/50' },
    purple: { text: 'text-purple-400', border: 'border-purple-500/50', bg: 'bg-purple-500/10', ring: 'ring-purple-500/50' },
    amber: { text: 'text-amber-400', border: 'border-amber-500/50', bg: 'bg-amber-500/10', ring: 'ring-amber-500/50' },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-6xl mx-auto"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-bold text-white mb-4"
      >
        Cómo Llegué Aquí
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-slate-400 mb-12"
      >
        De ingeniero civil en Chile a PhD en USA: viví el problema en primera persona
      </motion.p>

      <div className="flex justify-between items-stretch gap-4 mb-8">
        {timeline.map((item, i) => {
          const Icon = item.icon;
          const isActive = i <= activeStep;
          const isCurrent = i === activeStep;
          const colors = colorClasses[item.color];

          return (
            <motion.div
              key={item.year}
              initial={{ opacity: 0.3, scale: 0.95 }}
              animate={{
                opacity: isActive ? 1 : 0.3,
                scale: isCurrent ? 1.05 : 1,
                y: isCurrent ? -8 : 0
              }}
              transition={{ duration: 0.4 }}
              className={`flex-1 glass-card rounded-xl p-6 transition-all duration-300 ${
                isCurrent
                  ? `${colors.border} ${colors.bg} ring-2 ring-offset-2 ring-offset-slate-950 ${colors.ring}`
                  : isActive
                    ? 'border-white/20'
                    : 'border-white/5'
              }`}
            >
              <Icon
                size={32}
                className={`mx-auto mb-3 transition-all duration-300 ${
                  isActive ? colors.text : 'text-slate-600'
                }`}
              />
              <div className={`text-sm mb-2 transition-colors duration-300 ${
                isActive ? 'text-slate-400' : 'text-slate-700'
              }`}>
                {item.year}
              </div>
              <div className={`text-lg font-semibold transition-colors duration-300 ${
                isActive ? 'text-white' : 'text-slate-600'
              }`}>
                {item.event}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Description for current step */}
      <motion.div
        key={activeStep}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`glass-card rounded-xl p-6 mb-8 ${colorClasses[timeline[activeStep].color].border}`}
      >
        <div className={`text-xl font-semibold ${colorClasses[timeline[activeStep].color].text}`}>
          {timeline[activeStep].event}
        </div>
        <div className="text-slate-300 mt-2">
          {timeline[activeStep].description}
        </div>
      </motion.div>

      {/* Summary - only show when all steps are revealed */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: activeStep >= 4 ? 1 : 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card rounded-xl p-6 border border-blue-500/30"
      >
        <div className="text-slate-300 text-lg">
          <span className="text-blue-400 font-bold">3 años en Chile</span> viendo el problema +{' '}
          <span className="text-purple-400 font-bold">5 años en USA</span> descubriendo la solución
        </div>
      </motion.div>
    </motion.div>
  );
}

function SlideProblem() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-6xl mx-auto"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-bold text-white mb-4"
      >
        El Problema Fundamental
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-slate-400 mb-12"
      >
        En Chile y en mi PhD: data esparcida en formatos incompatibles
      </motion.p>

      <div className="grid grid-cols-2 gap-8 mb-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-8 border border-red-500/30 text-left"
        >
          <div className="text-2xl font-bold text-red-400 mb-6">Contenido Estático</div>
          <div className="space-y-3 text-slate-300">
            <div>• PDFs, TIFFs, GIS, DWG, Excel</div>
            <div>• Solo ves lo que el autor decidió</div>
            <div>• No puedes cambiar parámetros</div>
            <div>• Imposible re-analizar</div>
            <div>• Cada formato necesita software específico</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl p-8 border border-red-500/30 text-left"
        >
          <div className="text-2xl font-bold text-red-400 mb-6">Data Aislada</div>
          <div className="space-y-3 text-slate-300">
            <div>• Hidrología separada de estructural</div>
            <div>• Planos desconectados de cálculos</div>
            <div>• Cada disciplina en su isla</div>
            <div>• Difícil acceso programático</div>
            <div>• Imposible análisis expandido</div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-2xl text-white"
      >
        Resultado: <span className="text-red-400 font-bold">ingenieros luchando con formatos</span>,
        no haciendo <span className="text-green-400 font-bold">ingeniería</span>
      </motion.div>
    </motion.div>
  );
}

function SlideWhyNow() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-6xl mx-auto"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-bold text-white mb-4"
      >
        ¿Por Qué Ahora?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-2xl text-slate-400 mb-10"
      >
        La data es solo <span className="text-blue-400">números en un esquema</span>
      </motion.p>

      <div className="grid grid-cols-2 gap-8 mb-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-xl p-8 border border-red-500/30 text-left"
        >
          <div className="text-2xl font-bold text-red-400 mb-6">Antes: Big Tech dictaba</div>
          <div className="space-y-3 text-slate-300 mb-4">
            <div>• AutoCAD, ESRI, Adobe invirtieron <span className="text-red-400 font-bold">millones</span></div>
            <div>• Necesitaban <span className="text-red-400 font-bold">dominar el mercado</span> para recuperar</div>
            <div>• Todos usamos <span className="text-red-400 font-bold">SUS esquemas</span></div>
            <div>• Imposible personalizar por caso</div>
          </div>
          <div className="text-sm text-slate-500 mt-4 border-t border-red-500/30 pt-4">
            Resultado: Data bloqueada en formatos propietarios
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-xl p-8 border border-green-500/30 text-left"
        >
          <div className="text-2xl font-bold text-green-400 mb-6">Ahora: Expertos construyen</div>
          <div className="space-y-3 text-slate-300 mb-4">
            <div>• IA escribe el código (Claude: 90%+)</div>
            <div>• Infraestructura gratis (Vercel/Turso)</div>
            <div>• <span className="text-green-400 font-bold">Nosotros definimos el esquema</span></div>
            <div>• Optimizado para NUESTRO caso</div>
          </div>
          <div className="text-sm text-slate-500 mt-4 border-t border-green-500/30 pt-4">
            Resultado: Data dinámica conectada a análisis
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="glass-card rounded-xl p-6 border border-blue-500/30 mb-8"
      >
        <div className="text-xl font-bold text-blue-400 mb-4">Las 3 Fundaciones de LeDesign</div>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2">
              <Gauge size={24} className="text-blue-400" />
              <div className="font-semibold text-white">Contenido Dinámico</div>
            </div>
            <div className="text-sm text-slate-400">
              Data en NUESTRA DB, conectada a frontends dinámicos. No PDFs muertos.
            </div>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={24} className="text-amber-400" />
              <div className="font-semibold text-white">Acceso Expedito</div>
            </div>
            <div className="text-sm text-slate-400">
              Esquemas optimizados para análisis rápido. No formatos vendor.
            </div>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2">
              <Database size={24} className="text-purple-400" />
              <div className="font-semibold text-white">DB Centralizada</div>
            </div>
            <div className="text-sm text-slate-400">
              Toda la data en un lugar. Estructural + Hidráulico + Planos.
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="text-2xl text-white"
      >
        Por primera vez: <span className="text-green-400 font-bold">ingenieros definen los esquemas</span>,
        <br />no las empresas de software
      </motion.div>
    </motion.div>
  );
}

function SlideOpportunity() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-5xl mx-auto"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-bold text-white mb-12"
      >
        La Oportunidad
      </motion.h2>

      <div className="grid grid-cols-3 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-8 border border-blue-500/30"
        >
          <div className="text-6xl font-black text-blue-400 mb-4">$2M+</div>
          <div className="text-xl text-slate-300">Mercado software ingeniería</div>
          <div className="text-sm text-slate-500 mt-2">Solo Biobío/Ñuble</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-8 border border-purple-500/30"
        >
          <div className="text-6xl font-black text-purple-400 mb-4">1,500+</div>
          <div className="text-xl text-slate-300">Usuarios potenciales</div>
          <div className="text-sm text-slate-500 mt-2">Ingenieros en la región</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl p-8 border border-green-500/30"
        >
          <div className="text-6xl font-black text-green-400 mb-4">0</div>
          <div className="text-xl text-slate-300">Competencia local</div>
          <div className="text-sm text-slate-500 mt-2">Con normas NCh integradas</div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12 text-2xl text-slate-400"
      >
        Los ingenieros pagan <span className="text-red-400 font-bold">$2,000+/año</span> en software fragmentado
      </motion.div>
    </motion.div>
  );
}

function SlideMarket() {
  const stats = [
    { label: 'SERVIU Biobío', value: '$518B CLP', sub: 'Presupuesto 2025' },
    { label: 'MOP Regional', value: '$297B CLP', sub: 'Inversión 2025' },
    { label: 'ESSBIO', value: '$5B CLP/año', sub: 'Proyectos agua' },
    { label: 'Permisos edificación', value: '965K m²', sub: 'Autorizados 2024' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-6xl mx-auto"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-bold text-white mb-4"
      >
        El Mercado: Biobío + Ñuble
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-slate-400 mb-12"
      >
        2.13 millones de habitantes • 11.5% de Chile
      </motion.p>

      <div className="grid grid-cols-4 gap-6 mb-12">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className="glass-card rounded-xl p-6 border border-white/10"
          >
            <div className="text-sm text-slate-500 mb-2">{stat.label}</div>
            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-xs text-slate-500">{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="glass-card rounded-xl p-6 border border-green-500/30 inline-block"
      >
        <div className="text-slate-400">Conexiones de Waldo:</div>
        <div className="text-2xl font-bold text-white mt-2">
          SERVIU • MOP • ESSBIO • 40-70 leads directos
        </div>
      </motion.div>
    </motion.div>
  );
}

function SlideProduct() {
  const modules = [
    { name: 'Estructural', icon: Building2, price: '$100/mes', color: 'text-blue-400', features: ['FEA', 'NCh433 sísmico', 'Acero/Hormigón'] },
    { name: 'Pavimentos', icon: Map, price: '$100/mes', color: 'text-purple-400', features: ['AASHTO', 'CBR', 'Perfiles'] },
    { name: 'Hidráulico', icon: Droplets, price: '$100/mes', color: 'text-cyan-400', features: ['NCh691', 'Alcantarillado', 'Aguas lluvia'] },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-6xl mx-auto"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-bold text-white mb-12"
      >
        Los 3 Módulos
      </motion.h2>

      <div className="grid grid-cols-3 gap-8 mb-12">
        {modules.map((module, i) => {
          const Icon = module.icon;
          return (
            <motion.div
              key={module.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="glass-card rounded-2xl p-8 border border-white/10"
            >
              <Icon size={48} className={`${module.color} mx-auto mb-4`} />
              <div className="text-2xl font-bold text-white mb-2">{module.name}</div>
              <div className={`text-3xl font-black ${module.color} mb-4`}>{module.price}</div>
              <div className="space-y-2">
                {module.features.map(f => (
                  <div key={f} className="text-sm text-slate-400">{f}</div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-3xl text-white"
      >
        Plan Completo: <span className="text-green-400 font-bold">$200/mes</span>
        <span className="text-slate-500 text-xl ml-4">50% menos que la competencia</span>
      </motion.div>
    </motion.div>
  );
}

function SlideTechStatus() {
  const techCapabilities = [
    { name: 'CAD 2D', status: '✅', tech: 'Canvas 2D', detail: '19 herramientas', icon: Layers, color: 'text-blue-400' },
    { name: '3D Estructural', status: '✅', tech: 'Three.js', detail: 'PBR Materials', icon: Box, color: 'text-purple-400' },
    { name: 'Geoespacial', status: '✅', tech: 'Leaflet + R-tree', detail: '10,000+ entidades', icon: MapPin, color: 'text-green-400' },
    { name: 'Hidráulica', status: '✅', tech: 'Network Solvers', detail: 'Normas NCh', icon: Droplets, color: 'text-cyan-400' },
    { name: 'Rendimiento', status: '✅', tech: 'LOD + Caching', detail: 'Profesional', icon: Cpu, color: 'text-amber-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-6xl mx-auto"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-bold text-white mb-4"
      >
        Estado del Desarrollo
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-slate-400 mb-8"
      >
        Evaluación técnica independiente por Claude Code (Opus 4.5)
      </motion.p>

      <div className="grid grid-cols-5 gap-4 mb-8">
        {techCapabilities.map((cap, i) => {
          const Icon = cap.icon;
          return (
            <motion.div
              key={cap.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="glass-card rounded-xl p-4 border border-white/10"
            >
              <Icon size={28} className={`${cap.color} mx-auto mb-2`} />
              <div className="text-lg font-bold text-white mb-1">{cap.name}</div>
              <div className="text-2xl mb-1">{cap.status}</div>
              <div className="text-xs text-slate-400">{cap.tech}</div>
              <div className="text-xs text-slate-500">{cap.detail}</div>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="glass-card rounded-xl p-6 border border-green-500/30 mb-6"
      >
        <div className="text-xl font-bold text-green-400 mb-4">Veredicto: Web PUEDE igualar Desktop</div>
        <div className="grid grid-cols-3 gap-4 text-left">
          <div>
            <div className="text-sm text-slate-500 mb-1">RAM Elements</div>
            <div className="text-slate-300">Tecnología de los 90s. WebGL 2.0 ya es más avanzado.</div>
          </div>
          <div>
            <div className="text-sm text-slate-500 mb-1">Cálculos pesados</div>
            <div className="text-slate-300">WASM + Web Workers + WebGPU = velocidad nativa.</div>
          </div>
          <div>
            <div className="text-sm text-slate-500 mb-1">Nicho correcto</div>
            <div className="text-slate-300">No replicamos todo. Solo lo que Chile necesita.</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="text-lg text-slate-300"
      >
        <span className="text-green-400 font-bold">+15,000 líneas</span> de código CAD profesional ya implementado
      </motion.div>
    </motion.div>
  );
}

function SlideTeam() {
  const team = [
    { name: 'Benja', role: 'Founder & CEO', equity: '70%', location: 'USA', color: 'text-blue-400' },
    { name: 'Waldo', role: 'Conexiones', equity: '10%', location: 'Biobío', color: 'text-green-400' },
    { name: 'Waldo chico', role: 'CTO', equity: '10%', location: 'Chile', color: 'text-purple-400' },
    { name: 'Pichi', role: 'Eng Lead', equity: '10%', location: 'Chile', color: 'text-amber-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-6xl mx-auto"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-bold text-white mb-12"
      >
        El Equipo
      </motion.h2>

      <div className="grid grid-cols-4 gap-6">
        {team.map((member, i) => (
          <motion.div
            key={member.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className={`glass-card rounded-2xl p-6 border ${i === 0 ? 'border-blue-500/50' : 'border-white/10'}`}
          >
            <User size={40} className={`${member.color} mx-auto mb-4`} />
            <div className="text-xl font-bold text-white mb-1">{member.name}</div>
            <div className={`text-sm ${member.color} mb-2`}>{member.role}</div>
            <div className="text-4xl font-black text-white mb-2">{member.equity}</div>
            <div className="text-xs text-slate-500">{member.location}</div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-12 text-xl text-slate-400"
      >
        Tres Ledesma + Pichi construyendo el futuro de la ingeniería chilena
      </motion.div>
    </motion.div>
  );
}

function SlideEquity() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-5xl mx-auto"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-bold text-white mb-12"
      >
        Por Qué 70 / 10 / 10 / 10
      </motion.h2>

      <div className="grid grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-2xl p-8 border border-blue-500/30 text-left"
        >
          <div className="text-2xl font-bold text-blue-400 mb-6">Mi 70% representa:</div>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-blue-400" />
              La idea y visión
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-blue-400" />
              Todo el código desarrollado
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-blue-400" />
              7 años de ing. civil en Chile
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-blue-400" />
              Arquitectura técnica completa
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-blue-400" />
              100% del desarrollo continuo
            </li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-8 border border-green-500/30 text-left"
        >
          <div className="text-2xl font-bold text-green-400 mb-6">Tu 10% representa:</div>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-green-400" />
              $0 inversión financiera
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-green-400" />
              No renuncias a nada
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-green-400" />
              $1,000/mes desde marzo
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-green-400" />
              Basado en resultados
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle2 size={20} className="text-green-400" />
              10% de TODO para siempre
            </li>
          </ul>
        </motion.div>
      </div>
    </motion.div>
  );
}

function SlideCoFounderCommitment() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-5xl mx-auto"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-bold text-white mb-4"
      >
        Compromiso de Co-Fundador
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-2xl text-slate-400 mb-10"
      >
        Skin in the game: <span className="text-amber-400 font-bold">$1,000</span> por co-fundador
      </motion.p>

      <div className="grid grid-cols-2 gap-8 mb-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-8 border border-red-500/30 text-left"
        >
          <AlertTriangle size={32} className="text-red-400 mb-4" />
          <div className="text-2xl font-bold text-red-400 mb-4">El Riesgo</div>
          <div className="space-y-3 text-slate-300">
            <div className="text-lg">Si <span className="text-red-400 font-bold">NO</span> encontramos 2 Socios Fundadores:</div>
            <div className="text-3xl font-bold text-red-400">Pierdes $1,000</div>
            <div className="text-sm text-slate-500 mt-4">
              Ese es tu máximo downside. No $1,500, no más.
              <br />Solo $1,000 si el fundraising falla.
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl p-8 border border-green-500/30 text-left"
        >
          <CheckCircle2 size={32} className="text-green-400 mb-4" />
          <div className="text-2xl font-bold text-green-400 mb-4">La Recompensa</div>
          <div className="space-y-3 text-slate-300">
            <div className="text-lg">Si <span className="text-green-400 font-bold">SÍ</span> encontramos 2 Socios Fundadores:</div>
            <div className="text-3xl font-bold text-green-400">Recuperas $1,000</div>
            <div className="text-sm text-slate-500 mt-4">
              El dinero vuelve en marzo cuando cerramos el funding.
              <br />Además: 10% equity + $1,000/mes desde marzo.
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="glass-card rounded-xl p-6 border border-blue-500/30"
      >
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-400">$3,000</div>
            <div className="text-sm text-slate-400">Total de 3 co-fundadores</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-amber-400">$5,000</div>
            <div className="text-sm text-slate-400">Meta de enero</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-green-400">60%</div>
            <div className="text-sm text-slate-400">Ya cubierto con ustedes</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mt-8 text-xl text-slate-300"
      >
        Tu <span className="text-amber-400 font-bold">$1,000</span> cuenta hacia la meta.
        <br />Esto es <span className="text-green-400 font-bold">piel en el juego</span>, no solo palabras.
      </motion.div>
    </motion.div>
  );
}

function SlideModuleOwnership() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-5xl mx-auto"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-bold text-white mb-8"
      >
        Modelo de Propiedad
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-2xl text-slate-400 mb-12"
      >
        El que construye un módulo, tiene el <span className="text-amber-400 font-bold">70%</span> de ese módulo
      </motion.p>

      <div className="grid grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-8 border border-blue-500/30"
        >
          <div className="text-xl font-bold text-blue-400 mb-4">Módulos Core (Benja)</div>
          <div className="space-y-2 text-left">
            <div className="text-slate-300">Estructural → Benja 70%</div>
            <div className="text-slate-300">Pavimentos → Benja 70%</div>
            <div className="text-slate-300">Hidráulico → Benja 70%</div>
          </div>
          <div className="text-sm text-slate-500 mt-4">Otros socios: 10% cada uno</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl p-8 border border-amber-500/30"
        >
          <div className="text-xl font-bold text-amber-400 mb-4">Módulos Futuros (Quien lo haga)</div>
          <div className="space-y-2 text-left">
            <div className="text-slate-300">Construcción → <span className="text-amber-400">Pichi 70%</span></div>
            <div className="text-slate-300">Topografía → <span className="text-amber-400">Waldo chico 70%</span></div>
            <div className="text-slate-300">ITO → <span className="text-amber-400">Waldo 70%</span></div>
          </div>
          <div className="text-sm text-slate-500 mt-4">Otros socios: 10% cada uno</div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="mt-10 text-xl text-slate-300"
      >
        Si quieres más participación, <span className="text-amber-400 font-bold">la puedes ganar construyendo</span>
      </motion.div>
    </motion.div>
  );
}

function SlideFunding() {
  const tiers = [
    { name: 'Individual', price: '$250+', users: '1 usuario', target: '50', revenue: '$12,500' },
    { name: 'Equipo', price: '$1,000+', users: '3 usuarios', target: '10', revenue: '$10,000' },
    { name: 'Socio Fundador', price: '$5,000+', users: '5 usuarios', target: '2', revenue: '$10,000', highlight: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-6xl mx-auto"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-bold text-white mb-4"
      >
        Donaciones Pre-Lanzamiento
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-slate-400 mb-12"
      >
        Acceso lifetime a cambio de financiar el desarrollo
      </motion.p>

      <div className="grid grid-cols-3 gap-6 mb-10">
        {tiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className={`glass-card rounded-2xl p-6 border ${tier.highlight ? 'border-amber-500/50 bg-amber-500/5' : 'border-white/10'}`}
          >
            {tier.highlight && <div className="text-xs text-amber-400 font-bold mb-2">PRIORIDAD ENERO</div>}
            <div className="text-xl font-bold text-white mb-2">{tier.name}</div>
            <div className="text-4xl font-black text-green-400 mb-2">{tier.price}</div>
            <div className="text-sm text-slate-400 mb-4">{tier.users} de por vida</div>
            <div className="pt-4 border-t border-white/10">
              <div className="text-sm text-slate-500">Meta: {tier.target}</div>
              <div className="text-lg font-bold text-white">{tier.revenue}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex justify-center gap-8 text-xl"
      >
        <div className="text-slate-400">Total donaciones: <span className="text-green-400 font-bold">$36,000</span></div>
        <div className="text-slate-400">Total gastos: <span className="text-red-400 font-bold">$33,000</span></div>
        <div className="text-slate-400">Buffer: <span className="text-blue-400 font-bold">+$3,000</span></div>
      </motion.div>
    </motion.div>
  );
}

function SlideTimeline() {
  const months = [
    { month: 'ENE', goal: '2 Socios Fundadores', revenue: '$10K', status: 'current' },
    { month: 'FEB', goal: 'Donaciones individuales', revenue: '$6K', status: 'future' },
    { month: 'MAR', goal: 'Early access socios', revenue: '$5K', status: 'future' },
    { month: 'ABR', goal: 'Early access todos', revenue: '$5K', status: 'future' },
    { month: 'MAY', goal: 'LANZAMIENTO', revenue: '$4K+', status: 'launch' },
    { month: 'JUL', goal: 'Autosustentable', revenue: 'MRR', status: 'future' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-6xl mx-auto"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-bold text-white mb-12"
      >
        Timeline 2026
      </motion.h2>

      <div className="flex justify-between items-end gap-4">
        {months.map((m, i) => (
          <motion.div
            key={m.month}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className={`flex-1 glass-card rounded-xl p-4 border ${
              m.status === 'current' ? 'border-green-500/50 bg-green-500/10' :
              m.status === 'launch' ? 'border-purple-500/50 bg-purple-500/10' :
              'border-white/10'
            }`}
          >
            <div className={`text-2xl font-bold mb-2 ${
              m.status === 'current' ? 'text-green-400' :
              m.status === 'launch' ? 'text-purple-400' :
              'text-white'
            }`}>
              {m.month}
            </div>
            <div className="text-sm text-slate-300 mb-2">{m.goal}</div>
            <div className="text-lg font-bold text-green-400">{m.revenue}</div>
            {m.status === 'current' && (
              <div className="mt-2 text-xs text-green-400 font-bold">AHORA</div>
            )}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-10 text-xl text-slate-400"
      >
        Bonos: <span className="text-white">$1,000/mes</span> desde marzo → <span className="text-green-400">$2,500 cap</span>
      </motion.div>
    </motion.div>
  );
}

function SlideSustainability() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-6xl mx-auto"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-bold text-white mb-4"
      >
        Sustentabilidad Post-Julio
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-slate-400 mb-10"
      >
        Biobío + Ñuble primero • México después del primer mes exitoso
      </motion.p>

      <div className="grid grid-cols-3 gap-6 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card rounded-2xl p-6 border border-green-500/30"
        >
          <div className="text-sm text-slate-500 mb-2">SUPERVIVENCIA</div>
          <div className="text-lg text-slate-400 mb-2">$6,000/mes</div>
          <div className="text-5xl font-black text-green-400 mb-2">45</div>
          <div className="text-lg text-slate-300">clientes</div>
          <div className="text-xs text-slate-500 mt-3">~15 por socio ventas</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card rounded-2xl p-6 border border-blue-500/30"
        >
          <div className="text-sm text-slate-500 mb-2">CRECIENDO</div>
          <div className="text-lg text-slate-400 mb-2">$9,000/mes</div>
          <div className="text-5xl font-black text-blue-400 mb-2">68</div>
          <div className="text-lg text-slate-300">clientes</div>
          <div className="text-xs text-slate-500 mt-3">Co-fundadores a $2K</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-card rounded-2xl p-6 border border-purple-500/30"
        >
          <div className="text-sm text-slate-500 mb-2">DOING GOOD</div>
          <div className="text-lg text-slate-400 mb-2">$11,000/mes</div>
          <div className="text-5xl font-black text-purple-400 mb-2">83</div>
          <div className="text-lg text-slate-300">clientes</div>
          <div className="text-xs text-slate-500 mt-3">Todos a $2,500 cap</div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="grid grid-cols-2 gap-6"
      >
        <div className="glass-card rounded-xl p-5 border border-amber-500/30">
          <div className="text-amber-400 font-bold mb-2">Mercado Inicial</div>
          <div className="text-2xl font-bold text-white">Biobío + Ñuble</div>
          <div className="text-sm text-slate-400 mt-1">2.13M habitantes • Contactos directos de Waldo</div>
        </div>
        <div className="glass-card rounded-xl p-5 border border-cyan-500/30">
          <div className="text-cyan-400 font-bold mb-2">Expansión Internacional</div>
          <div className="text-2xl font-bold text-white">México</div>
          <div className="text-sm text-slate-400 mt-1">Contactos de Benja • Después del primer mes exitoso</div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SlideWhatIfWeNailIt() {
  const scenarios = [
    {
      stage: 'Supervivencia',
      clients: '45',
      mrr: '$6K',
      arr: '$72K',
      market: 'Biobío + Ñuble',
      marketShare: '3%',
      color: 'green',
      icon: '🌱'
    },
    {
      stage: 'Doing Good',
      clients: '83',
      mrr: '$11K',
      arr: '$132K',
      market: 'Biobío + Ñuble',
      marketShare: '6%',
      color: 'blue',
      icon: '📈'
    },
    {
      stage: 'Crushing It',
      clients: '556',
      mrr: '$83K',
      arr: '$1M',
      market: 'Chile completo',
      marketShare: '1.6%',
      color: 'purple',
      icon: '🚀'
    },
    {
      stage: 'Dominating',
      clients: '1,900',
      mrr: '$250K',
      arr: '$3M',
      market: 'Chile + México',
      marketShare: '2%',
      color: 'amber',
      icon: '👑'
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-6xl mx-auto"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-bold text-white mb-4"
      >
        ¿Y Si Lo Logramos?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl text-slate-400 mb-8"
      >
        Del mínimo al dominio — los números son alcanzables
      </motion.p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {scenarios.map((s, i) => (
          <motion.div
            key={s.stage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + i * 0.1 }}
            className={`glass-card rounded-xl p-5 border ${
              s.color === 'green' ? 'border-green-500/30' :
              s.color === 'blue' ? 'border-blue-500/30' :
              s.color === 'purple' ? 'border-purple-500/30' :
              'border-amber-500/30'
            }`}
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className={`text-sm font-bold mb-3 ${
              s.color === 'green' ? 'text-green-400' :
              s.color === 'blue' ? 'text-blue-400' :
              s.color === 'purple' ? 'text-purple-400' :
              'text-amber-400'
            }`}>
              {s.stage}
            </div>
            <div className={`text-4xl font-black mb-1 ${
              s.color === 'green' ? 'text-green-400' :
              s.color === 'blue' ? 'text-blue-400' :
              s.color === 'purple' ? 'text-purple-400' :
              'text-amber-400'
            }`}>
              {s.arr}
            </div>
            <div className="text-xs text-slate-500 mb-3">ARR ({s.mrr}/mes)</div>
            <div className="text-lg font-bold text-white">{s.clients}</div>
            <div className="text-xs text-slate-400">clientes</div>
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-xs text-slate-500">{s.market}</div>
              <div className="text-sm text-white font-semibold">{s.marketShare} del mercado</div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="grid grid-cols-2 gap-6"
      >
        <div className="glass-card rounded-xl p-5 border border-white/10 text-left">
          <div className="text-lg font-bold text-white mb-3">TAM (Mercado Total)</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Chile</span>
              <span className="text-green-400 font-bold">$45-60M USD/año</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">LATAM</span>
              <span className="text-purple-400 font-bold">$500M+ USD/año</span>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 border border-white/10 text-left">
          <div className="text-lg font-bold text-white mb-3">Tu 10% Vale...</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">@ $1M ARR</span>
              <span className="text-blue-400 font-bold">$100K/año pasivo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">@ Exit $50M</span>
              <span className="text-amber-400 font-bold">$5M para ti</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.1 }}
        className="mt-6 text-slate-400"
      >
        Solo necesitamos <span className="text-green-400 font-bold">1.6% de Chile</span> para llegar a $1M ARR.
        <br />El upside está en <span className="text-purple-400 font-bold">México y LATAM</span>.
      </motion.p>
    </motion.div>
  );
}

function SlideWhatYouGet() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-5xl mx-auto"
    >
      <motion.h2
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-5xl font-bold text-white mb-12"
      >
        Lo Que Recibes
      </motion.h2>

      <div className="grid grid-cols-2 gap-6">
        {[
          { icon: Crown, label: 'Equity', value: '10% de LeDesign', sub: 'Para siempre' },
          { icon: DollarSign, label: 'Bonus', value: '$1,000 → $2,500/mes', sub: 'Crece con la empresa' },
          { icon: Target, label: 'Compromiso', value: '$1,000', sub: 'Reembolsable si hay éxito' },
          { icon: Users, label: 'Dedicación', value: 'Resultados', sub: 'No horas' },
          { icon: TrendingUp, label: 'Oportunidad', value: '70%', sub: 'De módulos que construyas' },
          { icon: Handshake, label: 'Riesgo Máximo', value: '$1,000', sub: 'Si no cerramos funding' },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="glass-card rounded-xl p-6 border border-white/10 flex items-center gap-4"
            >
              <Icon size={32} className="text-blue-400" />
              <div className="text-left">
                <div className="text-sm text-slate-500">{item.label}</div>
                <div className="text-xl font-bold text-white">{item.value}</div>
                <div className="text-sm text-slate-400">{item.sub}</div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

function SlideCTA() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center max-w-4xl mx-auto"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring' }}
      >
        <Handshake size={80} className="text-blue-400 mx-auto mb-8" />
      </motion.div>

      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-6xl font-bold text-white mb-6"
      >
        ¿Estás adentro?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-2xl text-slate-300 mb-12"
      >
        Tres Ledesma + Pichi.<br />
        70 / 10 / 10 / 10.<br />
        Construyendo LeDesign juntos.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="glass-card rounded-2xl p-8 border border-amber-500/30 bg-amber-500/5"
      >
        <div className="text-xl text-amber-400 font-bold mb-4">Prioridad Enero:</div>
        <div className="text-3xl text-white mb-2">
          Encontrar 2 Socios Fundadores
        </div>
        <div className="text-xl text-slate-400">
          $5,000 cada uno = $10,000 para empezar
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="mt-12 text-slate-500"
      >
        ledesign.cl
      </motion.div>
    </motion.div>
  );
}
