/**
 * Surface AI Analysis API Route
 *
 * POST /api/surface-ai/analyze
 *
 * Analyzes survey data using AI to recommend interpolation methods
 * and validate surface quality.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  SurfaceAIAgent,
  createSurfaceAIAgent,
  quickTerrainAnalysis,
  quickMethodRecommendation,
} from '@ledesign/terrain/surface-ai';
import type {
  SurveyPoint,
  DatasetStatistics,
  BoundingBox,
} from '@ledesign/terrain/triangulation';
import type { InterpolationMetrics, InterpolationMethodType } from '@ledesign/terrain/interpolation';

export const dynamic = 'force-dynamic';

// ============================================================================
// Request Types
// ============================================================================

interface AnalyzeRequest {
  action: 'analyze' | 'validate' | 'recommend';

  // For analyze and recommend actions
  points?: Array<{ x: number; y: number; z: number; id?: string }>;
  statistics?: DatasetStatistics;
  bounds?: BoundingBox;

  // For validate action
  metrics?: InterpolationMetrics;
  method?: InterpolationMethodType;
  terrainAnalysis?: {
    characteristics: {
      classification: string;
      slopeStats: { mean: number; max: number; stdDev: number };
      roughness: number;
      uniformity: number;
      hasLinearFeatures: boolean;
      hasFlatAreas: boolean;
    };
    confidence: number;
    reasoning: string;
    anomalies: string[];
  };
  errorDistribution?: Array<{ x: number; y: number; error: number }>;

  // Options
  options?: {
    useAI?: boolean;
    detectFeatures?: boolean;
    hasDEM?: boolean;
    hasSatelliteImagery?: boolean;
    hasIDEFeatures?: boolean;
    hasBreaklines?: boolean;
  };
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalyzeRequest;

    // Get API key from environment
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    // Create agent
    const agent = createSurfaceAIAgent(apiKey);

    switch (body.action) {
      case 'analyze':
        return handleAnalyze(agent, body);

      case 'validate':
        return handleValidate(agent, body);

      case 'recommend':
        return handleRecommend(body);

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use "analyze", "validate", or "recommend".' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Surface AI analysis error:', error);
    return NextResponse.json(
      {
        error: 'Surface AI analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// Action Handlers
// ============================================================================

async function handleAnalyze(agent: SurfaceAIAgent, body: AnalyzeRequest) {
  if (!body.points || body.points.length < 3) {
    return NextResponse.json(
      { error: 'At least 3 points are required for analysis' },
      { status: 400 }
    );
  }

  // Convert to SurveyPoint format
  const surveyPoints: SurveyPoint[] = body.points.map((p, i) => ({
    id: p.id || `P${i + 1}`,
    x: p.x,
    y: p.y,
    z: p.z,
    source: 'survey' as const,
  }));

  // Calculate statistics if not provided
  const statistics: DatasetStatistics = body.statistics || calculateStatisticsFromPoints(surveyPoints);

  // Calculate bounds if not provided
  const bounds: BoundingBox = body.bounds || calculateBoundsFromPoints(surveyPoints);

  // Run analysis
  const result = await agent.analyzeDataset(
    surveyPoints,
    statistics,
    bounds,
    body.options
  );

  return NextResponse.json({
    success: true,
    terrain: result.terrain,
    recommendation: result.recommendation,
    overallConfidence: result.overallConfidence,
    processingTime: result.processingTime,
    model: result.model,
    aiAvailable: agent.isAIAvailable(),
  });
}

async function handleValidate(agent: SurfaceAIAgent, body: AnalyzeRequest) {
  if (!body.metrics) {
    return NextResponse.json(
      { error: 'Metrics are required for validation' },
      { status: 400 }
    );
  }

  if (!body.method) {
    return NextResponse.json(
      { error: 'Method is required for validation' },
      { status: 400 }
    );
  }

  // Use provided terrain analysis or create minimal one
  const terrainAnalysis = body.terrainAnalysis || {
    characteristics: {
      classification: 'rolling' as const,
      slopeStats: { mean: 5, max: 15, stdDev: 3 },
      roughness: 0.3,
      uniformity: 0.7,
      hasLinearFeatures: false,
      hasFlatAreas: false,
    },
    confidence: 0.5,
    reasoning: 'Default terrain analysis',
    anomalies: [],
  };

  const result = await agent.validateResults(
    body.metrics,
    body.method,
    terrainAnalysis as any,
    body.errorDistribution,
    body.options
  );

  return NextResponse.json({
    success: true,
    validation: result,
    aiAvailable: agent.isAIAvailable(),
  });
}

function handleRecommend(body: AnalyzeRequest) {
  if (!body.points || body.points.length < 3) {
    return NextResponse.json(
      { error: 'At least 3 points are required for recommendation' },
      { status: 400 }
    );
  }

  // Convert to SurveyPoint format
  const surveyPoints: SurveyPoint[] = body.points.map((p, i) => ({
    id: p.id || `P${i + 1}`,
    x: p.x,
    y: p.y,
    z: p.z,
    source: 'survey' as const,
  }));

  // Calculate statistics
  const statistics: DatasetStatistics = body.statistics || calculateStatisticsFromPoints(surveyPoints);
  const bounds: BoundingBox = body.bounds || calculateBoundsFromPoints(surveyPoints);

  // Quick analysis without AI
  const terrainResult = quickTerrainAnalysis(surveyPoints, statistics, bounds);
  const recommendation = quickMethodRecommendation(
    terrainResult,
    body.options?.hasBreaklines ?? false
  );

  return NextResponse.json({
    success: true,
    terrain: terrainResult,
    recommendation,
    model: 'rule-based',
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateStatisticsFromPoints(points: SurveyPoint[]): DatasetStatistics {
  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);
  const zValues = points.map((p) => p.z);

  const mean = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const stdDev = (arr: number[], m: number) =>
    Math.sqrt(arr.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / arr.length);

  const xMean = mean(xValues);
  const yMean = mean(yValues);
  const zMean = mean(zValues);

  return {
    pointCount: points.length,
    xMin: Math.min(...xValues),
    xMax: Math.max(...xValues),
    xMean,
    xStdDev: stdDev(xValues, xMean),
    yMin: Math.min(...yValues),
    yMax: Math.max(...yValues),
    yMean,
    yStdDev: stdDev(yValues, yMean),
    zMin: Math.min(...zValues),
    zMax: Math.max(...zValues),
    zMean,
    zStdDev: stdDev(zValues, zMean),
    elevationRange: Math.max(...zValues) - Math.min(...zValues),
    elevationMean: zMean,
    elevationStdDev: stdDev(zValues, zMean),
  };
}

function calculateBoundsFromPoints(points: SurveyPoint[]): BoundingBox {
  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);
  const zValues = points.map((p) => p.z);

  return {
    minX: Math.min(...xValues),
    maxX: Math.max(...xValues),
    minY: Math.min(...yValues),
    maxY: Math.max(...yValues),
    minZ: Math.min(...zValues),
    maxZ: Math.max(...zValues),
  };
}
