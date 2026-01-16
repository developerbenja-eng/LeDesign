'use client';

// ============================================================
// ELEMENT TOOLTIP
// HTML overlay showing element info when hovering in 3D view
// ============================================================

import { Html } from '@react-three/drei';
import { useEditorStore } from '@/stores';
import { useMemo } from 'react';

interface ElementTooltipProps {
  elementId: string;
  position: [number, number, number];
}

export function ElementTooltip({ elementId, position }: ElementTooltipProps) {
  const designResults = useEditorStore((state) => state.designResults);
  const beams = useEditorStore((state) => state.beams);
  const columns = useEditorStore((state) => state.columns);
  const braces = useEditorStore((state) => state.braces);

  // Get element info
  const elementInfo = useMemo(() => {
    const beam = beams.get(elementId);
    if (beam) return { type: 'Beam', name: beam.name || elementId };

    const column = columns.get(elementId);
    if (column) return { type: 'Column', name: column.name || elementId };

    const brace = braces.get(elementId);
    if (brace) return { type: 'Brace', name: brace.name || elementId };

    return null;
  }, [elementId, beams, columns, braces]);

  // Get design result
  const designResult = designResults.get(elementId);
  const dcRatio = designResult?.demand_capacity_ratio;
  const status = designResult?.status;

  // Get color based on status
  const getStatusColor = () => {
    if (!status) return 'text-slate-400';
    if (status === 'pass') return 'text-emerald-400';
    if (status === 'warning') return 'text-yellow-400';
    return 'text-red-400';
  };

  const getDCColor = (ratio: number) => {
    if (ratio < 0.7) return 'text-emerald-400';
    if (ratio < 0.9) return 'text-lime-400';
    if (ratio < 1.0) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!elementInfo) return null;

  return (
    <Html
      position={position}
      center
      distanceFactor={15}
      style={{ pointerEvents: 'none' }}
    >
      <div className="bg-lele-panel/95 backdrop-blur-sm border border-lele-border rounded-lg px-3 py-2 shadow-xl min-w-[120px] transform -translate-y-full -mt-2">
        {/* Element type and name */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] px-1.5 py-0.5 bg-lele-bg rounded font-medium text-slate-300">
            {elementInfo.type}
          </span>
          <span className="text-xs text-slate-400 truncate max-w-[80px]">
            {elementInfo.name}
          </span>
        </div>

        {/* D/C Ratio */}
        {dcRatio !== undefined ? (
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">D/C Ratio</span>
            <span className={`text-sm font-bold ${getDCColor(dcRatio)}`}>
              {dcRatio.toFixed(3)}
            </span>
          </div>
        ) : (
          <div className="text-[10px] text-slate-500 italic">
            No design data
          </div>
        )}

        {/* Status badge */}
        {status && (
          <div className={`text-[10px] mt-1 ${getStatusColor()} uppercase tracking-wide`}>
            {status}
          </div>
        )}
      </div>
    </Html>
  );
}
