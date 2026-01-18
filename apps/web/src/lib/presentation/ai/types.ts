// ============================================================
// AI PRESENTATION GENERATOR - TYPES
// ============================================================
// Types for multi-agent presentation generation system

import type { SlideType, IconName, Theme, Slide } from '@/types/presentation';

// ============================================================
// AI SLIDE TYPES (internal, mapped to SlideType in orchestrator)
// ============================================================

export type AISlideType =
  | 'title'
  | 'section'
  | 'content'
  | 'bullets'
  | 'stats'
  | 'comparison'
  | 'timeline'
  | 'quote'
  | 'image'
  | 'cta'
  | 'team'
  | 'features';

// ============================================================
// CONTENT ANALYZER TYPES
// ============================================================

export interface ContentAnalysisRequest {
  topic: string;
  context?: string;
  audience?: 'technical' | 'business' | 'general' | 'academic';
  tone?: 'formal' | 'casual' | 'inspiring' | 'professional';
  language?: 'es' | 'en';
  additionalInstructions?: string;
}

export interface ContentSection {
  id: string;
  title: string;
  description: string;
  keyPoints: string[];
  importance: 'high' | 'medium' | 'low';
  suggestedSlideCount: number;
}

export interface ContentAnalysisResult {
  title: string;
  subtitle: string;
  summary: string;
  sections: ContentSection[];
  totalSuggestedSlides: number;
  keyThemes: string[];
  reasoning: string;
  confidence: number;
}

// ============================================================
// STRUCTURE PLANNER TYPES
// ============================================================

export interface SlideStructure {
  sectionId: string;
  slideIndex: number;
  type: AISlideType;
  purpose: string;
  contentHints: {
    title?: string;
    hasItems?: boolean;
    itemCount?: number;
    hasImage?: boolean;
    hasQuote?: boolean;
  };
}

export interface StructurePlanResult {
  slides: SlideStructure[];
  totalSlides: number;
  sectionBreakdown: Array<{
    sectionId: string;
    sectionTitle: string;
    slideCount: number;
    slideTypes: AISlideType[];
  }>;
  reasoning: string;
  confidence: number;
}

// ============================================================
// CONTENT WRITER TYPES
// ============================================================

export interface SlideContentRequest {
  structure: SlideStructure;
  section: ContentSection;
  presentationContext: {
    title: string;
    audience: string;
    tone: string;
    previousSlides?: Array<{ title: string; type: AISlideType }>;
  };
}

export interface GeneratedSlideContent {
  slideIndex: number;
  type: AISlideType;
  content: {
    title?: string;
    subtitle?: string;
    body?: string;
    quote?: string;
    quoteAuthor?: string;
    items?: Array<{
      label: string;
      value: string;
      description?: string;
      icon?: IconName;
    }>;
    imageUrl?: string;
    imageAlt?: string;
  };
  speakerNotes?: string;
}

export interface ContentWriterResult {
  slides: GeneratedSlideContent[];
  reasoning: string;
  confidence: number;
}

// ============================================================
// STYLE ADVISOR TYPES
// ============================================================

export interface StyleAnalysisRequest {
  content: ContentAnalysisResult;
  slides: GeneratedSlideContent[];
  preferences?: {
    colorPreference?: 'dark' | 'light' | 'colorful' | 'minimal';
    industryType?: 'engineering' | 'business' | 'creative' | 'education';
  };
}

export interface StyleRecommendation {
  themeId: string;
  themeName: string;
  reasoning: string;
  slideStyleOverrides: Array<{
    slideIndex: number;
    backgroundType?: 'solid' | 'gradient';
    emphasis?: 'high' | 'normal' | 'low';
    suggestedGradient?: {
      from: string;
      to: string;
      direction: string;
    };
  }>;
  confidence: number;
}

// ============================================================
// ORCHESTRATOR TYPES
// ============================================================

export interface PresentationGenerationRequest {
  prompt: string;
  options?: {
    audience?: 'technical' | 'business' | 'general' | 'academic';
    tone?: 'formal' | 'casual' | 'inspiring' | 'professional';
    language?: 'es' | 'en';
    maxSlides?: number;
    minSlides?: number;
    themePreference?: string;
    includeResearch?: boolean;
  };
}

export interface PresentationGenerationProgress {
  stage: 'analyzing' | 'planning' | 'writing' | 'styling' | 'building' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  details?: string;
}

export interface PresentationGenerationResult {
  success: boolean;
  presentation?: {
    title: string;
    description: string;
    themeId: string;
    slides: Slide[];
  };
  analysis?: ContentAnalysisResult;
  structure?: StructurePlanResult;
  styleRecommendation?: StyleRecommendation;
  processingTime: number;
  tokensUsed?: number;
  error?: string;
}

// ============================================================
// AGENT CONFIGURATION
// ============================================================

export interface AgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  model: 'gemini-2.0-flash',
  temperature: 0.7,
  maxTokens: 8192,
  systemPrompt: '',
};

// ============================================================
// UTILITY TYPES
// ============================================================

export interface AgentResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  processingTime: number;
  tokensUsed?: number;
}
