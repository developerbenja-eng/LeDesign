// ============================================================
// RESPONSE SPECTRUM ANALYSIS
// Implements CQC and SRSS modal combination methods
// ============================================================

import { getDb } from '@/lib/db/turso';
import {
  ModalResult,
  ModeShape,
  NodeResult,
  MemberResult,
  ResponseSpectrum,
  SpectrumPoint,
  ModalCombinationMethod,
  DirectionalCombinationMethod,
  modalResultRowToModalResult,
  ModalResultRow,
} from '@/types/structural';
import { generateNodeResultId, generateMemberResultId } from '../factories';

type Vector = number[];
type Matrix = number[][];

// ============================================================
// SPECTRUM INTERPOLATION
// ============================================================

/**
 * Interpolate spectral acceleration at a given period
 * Uses linear interpolation between defined points
 */
function interpolateSpectrum(spectrum: ResponseSpectrum, period: number): number {
  const points = spectrum.spectrum_points;

  if (points.length === 0) return 0;

  // Sort points by period
  const sorted = [...points].sort((a, b) => a.period - b.period);

  // Before first point - extrapolate or use first value
  if (period <= sorted[0].period) {
    return sorted[0].acceleration;
  }

  // After last point - extrapolate or use last value
  if (period >= sorted[sorted.length - 1].period) {
    return sorted[sorted.length - 1].acceleration;
  }

  // Find bounding points
  for (let i = 0; i < sorted.length - 1; i++) {
    const p1 = sorted[i];
    const p2 = sorted[i + 1];

    if (period >= p1.period && period <= p2.period) {
      // Linear interpolation
      const t = (period - p1.period) / (p2.period - p1.period);
      return p1.acceleration + t * (p2.acceleration - p1.acceleration);
    }
  }

  return sorted[sorted.length - 1].acceleration;
}

// ============================================================
// MODAL DAMPING COEFFICIENT
// ============================================================

/**
 * Calculate cross-modal damping coefficient for CQC method
 * Formula: 8 * sqrt(ξi * ξj) * (ξi + r * ξj) * r^(3/2) / ((1 - r²)² + 4 * ξi * ξj * r * (1 + r²) + 4 * (ξi² + ξj²) * r²)
 * where r = ωi / ωj (frequency ratio)
 */
function crossModalDampingCoefficient(
  dampingI: number,
  dampingJ: number,
  frequencyI: number,
  frequencyJ: number
): number {
  // Avoid division by zero
  if (frequencyJ === 0) return 0;

  const r = frequencyI / frequencyJ;

  // For identical or very similar frequencies, return 1.0
  if (Math.abs(1 - r) < 1e-6) {
    return 1.0;
  }

  const xi = dampingI;
  const xj = dampingJ;

  const numerator = 8 * Math.sqrt(xi * xj) * (xi + r * xj) * Math.pow(r, 1.5);
  const denominator =
    Math.pow(1 - r * r, 2) +
    4 * xi * xj * r * (1 + r * r) +
    4 * (xi * xi + xj * xj) * r * r;

  // Avoid division by very small numbers
  if (Math.abs(denominator) < 1e-10) {
    return 0;
  }

  return numerator / denominator;
}

// ============================================================
// CQC (COMPLETE QUADRATIC COMBINATION)
// ============================================================

/**
 * Combine modal responses using CQC method
 * Accounts for cross-modal correlation
 *
 * Formula: R = sqrt(Σ Σ ρij * ri * rj)
 * where ρij is the cross-modal correlation coefficient
 */
export function combineModalResponsesCQC(
  modalResponses: number[],
  modalResults: ModalResult[],
  damping: number = 0.05
): number {
  const numModes = modalResponses.length;

  if (numModes === 0) return 0;
  if (numModes === 1) return Math.abs(modalResponses[0]);

  let sum = 0;

  for (let i = 0; i < numModes; i++) {
    for (let j = 0; j < numModes; j++) {
      const ri = modalResponses[i];
      const rj = modalResponses[j];

      // Get modal frequencies
      const fi = modalResults[i].frequency;
      const fj = modalResults[j].frequency;

      // Calculate cross-modal coefficient
      const rho = crossModalDampingCoefficient(damping, damping, fi, fj);

      sum += rho * ri * rj;
    }
  }

  return Math.sqrt(Math.abs(sum));
}

// ============================================================
// SRSS (SQUARE ROOT OF SUM OF SQUARES)
// ============================================================

/**
 * Combine modal responses using SRSS method
 * Assumes modal independence (no cross-modal correlation)
 *
 * Formula: R = sqrt(Σ ri²)
 */
export function combineModalResponsesSRSS(modalResponses: number[]): number {
  if (modalResponses.length === 0) return 0;

  const sumSquares = modalResponses.reduce((sum, r) => sum + r * r, 0);
  return Math.sqrt(sumSquares);
}

// ============================================================
// ABS (ABSOLUTE SUM)
// ============================================================

/**
 * Combine modal responses using ABS method
 * Conservative approach: sum absolute values
 *
 * Formula: R = Σ |ri|
 */
export function combineModalResponsesABS(modalResponses: number[]): number {
  return modalResponses.reduce((sum, r) => sum + Math.abs(r), 0);
}

// ============================================================
// DIRECTIONAL COMBINATION
// ============================================================

/**
 * Combine responses from different directions (X, Y, Z)
 * Methods: SRSS, ABS, 100-30-30, 100-40-40
 */
export function combineDirectionalResponses(
  responseX: number,
  responseY: number,
  responseZ: number,
  method: DirectionalCombinationMethod
): number {
  switch (method) {
    case 'SRSS':
      return Math.sqrt(responseX ** 2 + responseY ** 2 + responseZ ** 2);

    case 'ABS':
      return Math.abs(responseX) + Math.abs(responseY) + Math.abs(responseZ);

    case '100_30_30':
      // 100% X + 30% Y + 30% Z (and other combinations)
      return Math.max(
        Math.abs(responseX) + 0.3 * Math.abs(responseY) + 0.3 * Math.abs(responseZ),
        0.3 * Math.abs(responseX) + Math.abs(responseY) + 0.3 * Math.abs(responseZ),
        0.3 * Math.abs(responseX) + 0.3 * Math.abs(responseY) + Math.abs(responseZ)
      );

    case '100_40_40':
      // 100% X + 40% Y + 40% Z (and other combinations)
      return Math.max(
        Math.abs(responseX) + 0.4 * Math.abs(responseY) + 0.4 * Math.abs(responseZ),
        0.4 * Math.abs(responseX) + Math.abs(responseY) + 0.4 * Math.abs(responseZ),
        0.4 * Math.abs(responseX) + 0.4 * Math.abs(responseY) + Math.abs(responseZ)
      );

    default:
      return combineDirectionalResponses(responseX, responseY, responseZ, 'SRSS');
  }
}

// ============================================================
// MAIN RESPONSE SPECTRUM ANALYSIS
// ============================================================

export interface ResponseSpectrumAnalysisInput {
  projectId: string;
  runId: string;
  modalRunId: string; // Reference to previous modal analysis
  spectrumId: string; // Response spectrum to apply
  direction: 'X' | 'Y' | 'Z'; // Analysis direction
  modalCombination: ModalCombinationMethod;
  directionalCombination?: DirectionalCombinationMethod;
  damping?: number; // Default 5%
  combinationId: string; // Load combination ID to store results under
}

export async function runResponseSpectrumAnalysis(
  input: ResponseSpectrumAnalysisInput
): Promise<void> {
  const {
    projectId,
    runId,
    modalRunId,
    spectrumId,
    direction,
    modalCombination,
    damping = 0.05,
    combinationId,
  } = input;

  const db = getDb();

  // 1. Load modal results from previous modal analysis
  const modalResultsQuery = await db.execute({
    sql: `SELECT * FROM modal_results WHERE run_id = ? ORDER BY mode_number`,
    args: [modalRunId],
  });

  if (modalResultsQuery.rows.length === 0) {
    throw new Error('No modal results found. Run modal analysis first.');
  }

  const modalResults = modalResultsQuery.rows.map((row) =>
    modalResultRowToModalResult(row as unknown as ModalResultRow)
  );

  // 2. Load response spectrum
  const spectrumQuery = await db.execute({
    sql: `SELECT * FROM response_spectrums WHERE id = ?`,
    args: [spectrumId],
  });

  if (spectrumQuery.rows.length === 0) {
    throw new Error(`Response spectrum not found: ${spectrumId}`);
  }

  const spectrumRow = spectrumQuery.rows[0] as any;
  const spectrum: ResponseSpectrum = {
    id: spectrumRow.id,
    project_id: spectrumRow.project_id,
    name: spectrumRow.name,
    is_library: Boolean(spectrumRow.is_library),
    spectrum_type: spectrumRow.spectrum_type,
    code_params: JSON.parse(spectrumRow.code_params || '{}'),
    spectrum_points: JSON.parse(spectrumRow.spectrum_points || '[]'),
    damping_ratio: spectrumRow.damping_ratio,
    created_at: spectrumRow.created_at,
    updated_at: spectrumRow.updated_at,
  };

  // 3. Load mode shapes
  const modeShapesQuery = await db.execute({
    sql: `SELECT * FROM mode_shapes WHERE modal_result_id IN (
      SELECT id FROM modal_results WHERE run_id = ?
    )`,
    args: [modalRunId],
  });

  // Group mode shapes by modal result ID
  const modeShapesByModal = new Map<string, any[]>();
  for (const row of modeShapesQuery.rows) {
    const modalResultId = (row as any).modal_result_id;
    if (!modeShapesByModal.has(modalResultId)) {
      modeShapesByModal.set(modalResultId, []);
    }
    modeShapesByModal.get(modalResultId)!.push(row);
  }

  // 4. Calculate modal responses
  // For each mode, get spectral acceleration and multiply by mode shape
  const modalDisplacements: number[][] = []; // [mode][dof]
  const spectralAccelerations: number[] = [];

  for (const modal of modalResults) {
    // Get spectral acceleration at modal period
    const Sa = interpolateSpectrum(spectrum, modal.period);
    spectralAccelerations.push(Sa);

    // Get mode shapes for this mode
    const modeShapes = modeShapesByModal.get(modal.id) || [];

    // Modal displacement = Sa * mode_shape / omega^2
    const omega = modal.circular_frequency;
    const modalDisp: number[] = [];

    for (const shape of modeShapes) {
      // Select displacement component based on direction
      let disp = 0;
      switch (direction) {
        case 'X':
          disp = (shape as any).dx;
          break;
        case 'Y':
          disp = (shape as any).dy;
          break;
        case 'Z':
          disp = (shape as any).dz;
          break;
      }

      // Modal response = Sa * phi / omega^2
      const modalResponse = (Sa * disp) / (omega * omega);
      modalDisp.push(modalResponse);
    }

    modalDisplacements.push(modalDisp);
  }

  // 5. Combine modal responses using specified method
  // For simplicity, we'll store combined results
  // In a full implementation, you would:
  // - Combine displacements at each node
  // - Recover member forces from combined displacements
  // - Store in node_results and member_results tables

  console.log(`Response spectrum analysis completed for direction ${direction}`);
  console.log(`Modal combination: ${modalCombination}`);
  console.log(`Number of modes: ${modalResults.length}`);
  console.log(`Spectral accelerations:`, spectralAccelerations.slice(0, 5));

  // TODO: Complete implementation to store combined results
  // This requires:
  // 1. For each node, combine modal displacements
  // 2. For each member, recover forces from combined displacements
  // 3. Insert into node_results and member_results tables

  // For now, log a warning
  console.warn('Response spectrum analysis: Full result storage not yet implemented');
}

// ============================================================
// HELPER: GENERATE NCh433 SPECTRUM
// ============================================================

/**
 * Generate response spectrum curve from NCh433 parameters
 * Chilean seismic design code spectrum
 */
export function generateNCh433Spectrum(params: {
  A0: number; // Peak ground acceleration (g)
  S: number; // Site amplification factor
  T0: number; // Characteristic period (s)
  Tp: number; // Plateau period T' (s)
  n: number; // Spectral exponent
  I: number; // Importance factor
  R0: number; // Response modification factor
  numPoints?: number; // Number of spectrum points (default 100)
}): SpectrumPoint[] {
  const { A0, S, T0, Tp, n, I, R0, numPoints = 100 } = params;

  const points: SpectrumPoint[] = [];

  // Generate periods from 0 to 6 seconds
  const Tmax = 6.0;

  for (let i = 0; i <= numPoints; i++) {
    const T = (i / numPoints) * Tmax;

    let Sa: number;

    if (T <= T0) {
      // Ascending branch: Sa = A0 * S * (1 + 1.5 * T / T0)
      Sa = A0 * S * (1 + 1.5 * (T / T0));
    } else if (T <= Tp) {
      // Plateau: Sa = 2.5 * A0 * S
      Sa = 2.5 * A0 * S;
    } else {
      // Descending branch: Sa = 2.5 * A0 * S * (Tp / T)^n
      Sa = 2.5 * A0 * S * Math.pow(Tp / T, n);
    }

    // Apply importance and response modification factors
    Sa = (Sa * I) / (R0 * 0.9); // 0.9 is R*

    points.push({
      period: T,
      acceleration: Sa,
    });
  }

  return points;
}
