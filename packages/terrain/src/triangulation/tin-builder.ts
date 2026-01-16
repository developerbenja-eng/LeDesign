/**
 * Smart Surface Generation - TIN Builder
 *
 * High-level API for building TIN surfaces from various data sources.
 * Orchestrates parsing, validation, triangulation, and quality assessment.
 */

import type { TINSurface } from '../cad-types';
import {
  SurveyPoint,
  SurveyDataset,
  TriangulationResult,
  TriangulationConfig,
  GeneratedSurface,
  SurfaceGenerationConfig,
  SurfaceQualityMetrics,
  ProcessingProgress,
  ProcessingStage,
  BoundingBox,
  DatasetStatistics,
  InterpolationMethod,
} from './types';
import { processPointFile, calculateStatistics, calculateBounds } from './point-parser';
import { triangulate, toTINSurface, getElevationAt } from './delaunay';

// ============================================================================
// Main Builder Class
// ============================================================================

export class TINBuilder {
  private points: SurveyPoint[] = [];
  private triangulation: TriangulationResult | null = null;
  private onProgress?: (progress: ProcessingProgress) => void;

  constructor(onProgress?: (progress: ProcessingProgress) => void) {
    this.onProgress = onProgress;
  }

  // --------------------------------------------------------------------------
  // Progress Reporting
  // --------------------------------------------------------------------------

  private reportProgress(stage: ProcessingStage, percent: number, message: string): void {
    if (this.onProgress) {
      this.onProgress({ stage, percent, message });
    }
  }

  // --------------------------------------------------------------------------
  // Data Loading
  // --------------------------------------------------------------------------

  /**
   * Load points from a file (CSV, XYZ, etc.)
   */
  async loadFromFile(
    content: string | ArrayBuffer,
    filename: string,
    options: {
      removeOutliers?: boolean;
      removeDuplicates?: boolean;
      outlierThreshold?: number;
    } = {}
  ): Promise<{
    success: boolean;
    pointCount: number;
    statistics: DatasetStatistics;
    bounds: BoundingBox;
    errors: string[];
    warnings: string[];
  }> {
    this.reportProgress('parsing', 0, 'Parsing file...');

    const result = await processPointFile(content, filename, {
      removeOutliers: options.removeOutliers ?? true,
      removeDuplicates: options.removeDuplicates ?? true,
      outlierThreshold: options.outlierThreshold ?? 3.0,
    });

    this.points = result.cleanedPoints;

    this.reportProgress('parsing', 100, `Loaded ${this.points.length} points`);

    return {
      success: result.result.success,
      pointCount: this.points.length,
      statistics: result.statistics,
      bounds: result.bounds,
      errors: result.result.errors.map(e => e.message),
      warnings: result.result.warnings.map(w => w.message),
    };
  }

  /**
   * Load points directly
   */
  loadPoints(points: SurveyPoint[]): void {
    this.points = points;
  }

  /**
   * Add additional points (e.g., from DEM sampling)
   */
  addPoints(points: SurveyPoint[]): void {
    this.points = [...this.points, ...points];
  }

  /**
   * Get current point count
   */
  getPointCount(): number {
    return this.points.length;
  }

  /**
   * Get all points
   */
  getPoints(): SurveyPoint[] {
    return this.points;
  }

  // --------------------------------------------------------------------------
  // Triangulation
  // --------------------------------------------------------------------------

  /**
   * Perform triangulation on loaded points
   */
  triangulate(config: Partial<TriangulationConfig> = {}): TriangulationResult {
    if (this.points.length < 3) {
      throw new Error('At least 3 points are required for triangulation');
    }

    this.reportProgress('triangulating', 0, 'Starting triangulation...');

    this.triangulation = triangulate(this.points, config);

    this.reportProgress(
      'triangulating',
      100,
      `Created ${this.triangulation.triangles.length} triangles`
    );

    return this.triangulation;
  }

  /**
   * Get triangulation result
   */
  getTriangulation(): TriangulationResult | null {
    return this.triangulation;
  }

  // --------------------------------------------------------------------------
  // Surface Generation
  // --------------------------------------------------------------------------

  /**
   * Generate TINSurface for 3D visualization
   */
  toTINSurface(name: string, id?: string): TINSurface {
    if (!this.triangulation) {
      throw new Error('Must triangulate before converting to TINSurface');
    }

    return toTINSurface(this.triangulation, name, id);
  }

  // --------------------------------------------------------------------------
  // Quality Assessment
  // --------------------------------------------------------------------------

  /**
   * Perform cross-validation to assess surface quality
   */
  crossValidate(folds: number = 10): SurfaceQualityMetrics {
    if (this.points.length < folds * 3) {
      folds = Math.max(3, Math.floor(this.points.length / 3));
    }

    this.reportProgress('validating_quality', 0, 'Running cross-validation...');

    const results: Array<{
      pointId: string;
      actual: number;
      predicted: number;
      error: number;
      percentError: number;
    }> = [];

    // Shuffle points
    const shuffled = [...this.points].sort(() => Math.random() - 0.5);
    const foldSize = Math.floor(shuffled.length / folds);

    for (let fold = 0; fold < folds; fold++) {
      // Split into test and training sets
      const testStart = fold * foldSize;
      const testEnd = fold === folds - 1 ? shuffled.length : (fold + 1) * foldSize;
      const testPoints = shuffled.slice(testStart, testEnd);
      const trainPoints = [
        ...shuffled.slice(0, testStart),
        ...shuffled.slice(testEnd),
      ];

      // Triangulate training set
      if (trainPoints.length < 3) continue;

      try {
        const trainTriangulation = triangulate(trainPoints, {
          removeOutliers: false,
          removeDuplicates: false,
        });

        // Predict test points
        for (const testPoint of testPoints) {
          const predicted = getElevationAt(trainTriangulation, testPoint.x, testPoint.y);
          if (predicted !== null) {
            const error = Math.abs(predicted - testPoint.z);
            const percentError = (error / Math.abs(testPoint.z)) * 100;

            results.push({
              pointId: testPoint.id,
              actual: testPoint.z,
              predicted,
              error,
              percentError,
            });
          }
        }
      } catch {
        // Skip this fold if triangulation fails
        continue;
      }

      this.reportProgress(
        'validating_quality',
        ((fold + 1) / folds) * 100,
        `Completed fold ${fold + 1}/${folds}`
      );
    }

    // Calculate metrics
    if (results.length === 0) {
      return {
        rmse: 0,
        mae: 0,
        maxError: 0,
        r2: 0,
        crossValidationResults: [],
        coveragePercent: 0,
        artifactScore: 100,
      };
    }

    const errors = results.map(r => r.error);
    const squaredErrors = errors.map(e => e * e);

    const rmse = Math.sqrt(squaredErrors.reduce((a, b) => a + b, 0) / errors.length);
    const mae = errors.reduce((a, b) => a + b, 0) / errors.length;
    const maxError = Math.max(...errors);

    // Calculate R²
    const actualValues = results.map(r => r.actual);
    const meanActual = actualValues.reduce((a, b) => a + b, 0) / actualValues.length;
    const ssTotal = actualValues.reduce((sum, a) => sum + Math.pow(a - meanActual, 2), 0);
    const ssResidual = results.reduce((sum, r) => sum + Math.pow(r.actual - r.predicted, 2), 0);
    const r2 = 1 - ssResidual / ssTotal;

    // Coverage (percentage of test points successfully predicted)
    const coveragePercent = (results.length / this.points.length) * 100;

    // Artifact score (lower is better) - based on error distribution
    const errorStdDev = Math.sqrt(
      errors.reduce((sum, e) => sum + Math.pow(e - mae, 2), 0) / errors.length
    );
    const artifactScore = Math.min(100, (errorStdDev / mae) * 50 + (maxError / mae) * 10);

    this.reportProgress('validating_quality', 100, 'Cross-validation complete');

    return {
      rmse,
      mae,
      maxError,
      r2,
      crossValidationResults: results,
      coveragePercent,
      artifactScore,
    };
  }

  // --------------------------------------------------------------------------
  // Elevation Queries
  // --------------------------------------------------------------------------

  /**
   * Get elevation at a specific XY location
   */
  getElevationAt(x: number, y: number): number | null {
    if (!this.triangulation) return null;
    return getElevationAt(this.triangulation, x, y);
  }

  /**
   * Sample elevations on a regular grid
   */
  sampleGrid(
    bounds: BoundingBox,
    resolution: number
  ): Array<{ x: number; y: number; z: number | null }> {
    if (!this.triangulation) return [];

    const samples: Array<{ x: number; y: number; z: number | null }> = [];

    for (let y = bounds.minY; y <= bounds.maxY; y += resolution) {
      for (let x = bounds.minX; x <= bounds.maxX; x += resolution) {
        const z = getElevationAt(this.triangulation, x, y);
        samples.push({ x, y, z });
      }
    }

    return samples;
  }

  // --------------------------------------------------------------------------
  // Export
  // --------------------------------------------------------------------------

  /**
   * Export to LandXML format
   */
  toLandXML(surfaceName: string): string {
    if (!this.triangulation) {
      throw new Error('Must triangulate before exporting');
    }

    const points = this.points;
    const triangles = this.triangulation.triangles;

    // Build LandXML string
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<LandXML xmlns="http://www.landxml.org/schema/LandXML-1.2" version="1.2">
  <Units>
    <Metric linearUnit="meter" areaUnit="squareMeter" volumeUnit="cubicMeter"/>
  </Units>
  <Surfaces>
    <Surface name="${surfaceName}">
      <Definition surfType="TIN">
        <Pnts>
`;

    // Add points (1-indexed for LandXML)
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      xml += `          <P id="${i + 1}">${p.y.toFixed(4)} ${p.x.toFixed(4)} ${p.z.toFixed(4)}</P>\n`;
    }

    xml += `        </Pnts>
        <Faces>
`;

    // Add faces (1-indexed for LandXML)
    for (const tri of triangles) {
      const [i0, i1, i2] = tri.indices;
      xml += `          <F>${i0 + 1} ${i1 + 1} ${i2 + 1}</F>\n`;
    }

    xml += `        </Faces>
      </Definition>
    </Surface>
  </Surfaces>
</LandXML>`;

    return xml;
  }

  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------

  /**
   * Get statistics about the current dataset
   */
  getStatistics(): DatasetStatistics & { triangleCount?: number } {
    const stats = calculateStatistics(this.points);

    if (this.triangulation) {
      return {
        ...stats,
        triangleCount: this.triangulation.triangles.length,
      };
    }

    return stats;
  }

  /**
   * Get bounds of the current dataset
   */
  getBounds(): BoundingBox {
    return calculateBounds(this.points);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a TIN surface from a file in one call
 */
export async function createTINFromFile(
  content: string | ArrayBuffer,
  filename: string,
  surfaceName: string,
  options: {
    removeOutliers?: boolean;
    removeDuplicates?: boolean;
    maxEdgeLength?: number;
    onProgress?: (progress: ProcessingProgress) => void;
  } = {}
): Promise<{
  surface: TINSurface;
  statistics: DatasetStatistics;
  metrics: SurfaceQualityMetrics;
  triangulation: TriangulationResult;
}> {
  const builder = new TINBuilder(options.onProgress);

  // Load and parse
  await builder.loadFromFile(content, filename, {
    removeOutliers: options.removeOutliers,
    removeDuplicates: options.removeDuplicates,
  });

  // Triangulate
  const triangulation = builder.triangulate({
    maxEdgeLength: options.maxEdgeLength,
  });

  // Validate
  const metrics = builder.crossValidate();

  // Convert to TINSurface
  const surface = builder.toTINSurface(surfaceName);

  return {
    surface,
    statistics: builder.getStatistics(),
    metrics,
    triangulation,
  };
}

/**
 * Create a TIN surface from an array of points
 */
export function createTINFromPoints(
  points: Array<{ x: number; y: number; z: number; id?: string }>,
  surfaceName: string,
  config: Partial<TriangulationConfig> = {}
): {
  surface: TINSurface;
  triangulation: TriangulationResult;
} {
  const surveyPoints: SurveyPoint[] = points.map((p, i) => ({
    id: p.id || `P${i + 1}`,
    x: p.x,
    y: p.y,
    z: p.z,
    source: 'manual' as const,
  }));

  const builder = new TINBuilder();
  builder.loadPoints(surveyPoints);

  const triangulation = builder.triangulate(config);
  const surface = builder.toTINSurface(surfaceName);

  return { surface, triangulation };
}

// ============================================================================
// DEM Integration Helpers
// ============================================================================

/**
 * Sample points from a DEM to augment sparse survey data
 */
export function sampleDEMForAugmentation(
  demElevations: Float32Array | Float64Array,
  demWidth: number,
  demHeight: number,
  demBounds: BoundingBox,
  surveyBounds: BoundingBox,
  targetDensity: number // Points per hectare
): SurveyPoint[] {
  const points: SurveyPoint[] = [];

  // Calculate area and required points
  const areaWidth = surveyBounds.maxX - surveyBounds.minX;
  const areaHeight = surveyBounds.maxY - surveyBounds.minY;
  const areaHectares = (areaWidth * areaHeight) / 10000;
  const targetPoints = Math.ceil(areaHectares * targetDensity);

  // Calculate grid spacing
  const gridSize = Math.sqrt((areaWidth * areaHeight) / targetPoints);

  let pointId = 0;
  for (let y = surveyBounds.minY; y <= surveyBounds.maxY; y += gridSize) {
    for (let x = surveyBounds.minX; x <= surveyBounds.maxX; x += gridSize) {
      // Convert to DEM pixel coordinates
      const demX = ((x - demBounds.minX) / (demBounds.maxX - demBounds.minX)) * demWidth;
      const demY = ((demBounds.maxY - y) / (demBounds.maxY - demBounds.minY)) * demHeight;

      // Bilinear interpolation
      const x0 = Math.floor(demX);
      const y0 = Math.floor(demY);
      const x1 = Math.min(x0 + 1, demWidth - 1);
      const y1 = Math.min(y0 + 1, demHeight - 1);

      const fx = demX - x0;
      const fy = demY - y0;

      const z00 = demElevations[y0 * demWidth + x0];
      const z10 = demElevations[y0 * demWidth + x1];
      const z01 = demElevations[y1 * demWidth + x0];
      const z11 = demElevations[y1 * demWidth + x1];

      const z =
        z00 * (1 - fx) * (1 - fy) +
        z10 * fx * (1 - fy) +
        z01 * (1 - fx) * fy +
        z11 * fx * fy;

      if (!isNaN(z) && z > -9999) {
        points.push({
          id: `DEM_${pointId++}`,
          x,
          y,
          z,
          source: 'dem_sample',
        });
      }
    }
  }

  return points;
}
