// ============================================================
// PRESENTATION ORCHESTRATOR
// ============================================================
// Coordinates all AI agents to generate complete presentations

import { ContentAnalyzerAgent } from './content-analyzer';
import { StructurePlannerAgent } from './structure-planner';
import { ContentWriterAgent } from './content-writer';
import { StyleAdvisorAgent } from './style-advisor';
import type {
  PresentationGenerationRequest,
  PresentationGenerationProgress,
  PresentationGenerationResult,
  ContentAnalysisResult,
  StructurePlanResult,
  ContentWriterResult,
  StyleRecommendation,
  AISlideType,
} from './types';
import type { Slide, SlideType, Theme } from '@/types/presentation';
import { THEMES } from '../templates';
import {
  generateSlideId,
  generateItemId,
  DEFAULT_SLIDE_STYLE,
  DEFAULT_SLIDE_ANIMATION,
} from '@/types/presentation';

// ============================================================
// ORCHESTRATOR CLASS
// ============================================================

export class PresentationOrchestrator {
  private apiKey: string;
  private model: string;
  private onProgress?: (progress: PresentationGenerationProgress) => void;

  // Agents
  private contentAnalyzer: ContentAnalyzerAgent;
  private structurePlanner: StructurePlannerAgent;
  private contentWriter: ContentWriterAgent;
  private styleAdvisor: StyleAdvisorAgent;

  constructor(
    apiKey: string,
    options?: {
      model?: string;
      onProgress?: (progress: PresentationGenerationProgress) => void;
    }
  ) {
    this.apiKey = apiKey;
    this.model = options?.model || 'gemini-2.0-flash';
    this.onProgress = options?.onProgress;

    // Initialize agents
    this.contentAnalyzer = new ContentAnalyzerAgent(apiKey, this.model);
    this.structurePlanner = new StructurePlannerAgent(apiKey, this.model);
    this.contentWriter = new ContentWriterAgent(apiKey, this.model);
    this.styleAdvisor = new StyleAdvisorAgent(apiKey, this.model);
  }

  async generate(
    request: PresentationGenerationRequest
  ): Promise<PresentationGenerationResult> {
    const startTime = performance.now();
    let totalTokens = 0;

    try {
      // ============================================================
      // STAGE 1: CONTENT ANALYSIS
      // ============================================================
      this.emitProgress({
        stage: 'analyzing',
        progress: 10,
        message: 'Analizando contenido...',
        details: 'Identificando temas y estructura',
      });

      const analysisResult = await this.contentAnalyzer.analyze({
        topic: request.prompt,
        audience: request.options?.audience || 'general',
        tone: request.options?.tone || 'professional',
        language: request.options?.language || 'es',
      });

      if (!analysisResult.success || !analysisResult.data) {
        throw new Error(`Error en análisis: ${analysisResult.error}`);
      }

      totalTokens += analysisResult.tokensUsed || 0;
      const analysis = analysisResult.data;

      // ============================================================
      // STAGE 2: STRUCTURE PLANNING
      // ============================================================
      this.emitProgress({
        stage: 'planning',
        progress: 30,
        message: 'Planificando estructura...',
        details: `${analysis.sections.length} secciones identificadas`,
      });

      const structureResult = await this.structurePlanner.plan(analysis, {
        minSlides: request.options?.minSlides || 6,
        maxSlides: request.options?.maxSlides || 15,
      });

      if (!structureResult.success || !structureResult.data) {
        throw new Error(`Error en planificación: ${structureResult.error}`);
      }

      totalTokens += structureResult.tokensUsed || 0;
      const structure = structureResult.data;

      // ============================================================
      // STAGE 3: CONTENT WRITING
      // ============================================================
      this.emitProgress({
        stage: 'writing',
        progress: 50,
        message: 'Generando contenido...',
        details: `Escribiendo ${structure.totalSlides} diapositivas`,
      });

      const contentResult = await this.contentWriter.write(analysis, structure, {
        audience: request.options?.audience,
        tone: request.options?.tone,
        language: request.options?.language,
      });

      if (!contentResult.success || !contentResult.data) {
        throw new Error(`Error en generación de contenido: ${contentResult.error}`);
      }

      totalTokens += contentResult.tokensUsed || 0;
      const content = contentResult.data;

      // ============================================================
      // STAGE 4: STYLE ANALYSIS
      // ============================================================
      this.emitProgress({
        stage: 'styling',
        progress: 70,
        message: 'Seleccionando estilo visual...',
        details: 'Analizando mejor tema',
      });

      const styleResult = await this.styleAdvisor.advise({
        content: analysis,
        slides: content.slides,
        preferences: {
          industryType: this.inferIndustry(analysis),
        },
      });

      if (!styleResult.success || !styleResult.data) {
        throw new Error(`Error en análisis de estilo: ${styleResult.error}`);
      }

      totalTokens += styleResult.tokensUsed || 0;
      const styleRec = styleResult.data;

      // ============================================================
      // STAGE 5: BUILD PRESENTATION
      // ============================================================
      this.emitProgress({
        stage: 'building',
        progress: 85,
        message: 'Construyendo presentación...',
        details: 'Aplicando estilos y animaciones',
      });

      const presentation = this.buildPresentation(
        analysis,
        structure,
        content,
        styleRec,
        request.options?.themePreference
      );

      // ============================================================
      // COMPLETE
      // ============================================================
      const processingTime = performance.now() - startTime;

      this.emitProgress({
        stage: 'complete',
        progress: 100,
        message: 'Presentación generada',
        details: `${presentation.slides.length} diapositivas en ${(processingTime / 1000).toFixed(1)}s`,
      });

      return {
        success: true,
        presentation,
        analysis,
        structure,
        styleRecommendation: styleRec,
        processingTime,
        tokensUsed: totalTokens,
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;

      this.emitProgress({
        stage: 'error',
        progress: 0,
        message: 'Error en generación',
        details: error instanceof Error ? error.message : 'Error desconocido',
      });

      return {
        success: false,
        processingTime,
        tokensUsed: totalTokens,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private emitProgress(progress: PresentationGenerationProgress) {
    if (this.onProgress) {
      this.onProgress(progress);
    }
  }

  private inferIndustry(
    analysis: ContentAnalysisResult
  ): 'engineering' | 'business' | 'creative' | 'education' {
    const text = `${analysis.title} ${analysis.summary} ${analysis.keyThemes.join(' ')}`.toLowerCase();

    if (
      text.includes('ingenier') ||
      text.includes('estructur') ||
      text.includes('construcción') ||
      text.includes('hidráulic') ||
      text.includes('paviment') ||
      text.includes('técnic')
    ) {
      return 'engineering';
    }

    if (
      text.includes('negocio') ||
      text.includes('empresa') ||
      text.includes('venta') ||
      text.includes('marketing') ||
      text.includes('finanz') ||
      text.includes('inversión')
    ) {
      return 'business';
    }

    if (
      text.includes('diseño') ||
      text.includes('creativ') ||
      text.includes('arte') ||
      text.includes('marca') ||
      text.includes('visual')
    ) {
      return 'creative';
    }

    return 'education';
  }

  private buildPresentation(
    analysis: ContentAnalysisResult,
    structure: StructurePlanResult,
    content: ContentWriterResult,
    styleRec: StyleRecommendation,
    themePreference?: string
  ): PresentationGenerationResult['presentation'] {
    // Get theme
    const themeId = themePreference || styleRec.themeId;
    const theme = THEMES[themeId] || THEMES['dark-blue'];

    // Build slides
    const slides: Slide[] = content.slides.map((slideContent, index) => {
      const structureSlide = structure.slides[index];
      const styleOverride = styleRec.slideStyleOverrides.find(
        o => o.slideIndex === index
      );

      // Map AI slide types to presentation types
      const slideType = this.mapSlideType(slideContent.type);

      // Build slide style
      const style = {
        ...DEFAULT_SLIDE_STYLE,
        titleColor: `text-[${theme.colors.text}]`,
        subtitleColor: `text-[${theme.colors.textMuted}]`,
        bodyColor: `text-[${theme.colors.textMuted}]`,
        cardStyle: 'glass' as const,
        ...(styleOverride?.emphasis === 'high' && {
          titleSize: 'xl' as const,
          ...(styleOverride.backgroundType === 'gradient' &&
            styleOverride.suggestedGradient && {
              backgroundType: 'gradient' as const,
              backgroundGradient: {
                from: styleOverride.suggestedGradient.from,
                to: styleOverride.suggestedGradient.to,
                direction: (styleOverride.suggestedGradient.direction || 'to-br') as 'to-br',
              },
            }),
        }),
      };

      // Build slide content
      const slideContentData = {
        title: slideContent.content.title,
        subtitle: slideContent.content.subtitle,
        body: slideContent.content.body,
        quote: slideContent.content.quote,
        quoteAuthor: slideContent.content.quoteAuthor,
        items: slideContent.content.items?.map(item => ({
          id: generateItemId(),
          label: item.label,
          value: item.value,
          description: item.description,
          icon: item.icon,
        })),
        imageUrl: slideContent.content.imageUrl,
      };

      return {
        id: generateSlideId(),
        type: slideType,
        content: slideContentData,
        style,
        animation: {
          ...DEFAULT_SLIDE_ANIMATION,
          enter: index === 0 ? 'scale' : 'fade',
        },
        notes: slideContent.speakerNotes,
      };
    });

    return {
      title: analysis.title,
      description: analysis.summary,
      themeId,
      slides,
    };
  }

  private mapSlideType(aiType: AISlideType): SlideType {
    // Map AI generated types to available presentation types
    const typeMap: Record<AISlideType, SlideType> = {
      title: 'title',
      section: 'title-subtitle',
      content: 'title-subtitle',
      bullets: 'list',
      stats: 'stats',
      comparison: 'comparison',
      timeline: 'timeline',
      quote: 'quote',
      image: 'image-text',
      cta: 'cta',
      team: 'grid-4',
      features: 'grid-3',
    };

    return typeMap[aiType] || 'title-subtitle';
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

export function createPresentationOrchestrator(
  apiKey: string,
  options?: {
    model?: string;
    onProgress?: (progress: PresentationGenerationProgress) => void;
  }
): PresentationOrchestrator {
  return new PresentationOrchestrator(apiKey, options);
}
