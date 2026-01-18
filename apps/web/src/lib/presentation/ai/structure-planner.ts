// ============================================================
// STRUCTURE PLANNER AGENT
// ============================================================
// Plans slide structure based on content analysis

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  ContentAnalysisResult,
  ContentSection,
  SlideStructure,
  StructurePlanResult,
  AgentResponse,
  AISlideType,
} from './types';

// ============================================================
// SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `Eres un experto en diseño de presentaciones y arquitectura de información visual.

Tu rol es tomar un análisis de contenido y planificar la estructura exacta de diapositivas.

TIPOS DE DIAPOSITIVAS DISPONIBLES:
- "title": Diapositiva de título principal (solo inicio)
- "section": Separador de sección
- "content": Contenido con texto/párrafos
- "bullets": Lista con viñetas (3-6 puntos)
- "stats": Estadísticas o métricas (2-4 números)
- "comparison": Comparación lado a lado
- "timeline": Línea de tiempo o proceso
- "quote": Cita destacada
- "image": Imagen con texto mínimo
- "cta": Llamada a la acción (solo final)
- "team": Presentación de equipo
- "features": Características o beneficios (3-4 items)

REGLAS DE ESTRUCTURA:
1. SIEMPRE comenzar con una diapositiva "title"
2. SIEMPRE terminar con una diapositiva "cta"
3. Usar "section" para separar secciones principales
4. Variar tipos de slides para mantener interés visual
5. No más de 2 slides del mismo tipo consecutivas
6. "stats" y "features" son muy efectivas para datos
7. "quote" para testimonios o frases impactantes
8. Máximo 15-20 slides para mantener atención

FORMATO DE RESPUESTA (JSON):
{
  "slides": [
    {
      "sectionId": "intro",
      "slideIndex": 0,
      "type": "title",
      "purpose": "Presentar el tema principal",
      "contentHints": {
        "title": "Sugerencia de título",
        "hasItems": false,
        "hasImage": true
      }
    }
  ],
  "totalSlides": 12,
  "sectionBreakdown": [
    {
      "sectionId": "section_1",
      "sectionTitle": "Nombre",
      "slideCount": 3,
      "slideTypes": ["section", "bullets", "stats"]
    }
  ],
  "reasoning": "Explicación de la estructura elegida",
  "confidence": 0.85
}`;

// ============================================================
// STRUCTURE PLANNER CLASS
// ============================================================

export class StructurePlannerAgent {
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-2.0-flash') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async plan(
    contentAnalysis: ContentAnalysisResult,
    constraints?: {
      minSlides?: number;
      maxSlides?: number;
      preferredTypes?: AISlideType[];
    }
  ): Promise<AgentResponse<StructurePlanResult>> {
    const startTime = performance.now();

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      });

      // Build the prompt
      const prompt = this.buildPrompt(contentAnalysis, constraints);

      // Generate content
      const result = await model.generateContent([
        { text: SYSTEM_PROMPT },
        { text: prompt },
      ]);

      const response = result.response;
      const text = response.text();

      // Parse JSON response
      const parsed = JSON.parse(text) as StructurePlanResult;

      // Validate and enhance structure
      const validatedResult = this.validateResult(parsed, contentAnalysis);

      const processingTime = performance.now() - startTime;

      return {
        success: true,
        data: validatedResult,
        processingTime,
        tokensUsed: response.usageMetadata?.totalTokenCount,
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in structure planning',
        processingTime,
      };
    }
  }

  private buildPrompt(
    analysis: ContentAnalysisResult,
    constraints?: {
      minSlides?: number;
      maxSlides?: number;
      preferredTypes?: AISlideType[];
    }
  ): string {
    let prompt = `ANÁLISIS DE CONTENIDO:

TÍTULO: ${analysis.title}
SUBTÍTULO: ${analysis.subtitle}
RESUMEN: ${analysis.summary}

SECCIONES:
${analysis.sections.map((s, i) => `
${i + 1}. ${s.title} (${s.id})
   - Descripción: ${s.description}
   - Puntos clave: ${s.keyPoints.join(', ')}
   - Importancia: ${s.importance}
   - Slides sugeridas: ${s.suggestedSlideCount}
`).join('')}

TEMAS CLAVE: ${analysis.keyThemes.join(', ')}
TOTAL SLIDES SUGERIDAS: ${analysis.totalSuggestedSlides}`;

    if (constraints) {
      prompt += `\n\nRESTRICCIONES:`;
      if (constraints.minSlides) {
        prompt += `\n- Mínimo ${constraints.minSlides} diapositivas`;
      }
      if (constraints.maxSlides) {
        prompt += `\n- Máximo ${constraints.maxSlides} diapositivas`;
      }
      if (constraints.preferredTypes?.length) {
        prompt += `\n- Tipos preferidos: ${constraints.preferredTypes.join(', ')}`;
      }
    }

    prompt += `\n\nPlanifica la estructura exacta de diapositivas para esta presentación.
Asegúrate de:
1. Comenzar con slide "title" y terminar con "cta"
2. Variar los tipos de slides
3. Asignar cada slide a su sección correspondiente
4. Dar hints de contenido para cada slide

Responde ÚNICAMENTE con el JSON estructurado.`;

    return prompt;
  }

  private validateResult(
    result: StructurePlanResult,
    analysis: ContentAnalysisResult
  ): StructurePlanResult {
    const validTypes: AISlideType[] = [
      'title', 'section', 'content', 'bullets', 'stats',
      'comparison', 'timeline', 'quote', 'image', 'cta',
      'team', 'features'
    ];

    // Ensure slides have valid types and indices
    let slides = result.slides.map((slide, index) => ({
      ...slide,
      slideIndex: index,
      type: validTypes.includes(slide.type) ? slide.type : 'content',
      contentHints: slide.contentHints || {},
    }));

    // Ensure first slide is title
    if (slides.length === 0 || slides[0].type !== 'title') {
      slides.unshift({
        sectionId: 'intro',
        slideIndex: 0,
        type: 'title',
        purpose: 'Presentar el tema principal',
        contentHints: {
          title: analysis.title,
          hasImage: false,
        },
      });
    }

    // Ensure last slide is CTA
    if (slides[slides.length - 1]?.type !== 'cta') {
      slides.push({
        sectionId: 'closing',
        slideIndex: slides.length,
        type: 'cta',
        purpose: 'Llamada a la acción final',
        contentHints: {
          title: '¿Próximos pasos?',
          hasItems: true,
          itemCount: 3,
        },
      });
    }

    // Re-index slides
    slides = slides.map((slide, index) => ({
      ...slide,
      slideIndex: index,
    }));

    // Build section breakdown
    const sectionBreakdown = this.buildSectionBreakdown(slides, analysis.sections);

    return {
      slides,
      totalSlides: slides.length,
      sectionBreakdown,
      reasoning: result.reasoning || 'Estructura optimizada para el contenido',
      confidence: Math.min(1, Math.max(0, result.confidence || 0.75)),
    };
  }

  private buildSectionBreakdown(
    slides: SlideStructure[],
    sections: ContentSection[]
  ): StructurePlanResult['sectionBreakdown'] {
    const sectionMap = new Map<string, { slides: SlideStructure[]; title: string }>();

    // Initialize with analysis sections
    sections.forEach(section => {
      sectionMap.set(section.id, { slides: [], title: section.title });
    });

    // Add intro and closing
    sectionMap.set('intro', { slides: [], title: 'Introducción' });
    sectionMap.set('closing', { slides: [], title: 'Cierre' });

    // Group slides by section
    slides.forEach(slide => {
      const section = sectionMap.get(slide.sectionId);
      if (section) {
        section.slides.push(slide);
      } else {
        // Create section if doesn't exist
        sectionMap.set(slide.sectionId, {
          slides: [slide],
          title: slide.sectionId,
        });
      }
    });

    // Convert to array format
    return Array.from(sectionMap.entries())
      .filter(([, data]) => data.slides.length > 0)
      .map(([sectionId, data]) => ({
        sectionId,
        sectionTitle: data.title,
        slideCount: data.slides.length,
        slideTypes: data.slides.map(s => s.type),
      }));
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

export function createStructurePlanner(
  apiKey: string,
  model?: string
): StructurePlannerAgent {
  return new StructurePlannerAgent(apiKey, model);
}
