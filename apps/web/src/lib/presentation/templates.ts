// ============================================================
// PRESENTATION TEMPLATES & THEMES
// ============================================================

import {
  Theme,
  PresentationTemplate,
  Slide,
  DEFAULT_SLIDE_STYLE,
  DEFAULT_SLIDE_ANIMATION,
} from '@/types/presentation';

// ============================================================
// COLOR THEMES
// ============================================================

export const THEMES: Record<string, Theme> = {
  // Dark Blue (LeDesign default)
  'dark-blue': {
    id: 'dark-blue',
    name: 'Azul Oscuro',
    colors: {
      primary: '#3b82f6',     // blue-500
      secondary: '#8b5cf6',   // purple-500
      accent: '#22d3ee',      // cyan-400
      success: '#22c55e',     // green-500
      warning: '#f59e0b',     // amber-500
      error: '#ef4444',       // red-500
      background: '#0f172a',  // slate-900
      backgroundAlt: '#1e293b', // slate-800
      surface: 'rgba(30, 41, 59, 0.7)', // glass effect
      text: '#f1f5f9',        // slate-100
      textMuted: '#94a3b8',   // slate-400
      border: 'rgba(148, 163, 184, 0.1)',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    borderRadius: 'lg',
  },

  // Dark Purple
  'dark-purple': {
    id: 'dark-purple',
    name: 'Púrpura Oscuro',
    colors: {
      primary: '#a855f7',     // purple-500
      secondary: '#ec4899',   // pink-500
      accent: '#f472b6',      // pink-400
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#0c0a1d',
      backgroundAlt: '#1a1633',
      surface: 'rgba(26, 22, 51, 0.7)',
      text: '#f5f3ff',        // purple-50
      textMuted: '#a78bfa',   // purple-400
      border: 'rgba(168, 85, 247, 0.1)',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    borderRadius: 'lg',
  },

  // Dark Green
  'dark-green': {
    id: 'dark-green',
    name: 'Verde Oscuro',
    colors: {
      primary: '#22c55e',     // green-500
      secondary: '#14b8a6',   // teal-500
      accent: '#34d399',      // emerald-400
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#0a1f0c',
      backgroundAlt: '#14331a',
      surface: 'rgba(20, 51, 26, 0.7)',
      text: '#f0fdf4',        // green-50
      textMuted: '#86efac',   // green-300
      border: 'rgba(34, 197, 94, 0.1)',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    borderRadius: 'lg',
  },

  // Dark Amber/Orange
  'dark-amber': {
    id: 'dark-amber',
    name: 'Ámbar Oscuro',
    colors: {
      primary: '#f59e0b',     // amber-500
      secondary: '#f97316',   // orange-500
      accent: '#fbbf24',      // amber-400
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#1c1208',
      backgroundAlt: '#2d1f0d',
      surface: 'rgba(45, 31, 13, 0.7)',
      text: '#fffbeb',        // amber-50
      textMuted: '#fcd34d',   // amber-300
      border: 'rgba(245, 158, 11, 0.1)',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    borderRadius: 'lg',
  },

  // Dark Cyan
  'dark-cyan': {
    id: 'dark-cyan',
    name: 'Cian Oscuro',
    colors: {
      primary: '#06b6d4',     // cyan-500
      secondary: '#0ea5e9',   // sky-500
      accent: '#22d3ee',      // cyan-400
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#0a1a1f',
      backgroundAlt: '#0d2832',
      surface: 'rgba(13, 40, 50, 0.7)',
      text: '#ecfeff',        // cyan-50
      textMuted: '#67e8f9',   // cyan-300
      border: 'rgba(6, 182, 212, 0.1)',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    borderRadius: 'lg',
  },

  // Dark Red
  'dark-red': {
    id: 'dark-red',
    name: 'Rojo Oscuro',
    colors: {
      primary: '#ef4444',     // red-500
      secondary: '#f97316',   // orange-500
      accent: '#fb7185',      // rose-400
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#1c0a0a',
      backgroundAlt: '#2d1111',
      surface: 'rgba(45, 17, 17, 0.7)',
      text: '#fef2f2',        // red-50
      textMuted: '#fca5a5',   // red-300
      border: 'rgba(239, 68, 68, 0.1)',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    borderRadius: 'lg',
  },

  // Light (for contrast)
  'light': {
    id: 'light',
    name: 'Claro',
    colors: {
      primary: '#2563eb',     // blue-600
      secondary: '#7c3aed',   // violet-600
      accent: '#0891b2',      // cyan-600
      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
      background: '#ffffff',
      backgroundAlt: '#f8fafc', // slate-50
      surface: 'rgba(248, 250, 252, 0.9)',
      text: '#0f172a',        // slate-900
      textMuted: '#64748b',   // slate-500
      border: 'rgba(148, 163, 184, 0.2)',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    borderRadius: 'lg',
  },

  // Minimal Dark
  'minimal-dark': {
    id: 'minimal-dark',
    name: 'Mínimo Oscuro',
    colors: {
      primary: '#ffffff',
      secondary: '#a1a1aa',   // zinc-400
      accent: '#ffffff',
      success: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      background: '#09090b',  // zinc-950
      backgroundAlt: '#18181b', // zinc-900
      surface: 'rgba(24, 24, 27, 0.7)',
      text: '#fafafa',        // zinc-50
      textMuted: '#71717a',   // zinc-500
      border: 'rgba(113, 113, 122, 0.2)',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    borderRadius: 'md',
  },
};

export const THEME_LIST = Object.values(THEMES);

// ============================================================
// TEMPLATE 1: BUSINESS PITCH (like our current pitch page)
// ============================================================

const businessPitchSlides: Omit<Slide, 'id'>[] = [
  // Slide 1: Title
  {
    type: 'title',
    content: {
      title: 'Título de la Presentación',
      subtitle: 'Subtítulo o eslogan',
      body: 'Fecha o contexto adicional',
    },
    style: {
      ...DEFAULT_SLIDE_STYLE,
      titleSize: '3xl',
      titleGradient: {
        from: 'blue-400',
        via: 'purple-400',
        to: 'cyan-400',
      },
    },
    animation: {
      ...DEFAULT_SLIDE_ANIMATION,
      enter: 'scale',
    },
  },
  // Slide 2: Stats/Opportunity
  {
    type: 'stats',
    content: {
      title: 'La Oportunidad',
      items: [
        { id: '1', label: 'Mercado', value: '$2M+', description: 'Tamaño del mercado' },
        { id: '2', label: 'Usuarios', value: '1,500+', description: 'Usuarios potenciales' },
        { id: '3', label: 'Competencia', value: '0', description: 'Competidores locales' },
      ],
    },
    style: {
      ...DEFAULT_SLIDE_STYLE,
      titleSize: 'xl',
    },
    animation: DEFAULT_SLIDE_ANIMATION,
  },
  // Slide 3: Grid of features
  {
    type: 'grid-3',
    content: {
      title: 'Nuestros Productos',
      items: [
        { id: '1', label: 'Producto 1', value: '$100/mes', description: 'Descripción breve', icon: 'building' },
        { id: '2', label: 'Producto 2', value: '$100/mes', description: 'Descripción breve', icon: 'map' },
        { id: '3', label: 'Producto 3', value: '$100/mes', description: 'Descripción breve', icon: 'droplets' },
      ],
    },
    style: {
      ...DEFAULT_SLIDE_STYLE,
      cardStyle: 'glass',
    },
    animation: DEFAULT_SLIDE_ANIMATION,
  },
  // Slide 4: Team
  {
    type: 'grid-4',
    content: {
      title: 'El Equipo',
      subtitle: 'Las personas detrás del proyecto',
      items: [
        { id: '1', label: 'Nombre 1', value: '70%', description: 'Founder & CEO', icon: 'users' },
        { id: '2', label: 'Nombre 2', value: '10%', description: 'Rol', icon: 'users' },
        { id: '3', label: 'Nombre 3', value: '10%', description: 'Rol', icon: 'users' },
        { id: '4', label: 'Nombre 4', value: '10%', description: 'Rol', icon: 'users' },
      ],
    },
    style: DEFAULT_SLIDE_STYLE,
    animation: DEFAULT_SLIDE_ANIMATION,
  },
  // Slide 5: Comparison
  {
    type: 'comparison',
    content: {
      title: 'Propuesta de Valor',
      items: [
        { id: '1', label: 'Lo que ofrecemos', value: '', description: 'Lista de beneficios' },
        { id: '2', label: 'Lo que pedimos', value: '', description: 'Lista de requerimientos' },
      ],
    },
    style: DEFAULT_SLIDE_STYLE,
    animation: DEFAULT_SLIDE_ANIMATION,
  },
  // Slide 6: Timeline
  {
    type: 'timeline',
    content: {
      title: 'Roadmap',
      items: [
        { id: '1', label: 'Mes 1', value: 'Meta 1', description: '$X' },
        { id: '2', label: 'Mes 2', value: 'Meta 2', description: '$X' },
        { id: '3', label: 'Mes 3', value: 'Meta 3', description: '$X' },
        { id: '4', label: 'Mes 4', value: 'Lanzamiento', description: '$X' },
      ],
    },
    style: DEFAULT_SLIDE_STYLE,
    animation: DEFAULT_SLIDE_ANIMATION,
  },
  // Slide 7: CTA
  {
    type: 'cta',
    content: {
      title: '¿Estás listo?',
      subtitle: 'Llamado a la acción principal',
      body: 'Texto adicional de soporte',
    },
    style: {
      ...DEFAULT_SLIDE_STYLE,
      titleSize: '2xl',
    },
    animation: {
      ...DEFAULT_SLIDE_ANIMATION,
      enter: 'scale',
    },
  },
];

// ============================================================
// TEMPLATE 2: TECHNICAL REPORT (for memorias, EETTs)
// ============================================================

const technicalReportSlides: Omit<Slide, 'id'>[] = [
  // Slide 1: Title page
  {
    type: 'title',
    content: {
      title: 'Informe Técnico',
      subtitle: 'Proyecto: [Nombre del Proyecto]',
      body: 'Fecha: [Fecha] | Versión: 1.0',
    },
    style: {
      ...DEFAULT_SLIDE_STYLE,
      titleSize: '2xl',
      alignment: 'center',
    },
    animation: DEFAULT_SLIDE_ANIMATION,
  },
  // Slide 2: Index/Contents
  {
    type: 'list',
    content: {
      title: 'Contenido',
      items: [
        { id: '1', label: '1.', value: 'Introducción', description: '' },
        { id: '2', label: '2.', value: 'Antecedentes', description: '' },
        { id: '3', label: '3.', value: 'Metodología', description: '' },
        { id: '4', label: '4.', value: 'Resultados', description: '' },
        { id: '5', label: '5.', value: 'Conclusiones', description: '' },
      ],
    },
    style: {
      ...DEFAULT_SLIDE_STYLE,
      alignment: 'left',
    },
    animation: DEFAULT_SLIDE_ANIMATION,
  },
  // Slide 3: Introduction
  {
    type: 'title-subtitle',
    content: {
      title: '1. Introducción',
      body: 'Descripción del contexto y objetivos del proyecto. Este espacio permite explicar el alcance y la importancia del trabajo realizado.',
    },
    style: {
      ...DEFAULT_SLIDE_STYLE,
      alignment: 'left',
      titleSize: 'lg',
    },
    animation: DEFAULT_SLIDE_ANIMATION,
  },
  // Slide 4: Data/Stats
  {
    type: 'stats',
    content: {
      title: '2. Datos del Proyecto',
      items: [
        { id: '1', label: 'Área', value: '1,500 m²', description: 'Superficie total' },
        { id: '2', label: 'Ubicación', value: 'Concepción', description: 'Región del Biobío' },
        { id: '3', label: 'Tipo', value: 'Estructural', description: 'Categoría' },
      ],
    },
    style: DEFAULT_SLIDE_STYLE,
    animation: DEFAULT_SLIDE_ANIMATION,
  },
  // Slide 5: Methodology
  {
    type: 'list',
    content: {
      title: '3. Metodología',
      items: [
        { id: '1', label: '', value: 'Paso 1: Levantamiento de información', description: 'Descripción' },
        { id: '2', label: '', value: 'Paso 2: Análisis de datos', description: 'Descripción' },
        { id: '3', label: '', value: 'Paso 3: Modelamiento', description: 'Descripción' },
        { id: '4', label: '', value: 'Paso 4: Verificación', description: 'Descripción' },
      ],
    },
    style: {
      ...DEFAULT_SLIDE_STYLE,
      alignment: 'left',
    },
    animation: DEFAULT_SLIDE_ANIMATION,
  },
  // Slide 6: Results
  {
    type: 'grid-2',
    content: {
      title: '4. Resultados',
      items: [
        { id: '1', label: 'Resultado 1', value: 'Valor', description: 'Descripción del resultado', icon: 'check-circle' },
        { id: '2', label: 'Resultado 2', value: 'Valor', description: 'Descripción del resultado', icon: 'check-circle' },
      ],
    },
    style: DEFAULT_SLIDE_STYLE,
    animation: DEFAULT_SLIDE_ANIMATION,
  },
  // Slide 7: Conclusions
  {
    type: 'title-subtitle',
    content: {
      title: '5. Conclusiones',
      body: 'Resumen de los principales hallazgos y recomendaciones derivadas del análisis realizado.',
    },
    style: {
      ...DEFAULT_SLIDE_STYLE,
      alignment: 'left',
      titleSize: 'lg',
    },
    animation: DEFAULT_SLIDE_ANIMATION,
  },
  // Slide 8: Thank you
  {
    type: 'cta',
    content: {
      title: 'Gracias',
      subtitle: '¿Preguntas?',
      body: 'Contacto: email@ejemplo.com',
    },
    style: DEFAULT_SLIDE_STYLE,
    animation: DEFAULT_SLIDE_ANIMATION,
  },
];

// ============================================================
// TEMPLATE 3: MINIMAL/CREATIVE
// ============================================================

const minimalCreativeSlides: Omit<Slide, 'id'>[] = [
  // Slide 1: Big statement
  {
    type: 'title',
    content: {
      title: 'Una Gran Idea',
      subtitle: '',
    },
    style: {
      ...DEFAULT_SLIDE_STYLE,
      titleSize: '3xl',
      alignment: 'center',
    },
    animation: {
      ...DEFAULT_SLIDE_ANIMATION,
      enter: 'fade',
      duration: 1,
    },
  },
  // Slide 2: Problem
  {
    type: 'title-subtitle',
    content: {
      title: 'El Problema',
      body: 'Una frase impactante que describe el problema que resuelves.',
    },
    style: {
      ...DEFAULT_SLIDE_STYLE,
      titleSize: '2xl',
    },
    animation: DEFAULT_SLIDE_ANIMATION,
  },
  // Slide 3: Solution
  {
    type: 'title-subtitle',
    content: {
      title: 'La Solución',
      body: 'Tu propuesta de valor en una oración.',
    },
    style: {
      ...DEFAULT_SLIDE_STYLE,
      titleSize: '2xl',
    },
    animation: DEFAULT_SLIDE_ANIMATION,
  },
  // Slide 4: How it works
  {
    type: 'grid-3',
    content: {
      title: 'Cómo Funciona',
      items: [
        { id: '1', label: '01', value: 'Paso Uno', description: 'Descripción', icon: 'none' },
        { id: '2', label: '02', value: 'Paso Dos', description: 'Descripción', icon: 'none' },
        { id: '3', label: '03', value: 'Paso Tres', description: 'Descripción', icon: 'none' },
      ],
    },
    style: {
      ...DEFAULT_SLIDE_STYLE,
      cardStyle: 'outline',
    },
    animation: DEFAULT_SLIDE_ANIMATION,
  },
  // Slide 5: Quote/Testimonial
  {
    type: 'quote',
    content: {
      quote: '"Una cita poderosa que respalda tu mensaje."',
      quoteAuthor: '— Nombre, Cargo',
    },
    style: {
      ...DEFAULT_SLIDE_STYLE,
      titleSize: 'xl',
    },
    animation: DEFAULT_SLIDE_ANIMATION,
  },
  // Slide 6: Final CTA
  {
    type: 'cta',
    content: {
      title: 'Empezar',
      subtitle: 'www.tusitio.com',
    },
    style: {
      ...DEFAULT_SLIDE_STYLE,
      titleSize: '2xl',
    },
    animation: DEFAULT_SLIDE_ANIMATION,
  },
];

// ============================================================
// TEMPLATE DEFINITIONS
// ============================================================

export const TEMPLATES: PresentationTemplate[] = [
  {
    id: 'business-pitch',
    name: 'Pitch de Negocio',
    description: 'Ideal para presentaciones a inversores, socios o clientes. Incluye secciones de equipo, oportunidad, productos y llamado a la acción.',
    category: 'business',
    thumbnail: '/templates/business-pitch.png',
    defaultTheme: THEMES['dark-blue'],
    defaultSlides: businessPitchSlides,
  },
  {
    id: 'technical-report',
    name: 'Informe Técnico',
    description: 'Perfecto para memorias de cálculo, EETTs e informes de proyecto. Estructura formal con secciones de metodología y resultados.',
    category: 'technical',
    thumbnail: '/templates/technical-report.png',
    defaultTheme: THEMES['dark-cyan'],
    defaultSlides: technicalReportSlides,
  },
  {
    id: 'minimal-creative',
    name: 'Mínimo Creativo',
    description: 'Diseño limpio y moderno con énfasis en el contenido. Ideal para presentaciones impactantes con poco texto.',
    category: 'minimal',
    thumbnail: '/templates/minimal-creative.png',
    defaultTheme: THEMES['minimal-dark'],
    defaultSlides: minimalCreativeSlides,
  },
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getTemplateById(id: string): PresentationTemplate | undefined {
  return TEMPLATES.find(t => t.id === id);
}

export function getThemeById(id: string): Theme | undefined {
  return THEMES[id];
}

export function createPresentationFromTemplate(
  template: PresentationTemplate,
  theme?: Theme
): Omit<Presentation, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> {
  const { generateSlideId } = require('@/types/presentation');

  return {
    title: 'Nueva Presentación',
    templateId: template.id,
    theme: theme || template.defaultTheme,
    slides: template.defaultSlides.map(slide => ({
      ...slide,
      id: generateSlideId(),
    })),
    settings: {
      aspectRatio: '16:9',
      autoPlay: false,
      autoPlayInterval: 5,
      showProgress: true,
      showSlideNumbers: true,
      loopPresentation: false,
    },
  };
}
