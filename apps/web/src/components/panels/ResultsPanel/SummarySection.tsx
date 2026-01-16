'use client';

// ============================================================
// SUMMARY SECTION
// Design check summary with pass rate, D/C ratios, and status counts
// ============================================================

import { DesignSummary } from '@/stores/slices/types';
import { CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react';

interface SummarySectionProps {
  summary: DesignSummary;
}

export function SummarySection({ summary }: SummarySectionProps) {
  const {
    totalElements,
    passCount,
    warningCount,
    failCount,
    passRate,
    maxDCRatio,
    avgDCRatio,
  } = summary;

  // Determine overall status color
  const getStatusColor = () => {
    if (failCount > 0) return 'text-red-400';
    if (warningCount > 0) return 'text-yellow-400';
    return 'text-emerald-400';
  };

  const getPassRateColor = () => {
    if (passRate >= 100) return 'text-emerald-400';
    if (passRate >= 80) return 'text-lime-400';
    if (passRate >= 60) return 'text-yellow-400';
    if (passRate >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getDCRatioColor = (ratio: number) => {
    if (ratio < 0.7) return 'text-emerald-400';
    if (ratio < 0.9) return 'text-lime-400';
    if (ratio < 1.0) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="p-4 border-b border-lele-border">
      {/* Pass Rate Card */}
      <div className="bg-lele-bg rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400 uppercase tracking-wide">Pass Rate</span>
          <Activity className={`w-4 h-4 ${getStatusColor()}`} />
        </div>
        <div className={`text-3xl font-bold ${getPassRateColor()}`}>
          {passRate.toFixed(1)}%
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {totalElements} elements checked
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Max D/C Ratio */}
        <div className="bg-lele-bg rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Max D/C</div>
          <div className={`text-lg font-semibold ${getDCRatioColor(maxDCRatio)}`}>
            {maxDCRatio.toFixed(3)}
          </div>
        </div>

        {/* Avg D/C Ratio */}
        <div className="bg-lele-bg rounded-lg p-3">
          <div className="text-xs text-slate-400 mb-1">Avg D/C</div>
          <div className={`text-lg font-semibold ${getDCRatioColor(avgDCRatio)}`}>
            {avgDCRatio.toFixed(3)}
          </div>
        </div>
      </div>

      {/* Status Counts */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-lele-border/50">
        {/* Pass */}
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span className="text-sm">
            <span className="text-emerald-400 font-medium">{passCount}</span>
            <span className="text-slate-500 ml-1">pass</span>
          </span>
        </div>

        {/* Warning */}
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
          <span className="text-sm">
            <span className="text-yellow-400 font-medium">{warningCount}</span>
            <span className="text-slate-500 ml-1">warn</span>
          </span>
        </div>

        {/* Fail */}
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-red-400" />
          <span className="text-sm">
            <span className="text-red-400 font-medium">{failCount}</span>
            <span className="text-slate-500 ml-1">fail</span>
          </span>
        </div>
      </div>
    </div>
  );
}
