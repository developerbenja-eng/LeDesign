// ============================================================
// RESULTS SLICE
// Manages analysis and design results state
// ============================================================

import {
  SliceCreator,
  ResultsSlice,
  DesignSummary,
  DesignCheckStatus,
  DCColorMode,
} from './types';
import {
  AnalysisRun,
  NodeResult,
  MemberResult,
  ModalResult,
  DesignResult,
} from '@ledesign/structural';

export const createResultsSlice: SliceCreator<ResultsSlice> = (set, get) => ({
  // ===========================================
  // Analysis State
  // ===========================================
  analysisRuns: new Map<string, AnalysisRun>(),
  activeRunId: null,
  nodeResults: new Map<string, NodeResult[]>(),
  memberResults: new Map<string, MemberResult[]>(),
  modalResults: new Map<string, ModalResult[]>(),
  activeCombinationId: null,
  showDeformedShape: false,
  deformationScale: 100,
  showForcesDiagram: false,
  diagramType: 'moment',

  // ===========================================
  // Design State
  // ===========================================
  designResults: new Map<string, DesignResult>(),
  designSummary: null,
  showDCRatioColoring: false,
  dcColorMode: 'gradient',
  designCheckStatus: 'idle',
  designCheckError: null,
  designResultsFilter: 'all',

  // ===========================================
  // Analysis Actions
  // ===========================================
  setAnalysisRuns: (runs: AnalysisRun[]) =>
    set((state) => {
      state.analysisRuns = new Map(runs.map((r) => [r.id, r]));
    }),

  addAnalysisRun: (run: AnalysisRun) =>
    set((state) => {
      state.analysisRuns.set(run.id, run);
    }),

  updateAnalysisRun: (id: string, updates: Partial<AnalysisRun>) =>
    set((state) => {
      const run = state.analysisRuns.get(id);
      if (run) {
        state.analysisRuns.set(id, { ...run, ...updates });
      }
    }),

  setActiveRun: (runId: string | null) =>
    set((state) => {
      state.activeRunId = runId;
    }),

  setNodeResults: (runId: string, results: NodeResult[]) =>
    set((state) => {
      state.nodeResults.set(runId, results);
    }),

  setMemberResults: (runId: string, results: MemberResult[]) =>
    set((state) => {
      state.memberResults.set(runId, results);
    }),

  setModalResults: (runId: string, results: ModalResult[]) =>
    set((state) => {
      state.modalResults.set(runId, results);
    }),

  setActiveCombination: (combinationId: string | null) =>
    set((state) => {
      state.activeCombinationId = combinationId;
    }),

  setShowDeformedShape: (show: boolean) =>
    set((state) => {
      state.showDeformedShape = show;
    }),

  setDeformationScale: (scale: number) =>
    set((state) => {
      state.deformationScale = Math.max(1, Math.min(1000, scale));
    }),

  setShowForcesDiagram: (show: boolean) =>
    set((state) => {
      state.showForcesDiagram = show;
    }),

  setDiagramType: (type: 'moment' | 'shear' | 'axial') =>
    set((state) => {
      state.diagramType = type;
    }),

  clearResults: () =>
    set((state) => {
      state.analysisRuns = new Map();
      state.activeRunId = null;
      state.nodeResults = new Map();
      state.memberResults = new Map();
      state.modalResults = new Map();
      state.activeCombinationId = null;
      state.showDeformedShape = false;
      state.showForcesDiagram = false;
    }),

  // ===========================================
  // Design Actions
  // ===========================================
  setDesignResults: (results: DesignResult[]) =>
    set((state) => {
      // Create map keyed by member_id for quick lookup
      state.designResults = new Map(results.map((r) => [r.member_id, r]));
    }),

  setDesignSummary: (summary: DesignSummary | null) =>
    set((state) => {
      state.designSummary = summary;
    }),

  setShowDCRatioColoring: (show: boolean) =>
    set((state) => {
      state.showDCRatioColoring = show;
    }),

  setDCColorMode: (mode: DCColorMode) =>
    set((state) => {
      state.dcColorMode = mode;
    }),

  setDesignCheckStatus: (status: DesignCheckStatus) =>
    set((state) => {
      state.designCheckStatus = status;
    }),

  setDesignCheckError: (error: string | null) =>
    set((state) => {
      state.designCheckError = error;
    }),

  setDesignResultsFilter: (filter: 'all' | 'pass' | 'warning' | 'fail') =>
    set((state) => {
      state.designResultsFilter = filter;
    }),

  clearDesignResults: () =>
    set((state) => {
      state.designResults = new Map();
      state.designSummary = null;
      state.showDCRatioColoring = false;
      state.designCheckStatus = 'idle';
      state.designCheckError = null;
      state.designResultsFilter = 'all';
    }),

  getDesignResultForElement: (elementId: string) => {
    return get().designResults.get(elementId);
  },
});
