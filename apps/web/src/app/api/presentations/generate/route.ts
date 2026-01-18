// ============================================================
// AI PRESENTATION GENERATION API
// ============================================================
// Endpoint for generating presentations using multi-agent AI

import { NextRequest, NextResponse } from 'next/server';
import {
  createPresentationOrchestrator,
  type PresentationGenerationRequest,
  type PresentationGenerationProgress,
} from '@/lib/presentation/ai';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for AI generation

// ============================================================
// POST: Generate a presentation
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // Get API key from environment
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'API de IA no configurada. Configura GOOGLE_GEMINI_API_KEY.',
        },
        { status: 500 }
      );
    }

    // Parse request body
    const body: PresentationGenerationRequest = await request.json();

    if (!body.prompt || body.prompt.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Se requiere un prompt para generar la presentación.',
        },
        { status: 400 }
      );
    }

    // Validate prompt length
    if (body.prompt.length > 5000) {
      return NextResponse.json(
        {
          success: false,
          error: 'El prompt es demasiado largo. Máximo 5000 caracteres.',
        },
        { status: 400 }
      );
    }

    // Create orchestrator
    const orchestrator = createPresentationOrchestrator(apiKey, {
      model: 'gemini-2.0-flash',
    });

    // Generate presentation
    const result = await orchestrator.generate(body);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Error al generar la presentación',
          processingTime: result.processingTime,
        },
        { status: 500 }
      );
    }

    // Return successful result
    return NextResponse.json({
      success: true,
      presentation: result.presentation,
      analysis: {
        title: result.analysis?.title,
        subtitle: result.analysis?.subtitle,
        sections: result.analysis?.sections.length,
        keyThemes: result.analysis?.keyThemes,
      },
      structure: {
        totalSlides: result.structure?.totalSlides,
        sectionBreakdown: result.structure?.sectionBreakdown,
      },
      style: {
        themeId: result.styleRecommendation?.themeId,
        themeName: result.styleRecommendation?.themeName,
        reasoning: result.styleRecommendation?.reasoning,
      },
      metadata: {
        processingTime: result.processingTime,
        tokensUsed: result.tokensUsed,
        model: 'gemini-2.0-flash',
      },
    });
  } catch (error) {
    console.error('Presentation generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error inesperado al generar presentación',
      },
      { status: 500 }
    );
  }
}

// ============================================================
// GET: Get generation capabilities
// ============================================================

export async function GET() {
  const hasApiKey = !!process.env.GOOGLE_GEMINI_API_KEY;

  return NextResponse.json({
    success: true,
    enabled: hasApiKey,
    capabilities: {
      audiences: ['technical', 'business', 'general', 'academic'],
      tones: ['formal', 'casual', 'inspiring', 'professional'],
      languages: ['es', 'en'],
      limits: {
        minSlides: 4,
        maxSlides: 20,
        maxPromptLength: 5000,
      },
    },
    themes: [
      { id: 'dark-blue', name: 'Azul Oscuro' },
      { id: 'dark-purple', name: 'Púrpura Oscuro' },
      { id: 'dark-green', name: 'Verde Oscuro' },
      { id: 'dark-amber', name: 'Ámbar Oscuro' },
      { id: 'dark-cyan', name: 'Cian Oscuro' },
      { id: 'dark-red', name: 'Rojo Oscuro' },
      { id: 'light', name: 'Claro' },
      { id: 'minimal-dark', name: 'Mínimo Oscuro' },
    ],
  });
}

// ============================================================
// OPTIONS: CORS preflight
// ============================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
