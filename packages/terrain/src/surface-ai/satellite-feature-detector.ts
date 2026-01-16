/**
 * Smart Surface Generation - Satellite Feature Detector
 *
 * Uses Google Gemini's multimodal capabilities to detect buildings,
 * fences, and other structures from satellite imagery for surface
 * generation constraints.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type {
  FeatureDetectionInput,
  DetectedFeature,
  SatelliteDetectionOptions,
  SatelliteFeatureDetectionResult,
  FeatureType,
} from './types';
import type { BoundingBox } from '../triangulation/types';
import { terrainConfig } from '../config';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_OPTIONS: Required<SatelliteDetectionOptions> = {
  detectBuildings: true,
  detectFences: true,
  detectRoads: true,
  detectWater: true,
  detectVegetation: false,
  detectParking: true,
  minConfidence: 0.6,
  simplifyGeometry: true,
};

const GEMINI_MODEL = 'gemini-2.0-flash';

// ============================================================================
// Main Detection Function
// ============================================================================

/**
 * Detect features from satellite imagery using Gemini Vision
 */
export async function detectFeaturesFromSatellite(
  input: FeatureDetectionInput,
  apiKey?: string
): Promise<SatelliteFeatureDetectionResult> {
  const startTime = performance.now();
  const options = { ...DEFAULT_OPTIONS, ...input.options };

  if (!input.imageryTile) {
    return createEmptyResult(input.bounds, startTime, 'No imagery provided');
  }

  // Use provided API key or fall back to config
  const effectiveApiKey = apiKey || terrainConfig.googleGeminiApiKey;

  if (!effectiveApiKey) {
    return createEmptyResult(
      input.bounds,
      startTime,
      'Google Gemini API key not provided. Set GOOGLE_GEMINI_API_KEY in .env file.'
    );
  }

  try {
    const genAI = new GoogleGenerativeAI(effectiveApiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    // Build the detection prompt
    const prompt = buildDetectionPrompt(input.bounds, options);

    // Prepare image for Gemini
    const imagePart = {
      inlineData: {
        mimeType: input.imageMimeType || 'image/png',
        data: input.imageryTile,
      },
    };

    // Run detection
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Parse the response
    const parsedResult = parseDetectionResponse(text, input.bounds, options);

    const processingTime = performance.now() - startTime;

    return {
      ...parsedResult,
      rawResponse: text,
      metadata: {
        modelUsed: GEMINI_MODEL,
        processingTimeMs: processingTime,
        boundsAnalyzed: input.bounds,
      },
    };
  } catch (error) {
    console.error('Satellite feature detection failed:', error);
    return createEmptyResult(
      input.bounds,
      startTime,
      `Detection failed: ${(error as Error).message}`
    );
  }
}

// ============================================================================
// Prompt Building
// ============================================================================

/**
 * Build the detection prompt for Gemini
 */
function buildDetectionPrompt(
  bounds: BoundingBox,
  options: Required<SatelliteDetectionOptions>
): string {
  const featureTypes: string[] = [];

  if (options.detectBuildings) {
    featureTypes.push('buildings (houses, structures, sheds)');
  }
  if (options.detectFences) {
    featureTypes.push('fences and walls (property boundaries, barriers)');
  }
  if (options.detectRoads) {
    featureTypes.push('roads and paths (paved, unpaved, driveways)');
  }
  if (options.detectWater) {
    featureTypes.push('water bodies (pools, ponds, streams)');
  }
  if (options.detectVegetation) {
    featureTypes.push('vegetation areas (trees, gardens, lawns)');
  }
  if (options.detectParking) {
    featureTypes.push('parking lots and paved areas');
  }

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  return `You are an expert geospatial analyst. Analyze this satellite/aerial image and detect the following features:
${featureTypes.map((t, i) => `${i + 1}. ${t}`).join('\n')}

The image covers an area of approximately ${width.toFixed(2)} x ${height.toFixed(2)} meters (or degrees if WGS84).

For each detected feature, provide:
1. Type: One of [building, fence, wall, road, water, lake, parking, vegetation]
2. Confidence: A value from 0.0 to 1.0
3. Approximate bounding box as percentages of image dimensions: [left%, top%, right%, bottom%]
4. Description: Brief description of the feature

IMPORTANT: Only include features you can clearly identify with confidence >= ${options.minConfidence}.

Format your response as JSON:
{
  "summary": "Brief summary of what's visible in the image",
  "features": [
    {
      "type": "building",
      "confidence": 0.85,
      "bbox": [10, 20, 30, 40],
      "description": "Rectangular house with red roof"
    },
    {
      "type": "fence",
      "confidence": 0.75,
      "bbox": [5, 15, 95, 18],
      "description": "Property fence along northern boundary"
    }
  ]
}

If no features are detected, return:
{
  "summary": "Description of the terrain",
  "features": []
}`;
}

// ============================================================================
// Response Parsing
// ============================================================================

interface GeminiFeature {
  type: string;
  confidence: number;
  bbox: [number, number, number, number]; // left%, top%, right%, bottom%
  description?: string;
}

interface GeminiResponse {
  summary: string;
  features: GeminiFeature[];
}

/**
 * Parse Gemini's detection response
 */
function parseDetectionResponse(
  responseText: string,
  bounds: BoundingBox,
  options: Required<SatelliteDetectionOptions>
): Omit<SatelliteFeatureDetectionResult, 'metadata' | 'rawResponse'> {
  const features: DetectedFeature[] = [];
  const breaklines: SatelliteFeatureDetectionResult['breaklines'] = [];
  const flatConstraints: SatelliteFeatureDetectionResult['flatConstraints'] = [];
  const notes: string[] = [];

  const structureCounts = {
    buildings: 0,
    fences: 0,
    roads: 0,
    water: 0,
    vegetation: 0,
    parking: 0,
  };

  let imageSummary = '';

  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonText = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const parsed: GeminiResponse = JSON.parse(jsonText);
    imageSummary = parsed.summary || '';

    for (const feature of parsed.features) {
      // Skip low confidence features
      if (feature.confidence < options.minConfidence) {
        continue;
      }

      // Map Gemini type to our FeatureType
      const featureType = mapFeatureType(feature.type);
      if (!featureType) {
        notes.push(`Unknown feature type: ${feature.type}`);
        continue;
      }

      // Convert bbox percentages to coordinates
      const geometry = bboxToGeometry(feature.bbox, bounds, featureType);

      // Create detected feature
      const detectedFeature: DetectedFeature = {
        type: featureType,
        geometry,
        confidence: feature.confidence,
        source: 'satellite',
        useAsBreakline: shouldUseAsBreakline(featureType),
        useAsFlatConstraint: shouldUseAsFlatConstraint(featureType),
      };

      features.push(detectedFeature);

      // Update counts
      updateStructureCounts(structureCounts, featureType);

      // Generate breaklines/constraints based on feature type
      if (detectedFeature.useAsBreakline) {
        breaklines.push({
          points: geometryToPoints(geometry),
          type: getBreaklineType(featureType),
          source: `Satellite detection - ${feature.description || featureType}`,
        });
      }

      if (detectedFeature.useAsFlatConstraint && geometry.type === 'Polygon') {
        flatConstraints.push({
          polygon: geometryToPoints(geometry),
          source: `Satellite detection - ${feature.description || featureType}`,
        });
      }
    }

    notes.push(`Detected ${features.length} features from satellite imagery`);
    if (structureCounts.buildings > 0) {
      notes.push(`${structureCounts.buildings} building(s) identified as exclusion zones`);
    }
    if (structureCounts.fences > 0) {
      notes.push(`${structureCounts.fences} fence(s)/wall(s) identified as breaklines`);
    }
  } catch (error) {
    notes.push(`Failed to parse AI response: ${(error as Error).message}`);
  }

  return {
    features,
    breaklines,
    flatConstraints,
    notes,
    imageSummary,
    structureCounts,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map Gemini feature type to our FeatureType
 */
function mapFeatureType(type: string): FeatureType | null {
  const normalized = type.toLowerCase().trim();

  const typeMap: Record<string, FeatureType> = {
    building: 'building',
    house: 'building',
    structure: 'building',
    shed: 'building',
    fence: 'fence',
    wall: 'wall',
    barrier: 'fence',
    boundary: 'fence',
    road: 'road',
    path: 'road',
    driveway: 'road',
    street: 'road',
    water: 'lake',
    lake: 'lake',
    pond: 'lake',
    pool: 'lake',
    stream: 'stream',
    river: 'river',
    vegetation: 'vegetation',
    tree: 'vegetation',
    garden: 'vegetation',
    parking: 'parking',
    'parking lot': 'parking',
    paved: 'parking',
  };

  return typeMap[normalized] || null;
}

/**
 * Convert bbox percentages to geometry
 */
function bboxToGeometry(
  bbox: [number, number, number, number],
  bounds: BoundingBox,
  featureType: FeatureType
): DetectedFeature['geometry'] {
  const [leftPct, topPct, rightPct, bottomPct] = bbox;

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  const left = bounds.minX + (leftPct / 100) * width;
  const right = bounds.minX + (rightPct / 100) * width;
  const top = bounds.maxY - (topPct / 100) * height; // Y is inverted in image coords
  const bottom = bounds.maxY - (bottomPct / 100) * height;

  // For linear features (fences, roads), use LineString
  if (featureType === 'fence' || featureType === 'wall') {
    // Determine if horizontal or vertical based on aspect ratio
    const bboxWidth = right - left;
    const bboxHeight = Math.abs(top - bottom);

    if (bboxWidth > bboxHeight * 2) {
      // Horizontal line
      return {
        type: 'LineString',
        coordinates: [
          [left, (top + bottom) / 2],
          [right, (top + bottom) / 2],
        ],
      };
    } else if (bboxHeight > bboxWidth * 2) {
      // Vertical line
      return {
        type: 'LineString',
        coordinates: [
          [(left + right) / 2, bottom],
          [(left + right) / 2, top],
        ],
      };
    } else {
      // Return as polygon (perimeter line)
      return {
        type: 'Polygon',
        coordinates: [
          [left, bottom],
          [right, bottom],
          [right, top],
          [left, top],
          [left, bottom],
        ],
      };
    }
  }

  // For roads, use LineString along the longer axis
  if (featureType === 'road') {
    const bboxWidth = right - left;
    const bboxHeight = Math.abs(top - bottom);

    if (bboxWidth >= bboxHeight) {
      return {
        type: 'LineString',
        coordinates: [
          [left, (top + bottom) / 2],
          [right, (top + bottom) / 2],
        ],
      };
    } else {
      return {
        type: 'LineString',
        coordinates: [
          [(left + right) / 2, bottom],
          [(left + right) / 2, top],
        ],
      };
    }
  }

  // For area features (buildings, water, parking), use Polygon
  return {
    type: 'Polygon',
    coordinates: [
      [left, bottom],
      [right, bottom],
      [right, top],
      [left, top],
      [left, bottom],
    ],
  };
}

/**
 * Convert geometry to points array
 */
function geometryToPoints(
  geometry: DetectedFeature['geometry']
): Array<{ x: number; y: number }> {
  return geometry.coordinates.map(([x, y]) => ({ x, y }));
}

/**
 * Determine if feature should be used as breakline
 */
function shouldUseAsBreakline(type: FeatureType): boolean {
  return ['fence', 'wall', 'road', 'river', 'stream'].includes(type);
}

/**
 * Determine if feature should be used as flat constraint
 */
function shouldUseAsFlatConstraint(type: FeatureType): boolean {
  return ['building', 'lake', 'parking'].includes(type);
}

/**
 * Get breakline type for feature
 */
function getBreaklineType(type: FeatureType): 'hard' | 'soft' {
  // Hard breaklines: elevation discontinuity
  if (['wall', 'river', 'stream'].includes(type)) {
    return 'hard';
  }
  // Soft breaklines: smooth surface follows feature
  return 'soft';
}

/**
 * Update structure counts
 */
function updateStructureCounts(
  counts: SatelliteFeatureDetectionResult['structureCounts'],
  type: FeatureType
): void {
  switch (type) {
    case 'building':
      counts.buildings++;
      break;
    case 'fence':
    case 'wall':
      counts.fences++;
      break;
    case 'road':
      counts.roads++;
      break;
    case 'lake':
    case 'river':
    case 'stream':
      counts.water++;
      break;
    case 'vegetation':
      counts.vegetation++;
      break;
    case 'parking':
      counts.parking++;
      break;
  }
}

/**
 * Create empty result for error cases
 */
function createEmptyResult(
  bounds: BoundingBox,
  startTime: number,
  note: string
): SatelliteFeatureDetectionResult {
  return {
    features: [],
    breaklines: [],
    flatConstraints: [],
    notes: [note],
    structureCounts: {
      buildings: 0,
      fences: 0,
      roads: 0,
      water: 0,
      vegetation: 0,
      parking: 0,
    },
    metadata: {
      modelUsed: GEMINI_MODEL,
      processingTimeMs: performance.now() - startTime,
      boundsAnalyzed: bounds,
    },
  };
}

// ============================================================================
// Utility Functions for Image Capture
// ============================================================================

/**
 * Fetch satellite tile from Esri World Imagery for a given bounds
 * Returns base64 encoded PNG
 */
export async function fetchSatelliteTile(
  bounds: BoundingBox,
  width: number = 512,
  height: number = 512
): Promise<{ imageData: string; mimeType: string } | null> {
  try {
    // Esri World Imagery export endpoint
    const baseUrl = 'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export';

    // Convert bounds to bbox string (assumes WGS84)
    const bbox = `${bounds.minX},${bounds.minY},${bounds.maxX},${bounds.maxY}`;

    const params = new URLSearchParams({
      bbox,
      bboxSR: '4326',
      imageSR: '4326',
      size: `${width},${height}`,
      format: 'png',
      f: 'image',
    });

    const response = await fetch(`${baseUrl}?${params}`);

    if (!response.ok) {
      console.error('Failed to fetch satellite tile:', response.status);
      return null;
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    return {
      imageData: base64,
      mimeType: 'image/png',
    };
  } catch (error) {
    console.error('Error fetching satellite tile:', error);
    return null;
  }
}

/**
 * Capture satellite image from canvas (browser environment)
 */
export function captureSatelliteFromCanvas(
  canvas: HTMLCanvasElement,
  bounds: BoundingBox
): { imageData: string; mimeType: string; bounds: BoundingBox } {
  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.split(',')[1];

  return {
    imageData: base64,
    mimeType: 'image/png',
    bounds,
  };
}

// ============================================================================
// Export all functions
// ============================================================================

export {
  buildDetectionPrompt,
  parseDetectionResponse,
  mapFeatureType,
  bboxToGeometry,
  shouldUseAsBreakline,
  shouldUseAsFlatConstraint,
};
