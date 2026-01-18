// ============================================================
// PRESENTATION TYPES & SCHEMA
// ============================================================
// Data-driven presentation system for LeDesign

export type SlideType =
  | 'title'
  | 'title-subtitle'
  | 'stats'
  | 'grid-2'
  | 'grid-3'
  | 'grid-4'
  | 'comparison'
  | 'list'
  | 'image-text'
  | 'quote'
  | 'timeline'
  | 'cta';

export type AnimationType =
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'scale'
  | 'none';

export type LayoutAlignment = 'left' | 'center' | 'right';

export type IconName =
  | 'building' | 'droplets' | 'map' | 'road' | 'mountain'
  | 'users' | 'target' | 'trending-up' | 'dollar-sign' | 'check-circle'
  | 'crown' | 'handshake' | 'calendar' | 'rocket' | 'shield'
  | 'star' | 'heart' | 'zap' | 'globe' | 'code'
  | 'none';

// ============================================================
// SLIDE CONTENT TYPES
// ============================================================

export interface SlideContentItem {
  id: string;
  label: string;
  value: string;
  description?: string;
  icon?: IconName;
  color?: string; // Tailwind color class or hex
}

export interface SlideContent {
  title?: string;
  subtitle?: string;
  body?: string;
  items?: SlideContentItem[];
  imageUrl?: string;
  quote?: string;
  quoteAuthor?: string;
}

// ============================================================
// SLIDE STYLE
// ============================================================

export interface SlideStyle {
  // Background
  backgroundType: 'solid' | 'gradient' | 'image';
  backgroundColor?: string;
  backgroundGradient?: {
    from: string;
    via?: string;
    to: string;
    direction: 'to-r' | 'to-l' | 'to-t' | 'to-b' | 'to-br' | 'to-bl' | 'to-tr' | 'to-tl';
  };
  backgroundImage?: string;
  backgroundOverlay?: string; // Color with opacity for image backgrounds

  // Typography
  titleSize: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  titleColor: string;
  titleGradient?: {
    from: string;
    via?: string;
    to: string;
  };
  subtitleColor: string;
  bodyColor: string;

  // Layout
  alignment: LayoutAlignment;
  padding: 'sm' | 'md' | 'lg' | 'xl';
  maxWidth: 'sm' | 'md' | 'lg' | 'xl' | 'full';

  // Cards/Items
  cardStyle: 'glass' | 'solid' | 'outline' | 'none';
  cardBorderColor?: string;
  cardBackground?: string;
}

// ============================================================
// SLIDE ANIMATION
// ============================================================

export interface SlideAnimation {
  enter: AnimationType;
  exit: AnimationType;
  duration: number; // seconds
  stagger: number; // delay between child elements in seconds
  delay: number; // initial delay in seconds
}

// ============================================================
// SLIDE
// ============================================================

export interface Slide {
  id: string;
  type: SlideType;
  content: SlideContent;
  style: SlideStyle;
  animation: SlideAnimation;
  notes?: string; // Speaker notes
  duration?: number; // Auto-advance duration in seconds (for auto-play)
}

// ============================================================
// THEME
// ============================================================

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  background: string;
  backgroundAlt: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  fonts: {
    heading: string;
    body: string;
  };
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

// ============================================================
// PRESENTATION
// ============================================================

export interface Presentation {
  id: string;
  title: string;
  description?: string;
  projectId?: string; // Link to project for context
  templateId: string;
  theme: Theme;
  slides: Slide[];
  settings: {
    aspectRatio: '16:9' | '4:3' | '1:1';
    autoPlay: boolean;
    autoPlayInterval: number; // seconds
    showProgress: boolean;
    showSlideNumbers: boolean;
    loopPresentation: boolean;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================
// TEMPLATE
// ============================================================

export interface PresentationTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  category: 'business' | 'technical' | 'creative' | 'minimal';
  defaultTheme: Theme;
  defaultSlides: Omit<Slide, 'id'>[]; // Slides without IDs (generated on use)
}

// ============================================================
// EDITOR STATE
// ============================================================

export interface EditorState {
  mode: 'edit' | 'preview' | 'present';
  selectedSlideIndex: number;
  selectedElementId: string | null;
  zoom: number;
  showGrid: boolean;
  showNotes: boolean;
  history: {
    past: Presentation[];
    future: Presentation[];
  };
}

// ============================================================
// EXPORT OPTIONS
// ============================================================

export interface ExportOptions {
  format: 'pdf' | 'pptx' | 'png' | 'json';
  quality: 'draft' | 'standard' | 'high';
  includeNotes: boolean;
  slideRange?: {
    from: number;
    to: number;
  };
}

// ============================================================
// DEFAULT VALUES
// ============================================================

export const DEFAULT_SLIDE_STYLE: SlideStyle = {
  backgroundType: 'solid',
  backgroundColor: 'transparent',
  titleSize: 'xl',
  titleColor: 'text-white',
  subtitleColor: 'text-slate-300',
  bodyColor: 'text-slate-400',
  alignment: 'center',
  padding: 'lg',
  maxWidth: 'xl',
  cardStyle: 'glass',
  cardBorderColor: 'border-white/10',
};

export const DEFAULT_SLIDE_ANIMATION: SlideAnimation = {
  enter: 'fade',
  exit: 'fade',
  duration: 0.6,
  stagger: 0.1,
  delay: 0,
};

export const DEFAULT_PRESENTATION_SETTINGS: Presentation['settings'] = {
  aspectRatio: '16:9',
  autoPlay: false,
  autoPlayInterval: 5,
  showProgress: true,
  showSlideNumbers: true,
  loopPresentation: false,
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

export function generateSlideId(): string {
  return `slide_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateItemId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generatePresentationId(): string {
  return `pres_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
