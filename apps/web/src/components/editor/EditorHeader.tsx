'use client';

// ============================================================
// EDITOR HEADER
// Project name, save status, and global actions
// ============================================================

import { useCallback } from 'react';
import { useEditorStore } from '@/stores';
import { DesignSummary } from '@/stores/slices/types';
import { Save, Settings, Undo2, Redo2, Play, CheckCircle, Loader2 } from 'lucide-react';

interface EditorHeaderProps {
  projectName: string;
  projectId: string;
}

export function EditorHeader({ projectName, projectId }: EditorHeaderProps) {
  // History actions
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const undoStack = useEditorStore((state) => state.undoStack);
  const redoStack = useEditorStore((state) => state.redoStack);

  // Analysis state
  const activeRunId = useEditorStore((state) => state.activeRunId);

  // Design state
  const designCheckStatus = useEditorStore((state) => state.designCheckStatus);
  const setDesignCheckStatus = useEditorStore((state) => state.setDesignCheckStatus);
  const setDesignCheckError = useEditorStore((state) => state.setDesignCheckError);
  const setDesignResults = useEditorStore((state) => state.setDesignResults);
  const setDesignSummary = useEditorStore((state) => state.setDesignSummary);
  const setShowDCRatioColoring = useEditorStore((state) => state.setShowDCRatioColoring);

  // Panel actions
  const togglePanel = useEditorStore((state) => state.togglePanel);
  const resultsPanel = useEditorStore((state) => state.resultsPanel);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;
  const isRunningDesignCheck = designCheckStatus === 'running';

  // Handle Design Check button click
  const handleDesignCheck = useCallback(async () => {
    if (!projectId || !activeRunId) {
      setDesignCheckError('Run analysis first before running design checks');
      return;
    }

    setDesignCheckStatus('running');
    setDesignCheckError(null);

    try {
      const response = await fetch(`/api/structural/projects/${projectId}/design`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_run_id: activeRunId,
          design_code: 'AISC 360-22',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to run design checks');
      }

      const data = await response.json();

      // Update store with design results
      setDesignResults(data.designResults);

      // Build design summary with proper types
      const results = data.designResults;
      const total = results.length;
      const passCount = results.filter((r: any) => r.status === 'pass').length;
      const warningCount = results.filter((r: any) => r.status === 'warning').length;
      const failCount = results.filter((r: any) => r.status === 'fail').length;
      const maxDCRatio = total > 0 ? Math.max(...results.map((r: any) => r.demand_capacity_ratio)) : 0;
      const avgDCRatio = total > 0 ? results.reduce((sum: number, r: any) => sum + r.demand_capacity_ratio, 0) / total : 0;

      // Find governing element (highest D/C ratio)
      const governingResult = results.length > 0
        ? results.reduce((max: any, r: any) => r.demand_capacity_ratio > max.demand_capacity_ratio ? r : max, results[0])
        : null;

      const summary: DesignSummary = {
        totalElements: total,
        passCount,
        warningCount,
        failCount,
        passRate: total > 0 ? (passCount / total) * 100 : 0,
        maxDCRatio,
        avgDCRatio,
        governingElement: governingResult?.member_id || null,
        governingCheck: governingResult?.controlling_check || null,
      };

      setDesignSummary(summary);
      setDesignCheckStatus('completed');

      // Enable D/C ratio coloring and open results panel
      setShowDCRatioColoring(true);
      if (!resultsPanel.isOpen) {
        togglePanel('resultsPanel');
      }
    } catch (error) {
      console.error('Design check failed:', error);
      setDesignCheckError(error instanceof Error ? error.message : 'Design check failed');
      setDesignCheckStatus('error');
    }
  }, [
    projectId,
    activeRunId,
    setDesignCheckStatus,
    setDesignCheckError,
    setDesignResults,
    setDesignSummary,
    setShowDCRatioColoring,
    togglePanel,
    resultsPanel.isOpen,
  ]);

  return (
    <header className="h-12 bg-lele-panel border-b border-lele-border flex items-center px-4 gap-4 shrink-0">
      {/* Project Name */}
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-medium text-slate-200 truncate max-w-xs">
          {projectName}
        </h1>
        <span className="text-xs text-slate-500">Draft</span>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-lele-border" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="p-1.5 rounded hover:bg-lele-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="p-1.5 rounded hover:bg-lele-bg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Analysis Actions */}
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-lele-accent hover:bg-blue-600 rounded transition-colors"
          title="Run Analysis"
        >
          <Play className="w-3.5 h-3.5" />
          <span>Run Analysis</span>
        </button>

        <button
          onClick={handleDesignCheck}
          disabled={isRunningDesignCheck || !activeRunId}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title={!activeRunId ? 'Run analysis first' : 'Design Check'}
        >
          {isRunningDesignCheck ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCircle className="w-3.5 h-3.5" />
          )}
          <span>{isRunningDesignCheck ? 'Checking...' : 'Design Check'}</span>
        </button>
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-lele-border" />

      {/* Save and Settings */}
      <div className="flex items-center gap-1">
        <button
          className="p-1.5 rounded hover:bg-lele-bg transition-colors"
          title="Save (Ctrl+S)"
        >
          <Save className="w-4 h-4" />
        </button>
        <button
          className="p-1.5 rounded hover:bg-lele-bg transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
