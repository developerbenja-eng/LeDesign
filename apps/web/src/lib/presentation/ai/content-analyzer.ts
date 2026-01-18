// ============================================================
// CONTENT ANALYZER AGENT
// ============================================================
// Analyzes topic/prompt and creates structured presentation outline

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  ContentAnalysisRequest,
  ContentAnalysisResult,
  ContentSection,
  AgentResponse,
} from './types';

// ============================================================
// SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `Eres un experto en comunicación y estructuración de contenido para presentaciones profesionales.

Tu rol es analizar un tema o prompt y crear un esquema estructurado para una presentación efectiva.

REGLAS:
1. Identifica los puntos clave que deben comunicarse
2. Organiza el contenido en secciones lógicas (3-6 secciones típicamente)
3. Cada sección debe tener un propósito claro
4. Sugiere cuántas diapositivas necesita cada sección
5. Identifica los temas principales que unifican la presentación
6. Considera la audiencia objetivo al estructurar

FORMATO DE RESPUESTA (JSON):
{
  "title": "Título principal de la presentación",
  "subtitle": "Subtítulo o tagline",
  "summary": "Resumen ejecutivo de 2-3 oraciones",
  "sections": [
    {
      "id": "section_1",
      "title": "Nombre de la sección",
      "description": "Qué cubre esta sección",
      "keyPoints": ["Punto 1", "Punto 2", "Punto 3"],
      "importance": "high|medium|low",
      "suggestedSlideCount": 2
    }
  ],
  "totalSuggestedSlides": 12,
  "keyThemes": ["Tema 1", "Tema 2"],
  "reasoning": "Explicación de por qué esta estructura es efectiva",
  "confidence": 0.85
}`;

// ============================================================
// CONTENT ANALYZER CLASS
// ============================================================

export class ContentAnalyzerAgent {
  private genAI: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-2.0-flash') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async analyze(request: ContentAnalysisRequest): Promise<AgentResponse<ContentAnalysisResult>> {
    const startTime = performance.now();

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
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
      const parsed = JSON.parse(text) as ContentAnalysisResult;

      // Validate and enhance sections
      const validatedResult = this.validateResult(parsed, request);

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
        error: error instanceof Error ? error.message : 'Unknown error in content analysis',
        processingTime,
      };
    }
  }

  private buildPrompt(request: ContentAnalysisRequest): string {
    const {
      topic,
      context,
      audience = 'general',
      tone = 'professional',
      language = 'es',
      additionalInstructions,
    } = request;

    let prompt = `TEMA DE LA PRESENTACIÓN:
${topic}

AUDIENCIA: ${this.getAudienceDescription(audience)}
TONO: ${this.getToneDescription(tone)}
IDIOMA: ${language === 'es' ? 'Español' : 'English'}`;

    if (context) {
      prompt += `\n\nCONTEXTO ADICIONAL:\n${context}`;
    }

    if (additionalInstructions) {
      prompt += `\n\nINSTRUCCIONES ESPECIALES:\n${additionalInstructions}`;
    }

    prompt += `\n\nAnaliza este tema y crea un esquema estructurado para una presentación efectiva.
Responde ÚNICAMENTE con el JSON estructurado, sin texto adicional.`;

    return prompt;
  }

  private getAudienceDescription(audience: string): string {
    const descriptions: Record<string, string> = {
      technical: 'Profesionales técnicos con conocimiento especializado',
      business: 'Ejecutivos y tomadores de decisiones empresariales',
      general: 'Audiencia general sin conocimiento especializado previo',
      academic: 'Audiencia académica o de investigación',
    };
    return descriptions[audience] || descriptions.general;
  }

  private getToneDescription(tone: string): string {
    const descriptions: Record<string, string> = {
      formal: 'Formal y profesional',
      casual: 'Casual y accesible',
      inspiring: 'Inspirador y motivacional',
      professional: 'Profesional pero cercano',
    };
    return descriptions[tone] || descriptions.professional;
  }

  private validateResult(
    result: ContentAnalysisResult,
    request: ContentAnalysisRequest
  ): ContentAnalysisResult {
    // Ensure sections have valid IDs
    const sections = result.sections.map((section, index) => ({
      ...section,
      id: section.id || `section_${index + 1}`,
      keyPoints: section.keyPoints || [],
      importance: section.importance || 'medium',
      suggestedSlideCount: Math.max(1, Math.min(5, section.suggestedSlideCount || 2)),
    }));

    // Calculate total slides
    const totalSuggestedSlides = sections.reduce(
      (sum, section) => sum + section.suggestedSlideCount,
      0
    ) + 2; // +2 for title and CTA slides

    return {
      ...result,
      sections,
      totalSuggestedSlides,
      keyThemes: result.keyThemes || [],
      confidence: Math.min(1, Math.max(0, result.confidence || 0.7)),
    };
  }
}

// ============================================================
// FACTORY FUNCTION
// ============================================================

export function createContentAnalyzer(
  apiKey: string,
  model?: string
): ContentAnalyzerAgent {
  return new ContentAnalyzerAgent(apiKey, model);
}
