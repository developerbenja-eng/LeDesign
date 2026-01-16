'use client';

// ============================================================
// RESULTS PANEL
// Design check results dashboard with summary and element list
// ============================================================

import { useState, useMemo } from 'react';
import { useEditorStore, useFilteredDesignResults } from '@/stores';
import { SummarySection } from './SummarySection';
import { ResultItem } from './ResultItem';
import { X, Filter, Eye, EyeOff, RefreshCw, ArrowUpDown, MousePointer } from 'lucide-react';

type SortOption = 'dc_high' | 'dc_low' | 'status' | 'name';

export function ResultsPanel() {
  const togglePanel = useEditorStore((state) => state.togglePanel);
  const designSummary = useEditorStore((state) => state.designSummary);
  const designCheckStatus = useEditorStore((state) => state.designCheckStatus);
  const designCheckError = useEditorStore((state) => state.designCheckError);
  const designResultsFilter = useEditorStore((state) => state.designResultsFilter);
  const setDesignResultsFilter = useEditorStore((state) => state.setDesignResultsFilter);
  const showDCRatioColoring = useEditorStore((state) => state.showDCRatioColoring);
  const setShowDCRatioColoring = useEditorStore((state) => state.setShowDCRatioColoring);
  const clearDesignResults = useEditorStore((state) => state.clearDesignResults);
  const designResults = useEditorStore((state) => state.designResults);
  const select = useEditorStore((state) => state.select);

  const [sortBy, setSortBy] = useState<SortOption>('dc_high');

  const filteredResults = useFilteredDesignResults();

  // Sort the filtered results
  const sortedResults = useMemo(() => {
    const results = [...filteredResults];

    switch (sortBy) {
      case 'dc_high':
        return results.sort((a, b) => b.demand_capacity_ratio - a.demand_capacity_ratio);
      case 'dc_low':
        return results.sort((a, b) => a.demand_capacity_ratio - b.demand_capacity_ratio);
      case 'status':
        const statusOrder = { fail: 0, warning: 1, pass: 2, not_designed: 3 };
        return results.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
      case 'name':
        return results.sort((a, b) => a.member_id.localeCompare(b.member_id));
      default:
        return results;
    }
  }, [filteredResults, sortBy]);

  // Batch select functions
  const selectAllFailing = () => {
    const failingIds = Array.from(designResults.values())
      .filter((r) => r.status === 'fail')
      .map((r) => r.member_id);
    if (failingIds.length > 0) {
      select(failingIds);
    }
  };

  const selectAllWarnings = () => {
    const warningIds = Array.from(designResults.values())
      .filter((r) => r.status === 'warning')
      .map((r) => r.member_id);
    if (warningIds.length > 0) {
      select(warningIds);
    }
  };

  const selectAllFiltered = () => {
    const filteredIds = sortedResults.map((r) => r.member_id);
    if (filteredIds.length > 0) {
      select(filteredIds);
    }
  };

  const handleClose = () => {
    togglePanel('resultsPanel');
  };

  const filterOptions: Array<{ value: 'all' | 'pass' | 'warning' | 'fail'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'pass', label: 'Pass' },
    { value: 'warning', label: 'Warning' },
    { value: 'fail', label: 'Fail' },
  ];

  return (
    <div className="h-full flex flex-col bg-lele-panel">
      {/* Header */}
      <div className="px-4 py-3 border-b border-lele-border flex items-center justify-between shrink-0">
        <h2 className="text-sm font-medium text-slate-200">Design Results</h2>
        <button
          onClick={handleClose}
          className="p-1 rounded hover:bg-lele-bg transition-colors"
          title="Close"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Error State */}
        {designCheckStatus === 'error' && designCheckError && (
          <div className="p-4">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400">{designCheckError}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {designCheckStatus === 'running' && (
          <div className="p-4 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <p className="text-sm">Running design checks...</p>
          </div>
        )}

        {/* No Results State */}
        {designCheckStatus === 'idle' && (
          <div className="p-4 text-center text-slate-400">
            <p className="text-sm">No design results yet.</p>
            <p className="text-xs mt-1">Run analysis first, then click "Design Check".</p>
          </div>
        )}

        {/* Results */}
        {designCheckStatus === 'completed' && designSummary && (
          <>
            {/* Summary Section */}
            <SummarySection summary={designSummary} />

            {/* Controls */}
            <div className="px-4 py-2 border-b border-lele-border space-y-2 bg-lele-bg/50">
              {/* Filter Row */}
              <div className="flex items-center justify-between gap-2">
                {/* Filter Buttons */}
                <div className="flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
                  {filterOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDesignResultsFilter(option.value)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        designResultsFilter === option.value
                          ? 'bg-lele-accent text-white'
                          : 'bg-lele-panel text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* D/C Coloring Toggle */}
                <button
                  onClick={() => setShowDCRatioColoring(!showDCRatioColoring)}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
                    showDCRatioColoring
                      ? 'bg-emerald-600 text-white'
                      : 'bg-lele-panel text-slate-400 hover:text-slate-200'
                  }`}
                  title={showDCRatioColoring ? 'Hide D/C colors' : 'Show D/C colors'}
                >
                  {showDCRatioColoring ? (
                    <Eye className="w-3 h-3" />
                  ) : (
                    <EyeOff className="w-3 h-3" />
                  )}
                  <span>Colors</span>
                </button>
              </div>

              {/* Sort & Select Row */}
              <div className="flex items-center justify-between gap-2">
                {/* Sort Dropdown */}
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="bg-lele-panel border border-lele-border rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-lele-accent"
                  >
                    <option value="dc_high">D/C Ratio (High → Low)</option>
                    <option value="dc_low">D/C Ratio (Low → High)</option>
                    <option value="status">Status (Fail First)</option>
                    <option value="name">Element ID</option>
                  </select>
                </div>

                {/* Batch Select */}
                <div className="flex items-center gap-1">
                  <MousePointer className="w-3.5 h-3.5 text-slate-400" />
                  {designSummary && designSummary.failCount > 0 && (
                    <button
                      onClick={selectAllFailing}
                      className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                      title={`Select all ${designSummary.failCount} failing elements`}
                    >
                      Fail ({designSummary.failCount})
                    </button>
                  )}
                  {designSummary && designSummary.warningCount > 0 && (
                    <button
                      onClick={selectAllWarnings}
                      className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
                      title={`Select all ${designSummary.warningCount} warning elements`}
                    >
                      Warn ({designSummary.warningCount})
                    </button>
                  )}
                  <button
                    onClick={selectAllFiltered}
                    className="px-2 py-1 text-xs rounded bg-lele-panel text-slate-400 hover:text-slate-200 transition-colors"
                    title={`Select all ${sortedResults.length} filtered elements`}
                  >
                    All ({sortedResults.length})
                  </button>
                </div>
              </div>
            </div>

            {/* Results List */}
            <div className="divide-y divide-lele-border/50">
              {filteredResults.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm">
                  No results match the current filter.
                </div>
              ) : (
                filteredResults.map((result) => (
                  <ResultItem key={result.id} result={result} />
                ))
              )}
            </div>

            {/* Clear Results Button */}
            <div className="p-4 border-t border-lele-border">
              <button
                onClick={clearDesignResults}
                className="w-full py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-lele-bg rounded transition-colors"
              >
                Clear Results
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
