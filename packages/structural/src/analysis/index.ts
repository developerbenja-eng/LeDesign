/**
 * Structural Analysis Engine
 *
 * Exports all analysis functions:
 * - Static analysis: Linear elastic analysis using direct stiffness method
 * - Modal analysis: Eigenvalue analysis for natural frequencies and mode shapes
 */

export { runStaticAnalysis } from './static-analysis';
export { runModalAnalysis } from './modal-analysis';
export {
  runResponseSpectrumAnalysis,
  combineModalResponsesCQC,
  combineModalResponsesSRSS,
  combineModalResponsesABS,
  combineDirectionalResponses,
  generateNCh433Spectrum,
} from './response-spectrum';
export { buildForceDiagrams, getGlobalRange, calculateOffsetVector } from './force-diagrams';

// Analysis type constants
export const ANALYSIS_TYPES = {
  STATIC: 'static',
  MODAL: 'modal',
  RESPONSE_SPECTRUM: 'response_spectrum',
  TIME_HISTORY: 'time_history',
} as const;

// Default analysis settings
export const DEFAULT_STATIC_SETTINGS = {
  include_pdelta: false,
  max_iterations: 10,
  convergence_tolerance: 1e-6,
};

export const DEFAULT_MODAL_SETTINGS = {
  numModes: 12,
  tolerance: 1e-8,
  maxIterations: 100,
};

export const DEFAULT_RESPONSE_SPECTRUM_SETTINGS = {
  modalCombination: 'CQC' as const,
  directionalCombination: 'SRSS' as const,
  damping: 0.05, // 5% damping
  direction: 'X' as const,
};
