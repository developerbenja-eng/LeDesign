'use client';

// ============================================================
// MODAL RESULTS VIEWER
// Displays modal analysis results (frequencies, periods, mass participation)
// ============================================================

import { useMemo } from 'react';
import { ModalResult } from '@ledesign/structural/results';
import { TrendingUp } from 'lucide-react';

interface ModalResultsViewerProps {
  results: ModalResult[];
}

export function ModalResultsViewer({ results }: ModalResultsViewerProps) {
  // Sort results by mode number
  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => a.mode_number - b.mode_number);
  }, [results]);

  // Check if 90% participation is reached
  const ninetyPercentX = useMemo(() => {
    const index = sortedResults.findIndex((r) => r.cumulative_x >= 90);
    return index >= 0 ? index + 1 : null;
  }, [sortedResults]);

  const ninetyPercentY = useMemo(() => {
    const index = sortedResults.findIndex((r) => r.cumulative_y >= 90);
    return index >= 0 ? index + 1 : null;
  }, [sortedResults]);

  const ninetyPercentZ = useMemo(() => {
    const index = sortedResults.findIndex((r) => r.cumulative_z >= 90);
    return index >= 0 ? index + 1 : null;
  }, [sortedResults]);

  return (
    <div className="space-y-3">
      {/* 90% Participation Summary */}
      <div className="bg-lele-bg/50 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2 text-xs text-slate-400 uppercase tracking-wider">
          <TrendingUp className="w-3 h-3" />
          <span>90% Mass Participation</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="space-y-1">
            <div className="text-slate-500">X Direction</div>
            <div className="text-slate-200 font-mono">
              {ninetyPercentX ? `Mode ${ninetyPercentX}` : 'Not reached'}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-slate-500">Y Direction</div>
            <div className="text-slate-200 font-mono">
              {ninetyPercentY ? `Mode ${ninetyPercentY}` : 'Not reached'}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-slate-500">Z Direction</div>
            <div className="text-slate-200 font-mono">
              {ninetyPercentZ ? `Mode ${ninetyPercentZ}` : 'Not reached'}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Results Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-lele-bg/50 border-b border-lele-border">
            <tr>
              <th className="px-2 py-2 text-left text-slate-400 font-medium">Mode</th>
              <th className="px-2 py-2 text-right text-slate-400 font-medium">Freq (Hz)</th>
              <th className="px-2 py-2 text-right text-slate-400 font-medium">Period (s)</th>
              <th className="px-2 py-2 text-right text-slate-400 font-medium">Mx (%)</th>
              <th className="px-2 py-2 text-right text-slate-400 font-medium">My (%)</th>
              <th className="px-2 py-2 text-right text-slate-400 font-medium">Mz (%)</th>
              <th className="px-2 py-2 text-right text-slate-400 font-medium">Σx (%)</th>
              <th className="px-2 py-2 text-right text-slate-400 font-medium">Σy (%)</th>
              <th className="px-2 py-2 text-right text-slate-400 font-medium">Σz (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-lele-border/30">
            {sortedResults.map((result) => {
              // Highlight row if it reaches 90% in any direction
              const reaches90X = ninetyPercentX === result.mode_number;
              const reaches90Y = ninetyPercentY === result.mode_number;
              const reaches90Z = ninetyPercentZ === result.mode_number;
              const isHighlighted = reaches90X || reaches90Y || reaches90Z;

              return (
                <tr
                  key={result.id}
                  className={`hover:bg-lele-bg/30 transition-colors ${
                    isHighlighted ? 'bg-lele-accent/10' : ''
                  }`}
                >
                  <td className="px-2 py-2 text-slate-200 font-mono">{result.mode_number}</td>
                  <td className="px-2 py-2 text-right text-slate-300 font-mono">
                    {result.frequency.toFixed(3)}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-300 font-mono">
                    {result.period.toFixed(3)}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-300 font-mono">
                    {(result.mass_participation_x * 100).toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-300 font-mono">
                    {(result.mass_participation_y * 100).toFixed(2)}
                  </td>
                  <td className="px-2 py-2 text-right text-slate-300 font-mono">
                    {(result.mass_participation_z * 100).toFixed(2)}
                  </td>
                  <td
                    className={`px-2 py-2 text-right font-mono ${
                      reaches90X
                        ? 'text-emerald-400 font-bold'
                        : result.cumulative_x >= 90
                        ? 'text-emerald-500'
                        : 'text-slate-300'
                    }`}
                  >
                    {result.cumulative_x.toFixed(2)}
                  </td>
                  <td
                    className={`px-2 py-2 text-right font-mono ${
                      reaches90Y
                        ? 'text-emerald-400 font-bold'
                        : result.cumulative_y >= 90
                        ? 'text-emerald-500'
                        : 'text-slate-300'
                    }`}
                  >
                    {result.cumulative_y.toFixed(2)}
                  </td>
                  <td
                    className={`px-2 py-2 text-right font-mono ${
                      reaches90Z
                        ? 'text-emerald-400 font-bold'
                        : result.cumulative_z >= 90
                        ? 'text-emerald-500'
                        : 'text-slate-300'
                    }`}
                  >
                    {result.cumulative_z.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="bg-lele-bg/30 rounded-lg p-2 text-xs text-slate-400 space-y-1">
        <div className="font-medium text-slate-300">Legend:</div>
        <div>Mx, My, Mz = Mass participation in each mode</div>
        <div>Σx, Σy, Σz = Cumulative mass participation</div>
        <div className="text-emerald-400">Green = 90% participation reached</div>
      </div>
    </div>
  );
}
