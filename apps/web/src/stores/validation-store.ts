import { create } from 'zustand';
import type {
  TestRun,
  TestResult,
  ModuleSummary,
  VerificationStatus,
  CreateVerificationRequest,
  TestVerification,
} from '@/types/validation';

interface ValidationFilters {
  module: string | null;
  status: 'all' | 'passed' | 'failed' | 'skipped';
  verification: 'all' | 'verified' | 'unverified' | 'disputed' | 'needs_review';
  search: string;
}

interface ValidationState {
  // Data
  runs: TestRun[];
  selectedRunId: string | null;
  currentRun: TestRun | null;
  results: TestResult[];
  modules: ModuleSummary[];

  // Filters
  filters: ValidationFilters;

  // UI State
  isLoading: boolean;
  isLoadingRun: boolean;
  error: string | null;
  selectedResultId: string | null;
  isVerificationModalOpen: boolean;

  // Actions - Fetching
  fetchRuns: () => Promise<void>;
  fetchRun: (id: string) => Promise<void>;
  selectRun: (id: string) => void;

  // Actions - Filtering
  setFilter: <K extends keyof ValidationFilters>(key: K, value: ValidationFilters[K]) => void;
  resetFilters: () => void;

  // Actions - Selection
  selectResult: (id: string | null) => void;
  openVerificationModal: () => void;
  closeVerificationModal: () => void;

  // Actions - Verification
  submitVerification: (data: Omit<CreateVerificationRequest, 'test_result_id'>) => Promise<void>;

  // Computed
  getFilteredResults: () => TestResult[];
  getSelectedResult: () => TestResult | null;
}

const defaultFilters: ValidationFilters = {
  module: null,
  status: 'all',
  verification: 'all',
  search: '',
};

export const useValidationStore = create<ValidationState>((set, get) => ({
  // Initial state
  runs: [],
  selectedRunId: null,
  currentRun: null,
  results: [],
  modules: [],
  filters: { ...defaultFilters },
  isLoading: false,
  isLoadingRun: false,
  error: null,
  selectedResultId: null,
  isVerificationModalOpen: false,

  // Fetch all runs
  fetchRuns: async () => {
    set({ isLoading: true, error: null });

    try {
      const response = await fetch('/api/validation/runs');
      if (!response.ok) throw new Error('Failed to fetch runs');

      const data = await response.json();
      set({ runs: data.runs, isLoading: false });

      // Auto-select latest run if none selected
      if (data.runs.length > 0 && !get().selectedRunId) {
        get().selectRun(data.runs[0].id);
      }
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // Fetch specific run with results
  fetchRun: async (id: string) => {
    set({ isLoadingRun: true, error: null });

    try {
      const { filters } = get();
      const params = new URLSearchParams();
      if (filters.module) params.set('module', filters.module);
      if (filters.status !== 'all') params.set('status', filters.status);

      const response = await fetch(`/api/validation/runs/${id}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch run details');

      const data = await response.json();
      set({
        currentRun: data.run,
        results: data.results,
        modules: data.modules,
        isLoadingRun: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoadingRun: false });
    }
  },

  // Select a run
  selectRun: (id: string) => {
    set({ selectedRunId: id, selectedResultId: null });
    get().fetchRun(id);
  },

  // Set filter
  setFilter: (key, value) => {
    set(state => ({
      filters: { ...state.filters, [key]: value },
    }));

    // Refetch if module or status changed
    if ((key === 'module' || key === 'status') && get().selectedRunId) {
      get().fetchRun(get().selectedRunId!);
    }
  },

  // Reset filters
  resetFilters: () => {
    set({ filters: { ...defaultFilters } });
    if (get().selectedRunId) {
      get().fetchRun(get().selectedRunId!);
    }
  },

  // Select result
  selectResult: (id: string | null) => {
    set({ selectedResultId: id });
  },

  // Modal controls
  openVerificationModal: () => set({ isVerificationModalOpen: true }),
  closeVerificationModal: () => set({ isVerificationModalOpen: false }),

  // Submit verification
  submitVerification: async (data) => {
    const { selectedResultId, selectedRunId } = get();
    if (!selectedResultId) throw new Error('No result selected');

    const response = await fetch('/api/validation/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        test_result_id: selectedResultId,
        ...data,
      }),
    });

    if (!response.ok) throw new Error('Failed to submit verification');

    // Refresh the run data to show the new verification
    set({ isVerificationModalOpen: false });
    if (selectedRunId) {
      await get().fetchRun(selectedRunId);
    }
  },

  // Get filtered results (client-side filtering for search and verification status)
  getFilteredResults: () => {
    const { results, filters } = get();

    return results.filter(result => {
      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesSearch =
          result.test_name.toLowerCase().includes(search) ||
          result.suite.toLowerCase().includes(search) ||
          result.module.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Verification filter
      if (filters.verification !== 'all') {
        const hasVerification = result.verification_count && result.verification_count > 0;
        const latestStatus = result.latest_verification?.verification_status;

        switch (filters.verification) {
          case 'verified':
            if (!hasVerification || latestStatus !== 'verified') return false;
            break;
          case 'unverified':
            if (hasVerification) return false;
            break;
          case 'disputed':
            if (!hasVerification || latestStatus !== 'disputed') return false;
            break;
          case 'needs_review':
            if (!hasVerification || latestStatus !== 'needs_review') return false;
            break;
        }
      }

      return true;
    });
  },

  // Get selected result
  getSelectedResult: () => {
    const { results, selectedResultId } = get();
    if (!selectedResultId) return null;
    return results.find(r => r.id === selectedResultId) || null;
  },
}));
