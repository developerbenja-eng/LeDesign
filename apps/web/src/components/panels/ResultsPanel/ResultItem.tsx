'use client';

// ============================================================
// RESULT ITEM
// Individual design result row with expandable details
// ============================================================

import { useState, useCallback } from 'react';
import { useEditorStore } from '@/stores';
import { DesignResult } from '@ledesign/structural';
import { ChevronRight, ChevronDown, CheckCircle, AlertTriangle, XCircle, Target } from 'lucide-react';

interface ResultItemProps {
  result: DesignResult;
}

export function ResultItem({ result }: ResultItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const select = useEditorStore((state) => state.select);
  const selectedIds = useEditorStore((state) => state.selectedIds);

  const isSelected = selectedIds.has(result.member_id);

  const handleClick = useCallback(() => {
    // Select element in 3D view
    select([result.member_id]);
  }, [select, result.member_id]);

  const handleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  // Status icon and color
  const getStatusIcon = () => {
    switch (result.status) {
      case 'pass':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'fail':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getDCRatioColor = (ratio: number) => {
    if (ratio < 0.7) return 'text-emerald-400';
    if (ratio < 0.9) return 'text-lime-400';
    if (ratio < 1.0) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getElementTypeLabel = () => {
    const type = result.member_type;
    switch (type) {
      case 'beam':
        return 'Beam';
      case 'column':
        return 'Column';
      case 'brace':
        return 'Brace';
      case 'wall':
        return 'Wall';
      case 'slab':
        return 'Slab';
      default:
        return type || 'Member';
    }
  };

  return (
    <div
      className={`border-b border-lele-border/30 last:border-b-0 transition-colors ${
        isSelected ? 'bg-lele-accent/10' : 'hover:bg-lele-bg/50'
      }`}
    >
      {/* Main Row */}
      <div
        onClick={handleClick}
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
      >
        {/* Expand Button */}
        <button
          onClick={handleExpand}
          className="p-0.5 rounded hover:bg-lele-border/50 transition-colors"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {/* Status Icon */}
        {getStatusIcon()}

        {/* Element Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-200 truncate">
              {result.member_id}
            </span>
            <span className="text-xs text-slate-500 px-1.5 py-0.5 bg-lele-bg rounded">
              {getElementTypeLabel()}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5 truncate">
            {result.controlling_check || result.design_code}
          </div>
        </div>

        {/* D/C Ratio */}
        <div className="text-right">
          <div className={`text-sm font-mono font-medium ${getDCRatioColor(result.demand_capacity_ratio)}`}>
            {result.demand_capacity_ratio.toFixed(3)}
          </div>
          <div className="text-xs text-slate-500">D/C</div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-3 ml-8">
          <div className="bg-lele-bg rounded-lg p-3 text-sm">
            {/* Design Code */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-slate-400">Code:</span>
              <span className="text-slate-200">{result.design_code}</span>
            </div>

            {/* Controlling Check */}
            {result.controlling_check && (
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">Controlling:</span>
                <span className="text-slate-200">{result.controlling_check}</span>
              </div>
            )}

            {/* Individual Checks */}
            {result.checks?.checks && result.checks.checks.length > 0 && (
              <div className="mt-3 pt-3 border-t border-lele-border/50">
                <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Checks</div>
                <div className="space-y-1.5">
                  {result.checks.checks.map((check, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{check.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={getDCRatioColor(check.ratio)}>
                          {check.ratio.toFixed(3)}
                        </span>
                        {check.ratio <= 1.0 ? (
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {result.messages && result.messages.length > 0 && (
              <div className="mt-3 pt-3 border-t border-lele-border/50">
                <div className="text-xs text-slate-400 mb-2 uppercase tracking-wide">Messages</div>
                <div className="space-y-1">
                  {result.messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`text-xs ${
                        msg.type === 'error'
                          ? 'text-red-400'
                          : msg.type === 'warning'
                          ? 'text-yellow-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {msg.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
