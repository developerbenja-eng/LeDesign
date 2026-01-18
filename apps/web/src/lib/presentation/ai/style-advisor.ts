// ============================================================
// STYLE ADVISOR AGENT
// ============================================================
// Recommends themes and style overrides for the presentation

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  ContentAnalysisResult,
  GeneratedSlideContent,
  StyleAnalysisRequest,
  StyleRecommendation,
  AgentResponse,
} from './types';

// ============================================================
// AVAILABLE THEMES (must match templates.ts)
// ============================================================

const AVAILABLE_THEMES = [
  {
    id: 'dark-blue',
    name: 'Azul Oscuro',
    description: 'Profesional y tecnológico. Ideal para software, ingeniería, fintech.',
    primaryColor: '#3b82f6',
    mood: 'professional, tech, trustworthy',
  },
  {
    id: 'dark-purple',
    name: 'Púrpura Oscuro',
    description: 'Creativo y moderno. Ideal para startups, diseño, innovación.',
    primaryColor: '#a855f7',
    mood: 'creative, innovative, bold',
  },
  {
    id: 'dark-green',
    name: 'Verde Oscuro',
    description: 'Natural y sustentable. Ideal para medio ambiente, salud, agricultura.',
    primaryColor: '#22c55e',
    mood: 'natural, sustainable, growth',
  },
  {
    id: 'dark-amber',
    name: 'Ámbar Oscuro',
    description: 'Cálido y energético. Ideal para construcción, energía, emprendimiento.',
    primaryColor: '#f59e0b',
    mood: 'warm, energetic, passionate',
  },
  {
    id: 'dark-cyan',
    name: 'Cian Oscuro',
    description: 'Fresco y técnico. Ideal para agua, tecnología, ciencias.',
    primaryColor: '#06b6d4',
    mood: 'fresh, technical, scientific',
  },
  {
    id: 'dark-red',
    name: 'Rojo Oscuro',
    description: 'Impactante y urgente. Ideal para marketing, ventas, call-to-action.',
    primaryColor: '#ef4444',
    mood: 'impactful, urgent, powerful',
  },
  {
    id: 'light',
    name: 'Claro',
    description: 'Limpio y accesible. Ideal para educación, documentos formales.',
    primaryColor: '#2563eb',
    mood: 'clean, accessible, formal',
  },
  {
    id: 'minimal-dark',
    name: 'Mínimo Oscuro',
    description: 'Elegante y sofisticado. Ideal para diseño, arquitectura, lujo.',
    primaryColor: '#ffffff',
    mood: 'elegant, sophisticated, minimal',
  },
];

// ============================================================
// SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `Eres un experto en diseño visual y comunicación de presentaciones.

Tu rol es analizar el contenido de una presentación y recomendar el tema visual más apropiado.

TEMAS DISPONIBLES:
${AVAILABLE_THEMES.map(t => `- ${t.id}: ${t.name} - ${t.description} (${t.mood})`).join('\n')}

CONSIDERACIONES PARA ELEGIR TEMA:
1. Industria/sector del contenido
2. Tono del mensaje (formal, casual, técnico)
3. Audiencia objetivo
4. Impacto emocional deseado
5. Preferencias del usuario si las hay

SLIDES QUE PUEDEN NECESITAR ÉNFASIS:
- Título principal (emphasis: 'high')
- Estadísticas importantes
- Citas impactantes
- CTA final

FORMATO DE RESPUESTA (JSON):
{
  "themeId": "dark-blue",
  "themeName": "Azul Oscuro",
  "reasoning": "Explicación de por qué este tema es ideal para el contenido",
  "slideStyleOverrides": [
    {
      "slideIndex": 0,
      "emphasis": "high",
      "backgroundType": "gradient",
      "suggestedGradient": {
        "from": "#3b82f6",
        "to": "#8b5cf6",
        "direction": "to-br"
      }
    },
    {
      "slideIndex": 5,
      "emphasis": "high"
    }
  ],
  "confidence": 0.85
}

NOTAS:
- slideStyleOverrides es opcional, solo si ciertas slides necesitan tratamiento especial
- emphasis: 'high' para slides importantes, 'normal' por defecto, 'low' para transiciones
- Gradients solo para slides de alto impacto (title, cta, quotes importantes)`;

// ============================================================
// STYLE ADVISOR CLASS
// ============================================================

export class StyleAdvisorAgent {
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-2.0-flash') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async advise(
    request: StyleAnalysisRequest
  ): Promise<AgentResponse<StyleRecommendation>> {
    const startTime = performance.now();

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: 0.5, // Lower for more consistent recommendations
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      });

      // Build the prompt
      const prompt = this.buildPrompt(request);

      // Generate content
      const result = await model.generateContent([
        { text: SYSTEM_PROMPT },
        { text: prompt },
      ]);

      const response = result.response;
      const text = response.text();

      // Parse JSON response
      const parsed = JSON.parse(text) as StyleRecommendation;

      // Validate recommendation
      const validatedResult = this.validateResult(parsed, request.slides.length);

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
        error: error instanceof Error ? error.message : 'Unknown error in style analysis',
        processingTime,
      };
    }
  }

  private buildPrompt(request: StyleAnalysisRequest): string {
    const { content, slides, preferences } = request;

    let prompt = `ANÁLISIS DE CONTENIDO:

TÍTULO: ${content.title}
SUBTÍTULO: ${content.subtitle}
RESUMEN: ${content.summary}
TEMAS CLAVE: ${content.keyThemes.join(', ')}

SECCIONES:
${content.sections.map(s => `- ${s.title}: ${s.description}`).join('\n')}

ESTRUCTURA DE SLIDES (${slides.length} total):
${slides.map((slide, i) => `[${i}] ${slide.type}: ${slide.content.title || 'Sin título'}`).join('\n')}`;

    if (preferences) {
      prompt += `\n\nPREFERENCIAS DEL USUARIO:`;
      if (preferences.colorPreference) {
        prompt += `\n- Preferencia de color: ${preferences.colorPreference}`;
      }
      if (preferences.industryType) {
        prompt += `\n- Tipo de industria: ${preferences.industryType}`;
      }
    }

    prompt += `\n\nAnaliza el contenido y recomienda el tema visual más apropiado.
Identifica slides que necesiten énfasis especial (título, stats importantes, CTA).
Responde ÚNICAMENTE con el JSON estructurado.`;

    return prompt;
  }

  private validateResult(
    result: StyleRecommendation,
    totalSlides: number
  ): StyleRecommendation {
    // Validate theme ID
    const validTheme = AVAILABLE_THEMES.find(t => t.id === result.themeId);
    const themeId = validTheme ? result.themeId : 'dark-blue';
    const themeName = validTheme ? validTheme.name : 'Azul Oscuro';

    // Validate slide overrides
    const slideStyleOverrides = (result.slideStyleOverrides || [])
      .filter(override => override.slideIndex >= 0 && override.slideIndex < totalSlides)
      .map(override => ({
        ...override,
        emphasis: (['high', 'normal', 'low'].includes(override.emphasis || '')
          ? override.emphasis
          : 'normal') as 'high' | 'normal' | 'low',
        backgroundType: override.backgroundType === 'gradient' ? 'gradient' : 'solid',
      }));

    // Ensure title and CTA have high emphasis if not specified
    const hasTitle = slideStyleOverrides.some(o => o.slideIndex === 0);
    const hasCTA = slideStyleOverrides.some(o => o.slideIndex === totalSlides - 1);

    if (!hasTitle) {
      slideStyleOverrides.unshift({
        slideIndex: 0,
        emphasis: 'high',
      });
    }

    if (!hasCTA && totalSlides > 1) {
      slideStyleOverrides.push({
        slideIndex: totalSlides - 1,
        emphasis: 'high',
      });
    }

    return {
      themeId,
      themeName,
      reasoning: result.reasoning || `Tema ${themeName} seleccionado para el contenido`,
      slideStyleOverrides,
      confidence: Math.min(1, Math.max(0, result.confidence || 0.75)),
    };
  }

  // Utility method to get theme info
  static getAvailableThemes() {
    return AVAILABLE_THEMES;
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

export function createStyleAdvisor(
  apiKey: string,
  model?: string
): StyleAdvisorAgent {
  return new StyleAdvisorAgent(apiKey, model);
}
