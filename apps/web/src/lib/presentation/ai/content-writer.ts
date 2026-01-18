// ============================================================
// CONTENT WRITER AGENT
// ============================================================
// Generates actual content for each slide based on structure

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  ContentAnalysisResult,
  ContentSection,
  SlideStructure,
  StructurePlanResult,
  SlideContentRequest,
  GeneratedSlideContent,
  ContentWriterResult,
  AgentResponse,
  AISlideType,
} from './types';
import type { IconName } from '@/types/presentation';

// ============================================================
// SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `Eres un experto copywriter especializado en presentaciones profesionales de alto impacto.

Tu rol es crear contenido efectivo y persuasivo para cada diapositiva.

PRINCIPIOS DE ESCRITURA:
1. Titulares cortos e impactantes (máx 8 palabras)
2. Bullet points concisos (máx 10 palabras cada uno)
3. Estadísticas con contexto y unidades
4. Citas memorables y relevantes
5. CTAs claros y accionables

ICONOS DISPONIBLES (usa estos nombres exactos):
- "chart-bar", "chart-line", "chart-pie": Datos y gráficos
- "users", "user", "user-check": Personas y usuarios
- "target", "crosshair": Objetivos
- "rocket", "zap", "bolt": Velocidad e impacto
- "shield", "lock": Seguridad
- "clock", "timer": Tiempo
- "dollar-sign", "coins": Dinero
- "check", "check-circle": Confirmación
- "star", "award": Excelencia
- "building", "building-2": Empresas
- "lightbulb": Ideas
- "settings", "cog": Configuración
- "globe", "earth": Global
- "trending-up", "arrow-up": Crecimiento
- "heart", "thumbs-up": Positivo

FORMATO POR TIPO DE SLIDE:

Para "title":
{
  "title": "Título Principal Impactante",
  "subtitle": "Subtítulo que complementa"
}

Para "bullets":
{
  "title": "Título de la Sección",
  "items": [
    {"label": "Punto clave", "value": "Descripción breve", "icon": "check"}
  ]
}

Para "stats":
{
  "title": "Métricas que Importan",
  "items": [
    {"label": "Métrica", "value": "42%", "description": "de mejora", "icon": "trending-up"}
  ]
}

Para "features":
{
  "title": "Características",
  "items": [
    {"label": "Feature", "value": "Beneficio principal", "icon": "star"}
  ]
}

Para "quote":
{
  "quote": "La cita textual aquí",
  "quoteAuthor": "Nombre del Autor"
}

Para "cta":
{
  "title": "¿Listo para Comenzar?",
  "subtitle": "El siguiente paso",
  "items": [
    {"label": "Acción 1", "value": "Descripción", "icon": "rocket"}
  ]
}

RESPUESTA JSON:
{
  "slides": [
    {
      "slideIndex": 0,
      "type": "title",
      "content": { ... contenido según tipo ... },
      "speakerNotes": "Notas para el presentador"
    }
  ],
  "reasoning": "Explicación del enfoque de contenido",
  "confidence": 0.85
}`;

// ============================================================
// CONTENT WRITER CLASS
// ============================================================

export class ContentWriterAgent {
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-2.0-flash') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async write(
    contentAnalysis: ContentAnalysisResult,
    structurePlan: StructurePlanResult,
    context?: {
      audience?: string;
      tone?: string;
      language?: string;
    }
  ): Promise<AgentResponse<ContentWriterResult>> {
    const startTime = performance.now();

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: 0.8, // Higher for more creative content
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      });

      // Build the prompt
      const prompt = this.buildPrompt(contentAnalysis, structurePlan, context);

      // Generate content
      const result = await model.generateContent([
        { text: SYSTEM_PROMPT },
        { text: prompt },
      ]);

      const response = result.response;
      const text = response.text();

      // Parse JSON response
      const parsed = JSON.parse(text) as ContentWriterResult;

      // Validate and enhance content
      const validatedResult = this.validateResult(parsed, structurePlan);

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
        error: error instanceof Error ? error.message : 'Unknown error in content writing',
        processingTime,
      };
    }
  }

  private buildPrompt(
    analysis: ContentAnalysisResult,
    structure: StructurePlanResult,
    context?: {
      audience?: string;
      tone?: string;
      language?: string;
    }
  ): string {
    const audience = context?.audience || 'profesional';
    const tone = context?.tone || 'profesional';
    const language = context?.language || 'es';

    let prompt = `CONTEXTO DE LA PRESENTACIÓN:

TÍTULO: ${analysis.title}
SUBTÍTULO: ${analysis.subtitle}
RESUMEN: ${analysis.summary}
TEMAS CLAVE: ${analysis.keyThemes.join(', ')}

AUDIENCIA: ${audience}
TONO: ${tone}
IDIOMA: ${language === 'es' ? 'Español' : 'English'}

SECCIONES DE CONTENIDO:
${analysis.sections.map((s, i) => `
${i + 1}. ${s.title}
   Descripción: ${s.description}
   Puntos clave: ${s.keyPoints.map(p => `- ${p}`).join('\n   ')}
`).join('')}

ESTRUCTURA DE DIAPOSITIVAS A LLENAR:
${structure.slides.map((slide, i) => `
[${i}] Tipo: ${slide.type}
    Sección: ${slide.sectionId}
    Propósito: ${slide.purpose}
    ${slide.contentHints?.title ? `Sugerencia título: ${slide.contentHints.title}` : ''}
    ${slide.contentHints?.itemCount ? `Items sugeridos: ${slide.contentHints.itemCount}` : ''}
`).join('')}

INSTRUCCIONES:
1. Crea contenido para CADA diapositiva listada arriba
2. Respeta el tipo de cada slide
3. Usa los puntos clave de las secciones correspondientes
4. Mantén consistencia en el tono
5. Incluye speaker notes útiles para el presentador
6. Para stats, usa números específicos y realistas
7. Para bullets/features, limita a 3-5 items máximo

Responde ÚNICAMENTE con el JSON estructurado.`;

    return prompt;
  }

  private validateResult(
    result: ContentWriterResult,
    structure: StructurePlanResult
  ): ContentWriterResult {
    const validIcons: IconName[] = [
      'chart-bar', 'chart-line', 'chart-pie', 'users', 'user', 'user-check',
      'target', 'crosshair', 'rocket', 'zap', 'shield', 'lock', 'clock',
      'dollar-sign', 'check', 'check-circle', 'star', 'award', 'building',
      'lightbulb', 'settings', 'globe', 'trending-up', 'heart', 'thumbs-up',
      'arrow-right', 'play', 'pause', 'refresh', 'download', 'upload',
      'mail', 'phone', 'map-pin', 'calendar', 'file', 'folder'
    ];

    // Ensure all slides from structure have content
    const slides = structure.slides.map((structSlide, index) => {
      const contentSlide = result.slides.find(s => s.slideIndex === index);

      if (contentSlide) {
        // Validate and clean content
        return {
          ...contentSlide,
          slideIndex: index,
          type: structSlide.type,
          content: this.validateSlideContent(contentSlide.content, structSlide.type, validIcons),
          speakerNotes: contentSlide.speakerNotes || '',
        };
      } else {
        // Generate fallback content
        return this.generateFallbackContent(structSlide, index);
      }
    });

    return {
      slides,
      reasoning: result.reasoning || 'Contenido generado basado en el análisis',
      confidence: Math.min(1, Math.max(0, result.confidence || 0.7)),
    };
  }

  private validateSlideContent(
    content: GeneratedSlideContent['content'],
    type: AISlideType,
    validIcons: IconName[]
  ): GeneratedSlideContent['content'] {
    const validated = { ...content };

    // Validate items if present
    if (validated.items) {
      validated.items = validated.items.map(item => ({
        ...item,
        icon: item.icon && validIcons.includes(item.icon) ? item.icon : 'check',
      }));

      // Limit items based on type
      const maxItems = type === 'stats' ? 4 : type === 'features' ? 4 : 6;
      if (validated.items.length > maxItems) {
        validated.items = validated.items.slice(0, maxItems);
      }
    }

    // Ensure titles aren't too long
    if (validated.title && validated.title.length > 60) {
      validated.title = validated.title.substring(0, 57) + '...';
    }

    return validated;
  }

  private generateFallbackContent(
    structure: SlideStructure,
    index: number
  ): GeneratedSlideContent {
    const fallbacks: Record<AISlideType, GeneratedSlideContent['content']> = {
      title: {
        title: structure.contentHints?.title || 'Presentación',
        subtitle: 'Subtítulo de la presentación',
      },
      section: {
        title: structure.contentHints?.title || 'Nueva Sección',
      },
      content: {
        title: structure.contentHints?.title || 'Contenido',
        body: 'Contenido de la diapositiva.',
      },
      bullets: {
        title: structure.contentHints?.title || 'Puntos Clave',
        items: [
          { label: 'Punto 1', value: 'Descripción del primer punto', icon: 'check' as IconName },
          { label: 'Punto 2', value: 'Descripción del segundo punto', icon: 'check' as IconName },
          { label: 'Punto 3', value: 'Descripción del tercer punto', icon: 'check' as IconName },
        ],
      },
      stats: {
        title: structure.contentHints?.title || 'Estadísticas',
        items: [
          { label: 'Métrica 1', value: '85%', description: 'descripción', icon: 'trending-up' as IconName },
          { label: 'Métrica 2', value: '10x', description: 'descripción', icon: 'chart-bar' as IconName },
        ],
      },
      comparison: {
        title: structure.contentHints?.title || 'Comparación',
        items: [
          { label: 'Opción A', value: 'Características', icon: 'check' as IconName },
          { label: 'Opción B', value: 'Características', icon: 'check' as IconName },
        ],
      },
      timeline: {
        title: structure.contentHints?.title || 'Línea de Tiempo',
        items: [
          { label: 'Paso 1', value: 'Primera etapa', icon: 'clock' as IconName },
          { label: 'Paso 2', value: 'Segunda etapa', icon: 'clock' as IconName },
          { label: 'Paso 3', value: 'Tercera etapa', icon: 'clock' as IconName },
        ],
      },
      quote: {
        quote: 'Una cita inspiradora o relevante para el contexto.',
        quoteAuthor: 'Autor',
      },
      image: {
        title: structure.contentHints?.title || 'Imagen',
        imageAlt: 'Descripción de la imagen',
      },
      cta: {
        title: '¿Próximos Pasos?',
        subtitle: 'Comienza hoy',
        items: [
          { label: 'Acción 1', value: 'Primera acción a tomar', icon: 'rocket' as IconName },
          { label: 'Acción 2', value: 'Segunda acción a tomar', icon: 'arrow-right' as IconName },
        ],
      },
      team: {
        title: structure.contentHints?.title || 'Nuestro Equipo',
        items: [
          { label: 'Miembro 1', value: 'Rol', icon: 'user' as IconName },
          { label: 'Miembro 2', value: 'Rol', icon: 'user' as IconName },
        ],
      },
      features: {
        title: structure.contentHints?.title || 'Características',
        items: [
          { label: 'Feature 1', value: 'Beneficio clave', icon: 'star' as IconName },
          { label: 'Feature 2', value: 'Beneficio clave', icon: 'star' as IconName },
          { label: 'Feature 3', value: 'Beneficio clave', icon: 'star' as IconName },
        ],
      },
    };

    return {
      slideIndex: index,
      type: structure.type,
      content: fallbacks[structure.type] || fallbacks.content,
      speakerNotes: `Notas para ${structure.purpose}`,
    };
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

export function createContentWriter(
  apiKey: string,
  model?: string
): ContentWriterAgent {
  return new ContentWriterAgent(apiKey, model);
}
