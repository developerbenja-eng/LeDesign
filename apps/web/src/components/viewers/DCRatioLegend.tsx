'use client';

// ============================================================
// D/C RATIO LEGEND
// Floating legend showing the demand-capacity ratio color scale
// ============================================================

import { useEditorStore } from '@/stores';

export function DCRatioLegend() {
  const showDCRatioColoring = useEditorStore((state) => state.showDCRatioColoring);

  if (!showDCRatioColoring) {
    return null;
  }

  return (
    <div className="absolute bottom-4 left-4 bg-lele-panel/95 backdrop-blur-sm border border-lele-border rounded-lg p-3 shadow-lg z-10">
      <div className="text-xs text-slate-400 font-medium mb-2">D/C Ratio</div>

      {/* Color Gradient */}
      <div className="flex flex-col gap-1">
        {/* Gradient Bar */}
        <div
          className="w-24 h-3 rounded"
          style={{
            background: 'linear-gradient(to right, #22c55e, #84cc16, #eab308, #f97316, #ef4444)',
          }}
        />

        {/* Scale Labels */}
        <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
          <span>0.0</span>
          <span>0.5</span>
          <span>1.0+</span>
        </div>
      </div>

      {/* Legend Items */}
      <div className="mt-2 pt-2 border-t border-lele-border/50 space-y-1">
        <div className="flex items-center gap-2 text-[10px]">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }} />
          <span className="text-slate-400">&lt;0.5 Safe</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#eab308' }} />
          <span className="text-slate-400">0.7-0.9 Warning</span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-slate-400">&gt;1.0 Overstressed</span>
        </div>
      </div>
    </div>
  );
}
