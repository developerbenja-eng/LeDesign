'use client';

// ============================================================
// ANALYSIS PANEL
// Displays analysis results including deformed shapes and modal results
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import { useEditorStore } from '@/stores';
import { X, Eye, EyeOff, Activity, Waves, TrendingUp } from 'lucide-react';
import { ModalResultsViewer } from './ModalResultsViewer';

export function AnalysisPanel() {
  const [showModalResults, setShowModalResults] = useState(false);

  // Store state
  const togglePanel = useEditorStore((state) => state.togglePanel);
  const analysisRuns = useEditorStore((state) => state.analysisRuns);
  const activeRunId = useEditorStore((state) => state.activeRunId);
  const activeCombinationId = useEditorStore((state) => state.activeCombinationId);
  const loadCombinations = useEditorStore((state) => state.loadCombinations);
  const showDeformedShape = useEditorStore((state) => state.showDeformedShape);
  const deformationScale = useEditorStore((state) => state.deformationScale);
  const showForcesDiagram = useEditorStore((state) => state.showForcesDiagram);
  const diagramType = useEditorStore((state) => state.diagramType);
  const modalResults = useEditorStore((state) => state.modalResults);

  // Actions
  const setActiveRun = useEditorStore((state) => state.setActiveRun);
  const setActiveCombination = useEditorStore((state) => state.setActiveCombination);
  const setShowDeformedShape = useEditorStore((state) => state.setShowDeformedShape);
  const setDeformationScale = useEditorStore((state) => state.setDeformationScale);
  const setShowForcesDiagram = useEditorStore((state) => state.setShowForcesDiagram);
  const setDiagramType = useEditorStore((state) => state.setDiagramType);

  const activeRun = activeRunId ? analysisRuns.get(activeRunId) : null;
  const runModalResults = activeRunId ? modalResults.get(activeRunId) : null;

  // Get analysis runs as array
  const runsArray = useMemo(() => Array.from(analysisRuns.values()), [analysisRuns]);

  // Get combinations as array
  const combinationsArray = useMemo(() => Array.from(loadCombinations.values()), [loadCombinations]);

  const handleClose = () => {
    togglePanel('analysisPanel');
  };

  const handleScaleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDeformationScale(Number(e.target.value));
    },
    [setDeformationScale]
  );

  return (
    <div className="h-full flex flex-col bg-lele-panel">
      {/* Header */}
      <div className="px-4 py-3 border-b border-lele-border flex items-center justify-between shrink-0">
        <h2 className="text-sm font-medium text-slate-200">Analysis Results</h2>
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
        {/* No Analysis Run */}
        {runsArray.length === 0 && (
          <div className="p-4 text-center text-slate-400">
            <p className="text-sm">No analysis results yet.</p>
            <p className="text-xs mt-1">Run an analysis to see results.</p>
          </div>
        )}

        {/* Analysis Run Selection */}
        {runsArray.length > 0 && (
          <div className="p-4 space-y-4">
            {/* Run Selector */}
            <div className="space-y-2">
              <label className="text-xs text-slate-400 uppercase tracking-wider">Analysis Run</label>
              <select
                value={activeRunId || ''}
                onChange={(e) => setActiveRun(e.target.value || null)}
                className="w-full bg-lele-bg border border-lele-border rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-lele-accent"
              >
                {!activeRunId && <option value="">Select run...</option>}
                {runsArray.map((run) => (
                  <option key={run.id} value={run.id}>
                    {run.analysis_type} - {run.status} - {new Date(run.created_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Run Info */}
            {activeRun && (
              <div className="bg-lele-bg/50 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Type:</span>
                  <span className="text-slate-200">{activeRun.analysis_type}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      activeRun.status === 'completed'
                        ? 'bg-emerald-600/20 text-emerald-400'
                        : activeRun.status === 'running'
                        ? 'bg-blue-600/20 text-blue-400'
                        : activeRun.status === 'failed'
                        ? 'bg-red-600/20 text-red-400'
                        : 'bg-slate-600/20 text-slate-400'
                    }`}
                  >
                    {activeRun.status}
                  </span>
                </div>
                {activeRun.started_at && activeRun.completed_at && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Duration:</span>
                    <span className="text-slate-200">
                      {(
                        (new Date(activeRun.completed_at).getTime() - new Date(activeRun.started_at).getTime()) /
                        1000
                      ).toFixed(2)}
                      s
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Load Combination Selection (for static analysis) */}
            {activeRun && activeRun.analysis_type === 'static_linear' && combinationsArray.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs text-slate-400 uppercase tracking-wider">Load Combination</label>
                <select
                  value={activeCombinationId || ''}
                  onChange={(e) => setActiveCombination(e.target.value || null)}
                  className="w-full bg-lele-bg border border-lele-border rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-lele-accent"
                >
                  {!activeCombinationId && <option value="">Select combination...</option>}
                  {combinationsArray.map((combo) => (
                    <option key={combo.id} value={combo.id}>
                      {combo.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Deformed Shape Controls */}
            {activeRun && activeCombinationId && (
              <div className="space-y-3 border-t border-lele-border pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300">Deformed Shape</span>
                  </div>
                  <button
                    onClick={() => setShowDeformedShape(!showDeformedShape)}
                    className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
                      showDeformedShape
                        ? 'bg-emerald-600 text-white'
                        : 'bg-lele-bg text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {showDeformedShape ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                    <span>{showDeformedShape ? 'Visible' : 'Hidden'}</span>
                  </button>
                </div>

                {/* Deformation Scale Slider */}
                {showDeformedShape && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <label className="text-slate-400">Scale Factor</label>
                      <span className="text-slate-300 font-mono">{deformationScale}×</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="1000"
                      value={deformationScale}
                      onChange={handleScaleChange}
                      className="w-full accent-lele-accent"
                    />
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>1×</span>
                      <span>1000×</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Force Diagram Controls */}
            {activeRun && activeCombinationId && activeRun.analysis_type === 'static_linear' && (
              <div className="space-y-3 border-t border-lele-border pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-300">Force Diagrams</span>
                  </div>
                  <button
                    onClick={() => setShowForcesDiagram(!showForcesDiagram)}
                    className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
                      showForcesDiagram
                        ? 'bg-lele-accent text-white'
                        : 'bg-lele-bg text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {showForcesDiagram ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                    <span>{showForcesDiagram ? 'Visible' : 'Hidden'}</span>
                  </button>
                </div>

                {/* Diagram Type Selector */}
                {showForcesDiagram && (
                  <div className="space-y-2">
                    <label className="text-xs text-slate-400 uppercase tracking-wider">Diagram Type</label>
                    <select
                      value={diagramType}
                      onChange={(e) => setDiagramType(e.target.value as 'moment' | 'shear' | 'axial')}
                      className="w-full bg-lele-bg border border-lele-border rounded px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-lele-accent"
                    >
                      <option value="moment">Moment Diagram</option>
                      <option value="shear">Shear Diagram</option>
                      <option value="axial">Axial Diagram</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Modal Results Section */}
            {activeRun && activeRun.analysis_type === 'modal' && runModalResults && runModalResults.length > 0 && (
              <div className="space-y-3 border-t border-lele-border pt-4">
                <button
                  onClick={() => setShowModalResults(!showModalResults)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-lele-bg hover:bg-lele-bg/70 rounded transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Waves className="w-4 h-4 text-lele-accent" />
                    <span className="text-sm text-slate-300">Modal Results</span>
                    <span className="text-xs text-slate-500">({runModalResults.length} modes)</span>
                  </div>
                  <span className="text-slate-400">{showModalResults ? '▼' : '▶'}</span>
                </button>

                {showModalResults && <ModalResultsViewer results={runModalResults} />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
